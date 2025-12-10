import { useState } from 'react';
import { Search, X, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useEntriesSearch, type SearchFilters } from '@/hooks/useEntriesSearch';

// Re-export for backwards compatibility
export type { SearchFilters };

interface EntriesSearchProps {
  onSearch: (filters: SearchFilters) => void;
  templates?: string[];
  loading?: boolean;
  resultCount?: number;
}

export default function EntriesSearch({ onSearch, templates = [], loading, resultCount }: EntriesSearchProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const search = useEntriesSearch({ onSearch });

  return (
    <div className="space-y-4">
      {/* Main Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search entries..."
            value={search.query}
            onChange={(e) => search.setQuery(e.target.value)}
            className="pl-10 pr-10 h-11"
          />
          {search.query && (
            <button
              onClick={() => search.setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Sort Controls */}
        <div className="flex gap-2">
          <Select value={search.sortBy} onValueChange={(v: 'publishedAt' | 'slug') => search.setSortBy(v)}>
            <SelectTrigger className="w-[140px] h-11">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="publishedAt">Date</SelectItem>
              <SelectItem value="slug">Slug</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            className="h-11 w-11"
            onClick={search.toggleSortOrder}
            title={search.sortOrder === 'asc' ? 'Ascending' : 'Descending'}
          >
            <ArrowUpDown className={`h-4 w-4 transition-transform ${search.sortOrder === 'asc' ? 'rotate-180' : ''}`} />
          </Button>

          <Button
            variant={showAdvanced ? 'secondary' : 'outline'}
            size="icon"
            className="h-11 w-11"
            onClick={() => setShowAdvanced(!showAdvanced)}
            title="Advanced filters"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="p-4 rounded-lg border border-border/50 bg-muted/20 space-y-4 animate-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Template Filter */}
            {templates.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Template</label>
                <Select value={search.template} onValueChange={search.setTemplate}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All templates" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All templates</SelectItem>
                    {templates.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Date After Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Published after</label>
              <Input
                type="date"
                value={search.dateAfter}
                onChange={(e) => search.setDateAfter(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Date Before Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Published before</label>
              <Input
                type="date"
                value={search.dateBefore}
                onChange={(e) => search.setDateBefore(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* Active Filters & Results Count */}
      <div className="flex flex-wrap items-center gap-2">
        {resultCount !== undefined && (
          <span className="text-sm text-muted-foreground">
            {resultCount} {resultCount === 1 ? 'result' : 'results'}
          </span>
        )}

        {search.hasActiveFilters && (
          <>
            {search.query && (
              <Badge variant="secondary" className="gap-1">
                Search: {search.query}
                <button onClick={() => search.setQuery('')} className="ml-1 hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {search.template && (
              <Badge variant="secondary" className="gap-1">
                Template: {search.template}
                <button onClick={() => search.setTemplate('')} className="ml-1 hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {search.dateAfter && (
              <Badge variant="secondary" className="gap-1">
                After: {search.dateAfter}
                <button onClick={() => search.setDateAfter('')} className="ml-1 hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {search.dateBefore && (
              <Badge variant="secondary" className="gap-1">
                Before: {search.dateBefore}
                <button onClick={() => search.setDateBefore('')} className="ml-1 hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={search.clearFilters}
              className="text-muted-foreground hover:text-destructive"
            >
              Clear all
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
