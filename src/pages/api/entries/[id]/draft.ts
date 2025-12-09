import type { APIRoute } from 'astro';
import { db } from '@/db';
import { entries, revisions } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

// GET the latest draft for an entry
export const GET: APIRoute = async ({ params }) => {
  try {
    const entryId = parseInt(params.id as string);

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
    const body = await request.json();
    const { data, slug, template } = body;

    // Check if entry exists
    const [entry] = await db.select().from(entries).where(eq(entries.id, entryId));
    if (!entry) {
      return new Response(JSON.stringify({ error: 'Entry not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Update entry with new data, slug, and template (but keep as draft)
    await db.update(entries)
      .set({
        data,
        slug,
        template,
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
          data,
          createdAt: new Date()
        })
        .where(eq(revisions.id, existingDraft.id))
        .returning();
    } else {
      // Create new draft
      [draft] = await db.insert(revisions).values({
        entryId,
        data,
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
