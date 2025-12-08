import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
  icon?: React.ReactNode;
}

interface Props {
  items: BreadcrumbItem[];
  className?: string;
}

export default function Breadcrumbs({ items, className }: Props) {
  if (items.length === 0) return null;

  return (
    <nav 
      aria-label="Fil d'Ariane"
      className={cn("flex items-center gap-2 text-sm overflow-x-auto", className)}
    >
      <ol className="flex items-center gap-1.5">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const isFirst = index === 0;
          const isClickable = !!item.onClick && !isLast;

          return (
            <li key={index} className="flex items-center gap-1.5 whitespace-nowrap">
              {index > 0 && (
                <ChevronRight 
                  className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0" 
                  aria-hidden="true"
                />
              )}
              {isClickable ? (
                <button
                  onClick={item.onClick}
                  className={cn(
                    "flex items-center gap-1.5 font-medium tracking-wide transition-colors duration-200",
                    "text-muted-foreground hover:text-primary focus:outline-none focus:text-primary"
                  )}
                >
                  {isFirst && !item.icon && (
                    <Home className="h-4 w-4" aria-hidden="true" />
                  )}
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ) : (
                <span 
                  className={cn(
                    "flex items-center gap-1.5 font-medium tracking-wide",
                    isLast 
                      ? "text-foreground" 
                      : "text-muted-foreground"
                  )}
                  aria-current={isLast ? "page" : undefined}
                >
                  {isFirst && !item.icon && (
                    <Home className="h-4 w-4" aria-hidden="true" />
                  )}
                  {item.icon}
                  <span>{item.label}</span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
