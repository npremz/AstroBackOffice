import type { APIRoute } from 'astro';
import { db } from '@/db';
import { revisions, entries } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

// GET all drafts for a collection
export const GET: APIRoute = async ({ url }) => {
  try {
    const collectionId = url.searchParams.get('collectionId');

    if (!collectionId) {
      return new Response(JSON.stringify({ error: 'collectionId is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get all entries for this collection
    const collectionEntries = await db
      .select()
      .from(entries)
      .where(eq(entries.collectionId, parseInt(collectionId)));

    const entryIds = collectionEntries.map(e => e.id);

    if (entryIds.length === 0) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get all drafts for these entries
    const drafts = await db
      .select()
      .from(revisions)
      .where(eq(revisions.status, 'draft'))
      .orderBy(desc(revisions.createdAt));

    // Filter to only include drafts for entries in this collection
    const filteredDrafts = drafts.filter(draft => entryIds.includes(draft.entryId));

    return new Response(JSON.stringify(filteredDrafts), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching drafts:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch drafts' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// POST create new draft (for new entry that doesn't exist yet)
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { collectionId, slug, data, template } = body;

    // First create a placeholder entry with the draft data
    const [newEntry] = await db.insert(entries).values({
      collectionId,
      slug,
      data: data, // Use the actual data instead of empty object
      template,
      publishedAt: new Date(0) // Epoch time to indicate unpublished
    }).returning();

    // Then create the draft revision
    const [draft] = await db.insert(revisions).values({
      entryId: newEntry.id,
      data,
      createdAt: new Date(),
      status: 'draft'
    }).returning();

    return new Response(JSON.stringify({ entry: newEntry, draft }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error creating draft:', error);
    return new Response(JSON.stringify({ error: 'Failed to create draft' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
