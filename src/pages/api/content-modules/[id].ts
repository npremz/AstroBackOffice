import type { APIRoute } from 'astro';
import { db } from '../../../db';
import { contentModules } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import { updateContentModuleSchema, validateBody, validationError, sanitizeEntryData } from '@/lib/validation';
import { requireAuth } from '@/lib/auth';
import { logAudit, createAuditContext, computeChanges } from '@/lib/audit';

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
export const PUT: APIRoute = async ({ params, request, cookies }) => {
  const auth = await requireAuth(cookies);
  if ('response' in auth) return auth.response;

  const auditContext = createAuditContext(auth.user, request);
  const id = parseInt(params.id!);

  try {
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

    await logAudit(auditContext, {
      action: 'UPDATE',
      resourceType: 'ContentModule',
      resourceId: id,
      resourceName: updatedModule.slug,
      changes: computeChanges(
        { slug: currentModule.slug, name: currentModule.name, data: currentModule.data },
        { slug: updatedModule.slug, name: updatedModule.name, data: updatedModule.data }
      ),
    });

    return new Response(JSON.stringify(updatedModule), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Update content module error:', error);
    await logAudit(auditContext, {
      action: 'UPDATE',
      resourceType: 'ContentModule',
      resourceId: id,
      status: 'FAILED',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });
    return new Response(JSON.stringify({ error: 'Failed to update content module' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// DELETE content module (soft delete)
export const DELETE: APIRoute = async ({ params, request, cookies }) => {
  const auth = await requireAuth(cookies);
  if ('response' in auth) return auth.response;

  const auditContext = createAuditContext(auth.user, request);
  const id = parseInt(params.id!);

  try {
    if (isNaN(id) || id < 1) {
      return validationError('Invalid content module ID');
    }

    // Get module before deletion for audit log
    const [module] = await db.select().from(contentModules).where(eq(contentModules.id, id));
    if (!module) {
      return new Response(JSON.stringify({ error: 'Content module not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Soft delete - set deletedAt timestamp
    await db.update(contentModules)
      .set({ deletedAt: new Date() })
      .where(eq(contentModules.id, id));

    await logAudit(auditContext, {
      action: 'DELETE',
      resourceType: 'ContentModule',
      resourceId: id,
      resourceName: module.slug,
      changes: { before: { slug: module.slug, name: module.name, data: module.data } },
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Delete content module error:', error);
    await logAudit(auditContext, {
      action: 'DELETE',
      resourceType: 'ContentModule',
      resourceId: id,
      status: 'FAILED',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });
    return new Response(JSON.stringify({ error: 'Failed to delete content module' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
