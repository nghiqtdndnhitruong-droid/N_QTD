import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface DescriptionItemProps {
  label: ReactNode;
  value: ReactNode;
  span?: 1 | 2 | 3;
  mono?: boolean;
  className?: string;
}

export function DescriptionList({
  columns = 3,
  children,
  className,
}: {
  columns?: 2 | 3 | 4;
  children: ReactNode;
  className?: string;
}) {
  const gridCols =
    columns === 2
      ? 'sm:grid-cols-2'
      : columns === 4
        ? 'sm:grid-cols-2 lg:grid-cols-4'
        : 'sm:grid-cols-2 lg:grid-cols-3';

  return <dl className={cn('grid grid-cols-1 gap-x-6 gap-y-4', gridCols, className)}>{children}</dl>;
}

export function DescriptionItem({
  label,
  value,
  span = 1,
  mono = false,
  className,
}: DescriptionItemProps) {
  const spanClass =
    span === 3 ? 'sm:col-span-2 lg:col-span-3' : span === 2 ? 'sm:col-span-2' : '';

  return (
    <div className={cn('min-w-0', spanClass, className)}>
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd
        className={cn(
          'mt-1 text-sm font-medium text-slate-900 break-words',
          mono && 'tabular-nums',
        )}
      >
        {value ?? '—'}
      </dd>
    </div>
  );
}

