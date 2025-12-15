import type { APIRoute } from 'astro';
import { db } from '../../../db';
import { entries, collections } from '../../../db/schema';
import { eq, sql, isNull, and } from 'drizzle-orm';
import { createEntrySchema, validateBody, validationError, sanitizeEntryData, sanitizeSeoMetadata } from '@/lib/validation';
import { parsePaginationParams, getOffset, paginatedResponse } from '@/lib/pagination';
import { requireAuth } from '@/lib/auth';
import { logAudit, createAuditContext } from '@/lib/audit';

// GET all entries or entries by collection (with pagination)
// Excludes soft-deleted entries by default
export const GET: APIRoute = async ({ url }) => {
  try {
    const collectionId = url.searchParams.get('collectionId');
    const includeDeleted = url.searchParams.get('includeDeleted') === 'true';
    const pagination = parsePaginationParams(url);
    const offset = getOffset(pagination);

    // Build where conditions
    const conditions = [];
    
    // Exclude soft-deleted entries unless explicitly requested
    if (!includeDeleted) {
      conditions.push(isNull(entries.deletedAt));
    }
    
    if (collectionId) {
      const parsed = parseInt(collectionId);
      if (isNaN(parsed) || parsed < 1) {
        return validationError('Invalid collectionId');
      }
      conditions.push(eq(entries.collectionId, parsed));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const countQuery = db.select({ count: sql<number>`count(*)` }).from(entries);
    if (whereClause) {
      countQuery.where(whereClause);
    }
    const [{ count }] = await countQuery;
    const total = Number(count);

    // Get paginated data
    const query = db.select().from(entries);
    if (whereClause) {
      query.where(whereClause);
    }
    const data = await query.limit(pagination.limit).offset(offset);

    return new Response(JSON.stringify(paginatedResponse(data, pagination, total)), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Fetch entries error:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch entries' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// POST new entry
export const POST: APIRoute = async ({ request, cookies }) => {
  const auth = await requireAuth(cookies);
  if ('response' in auth) return auth.response;

  const auditContext = createAuditContext(auth.user, request);

  try {
    // Validate input
    const validation = await validateBody(request, createEntrySchema);
    if (!validation.success) {
      return validationError(validation.error);
    }

    const { collectionId, slug, data, template, seo, scheduledAt } = validation.data;

    // Get collection schema to sanitize data
    const [collection] = await db.select().from(collections).where(eq(collections.id, collectionId));
    if (!collection) {
      return validationError('Collection not found');
    }

    // Sanitize entry data based on schema
    const sanitizedData = sanitizeEntryData(data as Record<string, unknown>, collection.schema);
    const sanitizedSeo = sanitizeSeoMetadata(seo);

    // Parse scheduled date if provided
    const scheduledDate = scheduledAt ? new Date(scheduledAt) : null;

    const [newEntry] = await db.insert(entries).values({
      collectionId,
      slug,
      data: sanitizedData,
      template,
      seo: sanitizedSeo,
      publishedAt: new Date(),
      scheduledAt: scheduledDate
    }).returning();

    await logAudit(auditContext, {
      action: 'CREATE',
      resourceType: 'Entry',
      resourceId: newEntry.id,
      resourceName: slug,
      changes: { after: { slug, template, data: sanitizedData, seo: sanitizedSeo, scheduledAt: scheduledDate, collectionId } },
    });

    return new Response(JSON.stringify(newEntry), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Create entry error:', error);
    await logAudit(auditContext, {
      action: 'CREATE',
      resourceType: 'Entry',
      resourceName: 'unknown',
      status: 'FAILED',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });
    return new Response(JSON.stringify({ error: 'Failed to create entry' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
