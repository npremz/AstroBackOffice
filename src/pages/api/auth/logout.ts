import type { APIRoute } from 'astro';
import { destroySession, clearSessionCookie, SESSION_COOKIE_NAME, getSession } from '@/lib/auth';
import { logAudit, createAuditContext } from '@/lib/audit';

export const POST: APIRoute = async ({ cookies, request }) => {
  try {
    // Get user info before destroying session for audit log
    const session = await getSession(cookies);
    const user = session?.user;

    const raw = cookies.get(SESSION_COOKIE_NAME);
    if (raw?.value) {
      await destroySession(raw.value);
    }
    clearSessionCookie(cookies);

    // Log logout
    if (user) {
      await logAudit(createAuditContext(user, request), {
        action: 'LOGOUT',
        resourceType: 'Session',
        resourceId: user.id,
        resourceName: user.email,
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Logout error:', error);
    return new Response(JSON.stringify({ error: 'Failed to logout' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
