import type { APIRoute } from 'astro';
import { z } from 'zod';
import { getSession, destroyAllUserSessions, clearSessionCookie, SESSION_COOKIE_NAME } from '@/lib/auth';
import { logAudit, createAuditContext } from '@/lib/audit';

const jsonHeaders = { 'Content-Type': 'application/json' };

const bodySchema = z.object({
  keepCurrent: z.boolean().optional().default(false),
});

export const POST: APIRoute = async ({ cookies, request }) => {
  try {
    const session = await getSession(cookies);
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: jsonHeaders
      });
    }

    const { user, token } = session;

    // Parse request body
    let keepCurrent = false;
    try {
      const body = await request.json();
      const parsed = bodySchema.safeParse(body);
      if (parsed.success) {
        keepCurrent = parsed.data.keepCurrent;
      }
    } catch {
      // Empty body is fine, use default keepCurrent = false
    }

    // Destroy all sessions (optionally keeping current one)
    const sessionsRevoked = await destroyAllUserSessions(
      user.id,
      keepCurrent ? token : undefined
    );

    // Clear current session cookie if not keeping current
    if (!keepCurrent) {
      clearSessionCookie(cookies);
    }

    // Audit log
    await logAudit(createAuditContext(user, request), {
      action: 'LOGOUT',
      resourceType: 'Session',
      resourceId: user.id,
      resourceName: `Logout all sessions${keepCurrent ? ' (kept current)' : ''}`,
      changes: {
        after: {
          sessionsRevoked,
          keepCurrent,
        },
      },
    });

    return new Response(JSON.stringify({
      success: true,
      sessionsRevoked,
      keepCurrent,
    }), {
      status: 200,
      headers: jsonHeaders
    });
  } catch (error) {
    console.error('Logout all sessions error:', error);
    return new Response(JSON.stringify({ error: 'Failed to logout all sessions' }), {
      status: 500,
      headers: jsonHeaders
    });
  }
};
