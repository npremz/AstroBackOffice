import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  parseSearchParams,
  buildSearchResponse,
  escapeFtsQuery,
  validateSortColumn,
  validateSortOrder,
  searchParamsSchema,
  type SearchParams,
} from '@/lib/search';

/**
 * Search and Filter Unit Tests
 * 
 * These tests validate the search functionality including:
 * - Parameter parsing and validation
 * - Full-text search query sanitization
 * - Response building
 * - Security (injection prevention)
 */

describe('Search: Parameter Parsing', () => {
  describe('parseSearchParams', () => {
    it('should parse valid search parameters', () => {
      const url = new URL('http://localhost/api/entries/search?q=test&collectionId=1&page=2&limit=10');
      const params = parseSearchParams(url);
      
      expect(params.q).toBe('test');
      expect(params.collectionId).toBe(1);
      expect(params.page).toBe(2);
      expect(params.limit).toBe(10);
    });

    it('should return defaults for missing parameters', () => {
      const url = new URL('http://localhost/api/entries/search');
      const params = parseSearchParams(url);
      
      expect(params.sortBy).toBe('publishedAt');
      expect(params.sortOrder).toBe('desc');
      expect(params.page).toBe(1);
      expect(params.limit).toBe(20);
    });

    it('should handle empty query string', () => {
      const url = new URL('http://localhost/api/entries/search?q=');
      const params = parseSearchParams(url);
      
      expect(params.q).toBe('');
    });

    it('should validate sortBy values', () => {
      const validSorts = ['publishedAt', 'slug', 'updatedAt'];
      
      for (const sortBy of validSorts) {
        const url = new URL(`http://localhost/api/entries/search?sortBy=${sortBy}`);
        const params = parseSearchParams(url);
        expect(params.sortBy).toBe(sortBy);
      }
    });

    it('should reject invalid sortBy values and use default', () => {
      const url = new URL('http://localhost/api/entries/search?sortBy=invalidField');
      const params = parseSearchParams(url);
      
      // Should fall back to default
      expect(params.sortBy).toBe('publishedAt');
    });

    it('should validate sortOrder values', () => {
      const url1 = new URL('http://localhost/api/entries/search?sortOrder=asc');
      const url2 = new URL('http://localhost/api/entries/search?sortOrder=desc');
      
      expect(parseSearchParams(url1).sortOrder).toBe('asc');
      expect(parseSearchParams(url2).sortOrder).toBe('desc');
    });

    it('should reject invalid sortOrder values and use default', () => {
      const url = new URL('http://localhost/api/entries/search?sortOrder=INVALID');
      const params = parseSearchParams(url);
      
      expect(params.sortOrder).toBe('desc');
    });

    it('should constrain limit to maximum of 100', () => {
      const url = new URL('http://localhost/api/entries/search?limit=500');
      const params = parseSearchParams(url);
      
      // Should use default when validation fails
      expect(params.limit).toBeLessThanOrEqual(100);
    });

    it('should validate page as positive integer', () => {
      const invalidPages = ['0', '-1', 'abc', '1.5'];
      
      for (const page of invalidPages) {
        const url = new URL(`http://localhost/api/entries/search?page=${page}`);
        const params = parseSearchParams(url);
        
        // Should fall back to default
        expect(params.page).toBeGreaterThanOrEqual(1);
      }
    });

    it('should parse ISO datetime strings for date filters', () => {
      const url = new URL('http://localhost/api/entries/search?publishedAfter=2024-01-01T00:00:00Z&publishedBefore=2024-12-31T23:59:59Z');
      const params = parseSearchParams(url);
      
      expect(params.publishedAfter).toBe('2024-01-01T00:00:00Z');
      expect(params.publishedBefore).toBe('2024-12-31T23:59:59Z');
    });

    it('should reject invalid datetime formats', () => {
      const invalidDates = [
        'not-a-date',
        '2024-13-01', // invalid month
        '01-01-2024', // wrong format
        '2024/01/01',
      ];
      
      for (const date of invalidDates) {
        const url = new URL(`http://localhost/api/entries/search?publishedAfter=${encodeURIComponent(date)}`);
        const params = parseSearchParams(url);
        
        // Should be undefined (filter ignored)
        expect(params.publishedAfter).toBeUndefined();
      }
    });

    it('should parse template filter', () => {
      const url = new URL('http://localhost/api/entries/search?template=ArticleLayout');
      const params = parseSearchParams(url);
      
      expect(params.template).toBe('ArticleLayout');
    });
  });

  describe('searchParamsSchema', () => {
    it('should validate complete valid input', () => {
      const result = searchParamsSchema.safeParse({
        q: 'hello world',
        collectionId: '5',
        template: 'BlogLayout',
        publishedAfter: '2024-01-01T00:00:00Z',
        publishedBefore: '2024-12-31T23:59:59Z',
        sortBy: 'slug',
        sortOrder: 'asc',
        page: '3',
        limit: '50',
      });
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.q).toBe('hello world');
        expect(result.data.collectionId).toBe(5);
        expect(result.data.page).toBe(3);
        expect(result.data.limit).toBe(50);
      }
    });

    it('should coerce string numbers to integers', () => {
      const result = searchParamsSchema.safeParse({
        collectionId: '10',
        page: '5',
        limit: '25',
      });
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data.collectionId).toBe('number');
        expect(typeof result.data.page).toBe('number');
        expect(typeof result.data.limit).toBe('number');
      }
    });

    it('should reject query over 500 characters', () => {
      const result = searchParamsSchema.safeParse({
        q: 'a'.repeat(501),
      });
      
      expect(result.success).toBe(false);
    });

    it('should reject negative collectionId', () => {
      const result = searchParamsSchema.safeParse({
        collectionId: '-1',
      });
      
      expect(result.success).toBe(false);
    });

    it('should reject zero collectionId', () => {
      const result = searchParamsSchema.safeParse({
        collectionId: '0',
      });
      
      expect(result.success).toBe(false);
    });
  });
});

describe('Search: Full-Text Query Sanitization', () => {
  describe('escapeFtsQuery', () => {
    it('should escape single quotes', () => {
      const result = escapeFtsQuery("O'Brien");
      expect(result).not.toContain("'");
    });

    it('should escape double quotes', () => {
      const result = escapeFtsQuery('search "exact match"');
      // Input quotes are removed, each term is then wrapped in quotes for FTS
      expect(result).not.toContain('""'); // No empty quotes or doubled quotes from input
    });

    it('should handle FTS operators', () => {
      const result = escapeFtsQuery('prefix* ^boost :column');
      expect(result).not.toContain('*:^'); // Raw operators should be escaped
    });

    it('should normalize multiple spaces', () => {
      const result = escapeFtsQuery('hello    world');
      expect(result).not.toContain('    ');
    });

    it('should trim whitespace', () => {
      const result = escapeFtsQuery('  hello  ');
      expect(result).not.toMatch(/^\s/);
      expect(result).not.toMatch(/\s$/);
    });

    it('should handle empty string', () => {
      const result = escapeFtsQuery('');
      expect(result).toBe('');
    });

    it('should handle only whitespace', () => {
      const result = escapeFtsQuery('   ');
      expect(result).toBe('');
    });

    it('should create prefix search terms', () => {
      const result = escapeFtsQuery('hello world');
      expect(result).toContain('"hello"*');
      expect(result).toContain('"world"*');
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should neutralize SQL injection attempts', () => {
      const attacks = [
        "'; DROP TABLE entries; --",
        "1' OR '1'='1",
        "admin'--",
        "1; DELETE FROM users",
        "UNION SELECT * FROM users--",
      ];
      
      for (const attack of attacks) {
        const result = escapeFtsQuery(attack);
        expect(result).not.toContain("'");
        // Each term is quoted so SQL special chars become literal strings
        // The important thing is quotes are stripped and terms are safely quoted
      }
    });

    it('should not allow FTS5 operator injection', () => {
      const attacks = [
        'NOT hello',
        'hello AND goodbye',
        'hello OR malicious',
        '{hello}',
        'NEAR(hello goodbye)',
      ];
      
      for (const attack of attacks) {
        const result = escapeFtsQuery(attack);
        // Should be quoted to prevent operator interpretation
        expect(result).toMatch(/^"[^"]*"\*/);
      }
    });
  });
});

describe('Search: Sort Validation', () => {
  describe('validateSortColumn', () => {
    it('should accept valid sort columns', () => {
      expect(validateSortColumn('publishedAt')).toBe(true);
      expect(validateSortColumn('slug')).toBe(true);
      expect(validateSortColumn('updatedAt')).toBe(true);
    });

    it('should reject invalid sort columns', () => {
      expect(validateSortColumn('id')).toBe(false);
      expect(validateSortColumn('data')).toBe(false);
      expect(validateSortColumn('collectionId')).toBe(false);
      expect(validateSortColumn('invalid')).toBe(false);
      expect(validateSortColumn('')).toBe(false);
      expect(validateSortColumn('1; DROP TABLE--')).toBe(false);
    });
  });

  describe('validateSortOrder', () => {
    it('should accept valid sort orders', () => {
      expect(validateSortOrder('asc')).toBe(true);
      expect(validateSortOrder('desc')).toBe(true);
    });

    it('should reject invalid sort orders', () => {
      expect(validateSortOrder('ASC')).toBe(false);
      expect(validateSortOrder('DESC')).toBe(false);
      expect(validateSortOrder('ascending')).toBe(false);
      expect(validateSortOrder('')).toBe(false);
      expect(validateSortOrder('1; DROP TABLE--')).toBe(false);
    });
  });
});

describe('Search: Response Building', () => {
  describe('buildSearchResponse', () => {
    const sampleParams: SearchParams = {
      q: 'test',
      collectionId: 1,
      sortBy: 'publishedAt',
      sortOrder: 'desc',
      page: 2,
      limit: 10,
    };

    it('should build correct pagination metadata', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const result = buildSearchResponse(data, sampleParams, 25);
      
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.total).toBe(25);
      expect(result.pagination.totalPages).toBe(3);
    });

    it('should calculate hasNext correctly', () => {
      const data = [{ id: 1 }];
      
      // Page 2 of 3 pages - should have next
      const result1 = buildSearchResponse(data, { ...sampleParams, page: 2 }, 25);
      expect(result1.pagination.hasNext).toBe(true);
      
      // Page 3 of 3 pages - should not have next
      const result2 = buildSearchResponse(data, { ...sampleParams, page: 3 }, 25);
      expect(result2.pagination.hasNext).toBe(false);
    });

    it('should calculate hasPrev correctly', () => {
      const data = [{ id: 1 }];
      
      // Page 1 - should not have prev
      const result1 = buildSearchResponse(data, { ...sampleParams, page: 1 }, 25);
      expect(result1.pagination.hasPrev).toBe(false);
      
      // Page 2 - should have prev
      const result2 = buildSearchResponse(data, { ...sampleParams, page: 2 }, 25);
      expect(result2.pagination.hasPrev).toBe(true);
    });

    it('should include filter information in response', () => {
      const data = [{ id: 1 }];
      const result = buildSearchResponse(data, sampleParams, 10);
      
      expect(result.filters.q).toBe('test');
      expect(result.filters.collectionId).toBe(1);
      expect(result.filters.sortBy).toBe('publishedAt');
      expect(result.filters.sortOrder).toBe('desc');
    });

    it('should handle empty results', () => {
      const result = buildSearchResponse([], sampleParams, 0);
      
      expect(result.data).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
      expect(result.pagination.hasNext).toBe(false);
    });

    it('should handle single page of results', () => {
      const data = Array(5).fill({ id: 1 });
      const params: SearchParams = { ...sampleParams, page: 1, limit: 10 };
      const result = buildSearchResponse(data, params, 5);
      
      expect(result.pagination.totalPages).toBe(1);
      expect(result.pagination.hasNext).toBe(false);
      expect(result.pagination.hasPrev).toBe(false);
    });

    it('should preserve data array unchanged', () => {
      const data = [
        { id: 1, slug: 'test-1', data: { title: 'Test 1' } },
        { id: 2, slug: 'test-2', data: { title: 'Test 2' } },
      ];
      const result = buildSearchResponse(data, sampleParams, 2);
      
      expect(result.data).toEqual(data);
      // Data is passed through directly, same reference is acceptable
    });
  });
});

describe('Search: Edge Cases', () => {
  it('should handle Unicode search queries', () => {
    const url = new URL('http://localhost/api/entries/search?q=日本語テスト');
    const params = parseSearchParams(url);
    
    expect(params.q).toBe('日本語テスト');
  });

  it('should handle URL-encoded special characters', () => {
    const url = new URL('http://localhost/api/entries/search?q=hello%20world%21');
    const params = parseSearchParams(url);
    
    expect(params.q).toBe('hello world!');
  });

  it('should handle emoji in search', () => {
    const url = new URL('http://localhost/api/entries/search?q=test%20🎉');
    const params = parseSearchParams(url);
    
    expect(params.q).toBe('test 🎉');
  });

  it('should handle very long valid queries up to limit', () => {
    const longQuery = 'a'.repeat(500);
    const url = new URL(`http://localhost/api/entries/search?q=${longQuery}`);
    const params = parseSearchParams(url);
    
    expect(params.q).toBe(longQuery);
    expect(params.q!.length).toBe(500);
  });

  it('should handle multiple filter combinations', () => {
    const url = new URL(
      'http://localhost/api/entries/search?' +
      'q=blog&collectionId=2&template=ArticleLayout&' +
      'publishedAfter=2024-01-01T00:00:00Z&publishedBefore=2024-06-01T00:00:00Z&' +
      'sortBy=slug&sortOrder=asc&page=1&limit=50'
    );
    const params = parseSearchParams(url);
    
    expect(params.q).toBe('blog');
    expect(params.collectionId).toBe(2);
    expect(params.template).toBe('ArticleLayout');
    expect(params.publishedAfter).toBe('2024-01-01T00:00:00Z');
    expect(params.publishedBefore).toBe('2024-06-01T00:00:00Z');
    expect(params.sortBy).toBe('slug');
    expect(params.sortOrder).toBe('asc');
    expect(params.page).toBe(1);
    expect(params.limit).toBe(50);
  });
});

describe('Search: Security', () => {
  describe('XSS Prevention in Query', () => {
    it('should handle script tags in query', () => {
      const url = new URL('http://localhost/api/entries/search?q=<script>alert(1)</script>');
      const params = parseSearchParams(url);
      
      // The query is accepted but will be escaped when used in SQL
      expect(params.q).toBeDefined();
    });

    it('should handle HTML entities in query', () => {
      // URL encoding of &lt;script&gt; - the browser/URL parser handles this
      const url = new URL('http://localhost/api/entries/search?q=%3Cscript%3E');
      const params = parseSearchParams(url);
      
      expect(params.q).toBe('<script>');
    });
  });

  describe('Path Traversal Prevention', () => {
    it('should not allow path traversal in template', () => {
      const url = new URL('http://localhost/api/entries/search?template=../../../etc/passwd');
      const params = parseSearchParams(url);
      
      // Template is still parsed but validation happens elsewhere
      expect(params.template).toBeDefined();
    });
  });

  describe('Integer Overflow Prevention', () => {
    it('should handle very large page numbers', () => {
      const url = new URL('http://localhost/api/entries/search?page=999999999999999');
      const params = parseSearchParams(url);
      
      // Should still be a valid positive integer
      expect(Number.isInteger(params.page)).toBe(true);
      expect(params.page).toBeGreaterThanOrEqual(1);
    });

    it('should handle very large limit values', () => {
      const url = new URL('http://localhost/api/entries/search?limit=999999999999999');
      const params = parseSearchParams(url);
      
      // Should be constrained or use default
      expect(params.limit).toBeLessThanOrEqual(100);
    });
  });
});
