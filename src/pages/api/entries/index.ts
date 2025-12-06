import type { APIRoute } from 'astro';
import { db } from '../../../db';
import { entries, revisions } from '../../../db/schema';
import { eq } from 'drizzle-orm';

// GET all entries or entries by collection
export const GET: APIRoute = async ({ url }) => {
  try {
    const collectionId = url.searchParams.get('collectionId');

    let allEntries;
    if (collectionId) {
      allEntries = await db.select().from(entries).where(eq(entries.collectionId, parseInt(collectionId)));
    } else {
      allEntries = await db.select().from(entries);
    }

    return new Response(JSON.stringify(allEntries), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch entries' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// POST new entry
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { collectionId, slug, data, template } = body;

    const [newEntry] = await db.insert(entries).values({
      collectionId,
      slug,
      data,
      template,
      publishedAt: new Date()
    }).returning();

    return new Response(JSON.stringify(newEntry), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to create entry' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
