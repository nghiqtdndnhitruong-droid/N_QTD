import type { ReactNode } from 'react';
import { FileSearch, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  isFiltered?: boolean;
  onResetFilters?: () => void;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  isFiltered = false,
  onResetFilters,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white px-6 py-12 text-center',
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        {icon ?? (isFiltered ? <FileSearch className="h-6 w-6" /> : <Inbox className="h-6 w-6" />)}
      </div>
      <h3 className="mt-3.5 text-sm font-semibold text-slate-900">{title}</h3>
      {description && <p className="mt-1 max-w-md text-xs text-slate-500">{description}</p>}
      <div className="mt-4 flex items-center gap-2">
        {isFiltered && onResetFilters && (
          <Button variant="outline" size="sm" onClick={onResetFilters}>
            Xóa bộ lọc
          </Button>
        )}
        {action}
      </div>
    </div>
  );
}

