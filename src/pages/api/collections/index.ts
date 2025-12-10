import type { APIRoute } from 'astro';
import { db } from '../../../db';
import { collections } from '../../../db/schema';
import { sql } from 'drizzle-orm';
import { createCollectionSchema, validateBody, validationError } from '@/lib/validation';
import { parsePaginationParams, getOffset, paginatedResponse } from '@/lib/pagination';
import { requireAuth } from '@/lib/auth';
import { logAudit, createAuditContext } from '@/lib/audit';

export const GET: APIRoute = async ({ url }) => {
  try {
    const pagination = parsePaginationParams(url);
    const offset = getOffset(pagination);

    // Get total count
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(collections);
    const total = Number(count);

    // Get paginated data
    const data = await db.select().from(collections).limit(pagination.limit).offset(offset);

    return new Response(JSON.stringify(paginatedResponse(data, pagination, total)), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Fetch collections error:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch collections' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const auth = await requireAuth(cookies);
  if ('response' in auth) return auth.response;

  const auditContext = createAuditContext(auth.user, request);

  try {
    // Validate input
    const validation = await validateBody(request, createCollectionSchema);
    if (!validation.success) {
      return validationError(validation.error);
    }

    const { slug, schema } = validation.data;

    const [newCollection] = await db.insert(collections).values({
      slug,
      schema
    }).returning();

    await logAudit(auditContext, {
      action: 'CREATE',
      resourceType: 'Collection',
      resourceId: newCollection.id,
      resourceName: slug,
      changes: { after: { slug, schema } },
    });

    return new Response(JSON.stringify(newCollection), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Create collection error:', error);
    await logAudit(auditContext, {
      action: 'CREATE',
      resourceType: 'Collection',
      resourceName: 'unknown',
      status: 'FAILED',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });
    return new Response(JSON.stringify({ error: 'Failed to create collection' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
