import type { APIRoute } from 'astro';
import { db } from '../../../../db';
import { contentModules } from '../../../../db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import { logAudit, createAuditContext } from '@/lib/audit';

export const DELETE: APIRoute = async ({ params, request, cookies }) => {
  // Only admin can permanently delete
  const auth = await requireAuth(cookies, ['admin']);
  if ('response' in auth) return auth.response;

  const auditContext = createAuditContext(auth.user, request);
  const id = parseInt(params.id!);

  try {
    if (isNaN(id) || id < 1) {
      return new Response(JSON.stringify({ error: 'Invalid content module ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const [module] = await db.select().from(contentModules).where(eq(contentModules.id, id));

    if (!module) {
      return new Response(JSON.stringify({ error: 'Content module not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!module.deletedAt) {
      return new Response(JSON.stringify({ error: 'Content module must be in trash before permanent deletion' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Permanently delete
    await db.delete(contentModules).where(eq(contentModules.id, id));

    await logAudit(auditContext, {
      action: 'DELETE',
      resourceType: 'ContentModule',
      resourceId: id,
      resourceName: module.slug,
      changes: { 
        before: { 
          slug: module.slug, 
          name: module.name, 
          data: module.data,
          permanentDelete: true 
        } 
      },
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Permanent delete content module error:', error);
    await logAudit(auditContext, {
      action: 'DELETE',
      resourceType: 'ContentModule',
      resourceId: id,
      status: 'FAILED',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });
    return new Response(JSON.stringify({ error: 'Failed to permanently delete content module' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
