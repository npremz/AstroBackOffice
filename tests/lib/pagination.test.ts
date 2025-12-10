import { describe, it, expect } from 'vitest';
import {
  parsePaginationParams,
  getOffset,
  buildPaginationMeta,
  paginatedResponse,
} from '@/lib/pagination';

describe('pagination', () => {
  describe('parsePaginationParams', () => {
    it('should parse valid page and limit', () => {
      const url = new URL('http://example.com?page=2&limit=50');
      const result = parsePaginationParams(url);

      expect(result.page).toBe(2);
      expect(result.limit).toBe(50);
    });

    it('should use defaults when no params', () => {
      const url = new URL('http://example.com');
      const result = parsePaginationParams(url);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should use custom defaults', () => {
      const url = new URL('http://example.com');
      const result = parsePaginationParams(url, { page: 1, limit: 10 });

      expect(result.limit).toBe(10);
    });

    it('should enforce page >= 1', () => {
      expect(parsePaginationParams(new URL('http://example.com?page=0')).page).toBe(1);
      expect(parsePaginationParams(new URL('http://example.com?page=-5')).page).toBe(1);
      expect(parsePaginationParams(new URL('http://example.com?page=-999999')).page).toBe(1);
    });

    it('should enforce limit >= 1', () => {
      expect(parsePaginationParams(new URL('http://example.com?limit=0')).limit).toBe(20);
      expect(parsePaginationParams(new URL('http://example.com?limit=-10')).limit).toBe(20);
    });

    it('should cap limit at 100', () => {
      expect(parsePaginationParams(new URL('http://example.com?limit=100')).limit).toBe(100);
      expect(parsePaginationParams(new URL('http://example.com?limit=101')).limit).toBe(100);
      expect(parsePaginationParams(new URL('http://example.com?limit=500')).limit).toBe(100);
      expect(parsePaginationParams(new URL('http://example.com?limit=999999')).limit).toBe(100);
    });

    it('should handle invalid string values', () => {
      expect(parsePaginationParams(new URL('http://example.com?page=abc')).page).toBe(1);
      expect(parsePaginationParams(new URL('http://example.com?limit=xyz')).limit).toBe(20);
      expect(parsePaginationParams(new URL('http://example.com?page=1.5')).page).toBe(1);
      expect(parsePaginationParams(new URL('http://example.com?limit=2.5')).limit).toBe(2);
    });

    it('should handle edge case floats', () => {
      expect(parsePaginationParams(new URL('http://example.com?page=1.9')).page).toBe(1);
      expect(parsePaginationParams(new URL('http://example.com?limit=50.1')).limit).toBe(50);
    });

    it('should handle injection attempts', () => {
      expect(parsePaginationParams(new URL('http://example.com?page=1;DROP')).page).toBe(1);
      expect(parsePaginationParams(new URL('http://example.com?limit=10%00')).limit).toBe(10);
    });

    it('should handle very large numbers', () => {
      expect(parsePaginationParams(new URL('http://example.com?page=99999999')).page).toBe(99999999);
      // Limit is capped at 100
      expect(parsePaginationParams(new URL('http://example.com?limit=99999999')).limit).toBe(100);
    });
  });

  describe('getOffset', () => {
    it('should calculate offset correctly', () => {
      expect(getOffset({ page: 1, limit: 20 })).toBe(0);
      expect(getOffset({ page: 2, limit: 20 })).toBe(20);
      expect(getOffset({ page: 3, limit: 10 })).toBe(20);
      expect(getOffset({ page: 5, limit: 50 })).toBe(200);
    });

    it('should handle edge cases', () => {
      expect(getOffset({ page: 1, limit: 1 })).toBe(0);
      expect(getOffset({ page: 100, limit: 100 })).toBe(9900);
    });
  });

  describe('buildPaginationMeta', () => {
    it('should build correct meta for first page', () => {
      const meta = buildPaginationMeta({ page: 1, limit: 10 }, 25);

      expect(meta.page).toBe(1);
      expect(meta.limit).toBe(10);
      expect(meta.total).toBe(25);
      expect(meta.totalPages).toBe(3);
      expect(meta.hasNext).toBe(true);
      expect(meta.hasPrev).toBe(false);
    });

    it('should build correct meta for middle page', () => {
      const meta = buildPaginationMeta({ page: 2, limit: 10 }, 25);

      expect(meta.hasNext).toBe(true);
      expect(meta.hasPrev).toBe(true);
    });

    it('should build correct meta for last page', () => {
      const meta = buildPaginationMeta({ page: 3, limit: 10 }, 25);

      expect(meta.hasNext).toBe(false);
      expect(meta.hasPrev).toBe(true);
    });

    it('should handle empty results', () => {
      const meta = buildPaginationMeta({ page: 1, limit: 10 }, 0);

      expect(meta.total).toBe(0);
      expect(meta.totalPages).toBe(0);
      expect(meta.hasNext).toBe(false);
      expect(meta.hasPrev).toBe(false);
    });

    it('should handle single page', () => {
      const meta = buildPaginationMeta({ page: 1, limit: 10 }, 5);

      expect(meta.totalPages).toBe(1);
      expect(meta.hasNext).toBe(false);
      expect(meta.hasPrev).toBe(false);
    });

    it('should handle exact page boundary', () => {
      const meta = buildPaginationMeta({ page: 1, limit: 10 }, 10);

      expect(meta.totalPages).toBe(1);
      expect(meta.hasNext).toBe(false);
    });

    it('should handle page beyond total', () => {
      const meta = buildPaginationMeta({ page: 5, limit: 10 }, 25);

      expect(meta.hasNext).toBe(false);
      expect(meta.hasPrev).toBe(true);
    });

    it('should handle single item', () => {
      const meta = buildPaginationMeta({ page: 1, limit: 10 }, 1);

      expect(meta.total).toBe(1);
      expect(meta.totalPages).toBe(1);
    });
  });

  describe('paginatedResponse', () => {
    it('should create valid paginated response', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const response = paginatedResponse(data, { page: 1, limit: 10 }, 2);

      expect(response.data).toBe(data);
      expect(response.pagination.total).toBe(2);
      expect(response.pagination.page).toBe(1);
    });

    it('should create response with empty data', () => {
      const response = paginatedResponse([], { page: 1, limit: 10 }, 0);

      expect(response.data).toEqual([]);
      expect(response.pagination.total).toBe(0);
    });

    it('should include all pagination metadata', () => {
      const response = paginatedResponse([1, 2, 3], { page: 2, limit: 3 }, 10);

      expect(response.pagination).toHaveProperty('page');
      expect(response.pagination).toHaveProperty('limit');
      expect(response.pagination).toHaveProperty('total');
      expect(response.pagination).toHaveProperty('totalPages');
      expect(response.pagination).toHaveProperty('hasNext');
      expect(response.pagination).toHaveProperty('hasPrev');
    });
  });
});
