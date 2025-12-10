import type { APIRoute } from 'astro';
import { getSession, publicUser } from '@/lib/auth';

export const GET: APIRoute = async ({ cookies }) => {
  try {
    const session = await getSession(cookies);
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify(publicUser(session.user)), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Me error:', error);
    return new Response(JSON.stringify({ error: 'Failed to load user' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
