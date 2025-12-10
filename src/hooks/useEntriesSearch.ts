import { useState, useEffect, useCallback, useRef } from 'react';

export interface SearchFilters {
  q: string;
  sortBy: 'publishedAt' | 'slug';
  sortOrder: 'asc' | 'desc';
  template?: string;
  publishedAfter?: string;
  publishedBefore?: string;
}

export interface UseEntriesSearchOptions {
  onSearch: (filters: SearchFilters) => void;
  debounceMs?: number;
}

export interface UseEntriesSearchReturn {
  // State
  query: string;
  sortBy: 'publishedAt' | 'slug';
  sortOrder: 'asc' | 'desc';
  template: string;
  dateAfter: string;
  dateBefore: string;
  hasActiveFilters: boolean;
  
  // Actions
  setQuery: (value: string) => void;
  setSortBy: (value: 'publishedAt' | 'slug') => void;
  setSortOrder: (value: 'asc' | 'desc') => void;
  setTemplate: (value: string) => void;
  setDateAfter: (value: string) => void;
  setDateBefore: (value: string) => void;
  toggleSortOrder: () => void;
  clearFilters: () => void;
  
  // For testing: build filters without triggering search
  buildFilters: () => SearchFilters;
}

/**
 * Custom hook for entries search state management
 * Separates state logic from UI for better testability
 */
export function useEntriesSearch({ 
  onSearch, 
  debounceMs = 300 
}: UseEntriesSearchOptions): UseEntriesSearchReturn {
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<'publishedAt' | 'slug'>('publishedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [template, setTemplate] = useState('');
  const [dateAfter, setDateAfter] = useState('');
  const [dateBefore, setDateBefore] = useState('');
  
  const onSearchRef = useRef(onSearch);
  onSearchRef.current = onSearch;

  const buildFilters = useCallback((): SearchFilters => {
    const filters: SearchFilters = {
      q: query.trim(),
      sortBy,
      sortOrder,
    };

    if (template) {
      filters.template = template;
    }

    if (dateAfter) {
      filters.publishedAfter = new Date(dateAfter).toISOString();
    }

    if (dateBefore) {
      filters.publishedBefore = new Date(dateBefore).toISOString();
    }

    return filters;
  }, [query, sortBy, sortOrder, template, dateAfter, dateBefore]);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchRef.current(buildFilters());
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, sortBy, sortOrder, template, dateAfter, dateBefore, debounceMs, buildFilters]);

  const toggleSortOrder = useCallback(() => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  }, []);

  const clearFilters = useCallback(() => {
    setQuery('');
    setSortBy('publishedAt');
    setSortOrder('desc');
    setTemplate('');
    setDateAfter('');
    setDateBefore('');
  }, []);

  const hasActiveFilters = query !== '' || 
    template !== '' || 
    dateAfter !== '' || 
    dateBefore !== '' || 
    sortBy !== 'publishedAt' || 
    sortOrder !== 'desc';

  return {
    query,
    sortBy,
    sortOrder,
    template,
    dateAfter,
    dateBefore,
    hasActiveFilters,
    setQuery,
    setSortBy,
    setSortOrder,
    setTemplate,
    setDateAfter,
    setDateBefore,
    toggleSortOrder,
    clearFilters,
    buildFilters,
  };
}

/**
 * Pure function to build filters - for unit testing without hooks
 */
export function buildSearchFilters(params: {
  query: string;
  sortBy: 'publishedAt' | 'slug';
  sortOrder: 'asc' | 'desc';
  template?: string;
  dateAfter?: string;
  dateBefore?: string;
}): SearchFilters {
  const filters: SearchFilters = {
    q: params.query.trim(),
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  };

  if (params.template) {
    filters.template = params.template;
  }

  if (params.dateAfter) {
    filters.publishedAfter = new Date(params.dateAfter).toISOString();
  }

  if (params.dateBefore) {
    filters.publishedBefore = new Date(params.dateBefore).toISOString();
  }

  return filters;
}
