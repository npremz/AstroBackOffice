import type { APIRoute } from 'astro';
import { db } from '@/db';
import { entries } from '@/db/schema';
import { isNotNull, sql, desc } from 'drizzle-orm';
import { parsePaginationParams, getOffset, paginatedResponse } from '@/lib/pagination';
import { requireAuth } from '@/lib/auth';

// GET all soft-deleted entries (trash)
export const GET: APIRoute = async ({ url, cookies }) => {
  const auth = await requireAuth(cookies);
  if ('response' in auth) return auth.response;

  try {
    const pagination = parsePaginationParams(url);
    const offset = getOffset(pagination);

    // Get total count of deleted entries
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(entries)
      .where(isNotNull(entries.deletedAt));
    const total = Number(count);

    // Get paginated deleted entries
    const data = await db
      .select()
      .from(entries)
      .where(isNotNull(entries.deletedAt))
      .orderBy(desc(entries.deletedAt))
      .limit(pagination.limit)
      .offset(offset);

    return new Response(JSON.stringify(paginatedResponse(data, pagination, total)), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Fetch trash error:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch trash' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
