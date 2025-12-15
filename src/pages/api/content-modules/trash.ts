import type { APIRoute } from 'astro';
import { db } from '../../../db';
import { contentModules } from '../../../db/schema';
import { sql, isNotNull } from 'drizzle-orm';
import { parsePaginationParams, getOffset, paginatedResponse } from '@/lib/pagination';
import { requireAuth } from '@/lib/auth';

export const GET: APIRoute = async ({ url, cookies }) => {
  // Require authentication
  const auth = await requireAuth(cookies);
  if ('response' in auth) return auth.response;

  try {
    const pagination = parsePaginationParams(url);
    const offset = getOffset(pagination);

    // Get total count of soft-deleted content modules
    const [{ count }] = await db.select({ count: sql<number>`count(*)` })
      .from(contentModules)
      .where(isNotNull(contentModules.deletedAt));
    const total = Number(count);

    // Get paginated soft-deleted content modules
    const data = await db.select()
      .from(contentModules)
      .where(isNotNull(contentModules.deletedAt))
      .limit(pagination.limit)
      .offset(offset);

    return new Response(JSON.stringify(paginatedResponse(data, pagination, total)), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Fetch trashed content modules error:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch trashed content modules' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
