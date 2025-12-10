import { z } from 'zod';

// Search and filter parameters schema
export const searchParamsSchema = z.object({
  // Full-text search query
  q: z.string().max(500).optional(),
  
  // Filtering
  collectionId: z.coerce.number().int().positive().optional(),
  template: z.string().max(50).optional(),
  
  // Date range filters
  publishedAfter: z.string().datetime().optional(),
  publishedBefore: z.string().datetime().optional(),
  
  // Sorting
  sortBy: z.enum(['publishedAt', 'slug', 'updatedAt']).default('publishedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  
  // Pagination
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type SearchParams = z.infer<typeof searchParamsSchema>;

export interface SearchResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters: {
    q?: string;
    collectionId?: number;
    template?: string;
    publishedAfter?: string;
    publishedBefore?: string;
    sortBy: string;
    sortOrder: string;
  };
}

/**
 * Parse search parameters from URL with validation
 */
export function parseSearchParams(url: URL): SearchParams {
  const rawParams: Record<string, string | undefined> = {};
  
  for (const key of ['q', 'collectionId', 'template', 'publishedAfter', 'publishedBefore', 'sortBy', 'sortOrder', 'page', 'limit']) {
    const value = url.searchParams.get(key);
    if (value !== null) {
      rawParams[key] = value;
    }
  }
  
  const result = searchParamsSchema.safeParse(rawParams);
  
  if (!result.success) {
    // Return defaults on validation failure
    return {
      sortBy: 'publishedAt',
      sortOrder: 'desc',
      page: 1,
      limit: 20,
    };
  }
  
  return result.data;
}

/**
 * Build search result response
 */
export function buildSearchResponse<T>(
  data: T[],
  params: SearchParams,
  total: number
): SearchResult<T> {
  const totalPages = Math.ceil(total / params.limit);
  
  return {
    data,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages,
      hasNext: params.page < totalPages,
      hasPrev: params.page > 1,
    },
    filters: {
      q: params.q,
      collectionId: params.collectionId,
      template: params.template,
      publishedAfter: params.publishedAfter,
      publishedBefore: params.publishedBefore,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
    },
  };
}

/**
 * Escape special characters in FTS5 search query to prevent injection
 */
export function escapeFtsQuery(query: string): string {
  // Remove characters that could break FTS5 query syntax
  return query
    .replace(/['"]/g, '') // Remove quotes
    .replace(/[*:^]/g, '') // Remove FTS operators
    .replace(/\s+/g, ' ')  // Normalize whitespace
    .trim()
    .split(' ')
    .filter(term => term.length > 0)
    .map(term => `"${term}"*`) // Prefix search with each term quoted
    .join(' ');
}

/**
 * Validate sort parameters to prevent injection
 */
export function validateSortColumn(column: string): column is 'publishedAt' | 'slug' | 'updatedAt' {
  return ['publishedAt', 'slug', 'updatedAt'].includes(column);
}

export function validateSortOrder(order: string): order is 'asc' | 'desc' {
  return ['asc', 'desc'].includes(order);
}
