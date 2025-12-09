import type { APIRoute } from 'astro';
import { db } from '@/db';
import { entries, revisions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// POST publish a draft to production
export const POST: APIRoute = async ({ params, request }) => {
  try {
    const entryId = parseInt(params.id as string);
    const body = await request.json();
    const { data, slug, template } = body;

    // Get the current entry
    const [currentEntry] = await db.select().from(entries).where(eq(entries.id, entryId));

    if (!currentEntry) {
      return new Response(JSON.stringify({ error: 'Entry not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

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
        data,
        slug,
        template,
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
