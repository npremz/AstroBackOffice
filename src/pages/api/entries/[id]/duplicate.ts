import type { APIRoute } from 'astro';
import { db } from '../../../../db';
import { entries, collections } from '../../../../db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import { logAudit, createAuditContext } from '@/lib/audit';
import { validationError } from '@/lib/validation';

// POST duplicate entry
export const POST: APIRoute = async ({ params, request, cookies }) => {
  const auth = await requireAuth(cookies);
  if ('response' in auth) return auth.response;

  const auditContext = createAuditContext(auth.user, request);
  const id = parseInt(params.id!);

  try {
    if (isNaN(id) || id < 1) {
      return validationError('Invalid entry ID');
    }

    // Get the original entry
    const [originalEntry] = await db.select().from(entries).where(eq(entries.id, id));
    if (!originalEntry) {
      return new Response(JSON.stringify({ error: 'Entry not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get collection to validate slug uniqueness
    const [collection] = await db.select().from(collections).where(eq(collections.id, originalEntry.collectionId));
    if (!collection) {
      return new Response(JSON.stringify({ error: 'Collection not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Generate unique slug by appending -copy or -copy-N
    // Extract the entry slug without the collection prefix
    const entrySlugPart = originalEntry.slug.replace(`${collection.slug}/`, '');
    let newSlug = `${entrySlugPart}-copy`;
    let counter = 1;
    
    // Check if slug exists and find unique one
    while (true) {
      const fullSlug = `${collection.slug}/${newSlug}`;
      const existingEntries = await db.select({ id: entries.id })
        .from(entries)
        .where(eq(entries.slug, fullSlug));
      
      if (existingEntries.length === 0) break;
      
      counter++;
      newSlug = `${entrySlugPart}-copy-${counter}`;
      
      // Safety limit
      if (counter > 100) {
        return new Response(JSON.stringify({ error: 'Could not generate unique slug' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Create the duplicate entry
    const [duplicatedEntry] = await db.insert(entries).values({
      collectionId: originalEntry.collectionId,
      slug: `${collection.slug}/${newSlug}`,
      data: originalEntry.data,
      template: originalEntry.template,
      seo: originalEntry.seo,
      scheduledAt: null, // Don't copy scheduling
      deletedAt: null,
      publishedAt: new Date(), // Required field
    }).returning();

    await logAudit(auditContext, {
      action: 'CREATE',
      resourceType: 'Entry',
      resourceId: duplicatedEntry.id,
      resourceName: duplicatedEntry.slug,
      changes: { 
        after: { 
          slug: duplicatedEntry.slug, 
          duplicatedFrom: originalEntry.id,
          originalSlug: originalEntry.slug 
        } 
      },
    });

    return new Response(JSON.stringify({
      ...duplicatedEntry,
      originalId: originalEntry.id,
      originalSlug: originalEntry.slug,
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Duplicate entry error:', error);
    await logAudit(auditContext, {
      action: 'CREATE',
      resourceType: 'Entry',
      resourceName: 'duplicate',
      status: 'FAILED',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });
    return new Response(JSON.stringify({ error: 'Failed to duplicate entry' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
