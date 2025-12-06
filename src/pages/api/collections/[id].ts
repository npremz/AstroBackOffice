import type { APIRoute } from 'astro';
import { db } from '../../../db';
import { collections } from '../../../db/schema';
import { eq } from 'drizzle-orm';

// GET single collection
export const GET: APIRoute = async ({ params }) => {
  try {
    const id = parseInt(params.id!);
    const [collection] = await db.select().from(collections).where(eq(collections.id, id));

    if (!collection) {
      return new Response(JSON.stringify({ error: 'Collection not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify(collection), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch collection' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// PUT update collection
export const PUT: APIRoute = async ({ params, request }) => {
  try {
    const id = parseInt(params.id!);
    const body = await request.json();
    const { slug, schema } = body;

    const [updatedCollection] = await db.update(collections)
      .set({ slug, schema })
      .where(eq(collections.id, id))
      .returning();

    return new Response(JSON.stringify(updatedCollection), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to update collection' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// DELETE collection
export const DELETE: APIRoute = async ({ params }) => {
  try {
    const id = parseInt(params.id!);
    await db.delete(collections).where(eq(collections.id, id));

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to delete collection' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
