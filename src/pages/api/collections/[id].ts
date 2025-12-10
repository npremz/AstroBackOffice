import type { APIRoute } from 'astro';
import { db } from '../../../db';
import { collections, entries, revisions } from '../../../db/schema';
import { eq, inArray } from 'drizzle-orm';
import { updateCollectionSchema, validateBody, validationError } from '@/lib/validation';
import { requireAuth } from '@/lib/auth';
import { logAudit, createAuditContext, computeChanges } from '@/lib/audit';

// GET single collection
export const GET: APIRoute = async ({ params }) => {
  try {
    const id = parseInt(params.id!);
    if (isNaN(id) || id < 1) {
      return validationError('Invalid collection ID');
    }

    const [collection] = await db.select().from(collections).where(eq(collections.id, id));

    if (!collection) {
      return new Response(JSON.stringify({ error: 'Collection not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify(collection), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch collection' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// PUT update collection
export const PUT: APIRoute = async ({ params, request, cookies }) => {
  const auth = await requireAuth(cookies);
  if ('response' in auth) return auth.response;

  const auditContext = createAuditContext(auth.user, request);
  const id = parseInt(params.id!);

  try {
    if (isNaN(id) || id < 1) {
      return validationError('Invalid collection ID');
    }

    // Get current collection for audit
    const [currentCollection] = await db.select().from(collections).where(eq(collections.id, id));
    if (!currentCollection) {
      return new Response(JSON.stringify({ error: 'Collection not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate input
    const validation = await validateBody(request, updateCollectionSchema);
    if (!validation.success) {
      return validationError(validation.error);
    }

    const { slug, schema } = validation.data;

    const updateData: Record<string, unknown> = {};
    if (slug !== undefined) updateData.slug = slug;
    if (schema !== undefined) updateData.schema = schema;

    const [updatedCollection] = await db.update(collections)
      .set(updateData)
      .where(eq(collections.id, id))
      .returning();

    await logAudit(auditContext, {
      action: 'UPDATE',
      resourceType: 'Collection',
      resourceId: id,
      resourceName: updatedCollection.slug,
      changes: computeChanges(
        { slug: currentCollection.slug, schema: currentCollection.schema },
        { slug: updatedCollection.slug, schema: updatedCollection.schema }
      ),
    });

    return new Response(JSON.stringify(updatedCollection), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Update collection error:', error);
    await logAudit(auditContext, {
      action: 'UPDATE',
      resourceType: 'Collection',
      resourceId: id,
      status: 'FAILED',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });
    return new Response(JSON.stringify({ error: 'Failed to update collection' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// DELETE collection
export const DELETE: APIRoute = async ({ params, request, cookies }) => {
  const auth = await requireAuth(cookies);
  if ('response' in auth) return auth.response;

  const auditContext = createAuditContext(auth.user, request);
  const id = parseInt(params.id!);

  try {
    if (isNaN(id) || id < 1) {
      return validationError('Invalid collection ID');
    }

    // Get collection before deletion for audit log
    const [collection] = await db.select().from(collections).where(eq(collections.id, id));
    if (!collection) {
      return new Response(JSON.stringify({ error: 'Collection not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get all entries for this collection
    const collectionEntries = await db.select({ id: entries.id }).from(entries).where(eq(entries.collectionId, id));
    const entryIds = collectionEntries.map(e => e.id);

    // Delete revisions for all entries in this collection
    if (entryIds.length > 0) {
      await db.delete(revisions).where(inArray(revisions.entryId, entryIds));
    }

    // Delete all entries in this collection
    await db.delete(entries).where(eq(entries.collectionId, id));

    // Delete the collection
    await db.delete(collections).where(eq(collections.id, id));

    await logAudit(auditContext, {
      action: 'DELETE',
      resourceType: 'Collection',
      resourceId: id,
      resourceName: collection.slug,
      changes: { before: { slug: collection.slug, schema: collection.schema, entriesDeleted: entryIds.length } },
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Delete collection error:', error);
    await logAudit(auditContext, {
      action: 'DELETE',
      resourceType: 'Collection',
      resourceId: id,
      status: 'FAILED',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });
    return new Response(JSON.stringify({ error: 'Failed to delete collection' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
