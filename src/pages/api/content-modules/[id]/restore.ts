import type { APIRoute } from 'astro';
import { db } from '../../../../db';
import { contentModules } from '../../../../db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import { logAudit, createAuditContext } from '@/lib/audit';

export const POST: APIRoute = async ({ params, request, cookies }) => {
  const auth = await requireAuth(cookies);
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
      return new Response(JSON.stringify({ error: 'Content module is not in trash' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Restore by clearing deletedAt
    const [restoredModule] = await db.update(contentModules)
      .set({ deletedAt: null })
      .where(eq(contentModules.id, id))
      .returning();

    await logAudit(auditContext, {
      action: 'UPDATE',
      resourceType: 'ContentModule',
      resourceId: id,
      resourceName: restoredModule.slug,
      changes: {
        before: { deletedAt: module.deletedAt },
        after: { deletedAt: null },
      },
    });

    return new Response(JSON.stringify(restoredModule), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Restore content module error:', error);
    await logAudit(auditContext, {
      action: 'UPDATE',
      resourceType: 'ContentModule',
      resourceId: id,
      status: 'FAILED',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });
    return new Response(JSON.stringify({ error: 'Failed to restore content module' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
