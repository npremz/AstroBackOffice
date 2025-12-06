import type { APIRoute } from 'astro';
import { db } from '../../../db';
import { collections } from '../../../db/schema';

export const GET: APIRoute = async () => {
  try {
    const allCollections = await db.select().from(collections);
    return new Response(JSON.stringify(allCollections), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch collections' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { slug, schema } = body;

    const [newCollection] = await db.insert(collections).values({
      slug,
      schema
    }).returning();

    return new Response(JSON.stringify(newCollection), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to create collection' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
