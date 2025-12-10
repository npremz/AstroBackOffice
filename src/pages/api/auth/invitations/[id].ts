import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { invitations } from '@/db/schema';
import { requireAuth } from '@/lib/auth';

const jsonHeaders = { 'Content-Type': 'application/json' };

export const DELETE: APIRoute = async ({ params, cookies }) => {
  const auth = await requireAuth(cookies, ['super_admin']);
  if ('response' in auth) return auth.response;

  const id = parseInt(params.id || '', 10);
  if (!id) {
    return new Response(JSON.stringify({ error: 'Invalid invitation id' }), {
      status: 400,
      headers: jsonHeaders
    });
  }

  try {
    const [deleted] = await db.delete(invitations).where(eq(invitations.id, id)).returning();

    if (!deleted) {
      return new Response(JSON.stringify({ error: 'Invitation not found' }), {
        status: 404,
        headers: jsonHeaders
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: jsonHeaders
    });
  } catch (error) {
    console.error('Delete invitation error:', error);
    return new Response(JSON.stringify({ error: 'Failed to delete invitation' }), {
      status: 500,
      headers: jsonHeaders
    });
  }
};
