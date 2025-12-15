import type { APIRoute } from 'astro';
import { db } from '@/db';
import { entries, revisions, collections } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { updateEntrySchema, validateBody, validationError, sanitizeEntryData, sanitizeSeoMetadata } from '@/lib/validation';
import { requireAuth } from '@/lib/auth';
import { logAudit, createAuditContext, computeChanges } from '@/lib/audit';

// POST publish a draft to production
export const POST: APIRoute = async ({ params, request, cookies }) => {
  const auth = await requireAuth(cookies);
  if ('response' in auth) return auth.response;

  const auditContext = createAuditContext(auth.user, request);
  const entryId = parseInt(params.id as string);

  try {
    if (isNaN(entryId) || entryId < 1) {
      return validationError('Invalid entry ID');
    }

    // Validate input
    const validation = await validateBody(request, updateEntrySchema);
    if (!validation.success) {
      return validationError(validation.error);
    }

    const { data, slug, template, seo } = validation.data;

    // Get the current entry
    const [currentEntry] = await db.select().from(entries).where(eq(entries.id, entryId));

    if (!currentEntry) {
      return new Response(JSON.stringify({ error: 'Entry not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get collection schema for sanitization
    const [collection] = await db.select().from(collections).where(eq(collections.id, currentEntry.collectionId));

    // Sanitize data
    const sanitizedData = data && collection
      ? sanitizeEntryData(data as Record<string, unknown>, collection.schema)
      : currentEntry.data;

    // Sanitize SEO metadata
    const sanitizedSeo = seo !== undefined ? sanitizeSeoMetadata(seo) : currentEntry.seo;

    // Archive current version if it's already published (not epoch time)
    if (currentEntry.publishedAt.getTime() > 0) {
      await db.insert(revisions).values({
        entryId,
        data: currentEntry.data,
        createdAt: new Date(),
        status: 'archived'
      });
    }

    // Update entry with new data and publish
    const [publishedEntry] = await db.update(entries)
      .set({
        data: sanitizedData,
        slug: slug ?? currentEntry.slug,
        template: template ?? currentEntry.template,
        seo: sanitizedSeo,
        publishedAt: new Date()
      })
      .where(eq(entries.id, entryId))
      .returning();

    // Delete all drafts for this entry
    await db.delete(revisions)
      .where(and(
        eq(revisions.entryId, entryId),
        eq(revisions.status, 'draft')
      ));

    await logAudit(auditContext, {
      action: 'PUBLISH',
      resourceType: 'Entry',
      resourceId: entryId,
      resourceName: publishedEntry.slug,
      changes: computeChanges(
        { slug: currentEntry.slug, template: currentEntry.template, data: currentEntry.data, seo: currentEntry.seo },
        { slug: publishedEntry.slug, template: publishedEntry.template, data: publishedEntry.data, seo: publishedEntry.seo }
      ),
    });

    return new Response(JSON.stringify(publishedEntry), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error publishing entry:', error);
    await logAudit(auditContext, {
      action: 'PUBLISH',
      resourceType: 'Entry',
      resourceId: entryId,
      status: 'FAILED',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });
    return new Response(JSON.stringify({ error: 'Failed to publish entry' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
