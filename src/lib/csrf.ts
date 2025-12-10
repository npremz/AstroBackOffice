import { randomBytes, createHmac } from 'crypto';
import type { AstroCookies } from 'astro';

const CSRF_COOKIE = 'cms_csrf';
const CSRF_HEADER = 'x-csrf-token';
const CSRF_TTL_MS = 1000 * 60 * 60 * 24; // 24h

function getCsrfSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET is not set');
  }
  return secret;
}

// Generate a new CSRF token
export function generateCsrfToken(): string {
  return randomBytes(32).toString('hex');
}

// Hash the token for comparison (prevents timing attacks)
function hashToken(token: string): string {
  return createHmac('sha256', getCsrfSecret()).update(token).digest('hex');
}

// Set CSRF token cookie
export function setCsrfCookie(cookies: AstroCookies, token: string): void {
  cookies.set(CSRF_COOKIE, token, {
    path: '/',
    httpOnly: false, // Must be readable by JavaScript
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: CSRF_TTL_MS / 1000,
  });
}

// Get CSRF token from cookie
export function getCsrfFromCookie(cookies: AstroCookies): string | null {
  return cookies.get(CSRF_COOKIE)?.value || null;
}

// Get CSRF token from request header
export function getCsrfFromHeader(request: Request): string | null {
  return request.headers.get(CSRF_HEADER);
}

// Validate CSRF token
export function validateCsrf(cookies: AstroCookies, request: Request): boolean {
  const cookieToken = getCsrfFromCookie(cookies);
  const headerToken = getCsrfFromHeader(request);

  if (!cookieToken || !headerToken) {
    return false;
  }

  // Use hash comparison to prevent timing attacks
  const cookieHash = hashToken(cookieToken);
  const headerHash = hashToken(headerToken);

  return cookieHash === headerHash;
}

// CSRF validation middleware helper
export function csrfError(): Response {
  return new Response(JSON.stringify({ error: 'Invalid CSRF token' }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Check if request method requires CSRF validation
export function requiresCsrfValidation(method: string): boolean {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
}
