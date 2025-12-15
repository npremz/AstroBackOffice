import type { APIRoute } from 'astro';
import { db } from '../../../db';
import { entries } from '../../../db/schema';
import { eq, inArray } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import { validateCsrf, csrfError } from '@/lib/csrf';
import { logAudit, createAuditContext } from '@/lib/audit';

export const POST: APIRoute = async ({ request, cookies }) => {
  const auth = await requireAuth(cookies, ['admin', 'editor']);
  if ('response' in auth) return auth.response;

  if (!validateCsrf(cookies, request)) {
    return csrfError();
  }

  const auditContext = createAuditContext(auth.user, request);

  try {
    const body = await request.json();
    const { orderedIds, collectionId } = body;

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return new Response(JSON.stringify({ error: 'orderedIds must be a non-empty array' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!collectionId) {
      return new Response(JSON.stringify({ error: 'collectionId is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify all entries belong to the same collection
    const existingEntries = await db.select()
      .from(entries)
      .where(inArray(entries.id, orderedIds));

    const invalidEntries = existingEntries.filter(e => e.collectionId !== collectionId);
    if (invalidEntries.length > 0) {
      return new Response(JSON.stringify({ error: 'Some entries do not belong to this collection' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Update sort order for each entry
    for (let i = 0; i < orderedIds.length; i++) {
      await db.update(entries)
        .set({ sortOrder: i })
        .where(eq(entries.id, orderedIds[i]));
    }

    await logAudit({
      ...auditContext,
      action: 'UPDATE',
      resourceType: 'Entry',
      resourceId: collectionId,
      resourceName: `Reordered ${orderedIds.length} entries`,
      changes: { after: { orderedIds } },
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Reorder entries error:', error);
    return new Response(JSON.stringify({ error: 'Failed to reorder entries' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
