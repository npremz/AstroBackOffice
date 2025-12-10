import { sql } from 'drizzle-orm';
import type { SQLiteSelect } from 'drizzle-orm/sqlite-core';

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

// Parse pagination params from URL
export function parsePaginationParams(url: URL, defaults = { page: 1, limit: 20 }): PaginationParams {
  const pageParam = url.searchParams.get('page');
  const limitParam = url.searchParams.get('limit');

  let page = pageParam ? parseInt(pageParam, 10) : defaults.page;
  let limit = limitParam ? parseInt(limitParam, 10) : defaults.limit;

  // Validate and constrain
  if (isNaN(page) || page < 1) page = 1;
  if (isNaN(limit) || limit < 1) limit = defaults.limit;
  if (limit > 100) limit = 100; // Max 100 items per page

  return { page, limit };
}

// Calculate offset from pagination params
export function getOffset(params: PaginationParams): number {
  return (params.page - 1) * params.limit;
}

// Build pagination metadata
export function buildPaginationMeta(params: PaginationParams, total: number): PaginationMeta {
  const totalPages = Math.ceil(total / params.limit);
  return {
    page: params.page,
    limit: params.limit,
    total,
    totalPages,
    hasNext: params.page < totalPages,
    hasPrev: params.page > 1,
  };
}

// Helper to create paginated response
export function paginatedResponse<T>(
  data: T[],
  params: PaginationParams,
  total: number
): PaginatedResponse<T> {
  return {
    data,
    pagination: buildPaginationMeta(params, total),
  };
}

// Helper to get count from a table with optional where clause
export async function getTableCount(
  db: any,
  table: any,
  whereClause?: any
): Promise<number> {
  const query = db.select({ count: sql<number>`count(*)` }).from(table);
  if (whereClause) {
    query.where(whereClause);
  }
  const [result] = await query;
  return Number(result.count);
}
