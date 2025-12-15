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

  // CSRF validation for auth mutations (except login and accept invitation which don't have a token yet)
  const csrfExemptAuthRoutes = ['/api/auth/login', '/api/auth/invitations/accept'];
  if (pathname.startsWith('/api/auth') && !csrfExemptAuthRoutes.includes(pathname)) {
    if (requiresCsrfValidation(request.method)) {
      if (!validateCsrf(cookies, request)) {
        return csrfError();
      }
    }
  }

  return next();
};
