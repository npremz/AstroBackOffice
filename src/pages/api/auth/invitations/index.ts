import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { invitations, users } from '@/db/schema';
import { requireAuth, createInvitation, normalizeEmail, ensureRole } from '@/lib/auth';
import { logAudit, createAuditContext } from '@/lib/audit';

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

  const link = new URL('/accept-invitation', requestUrl);
  link.searchParams.set('token', token);

  const linkStr = link.toString();
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
      text: `Vous avez été invité à rejoindre le backoffice.\n\nAcceptez l'invitation ici : ${linkStr}\n\nCe lien expire dans 7 jours.`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">📧 Invitation CMS BackOffice</h1>
            </div>
            <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 16px 0;">Bonjour,</p>
              <p style="margin: 0 0 16px 0;">Vous avez été invité à rejoindre le backoffice. Cliquez sur le bouton ci-dessous pour créer votre compte.</p>
              <p style="text-align: center; margin: 24px 0;">
                <a href="${linkStr}" style="display: inline-block; background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600;">Accepter l'invitation</a>
              </p>
              <p style="margin: 16px 0 8px 0; font-size: 14px; color: #6b7280;">Ou copiez ce lien dans votre navigateur :</p>
              <p style="word-break: break-all; background: #e5e7eb; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 12px; margin: 0;">
                <a href="${linkStr}" style="color: #667eea; text-decoration: underline;">${linkStr}</a>
              </p>
              <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
                <p style="margin: 0;">⏰ Ce lien expire dans <strong>7 jours</strong>.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
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

  const auditContext = createAuditContext(auth.user, request);

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

    await logAudit(auditContext, {
      action: 'INVITE',
      resourceType: 'Invitation',
      resourceId: invitation.id,
      resourceName: normalizedEmail,
      changes: { after: { email: normalizedEmail, role } },
    });

    return new Response(JSON.stringify({ invitation: sanitizeInvitation(invitation), token }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Create invitation error:', error);
    await logAudit(auditContext, {
      action: 'INVITE',
      resourceType: 'Invitation',
      status: 'FAILED',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });
    return new Response(JSON.stringify({ error: 'Failed to create invitation' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
