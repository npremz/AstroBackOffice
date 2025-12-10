import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users, sessions } from '@/db/schema';
import { ensureRole, publicUser, requireAuth } from '@/lib/auth';
import { logAudit, createAuditContext, computeChanges } from '@/lib/audit';

const jsonHeaders = { 'Content-Type': 'application/json' };

export const DELETE: APIRoute = async ({ params, cookies, request }) => {
  const auth = await requireAuth(cookies, ['super_admin']);
  if ('response' in auth) return auth.response;

  const auditContext = createAuditContext(auth.user, request);
  const id = parseInt(params.id || '', 10);

  if (!id) {
    return new Response(JSON.stringify({ error: 'Invalid user id' }), {
      status: 400,
      headers: jsonHeaders
    });
  }

  // Prevent self-deletion
  if (id === auth.user.id) {
    return new Response(JSON.stringify({ error: 'Cannot delete your own account' }), {
      status: 400,
      headers: jsonHeaders
    });
  }

  try {
    // Get user before deletion for audit log
    const [userToDelete] = await db.select().from(users).where(eq(users.id, id));
    if (!userToDelete) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: jsonHeaders
      });
    }

    // Delete user sessions first
    await db.delete(sessions).where(eq(sessions.userId, id));

    await db.delete(users).where(eq(users.id, id));

    await logAudit(auditContext, {
      action: 'DELETE',
      resourceType: 'User',
      resourceId: id,
      resourceName: userToDelete.email,
      changes: { before: { email: userToDelete.email, name: userToDelete.name, role: userToDelete.role } },
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: jsonHeaders
    });
  } catch (error) {
    console.error('Delete user error:', error);
    await logAudit(auditContext, {
      action: 'DELETE',
      resourceType: 'User',
      resourceId: id,
      status: 'FAILED',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });
    return new Response(JSON.stringify({ error: 'Failed to delete user' }), {
      status: 500,
      headers: jsonHeaders
    });
  }
};

export const PATCH: APIRoute = async ({ params, request, cookies }) => {
  const auth = await requireAuth(cookies, ['super_admin']);
  if ('response' in auth) return auth.response;

  const auditContext = createAuditContext(auth.user, request);
  const id = parseInt(params.id || '', 10);

  if (!id) {
    return new Response(JSON.stringify({ error: 'Invalid user id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Get current user for audit log
    const [currentUser] = await db.select().from(users).where(eq(users.id, id));
    if (!currentUser) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const updates: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };

    if (body.name !== undefined) {
      updates.name = body.name;
    }

    if (body.role !== undefined) {
      if (!ensureRole(body.role)) {
        return new Response(JSON.stringify({ error: 'Invalid role' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      updates.role = body.role;
    }

    if (body.isActive !== undefined) {
      updates.isActive = Boolean(body.isActive);
    }

    const changed = Object.keys(updates).length > 1;
    if (!changed) {
      return new Response(JSON.stringify({ error: 'No updates provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const [updated] = await db.update(users).set(updates).where(eq(users.id, id)).returning();

    await logAudit(auditContext, {
      action: 'UPDATE',
      resourceType: 'User',
      resourceId: id,
      resourceName: updated.email,
      changes: computeChanges(
        { name: currentUser.name, role: currentUser.role, isActive: currentUser.isActive },
        { name: updated.name, role: updated.role, isActive: updated.isActive }
      ),
    });

    return new Response(JSON.stringify(publicUser(updated)), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Update user error:', error);
    await logAudit(auditContext, {
      action: 'UPDATE',
      resourceType: 'User',
      resourceId: id,
      status: 'FAILED',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });
    return new Response(JSON.stringify({ error: 'Failed to update user' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
