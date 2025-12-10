import type { APIRoute } from 'astro';
import { db } from '@/db';
import { entries, revisions, collections } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { updateEntrySchema, validateBody, validationError, sanitizeEntryData } from '@/lib/validation';

// GET the latest draft for an entry
export const GET: APIRoute = async ({ params }) => {
  try {
    const entryId = parseInt(params.id as string);
    if (isNaN(entryId) || entryId < 1) {
      return validationError('Invalid entry ID');
    }

    // Get the latest draft for this entry
    const [draft] = await db
      .select()
      .from(revisions)
      .where(and(
        eq(revisions.entryId, entryId),
        eq(revisions.status, 'draft')
      ))
      .orderBy(desc(revisions.createdAt))
      .limit(1);

    if (!draft) {
      return new Response(JSON.stringify({ error: 'No draft found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify(draft), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch draft' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// POST save current data as draft
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

    // Check if entry exists
    const [entry] = await db.select().from(entries).where(eq(entries.id, entryId));
    if (!entry) {
      return new Response(JSON.stringify({ error: 'Entry not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get collection schema for sanitization
    const [collection] = await db.select().from(collections).where(eq(collections.id, entry.collectionId));

    // Sanitize data if provided
    const sanitizedData = data && collection 
      ? sanitizeEntryData(data as Record<string, unknown>, collection.schema)
      : entry.data;

    // Update entry with new data, slug, and template (but keep as draft)
    await db.update(entries)
      .set({
        data: sanitizedData,
        slug: slug ?? entry.slug,
        template: template ?? entry.template,
        // Keep publishedAt as epoch to indicate it's still a draft
        publishedAt: new Date(0)
      })
      .where(eq(entries.id, entryId));

    // Check if there's already a draft
    const [existingDraft] = await db
      .select()
      .from(revisions)
      .where(and(
        eq(revisions.entryId, entryId),
        eq(revisions.status, 'draft')
      ))
      .orderBy(desc(revisions.createdAt))
      .limit(1);

    let draft;
    if (existingDraft) {
      // Update existing draft
      [draft] = await db
        .update(revisions)
        .set({
          data: sanitizedData,
          createdAt: new Date()
        })
        .where(eq(revisions.id, existingDraft.id))
        .returning();
    } else {
      // Create new draft
      [draft] = await db.insert(revisions).values({
        entryId,
        data: sanitizedData,
        createdAt: new Date(),
        status: 'draft'
      }).returning();
    }

    return new Response(JSON.stringify(draft), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error saving draft:', error);
    return new Response(JSON.stringify({ error: 'Failed to save draft' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
