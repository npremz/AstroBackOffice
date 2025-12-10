import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users } from '@/db/schema';
import { verifyPassword, normalizeEmail, createSession, setSessionCookie, publicUser } from '@/lib/auth';
import { loginSchema, validateBody, validationError } from '@/lib/validation';
import { checkRateLimit, getClientId, rateLimitResponse, loginRateLimit } from '@/lib/rate-limit';
import { logAudit, createAuditContext } from '@/lib/audit';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Rate limiting
    const clientId = getClientId(request);
    const rateCheck = checkRateLimit(`login:${clientId}`, loginRateLimit);
    if (!rateCheck.allowed) {
      return rateLimitResponse(rateCheck.resetAt);
    }

    // Validate input
    const validation = await validateBody(request, loginSchema);
    if (!validation.success) {
      return validationError(validation.error);
    }

    const { email, password } = validation.data;
    const normalizedEmail = normalizeEmail(email);
    const [user] = await db.select().from(users).where(eq(users.email, normalizedEmail));

    if (!user || !user.isActive || !verifyPassword(password, user.passwordHash)) {
      // Log failed login attempt
      await logAudit(createAuditContext(null, request), {
        action: 'LOGIN',
        resourceType: 'Session',
        resourceName: normalizedEmail,
        status: 'FAILED',
        errorMessage: !user ? 'User not found' : !user.isActive ? 'User inactive' : 'Invalid password',
      });
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userAgent = request.headers.get('user-agent');
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip');
    const { token, expiresAt } = await createSession(user.id, userAgent, ip);
    setSessionCookie(cookies, token, expiresAt);

    await db.update(users).set({ lastLoginAt: new Date(), updatedAt: new Date() }).where(eq(users.id, user.id));

    // Log successful login
    await logAudit(createAuditContext(user, request), {
      action: 'LOGIN',
      resourceType: 'Session',
      resourceId: user.id,
      resourceName: user.email,
    });

    return new Response(JSON.stringify(publicUser(user)), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Login error:', error);
    return new Response(JSON.stringify({ error: 'Failed to login' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
