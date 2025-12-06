import type { APIRoute } from 'astro';
import { db } from '../../../db';
import { contentModules } from '../../../db/schema';
import { eq } from 'drizzle-orm';

// GET single content module
export const GET: APIRoute = async ({ params }) => {
  try {
    const id = parseInt(params.id!);
    const [module] = await db.select().from(contentModules).where(eq(contentModules.id, id));

    if (!module) {
      return new Response(JSON.stringify({ error: 'Content module not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify(module), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch content module' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// PUT update content module
export const PUT: APIRoute = async ({ params, request }) => {
  try {
    const id = parseInt(params.id!);
    const body = await request.json();
    const { slug, name, schema, data } = body;

    const [updatedModule] = await db.update(contentModules)
      .set({
        slug,
        name,
        schema,
        data,
        updatedAt: new Date()
      })
      .where(eq(contentModules.id, id))
      .returning();

    return new Response(JSON.stringify(updatedModule), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to update content module' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// DELETE content module
export const DELETE: APIRoute = async ({ params }) => {
  try {
    const id = parseInt(params.id!);
    await db.delete(contentModules).where(eq(contentModules.id, id));

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to delete content module' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
