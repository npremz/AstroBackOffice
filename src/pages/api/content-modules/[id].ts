import type { APIRoute } from 'astro';
import { db } from '../../../db';
import { contentModules } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import { updateContentModuleSchema, validateBody, validationError, sanitizeEntryData } from '@/lib/validation';

// GET single content module
export const GET: APIRoute = async ({ params }) => {
  try {
    const id = parseInt(params.id!);
    if (isNaN(id) || id < 1) {
      return validationError('Invalid content module ID');
    }

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
    if (isNaN(id) || id < 1) {
      return validationError('Invalid content module ID');
    }

    // Validate input
    const validation = await validateBody(request, updateContentModuleSchema);
    if (!validation.success) {
      return validationError(validation.error);
    }

    const { slug, name, schema, data } = validation.data;

    // Get current module for schema reference
    const [currentModule] = await db.select().from(contentModules).where(eq(contentModules.id, id));
    if (!currentModule) {
      return new Response(JSON.stringify({ error: 'Content module not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Use new schema if provided, otherwise use existing
    const effectiveSchema = schema ?? currentModule.schema;

    // Sanitize data based on schema
    const sanitizedData = data 
      ? sanitizeEntryData(data as Record<string, unknown>, effectiveSchema)
      : currentModule.data;

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (slug !== undefined) updateData.slug = slug;
    if (name !== undefined) updateData.name = name;
    if (schema !== undefined) updateData.schema = schema;
    updateData.data = sanitizedData;

    const [updatedModule] = await db.update(contentModules)
      .set(updateData)
      .where(eq(contentModules.id, id))
      .returning();

    return new Response(JSON.stringify(updatedModule), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Update content module error:', error);
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
    if (isNaN(id) || id < 1) {
      return validationError('Invalid content module ID');
    }

    await db.delete(contentModules).where(eq(contentModules.id, id));

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Delete content module error:', error);
    return new Response(JSON.stringify({ error: 'Failed to delete content module' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
