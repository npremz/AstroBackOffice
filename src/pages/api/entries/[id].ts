import type { APIRoute } from 'astro';
import { db } from '../../../db';
import { entries, revisions, collections } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import { updateEntrySchema, validateBody, validationError, sanitizeEntryData, sanitizeSeoMetadata } from '@/lib/validation';
import { requireAuth } from '@/lib/auth';
import { logAudit, createAuditContext, computeChanges } from '@/lib/audit';

// GET single entry
export const GET: APIRoute = async ({ params }) => {
  try {
    const id = parseInt(params.id!);
    if (isNaN(id) || id < 1) {
      return validationError('Invalid entry ID');
    }

    const [entry] = await db.select().from(entries).where(eq(entries.id, id));

    if (!entry) {
      return new Response(JSON.stringify({ error: 'Entry not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify(entry), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch entry' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// PUT update entry
export const PUT: APIRoute = async ({ params, request, cookies }) => {
  const auth = await requireAuth(cookies);
  if ('response' in auth) return auth.response;

  const auditContext = createAuditContext(auth.user, request);
  const id = parseInt(params.id!);

  try {
    if (isNaN(id) || id < 1) {
      return validationError('Invalid entry ID');
    }

    // Validate input
    const validation = await validateBody(request, updateEntrySchema);
    if (!validation.success) {
      return validationError(validation.error);
    }

    const { data, slug, template, seo } = validation.data;

    // Get current entry and its collection
    const [currentEntry] = await db.select().from(entries).where(eq(entries.id, id));
    if (!currentEntry) {
      return new Response(JSON.stringify({ error: 'Entry not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get collection schema for sanitization
    const [collection] = await db.select().from(collections).where(eq(collections.id, currentEntry.collectionId));

    // Create a revision before updating
    await db.insert(revisions).values({
      entryId: id,
      data: currentEntry.data,
      createdAt: new Date(),
      status: 'archived'
    });

    // Sanitize data if provided
    const sanitizedData = data && collection
      ? sanitizeEntryData(data as Record<string, unknown>, collection.schema)
      : currentEntry.data;

    // Sanitize SEO metadata
    const sanitizedSeo = seo !== undefined ? sanitizeSeoMetadata(seo) : currentEntry.seo;

    // Update entry
    const [updatedEntry] = await db.update(entries)
      .set({
        data: sanitizedData,
        slug: slug ?? currentEntry.slug,
        template: template ?? currentEntry.template,
        seo: sanitizedSeo,
        publishedAt: new Date()
      })
      .where(eq(entries.id, id))
      .returning();

    await logAudit(auditContext, {
      action: 'UPDATE',
      resourceType: 'Entry',
      resourceId: id,
      resourceName: updatedEntry.slug,
      changes: computeChanges(
        { slug: currentEntry.slug, template: currentEntry.template, data: currentEntry.data, seo: currentEntry.seo },
        { slug: updatedEntry.slug, template: updatedEntry.template, data: updatedEntry.data, seo: updatedEntry.seo }
      ),
    });

    return new Response(JSON.stringify(updatedEntry), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Update entry error:', error);
    await logAudit(auditContext, {
      action: 'UPDATE',
      resourceType: 'Entry',
      resourceId: id,
      status: 'FAILED',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });
    return new Response(JSON.stringify({ error: 'Failed to update entry' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// DELETE entry (soft delete - moves to trash)
export const DELETE: APIRoute = async ({ params, request, cookies, url }) => {
  const auth = await requireAuth(cookies);
  if ('response' in auth) return auth.response;

  const auditContext = createAuditContext(auth.user, request);
  const id = parseInt(params.id!);
  const permanent = url.searchParams.get('permanent') === 'true';

  try {
    if (isNaN(id) || id < 1) {
      return validationError('Invalid entry ID');
    }

    // Get entry before deletion for audit log
    const [entry] = await db.select().from(entries).where(eq(entries.id, id));
    if (!entry) {
      return new Response(JSON.stringify({ error: 'Entry not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (permanent) {
      // Permanent delete - remove from database completely
      // Delete revisions first (cascade)
      await db.delete(revisions).where(eq(revisions.entryId, id));
      // Then delete the entry
      await db.delete(entries).where(eq(entries.id, id));

      await logAudit(auditContext, {
        action: 'DELETE',
        resourceType: 'Entry',
        resourceId: id,
        resourceName: entry.slug,
        changes: { before: { slug: entry.slug, template: entry.template, data: entry.data, seo: entry.seo } },
      });

      return new Response(JSON.stringify({ success: true, permanent: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      // Soft delete - set deletedAt timestamp
      const [deletedEntry] = await db.update(entries)
        .set({ deletedAt: new Date() })
        .where(eq(entries.id, id))
        .returning();

      await logAudit(auditContext, {
        action: 'DELETE',
        resourceType: 'Entry',
        resourceId: id,
        resourceName: entry.slug,
        changes: { 
          before: { deletedAt: null },
          after: { deletedAt: deletedEntry.deletedAt }
        },
      });

      return new Response(JSON.stringify({ success: true, permanent: false, deletedAt: deletedEntry.deletedAt }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error('Delete entry error:', error);
    await logAudit(auditContext, {
      action: 'DELETE',
      resourceType: 'Entry',
      resourceId: id,
      status: 'FAILED',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });
    return new Response(JSON.stringify({ error: 'Failed to delete entry' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
