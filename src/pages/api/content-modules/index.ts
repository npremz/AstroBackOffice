import type { APIRoute } from 'astro';
import { db } from '../../../db';
import { contentModules } from '../../../db/schema';
import { sql } from 'drizzle-orm';
import { createContentModuleSchema, validateBody, validationError, sanitizeEntryData } from '@/lib/validation';
import { parsePaginationParams, getOffset, paginatedResponse } from '@/lib/pagination';
import { requireAuth } from '@/lib/auth';
import { logAudit, createAuditContext } from '@/lib/audit';

export const GET: APIRoute = async ({ url }) => {
  try {
    const pagination = parsePaginationParams(url);
    const offset = getOffset(pagination);

    // Get total count
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(contentModules);
    const total = Number(count);

    // Get paginated data
    const data = await db.select().from(contentModules).limit(pagination.limit).offset(offset);

    return new Response(JSON.stringify(paginatedResponse(data, pagination, total)), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Fetch content modules error:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch content modules' }), {
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
    const validation = await validateBody(request, createContentModuleSchema);
    if (!validation.success) {
      return validationError(validation.error);
    }

    const { slug, name, schema, data } = validation.data;

    // Sanitize data based on schema
    const sanitizedData = data
      ? sanitizeEntryData(data as Record<string, unknown>, schema)
      : {};

    const [newModule] = await db.insert(contentModules).values({
      slug,
      name,
      schema,
      data: sanitizedData,
      updatedAt: new Date()
    }).returning();

    await logAudit(auditContext, {
      action: 'CREATE',
      resourceType: 'ContentModule',
      resourceId: newModule.id,
      resourceName: slug,
      changes: { after: { slug, name, schema, data: sanitizedData } },
    });

    return new Response(JSON.stringify(newModule), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Create content module error:', error);
    await logAudit(auditContext, {
      action: 'CREATE',
      resourceType: 'ContentModule',
      resourceName: 'unknown',
      status: 'FAILED',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });
    return new Response(JSON.stringify({ error: 'Failed to create content module' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
