import type { APIRoute } from 'astro';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { sessions } from '@/db/schema';
import { clearSessionCookie, getSession, requireAuth } from '@/lib/auth';

const jsonHeaders = { 'Content-Type': 'application/json' };

const sanitizeSession = (row: typeof sessions.$inferSelect) => {
  const { tokenHash, ...rest } = row;
  return rest;
};

export const GET: APIRoute = async ({ cookies }) => {
  const auth = await requireAuth(cookies);
  if ('response' in auth) return auth.response;

  try {
    const current = await getSession(cookies);
    const rows = await db.select().from(sessions).where(eq(sessions.userId, auth.user.id));

    const payload = rows.map((row) => ({
      ...sanitizeSession(row),
      isCurrent: current?.session?.id === row.id,
    }));

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: jsonHeaders
    });
  } catch (error) {
    console.error('List sessions error:', error);
    return new Response(JSON.stringify({ error: 'Failed to load sessions' }), {
      status: 500,
      headers: jsonHeaders
    });
  }
};

export const DELETE: APIRoute = async ({ request, cookies }) => {
  const auth = await requireAuth(cookies);
  if ('response' in auth) return auth.response;

  try {
    const url = new URL(request.url);
    const idParam = url.searchParams.get('id');
    const sessionId = idParam ? Number(idParam) : NaN;

    if (!Number.isFinite(sessionId)) {
      return new Response(JSON.stringify({ error: 'Session id is required' }), {
        status: 400,
        headers: jsonHeaders
      });
    }

    const current = await getSession(cookies);
    const [deleted] = await db
      .delete(sessions)
      .where(and(eq(sessions.id, sessionId), eq(sessions.userId, auth.user.id)))
      .returning();

    if (!deleted) {
      return new Response(JSON.stringify({ error: 'Session not found' }), {
        status: 404,
        headers: jsonHeaders
      });
    }

    if (current?.session?.id === sessionId) {
      clearSessionCookie(cookies);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: jsonHeaders
    });
  } catch (error) {
    console.error('Delete session error:', error);
    return new Response(JSON.stringify({ error: 'Failed to delete session' }), {
      status: 500,
      headers: jsonHeaders
    });
  }
};
