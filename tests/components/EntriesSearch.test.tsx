import { describe, it, expect, vi } from 'vitest';
import { buildSearchFilters, type SearchFilters } from '@/hooks/useEntriesSearch';

/**
 * Unit tests for search filter building logic
 * These test pure functions without React hooks complexity
 */
describe('buildSearchFilters', () => {
  describe('basic filter building', () => {
    it('should build filters with default values', () => {
      const result = buildSearchFilters({
        query: '',
        sortBy: 'publishedAt',
        sortOrder: 'desc',
      });

      expect(result).toEqual({
        q: '',
        sortBy: 'publishedAt',
        sortOrder: 'desc',
      });
    });

    it('should include search query', () => {
      const result = buildSearchFilters({
        query: 'hello world',
        sortBy: 'publishedAt',
        sortOrder: 'desc',
      });

      expect(result.q).toBe('hello world');
    });

    it('should trim whitespace from query', () => {
      const result = buildSearchFilters({
        query: '  hello  ',
        sortBy: 'publishedAt',
        sortOrder: 'desc',
      });

      expect(result.q).toBe('hello');
    });

    it('should include sort parameters', () => {
      const result = buildSearchFilters({
        query: '',
        sortBy: 'slug',
        sortOrder: 'asc',
      });

      expect(result.sortBy).toBe('slug');
      expect(result.sortOrder).toBe('asc');
    });
  });

  describe('optional filters', () => {
    it('should include template when provided', () => {
      const result = buildSearchFilters({
        query: '',
        sortBy: 'publishedAt',
        sortOrder: 'desc',
        template: 'ArticleLayout',
      });

      expect(result.template).toBe('ArticleLayout');
    });

    it('should not include template when empty', () => {
      const result = buildSearchFilters({
        query: '',
        sortBy: 'publishedAt',
        sortOrder: 'desc',
        template: '',
      });

      expect(result.template).toBeUndefined();
    });

    it('should convert dateAfter to ISO string', () => {
      const result = buildSearchFilters({
        query: '',
        sortBy: 'publishedAt',
        sortOrder: 'desc',
        dateAfter: '2024-06-01',
      });

      expect(result.publishedAfter).toMatch(/^2024-06-01/);
      expect(result.publishedAfter).toMatch(/T.*Z$/);
    });

    it('should convert dateBefore to ISO string', () => {
      const result = buildSearchFilters({
        query: '',
        sortBy: 'publishedAt',
        sortOrder: 'desc',
        dateBefore: '2024-12-31',
      });

      expect(result.publishedBefore).toMatch(/^2024-12-31/);
    });

    it('should not include dates when empty', () => {
      const result = buildSearchFilters({
        query: '',
        sortBy: 'publishedAt',
        sortOrder: 'desc',
        dateAfter: '',
        dateBefore: '',
      });

      expect(result.publishedAfter).toBeUndefined();
      expect(result.publishedBefore).toBeUndefined();
    });
  });

  describe('combined filters', () => {
    it('should build complete filter object', () => {
      const result = buildSearchFilters({
        query: 'blog post',
        sortBy: 'slug',
        sortOrder: 'asc',
        template: 'BlogLayout',
        dateAfter: '2024-01-01',
        dateBefore: '2024-12-31',
      });

      expect(result.q).toBe('blog post');
      expect(result.sortBy).toBe('slug');
      expect(result.sortOrder).toBe('asc');
      expect(result.template).toBe('BlogLayout');
      expect(result.publishedAfter).toBeDefined();
      expect(result.publishedBefore).toBeDefined();
    });
  });
});

describe('SearchFilters type', () => {
  it('should have required fields', () => {
    const filters: SearchFilters = {
      q: 'test',
      sortBy: 'publishedAt',
      sortOrder: 'desc',
    };

    expect(filters.q).toBeDefined();
    expect(filters.sortBy).toBeDefined();
    expect(filters.sortOrder).toBeDefined();
  });

  it('should allow optional fields', () => {
    const filters: SearchFilters = {
      q: 'test',
      sortBy: 'publishedAt',
      sortOrder: 'desc',
      template: 'Layout',
      publishedAfter: '2024-01-01T00:00:00Z',
      publishedBefore: '2024-12-31T23:59:59Z',
    };

    expect(filters.template).toBe('Layout');
    expect(filters.publishedAfter).toBeDefined();
    expect(filters.publishedBefore).toBeDefined();
  });
});
