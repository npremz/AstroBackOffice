import type { APIRoute } from 'astro';
import { getSession, publicUser } from '@/lib/auth';
import { getCsrfFromCookie, generateCsrfToken, setCsrfCookie } from '@/lib/csrf';

export const GET: APIRoute = async ({ cookies }) => {
  try {
    const session = await getSession(cookies);
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Ensure CSRF token exists and return it
    let csrfToken = getCsrfFromCookie(cookies);
    if (!csrfToken) {
      csrfToken = generateCsrfToken();
      setCsrfCookie(cookies, csrfToken);
    }

    return new Response(JSON.stringify({
      user: publicUser(session.user),
      csrfToken,
    }), {
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
