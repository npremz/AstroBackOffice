import type { MiddlewareHandler } from 'astro';
import { getSession } from '@/lib/auth';
import { validateCsrf, csrfError, requiresCsrfValidation, generateCsrfToken, setCsrfCookie, getCsrfFromCookie } from '@/lib/csrf';
import {
  applySecurityHeaders,
  getApiSecurityConfig,
  getRelaxedSecurityConfig,
  shouldRelaxSecurityHeaders,
  DEFAULT_CONFIG,
} from '@/lib/security-headers';

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

    // Allow GET /api/preview without auth (previewId is already a temporary token)
    // POST still requires auth to prevent abuse
    const isPreviewGet = pathname === '/api/preview' && request.method === 'GET';

    if (!isPreviewGet) {
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

  // Get the response from the next handler
  const response = await next();

  // Determine which security config to use based on the path
  let securityConfig = DEFAULT_CONFIG;

  if (pathname.startsWith('/api')) {
    // API routes get stricter CSP (no scripts/styles needed)
    securityConfig = getApiSecurityConfig();
  } else if (shouldRelaxSecurityHeaders(pathname)) {
    // Public assets get relaxed headers
    securityConfig = getRelaxedSecurityConfig();
  }

  // Apply security headers to the response
  return applySecurityHeaders(response, securityConfig);
};
