import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users } from '@/db/schema';
import { ensureRole, publicUser, requireAuth } from '@/lib/auth';

export const PATCH: APIRoute = async ({ params, request, cookies }) => {
  const auth = await requireAuth(cookies, ['super_admin']);
  if ('response' in auth) return auth.response;

  const id = parseInt(params.id || '', 10);
  if (!id) {
    return new Response(JSON.stringify({ error: 'Invalid user id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
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

    if (!updated) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify(publicUser(updated)), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Update user error:', error);
    return new Response(JSON.stringify({ error: 'Failed to update user' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
