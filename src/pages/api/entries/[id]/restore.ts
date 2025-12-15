import type { APIRoute } from 'astro';
import { db } from '@/db';
import { entries } from '@/db/schema';
import { eq, isNotNull } from 'drizzle-orm';
import { validationError } from '@/lib/validation';
import { requireAuth } from '@/lib/auth';
import { logAudit, createAuditContext } from '@/lib/audit';

// POST restore a soft-deleted entry
export const POST: APIRoute = async ({ params, request, cookies }) => {
  const auth = await requireAuth(cookies);
  if ('response' in auth) return auth.response;

  const auditContext = createAuditContext(auth.user, request);
  const id = parseInt(params.id as string);

  try {
    if (isNaN(id) || id < 1) {
      return validationError('Invalid entry ID');
    }

    // Get the deleted entry
    const [entry] = await db.select().from(entries).where(eq(entries.id, id));

    if (!entry) {
      return new Response(JSON.stringify({ error: 'Entry not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!entry.deletedAt) {
      return new Response(JSON.stringify({ error: 'Entry is not deleted' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Restore the entry by clearing deletedAt
    const [restoredEntry] = await db.update(entries)
      .set({ deletedAt: null })
      .where(eq(entries.id, id))
      .returning();

    await logAudit(auditContext, {
      action: 'UPDATE',
      resourceType: 'Entry',
      resourceId: id,
      resourceName: restoredEntry.slug,
      changes: {
        before: { deletedAt: entry.deletedAt },
        after: { deletedAt: null }
      },
    });

    return new Response(JSON.stringify(restoredEntry), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Restore entry error:', error);
    await logAudit(auditContext, {
      action: 'UPDATE',
      resourceType: 'Entry',
      resourceId: id,
      status: 'FAILED',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });
    return new Response(JSON.stringify({ error: 'Failed to restore entry' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
