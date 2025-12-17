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
import {
  isPreflightRequest,
  createPreflightResponse,
  applyCorsHeaders,
  isOriginAllowed,
} from '@/lib/cors';

const jsonHeaders = { 'Content-Type': 'application/json' };

export const onRequest: MiddlewareHandler = async ({ url, cookies, request }, next) => {
  const { pathname } = new URL(url);

  // Handle CORS preflight requests for API routes
  if (pathname.startsWith('/api') && isPreflightRequest(request)) {
    const origin = request.headers.get('Origin');
    if (origin && isOriginAllowed(origin)) {
      return createPreflightResponse(request);
    }
    // Reject preflight from disallowed origins
    return new Response(null, { status: 403 });
  }

  // Ensure CSRF token exists for all requests
  if (!getCsrfFromCookie(cookies)) {
    const token = generateCsrfToken();
    setCsrfCookie(cookies, token);
  }

  // Only guard API routes outside of auth namespace
  if (pathname.startsWith('/api') && !pathname.startsWith('/api/auth')) {
    // Handle non-preflight OPTIONS requests
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

  // Get the response from the next handler with error handling
  let response: Response;
  try {
    response = await next();
  } catch (error) {
    // Log error server-side only
    console.error('[Middleware] Unhandled error:', error);

    // Return appropriate error response
    if (pathname.startsWith('/api')) {
      response = new Response(
        JSON.stringify({ error: 'Internal Server Error' }),
        { status: 500, headers: jsonHeaders }
      );
    } else if (pathname === '/500') {
      // Avoid redirect loop - return inline error page
      response = new Response(
        '<!DOCTYPE html><html><head><title>500 - Server Error</title></head><body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f9fafb"><div style="text-align:center"><h1 style="font-size:6rem;color:#e5e7eb;margin:0">500</h1><p style="font-size:1.5rem;color:#111827">Server Error</p><a href="/" style="color:#2563eb">Go Home</a></div></body></html>',
        { status: 500, headers: { 'Content-Type': 'text/html' } }
      );
    } else {
      // Redirect to 500 page for non-API routes
      response = new Response(null, {
        status: 302,
        headers: { Location: '/500' },
      });
    }
  }

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
  let finalResponse = applySecurityHeaders(response, securityConfig);

  // Apply CORS headers to API responses
  if (pathname.startsWith('/api')) {
    finalResponse = applyCorsHeaders(finalResponse, request);
  }

  return finalResponse;
};
