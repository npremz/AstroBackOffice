import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users } from '@/db/schema';
import { consumeInvitation, normalizeEmail, hashPassword, markInvitationAccepted, createSession, setSessionCookie, publicUser } from '@/lib/auth';
import { acceptInvitationSchema } from '@/lib/validation';

const jsonHeaders = { 'Content-Type': 'application/json' };

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json();

    // Validate input with strong password policy
    const parseResult = acceptInvitationSchema.safeParse(body);
    if (!parseResult.success) {
      const errors = parseResult.error.errors.map(e => e.message);
      return new Response(JSON.stringify({ error: 'Validation failed', details: errors }), {
        status: 400,
        headers: jsonHeaders
      });
    }

    const { token, email, password, name } = parseResult.data;

    const invitation = await consumeInvitation(token);
    if (!invitation) {
      return new Response(JSON.stringify({ error: 'Invalid or expired invitation' }), {
        status: 400,
        headers: jsonHeaders
      });
    }

    const normalizedEmail = normalizeEmail(email);
    if (normalizeEmail(invitation.email) !== normalizedEmail) {
      return new Response(JSON.stringify({ error: 'Email does not match invitation' }), {
        status: 400,
        headers: jsonHeaders
      });
    }

    const [existingUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, normalizedEmail));
    if (existingUser) {
      return new Response(JSON.stringify({ error: 'User already exists' }), {
        status: 409,
        headers: jsonHeaders
      });
    }

    const now = new Date();
    const [user] = await db.insert(users).values({
      email: normalizedEmail,
      passwordHash: hashPassword(password),
      name: name?.trim() || null,
      role: invitation.role,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
    }).returning();

    await markInvitationAccepted(invitation.id);

    const userAgent = request.headers.get('user-agent');
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip');
    const { token: sessionToken, expiresAt } = await createSession(user.id, userAgent, ip);
    setSessionCookie(cookies, sessionToken, expiresAt);

    return new Response(JSON.stringify(publicUser(user)), {
      status: 201,
      headers: jsonHeaders
    });
  } catch (error) {
    console.error('Accept invitation error:', error);
    return new Response(JSON.stringify({ error: 'Failed to accept invitation' }), {
      status: 500,
      headers: jsonHeaders
    });
  }
};
