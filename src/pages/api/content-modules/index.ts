import type { APIRoute } from 'astro';
import { db } from '../../../db';
import { contentModules } from '../../../db/schema';

export const GET: APIRoute = async () => {
  try {
    const allModules = await db.select().from(contentModules);
    return new Response(JSON.stringify(allModules), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch content modules' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { slug, name, schema, data } = body;

    const [newModule] = await db.insert(contentModules).values({
      slug,
      name,
      schema,
      data: data || {},
      updatedAt: new Date()
    }).returning();

    return new Response(JSON.stringify(newModule), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to create content module' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
