import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { invitations, users } from '@/db/schema';
import { requireAuth, createInvitation, normalizeEmail, ensureRole } from '@/lib/auth';

const sanitizeInvitation = (invite: typeof invitations.$inferSelect) => {
  const { tokenHash, ...rest } = invite;
  return rest;
};

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM || 'no-reply@hordeagence.com';

async function sendInvitationEmail(email: string, token: string, requestUrl: string) {
  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  const link = new URL('/api/auth/invitations/accept', requestUrl);
  link.searchParams.set('token', token);

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: email,
      subject: 'Invitation à rejoindre le CMS',
      text: `Vous avez été invité à rejoindre le backoffice. Acceptez l'invitation ici : ${link.toString()}`,
      html: `
        <p>Bonjour,</p>
        <p>Vous avez été invité à rejoindre le backoffice.</p>
        <p><a href="${link.toString()}">Cliquez ici pour accepter l'invitation</a></p>
        <p>Ou copiez ce lien dans votre navigateur : <br />${link.toString()}</p>
      `,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend error: ${response.status} ${body}`);
  }
}

export const GET: APIRoute = async ({ cookies }) => {
  const auth = await requireAuth(cookies, ['super_admin']);
  if ('response' in auth) return auth.response;

  try {
    const active = await db.select().from(invitations);
    return new Response(JSON.stringify(active.map(sanitizeInvitation)), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('List invitations error:', error);
    return new Response(JSON.stringify({ error: 'Failed to load invitations' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const auth = await requireAuth(cookies, ['super_admin']);
  if ('response' in auth) return auth.response;

  try {
    const { email, role } = await request.json();
    if (!email || !role) {
      return new Response(JSON.stringify({ error: 'Email and role are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!ensureRole(role)) {
      return new Response(JSON.stringify({ error: 'Invalid role' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const normalizedEmail = normalizeEmail(email);

    const [existingUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, normalizedEmail));
    if (existingUser) {
      return new Response(JSON.stringify({ error: 'User already exists' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await db.update(invitations).set({ revoked: true }).where(eq(invitations.email, normalizedEmail));

    const { invitation, token } = await createInvitation(normalizedEmail, role, auth.user.id);

    await sendInvitationEmail(normalizedEmail, token, request.url);

    return new Response(JSON.stringify({ invitation: sanitizeInvitation(invitation), token }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Create invitation error:', error);
    return new Response(JSON.stringify({ error: 'Failed to create invitation' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
