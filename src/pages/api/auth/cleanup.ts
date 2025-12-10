import type { APIRoute } from 'astro';
import { cleanupAll } from '@/lib/auth';

const CLEANUP_SECRET = process.env.CLEANUP_SECRET;

export const POST: APIRoute = async ({ request }) => {
  // Verify secret token for cron job authentication
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!CLEANUP_SECRET || token !== CLEANUP_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const result = await cleanupAll();

    console.log(`[Cleanup] Deleted ${result.sessionsDeleted} expired sessions, ${result.invitationsDeleted} expired invitations`);

    return new Response(JSON.stringify({
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    return new Response(JSON.stringify({ error: 'Cleanup failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
