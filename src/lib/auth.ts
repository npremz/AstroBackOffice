import type { AstroCookies } from 'astro';
import { randomBytes, scryptSync, timingSafeEqual, createHmac } from 'crypto';
import { and, eq, gt, lt, ne } from 'drizzle-orm';
import { db } from '@/db';
import { users, sessions, invitations } from '@/db/schema';

const SESSION_COOKIE = 'cms_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24; // 24h
const ALLOWED_ROLES = ['super_admin', 'editor', 'viewer'] as const;
type Role = typeof ALLOWED_ROLES[number];

const parsedInviteDays = parseInt(process.env.INVITE_EXPIRATION_DAYS || '7', 10);
const inviteDays = Number.isFinite(parsedInviteDays) && parsedInviteDays > 0 ? parsedInviteDays : 7;

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET is not set');
  }
  return secret;
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `scrypt:${salt.toString('hex')}:${hash.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string) {
  const [method, saltHex, hashHex] = stored.split(':');
  if (method !== 'scrypt' || !saltHex || !hashHex) return false;

  const salt = Buffer.from(saltHex, 'hex');
  const storedHash = Buffer.from(hashHex, 'hex');
  const derived = scryptSync(password, salt, storedHash.length);

  return timingSafeEqual(storedHash, derived);
}

function hashToken(token: string) {
  return createHmac('sha256', getSessionSecret()).update(token).digest('hex');
}

export async function createSession(userId: number, userAgent?: string | null, ip?: string | null) {
  const token = randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.insert(sessions).values({
    userId,
    tokenHash,
    expiresAt,
    createdAt: new Date(),
    userAgent: userAgent || undefined,
    ip: ip || undefined,
  });

  return { token, expiresAt };
}

export async function destroySession(token: string) {
  await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
}

export async function destroyAllUserSessions(
  userId: number,
  exceptCurrentToken?: string
): Promise<number> {
  if (exceptCurrentToken) {
    const currentHash = hashToken(exceptCurrentToken);
    const result = await db
      .delete(sessions)
      .where(and(
        eq(sessions.userId, userId),
        ne(sessions.tokenHash, currentHash)
      ))
      .returning({ id: sessions.id });
    return result.length;
  }

  const result = await db
    .delete(sessions)
    .where(eq(sessions.userId, userId))
    .returning({ id: sessions.id });
  return result.length;
}

export async function getSession(cookies: AstroCookies) {
  const raw = cookies.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  const tokenHash = hashToken(raw);
  const [result] = await db
    .select({
      session: sessions,
      user: users,
    })
    .from(sessions)
    .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, new Date())))
    .leftJoin(users, eq(users.id, sessions.userId));

  if (!result?.user || !result.session || !result.user.isActive) {
    return null;
  }

  // Trigger probabilistic cleanup (non-blocking)
  maybeCleanup().catch(() => {});

  return {
    token: raw,
    user: result.user,
    session: result.session,
  };
}

export function setSessionCookie(cookies: AstroCookies, token: string, expiresAt: Date) {
  cookies.set(SESSION_COOKIE, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
  });
}

export function clearSessionCookie(cookies: AstroCookies) {
  cookies.delete(SESSION_COOKIE, { path: '/' });
}

export function ensureRole(role: string): role is Role {
  return (ALLOWED_ROLES as readonly string[]).includes(role);
}

export async function requireAuth(cookies: AstroCookies, roles?: Role[]) {
  const session = await getSession(cookies);
  if (!session) {
    return { response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } }) };
  }

  if (roles && !roles.includes(session.user.role as Role)) {
    return { response: new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } }) };
  }

  return { user: session.user, token: session.token };
}

export async function createInvitation(email: string, role: Role, invitedBy?: number) {
  const normalized = normalizeEmail(email);
  const token = randomBytes(24).toString('hex');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + inviteDays * 24 * 60 * 60 * 1000);

  const [invite] = await db.insert(invitations).values({
    email: normalized,
    role,
    tokenHash,
    expiresAt,
    invitedBy,
    createdAt: new Date(),
    revoked: false,
  }).returning();

  return { invitation: invite, token };
}

export async function consumeInvitation(token: string) {
  const tokenHash = hashToken(token);
  const [invite] = await db.select().from(invitations).where(and(
    eq(invitations.tokenHash, tokenHash),
    eq(invitations.revoked, false),
    gt(invitations.expiresAt, new Date())
  ));

  if (!invite || invite.acceptedAt) {
    return null;
  }

  return invite;
}

export async function markInvitationAccepted(inviteId: number) {
  await db.update(invitations).set({ acceptedAt: new Date() }).where(eq(invitations.id, inviteId));
}

export function publicUser(user: typeof users.$inferSelect) {
  const { passwordHash, ...rest } = user;
  return rest;
}

export { ALLOWED_ROLES };
export const SESSION_COOKIE_NAME = SESSION_COOKIE;

// Cleanup functions
export async function cleanupExpiredSessions() {
  const result = await db.delete(sessions).where(lt(sessions.expiresAt, new Date())).returning({ id: sessions.id });
  return result.length;
}

export async function cleanupExpiredInvitations() {
  // Delete invitations that are expired AND (not accepted OR revoked)
  const result = await db.delete(invitations).where(
    and(
      lt(invitations.expiresAt, new Date()),
      eq(invitations.acceptedAt, null)
    )
  ).returning({ id: invitations.id });
  return result.length;
}

export async function cleanupAll() {
  const [sessionsDeleted, invitationsDeleted] = await Promise.all([
    cleanupExpiredSessions(),
    cleanupExpiredInvitations(),
  ]);
  return { sessionsDeleted, invitationsDeleted };
}

// Probabilistic cleanup - runs cleanup ~1% of the time
let lastCleanup = 0;
const CLEANUP_INTERVAL_MS = 1000 * 60 * 60; // Max once per hour

export async function maybeCleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  if (Math.random() > 0.01) return; // 1% chance

  lastCleanup = now;
  try {
    await cleanupAll();
  } catch (err) {
    console.error('Cleanup error:', err);
  }
}
