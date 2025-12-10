import type { APIRoute } from 'astro';
import { db } from '@/db';
import { entries, revisions, collections } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { updateEntrySchema, validateBody, validationError, sanitizeEntryData } from '@/lib/validation';

// POST publish a draft to production
export const POST: APIRoute = async ({ params, request }) => {
  try {
    const entryId = parseInt(params.id as string);
    if (isNaN(entryId) || entryId < 1) {
      return validationError('Invalid entry ID');
    }

    // Validate input
    const validation = await validateBody(request, updateEntrySchema);
    if (!validation.success) {
      return validationError(validation.error);
    }

    const { data, slug, template } = validation.data;

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

    return new Response(JSON.stringify(publishedEntry), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error publishing entry:', error);
    return new Response(JSON.stringify({ error: 'Failed to publish entry' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
