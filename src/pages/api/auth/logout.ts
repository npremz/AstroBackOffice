import type { APIRoute } from 'astro';
import { destroySession, clearSessionCookie, SESSION_COOKIE_NAME } from '@/lib/auth';

export const POST: APIRoute = async ({ cookies }) => {
  try {
    const raw = cookies.get(SESSION_COOKIE_NAME);
    if (raw?.value) {
      await destroySession(raw.value);
    }
    clearSessionCookie(cookies);

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
