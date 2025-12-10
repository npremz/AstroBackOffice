import type { MiddlewareHandler } from 'astro';
import { getSession } from '@/lib/auth';

const jsonHeaders = { 'Content-Type': 'application/json' };

export const onRequest: MiddlewareHandler = async ({ url, cookies, request }, next) => {
  const { pathname } = new URL(url);

  // Only guard API routes outside of auth namespace
  if (pathname.startsWith('/api') && !pathname.startsWith('/api/auth')) {
    // Allow preflight to continue for CORS
    if (request.method === 'OPTIONS') {
      return next();
    }

    const session = await getSession(cookies);
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: jsonHeaders
      });
    }
  }

  return next();
};
