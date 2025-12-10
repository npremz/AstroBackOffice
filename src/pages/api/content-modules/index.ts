import type { APIRoute } from 'astro';
import { db } from '../../../db';
import { contentModules } from '../../../db/schema';
import { createContentModuleSchema, validateBody, validationError, sanitizeEntryData } from '@/lib/validation';

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
    // Validate input
    const validation = await validateBody(request, createContentModuleSchema);
    if (!validation.success) {
      return validationError(validation.error);
    }

    const { slug, name, schema, data } = validation.data;

    // Sanitize data based on schema
    const sanitizedData = data 
      ? sanitizeEntryData(data as Record<string, unknown>, schema)
      : {};

    const [newModule] = await db.insert(contentModules).values({
      slug,
      name,
      schema,
      data: sanitizedData,
      updatedAt: new Date()
    }).returning();

    return new Response(JSON.stringify(newModule), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Create content module error:', error);
    return new Response(JSON.stringify({ error: 'Failed to create content module' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
