import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface ListSkeletonProps {
  message?: string;
  count?: number;
  variant?: 'spinner' | 'cards' | 'rows';
}

export function ListSkeleton({ 
  message = "Chargement...", 
  count = 3,
  variant = 'spinner' 
}: ListSkeletonProps) {
  if (variant === 'spinner') {
    return (
      <Card className="card-float">
        <CardContent className="flex items-center justify-center py-16">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="font-medium">{message}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === 'cards') {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: count }).map((_, i) => (
          <Card key={i} className="card-float bg-card border-border/50 overflow-hidden animate-pulse">
            <div className="h-1 w-full bg-gradient-to-r from-muted via-muted/50 to-muted" />
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-muted rounded w-full" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </div>
              <div className="flex gap-2 pt-2">
                <div className="h-8 bg-muted rounded flex-1" />
                <div className="h-8 bg-muted rounded w-10" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // variant === 'rows'
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i} 
          className="flex items-center gap-4 p-4 rounded-lg border border-border/50 animate-pulse"
        >
          <div className="h-10 w-10 rounded-lg bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="h-3 bg-muted rounded w-1/4" />
          </div>
          <div className="flex gap-2">
            <div className="h-8 w-8 bg-muted rounded" />
            <div className="h-8 w-8 bg-muted rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Skeleton pour les tables
export function TableSkeleton({ rows = 5, columns = 6 }: { rows?: number; columns?: number }) {
  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex gap-4 p-4 border-b border-border/50">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="h-4 bg-muted rounded flex-1 animate-pulse" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 p-4 border-b border-border/30">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div 
              key={colIndex} 
              className="h-4 bg-muted rounded flex-1 animate-pulse"
              style={{ animationDelay: `${rowIndex * 50}ms` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export default ListSkeleton;
