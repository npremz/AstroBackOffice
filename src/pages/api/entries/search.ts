import type { APIRoute } from 'astro';
import { db } from '../../../db';
import { entries, collections } from '../../../db/schema';
import { eq, and, gte, lte, sql, like, or, desc, asc, isNull } from 'drizzle-orm';
import { parseSearchParams, buildSearchResponse, escapeFtsQuery, type SearchParams } from '@/lib/search';

/**
 * Search entries with full-text search and advanced filtering
 * 
 * Query Parameters:
 * - q: Full-text search query (searches in slug and JSON data)
 * - collectionId: Filter by collection ID
 * - template: Filter by template name
 * - publishedAfter: ISO datetime string for minimum publish date
 * - publishedBefore: ISO datetime string for maximum publish date
 * - sortBy: Field to sort by (publishedAt, slug, updatedAt)
 * - sortOrder: Sort direction (asc, desc)
 * - page: Page number (default: 1)
 * - limit: Results per page (default: 20, max: 100)
 */
export const GET: APIRoute = async ({ url }) => {
  try {
    const params = parseSearchParams(url);
    
    // Build WHERE conditions
    const conditions = buildWhereConditions(params);
    
    // Get total count for pagination
    const countQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(entries);
    
    if (conditions.length > 0) {
      countQuery.where(and(...conditions));
    }
    
    const [{ count }] = await countQuery;
    const total = Number(count);
    
    // Build main query with sorting
    const query = db
      .select({
        id: entries.id,
        collectionId: entries.collectionId,
        slug: entries.slug,
        data: entries.data,
        template: entries.template,
        publishedAt: entries.publishedAt,
        scheduledAt: entries.scheduledAt,
        sortOrder: entries.sortOrder,
      })
      .from(entries);
    
    if (conditions.length > 0) {
      query.where(and(...conditions));
    }
    
    // Apply sorting
    const sortColumn = getSortColumn(params.sortBy);
    if (params.sortOrder === 'desc') {
      query.orderBy(desc(sortColumn));
    } else {
      query.orderBy(asc(sortColumn));
    }
    
    // Apply pagination
    const offset = (params.page - 1) * params.limit;
    query.limit(params.limit).offset(offset);
    
    const data = await query;
    
    return new Response(JSON.stringify(buildSearchResponse(data, params, total)), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Search entries error:', error);
    return new Response(JSON.stringify({ error: 'Search failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

/**
 * Build WHERE conditions based on search parameters
 */
function buildWhereConditions(params: SearchParams) {
  const conditions = [];
  
  // Always exclude soft-deleted entries
  conditions.push(isNull(entries.deletedAt));
  
  // Collection filter
  if (params.collectionId) {
    conditions.push(eq(entries.collectionId, params.collectionId));
  }
  
  // Template filter
  if (params.template) {
    conditions.push(eq(entries.template, params.template));
  }
  
  // Date range filters
  if (params.publishedAfter) {
    const afterDate = new Date(params.publishedAfter);
    conditions.push(gte(entries.publishedAt, afterDate));
  }
  
  if (params.publishedBefore) {
    const beforeDate = new Date(params.publishedBefore);
    conditions.push(lte(entries.publishedAt, beforeDate));
  }
  
  // Full-text search (searches in slug and serialized JSON data)
  if (params.q && params.q.trim().length > 0) {
    const searchTerm = `%${params.q.toLowerCase().trim()}%`;
    conditions.push(
      or(
        like(sql`lower(${entries.slug})`, searchTerm),
        like(sql`lower(${entries.data})`, searchTerm)
      )
    );
  }
  
  return conditions;
}

/**
 * Get the column reference for sorting
 */
function getSortColumn(sortBy: string) {
  switch (sortBy) {
    case 'slug':
      return entries.slug;
    case 'publishedAt':
    default:
      return entries.publishedAt;
  }
}
