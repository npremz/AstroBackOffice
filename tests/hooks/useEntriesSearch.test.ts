import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEntriesSearch } from '@/hooks/useEntriesSearch';

describe('useEntriesSearch', () => {
  const mockOnSearch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('should have default values', () => {
      const { result } = renderHook(() => useEntriesSearch({ onSearch: mockOnSearch }));

      expect(result.current.query).toBe('');
      expect(result.current.sortBy).toBe('publishedAt');
      expect(result.current.sortOrder).toBe('desc');
      expect(result.current.template).toBe('');
      expect(result.current.dateAfter).toBe('');
      expect(result.current.dateBefore).toBe('');
      expect(result.current.hasActiveFilters).toBe(false);
    });
  });

  describe('setters', () => {
    it('should update query', () => {
      const { result } = renderHook(() => useEntriesSearch({ onSearch: mockOnSearch }));

      act(() => {
        result.current.setQuery('hello');
      });

      expect(result.current.query).toBe('hello');
    });

    it('should update sortBy', () => {
      const { result } = renderHook(() => useEntriesSearch({ onSearch: mockOnSearch }));

      act(() => {
        result.current.setSortBy('slug');
      });

      expect(result.current.sortBy).toBe('slug');
    });

    it('should update sortOrder', () => {
      const { result } = renderHook(() => useEntriesSearch({ onSearch: mockOnSearch }));

      act(() => {
        result.current.setSortOrder('asc');
      });

      expect(result.current.sortOrder).toBe('asc');
    });

    it('should update template', () => {
      const { result } = renderHook(() => useEntriesSearch({ onSearch: mockOnSearch }));

      act(() => {
        result.current.setTemplate('ArticleLayout');
      });

      expect(result.current.template).toBe('ArticleLayout');
    });

    it('should update dateAfter', () => {
      const { result } = renderHook(() => useEntriesSearch({ onSearch: mockOnSearch }));

      act(() => {
        result.current.setDateAfter('2024-06-01');
      });

      expect(result.current.dateAfter).toBe('2024-06-01');
    });

    it('should update dateBefore', () => {
      const { result } = renderHook(() => useEntriesSearch({ onSearch: mockOnSearch }));

      act(() => {
        result.current.setDateBefore('2024-12-31');
      });

      expect(result.current.dateBefore).toBe('2024-12-31');
    });
  });

  describe('toggleSortOrder', () => {
    it('should toggle from desc to asc', () => {
      const { result } = renderHook(() => useEntriesSearch({ onSearch: mockOnSearch }));

      expect(result.current.sortOrder).toBe('desc');

      act(() => {
        result.current.toggleSortOrder();
      });

      expect(result.current.sortOrder).toBe('asc');
    });

    it('should toggle from asc to desc', () => {
      const { result } = renderHook(() => useEntriesSearch({ onSearch: mockOnSearch }));

      act(() => {
        result.current.setSortOrder('asc');
      });

      act(() => {
        result.current.toggleSortOrder();
      });

      expect(result.current.sortOrder).toBe('desc');
    });
  });

  describe('clearFilters', () => {
    it('should reset all filters to defaults', () => {
      const { result } = renderHook(() => useEntriesSearch({ onSearch: mockOnSearch }));

      // Set various filters
      act(() => {
        result.current.setQuery('test');
        result.current.setSortBy('slug');
        result.current.setSortOrder('asc');
        result.current.setTemplate('Layout');
        result.current.setDateAfter('2024-01-01');
        result.current.setDateBefore('2024-12-31');
      });

      expect(result.current.hasActiveFilters).toBe(true);

      // Clear all
      act(() => {
        result.current.clearFilters();
      });

      expect(result.current.query).toBe('');
      expect(result.current.sortBy).toBe('publishedAt');
      expect(result.current.sortOrder).toBe('desc');
      expect(result.current.template).toBe('');
      expect(result.current.dateAfter).toBe('');
      expect(result.current.dateBefore).toBe('');
      expect(result.current.hasActiveFilters).toBe(false);
    });
  });

  describe('hasActiveFilters', () => {
    it('should be true when query is set', () => {
      const { result } = renderHook(() => useEntriesSearch({ onSearch: mockOnSearch }));

      act(() => {
        result.current.setQuery('test');
      });

      expect(result.current.hasActiveFilters).toBe(true);
    });

    it('should be true when template is set', () => {
      const { result } = renderHook(() => useEntriesSearch({ onSearch: mockOnSearch }));

      act(() => {
        result.current.setTemplate('Layout');
      });

      expect(result.current.hasActiveFilters).toBe(true);
    });

    it('should be true when sortBy differs from default', () => {
      const { result } = renderHook(() => useEntriesSearch({ onSearch: mockOnSearch }));

      act(() => {
        result.current.setSortBy('slug');
      });

      expect(result.current.hasActiveFilters).toBe(true);
    });

    it('should be true when sortOrder differs from default', () => {
      const { result } = renderHook(() => useEntriesSearch({ onSearch: mockOnSearch }));

      act(() => {
        result.current.setSortOrder('asc');
      });

      expect(result.current.hasActiveFilters).toBe(true);
    });

    it('should be false with all defaults', () => {
      const { result } = renderHook(() => useEntriesSearch({ onSearch: mockOnSearch }));

      expect(result.current.hasActiveFilters).toBe(false);
    });
  });

  describe('debounced search', () => {
    it('should call onSearch after debounce delay', () => {
      const { result } = renderHook(() => 
        useEntriesSearch({ onSearch: mockOnSearch, debounceMs: 300 })
      );

      act(() => {
        result.current.setQuery('test');
      });

      // Not called immediately
      expect(mockOnSearch).not.toHaveBeenCalled();

      // Advance past debounce
      act(() => {
        vi.advanceTimersByTime(350);
      });

      expect(mockOnSearch).toHaveBeenCalled();
    });

    it('should debounce multiple rapid changes', () => {
      const { result } = renderHook(() => 
        useEntriesSearch({ onSearch: mockOnSearch, debounceMs: 300 })
      );

      // Rapid changes
      act(() => {
        result.current.setQuery('a');
      });
      act(() => {
        vi.advanceTimersByTime(100);
        result.current.setQuery('ab');
      });
      act(() => {
        vi.advanceTimersByTime(100);
        result.current.setQuery('abc');
      });

      // Not called yet
      expect(mockOnSearch).not.toHaveBeenCalled();

      // Advance past debounce from last change
      act(() => {
        vi.advanceTimersByTime(350);
      });

      // Should be called once with final value
      expect(mockOnSearch).toHaveBeenCalledTimes(1);
      expect(mockOnSearch).toHaveBeenCalledWith(
        expect.objectContaining({ q: 'abc' })
      );
    });

    it('should use custom debounce delay', () => {
      const { result } = renderHook(() => 
        useEntriesSearch({ onSearch: mockOnSearch, debounceMs: 500 })
      );

      act(() => {
        result.current.setQuery('test');
      });

      // Not called at 300ms
      act(() => {
        vi.advanceTimersByTime(350);
      });
      expect(mockOnSearch).not.toHaveBeenCalled();

      // Called after 500ms
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(mockOnSearch).toHaveBeenCalled();
    });
  });

  describe('buildFilters', () => {
    it('should return current filter state', () => {
      const { result } = renderHook(() => useEntriesSearch({ onSearch: mockOnSearch }));

      act(() => {
        result.current.setQuery('  hello  ');
        result.current.setSortBy('slug');
        result.current.setSortOrder('asc');
      });

      const filters = result.current.buildFilters();

      expect(filters.q).toBe('hello'); // Trimmed
      expect(filters.sortBy).toBe('slug');
      expect(filters.sortOrder).toBe('asc');
    });

    it('should include optional fields when set', () => {
      const { result } = renderHook(() => useEntriesSearch({ onSearch: mockOnSearch }));

      act(() => {
        result.current.setTemplate('ArticleLayout');
        result.current.setDateAfter('2024-06-01');
      });

      const filters = result.current.buildFilters();

      expect(filters.template).toBe('ArticleLayout');
      expect(filters.publishedAfter).toMatch(/2024-06-01/);
    });

    it('should not include empty optional fields', () => {
      const { result } = renderHook(() => useEntriesSearch({ onSearch: mockOnSearch }));

      const filters = result.current.buildFilters();

      expect(filters.template).toBeUndefined();
      expect(filters.publishedAfter).toBeUndefined();
      expect(filters.publishedBefore).toBeUndefined();
    });
  });
});
