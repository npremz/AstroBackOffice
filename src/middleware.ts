import type { MiddlewareHandler } from 'astro';
import { getSession } from '@/lib/auth';
import { validateCsrf, csrfError, requiresCsrfValidation, generateCsrfToken, setCsrfCookie, getCsrfFromCookie } from '@/lib/csrf';

const jsonHeaders = { 'Content-Type': 'application/json' };

export const onRequest: MiddlewareHandler = async ({ url, cookies, request }, next) => {
  const { pathname } = new URL(url);

  // Ensure CSRF token exists for all requests
  if (!getCsrfFromCookie(cookies)) {
    const token = generateCsrfToken();
    setCsrfCookie(cookies, token);
  }

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

    // CSRF validation for state-changing methods
    if (requiresCsrfValidation(request.method)) {
      if (!validateCsrf(cookies, request)) {
        return csrfError();
      }
    }
  }

  // CSRF validation for auth mutations (except login which doesn't have a token yet)
  if (pathname.startsWith('/api/auth') && !pathname.endsWith('/login')) {
    if (requiresCsrfValidation(request.method)) {
      if (!validateCsrf(cookies, request)) {
        return csrfError();
      }
    }
  }

  return next();
};
