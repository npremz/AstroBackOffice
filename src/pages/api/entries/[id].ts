import type { APIRoute } from 'astro';
import { db } from '../../../db';
import { entries, revisions } from '../../../db/schema';
import { eq } from 'drizzle-orm';

// GET single entry
export const GET: APIRoute = async ({ params }) => {
  try {
    const id = parseInt(params.id!);
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
export const PUT: APIRoute = async ({ params, request }) => {
  try {
    const id = parseInt(params.id!);
    const body = await request.json();
    const { data, slug, template } = body;

    // Create a revision before updating
    const [currentEntry] = await db.select().from(entries).where(eq(entries.id, id));
    if (currentEntry) {
      await db.insert(revisions).values({
        entryId: id,
        data: currentEntry.data,
        createdAt: new Date(),
        status: 'archived'
      });
    }

    // Update entry
    const [updatedEntry] = await db.update(entries)
      .set({ data, slug, template, publishedAt: new Date() })
      .where(eq(entries.id, id))
      .returning();

    return new Response(JSON.stringify(updatedEntry), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to update entry' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// DELETE entry
export const DELETE: APIRoute = async ({ params }) => {
  try {
    const id = parseInt(params.id!);
    await db.delete(entries).where(eq(entries.id, id));

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to delete entry' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
