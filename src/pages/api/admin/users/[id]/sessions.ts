import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users } from '@/db/schema';
import { requireAuth, destroyAllUserSessions } from '@/lib/auth';
import { logAudit, createAuditContext } from '@/lib/audit';

const jsonHeaders = { 'Content-Type': 'application/json' };

export const DELETE: APIRoute = async ({ params, cookies, request }) => {
  try {
    // Require super_admin role
    const auth = await requireAuth(cookies, ['super_admin']);
    if ('response' in auth) {
      return auth.response;
    }

    const { user: admin } = auth;

    // Validate target user ID
    const targetUserId = parseInt(params.id || '', 10);
    if (!targetUserId || Number.isNaN(targetUserId)) {
      return new Response(JSON.stringify({ error: 'Invalid user ID' }), {
        status: 400,
        headers: jsonHeaders
      });
    }

    // Check if target user exists
    const [targetUser] = await db
      .select({ id: users.id, email: users.email, name: users.name })
      .from(users)
      .where(eq(users.id, targetUserId));

    if (!targetUser) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: jsonHeaders
      });
    }

    // Destroy all sessions for target user
    const sessionsRevoked = await destroyAllUserSessions(targetUserId);

    // Audit log - using a descriptive action name
    await logAudit(createAuditContext(admin, request), {
      action: 'DELETE',
      resourceType: 'Session',
      resourceId: targetUserId,
      resourceName: `Force logout: ${targetUser.email}`,
      changes: {
        after: {
          targetUserId,
          targetUserEmail: targetUser.email,
          sessionsRevoked,
          forcedBy: admin.email,
        },
      },
    });

    return new Response(JSON.stringify({
      success: true,
      sessionsRevoked,
      targetUser: {
        id: targetUser.id,
        email: targetUser.email,
        name: targetUser.name,
      },
    }), {
      status: 200,
      headers: jsonHeaders
    });
  } catch (error) {
    console.error('Force logout error:', error);
    return new Response(JSON.stringify({ error: 'Failed to force logout user' }), {
      status: 500,
      headers: jsonHeaders
    });
  }
};
