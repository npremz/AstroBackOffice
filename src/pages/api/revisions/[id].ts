import type { APIRoute } from 'astro';
import { db } from '@/db';
import { revisions, entries } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

// GET specific revision/draft
export const GET: APIRoute = async ({ params }) => {
  try {
    const id = parseInt(params.id as string);
    const [revision] = await db.select().from(revisions).where(eq(revisions.id, id));

    if (!revision) {
      return new Response(JSON.stringify({ error: 'Draft not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify(revision), {
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

// PUT update existing draft
export const PUT: APIRoute = async ({ params, request }) => {
  try {
    const id = parseInt(params.id as string);
    const body = await request.json();
    const { data } = body;

    const [updatedDraft] = await db
      .update(revisions)
      .set({
        data,
        createdAt: new Date() // Update timestamp
      })
      .where(eq(revisions.id, id))
      .returning();

    if (!updatedDraft) {
      return new Response(JSON.stringify({ error: 'Draft not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify(updatedDraft), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error updating draft:', error);
    return new Response(JSON.stringify({ error: 'Failed to update draft' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// DELETE draft
export const DELETE: APIRoute = async ({ params }) => {
  try {
    const id = parseInt(params.id as string);

    await db.delete(revisions).where(eq(revisions.id, id));

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to delete draft' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
