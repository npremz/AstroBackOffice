import type { APIRoute } from 'astro';
import { db } from '@/db';
import { users } from '@/db/schema';
import { requireAuth, publicUser } from '@/lib/auth';

export const GET: APIRoute = async ({ cookies }) => {
  const auth = await requireAuth(cookies, ['super_admin']);
  if ('response' in auth) return auth.response;

  try {
    const rows = await db.select().from(users);
    return new Response(JSON.stringify(rows.map(publicUser)), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('List users error:', error);
    return new Response(JSON.stringify({ error: 'Failed to load users' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
