import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowData,
} from '@tanstack/react-table';
import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PaginationMeta } from '@/shared/types';
import { Button } from '../ui/button';
import { EmptyState } from '../feedback/empty-state';
import { ErrorState } from '../feedback/error-state';
import { TableSkeleton } from '../feedback/skeleton';

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    align?: 'left' | 'center' | 'right';
    sticky?: 'left' | 'right';
    sortableId?: string;
    className?: string;
  }
}

export interface DataTableProps<TData> {
  columns: ColumnDef<TData, any>[];
  data: TData[];
  getRowId?: (row: TData, index: number) => string;
  pagination?: PaginationMeta;
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSortChange?: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  isLoading?: boolean;
  isFetching?: boolean;
  error?: unknown;
  onRetry?: () => void;
  isFiltered?: boolean;
  onResetFilters?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  onRowClick?: (row: TData) => void;
  /** Hiển thị dạng thẻ trên màn hình nhỏ (< md) nếu được cung cấp. */
  renderMobileCard?: (row: TData) => ReactNode;
  className?: string;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

export function DataTable<TData>({
  columns,
  data,
  getRowId,
  pagination,
  onPageChange,
  onLimitChange,
  sortBy,
  sortOrder = 'desc',
  onSortChange,
  isLoading = false,
  isFetching = false,
  error,
  onRetry,
  isFiltered = false,
  onResetFilters,
  emptyTitle = 'Chưa có dữ liệu',
  emptyDescription = 'Hệ thống chưa ghi nhận bản ghi nào trong mục này.',
  emptyAction,
  onRowClick,
  renderMobileCard,
  className,
}: DataTableProps<TData>) {
  const table = useReactTable({
    data,
    columns,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
  });

  if (error) {
    return <ErrorState error={error} onRetry={onRetry} className={className} />;
  }

  if (isLoading && data.length === 0) {
    return (
      <div className={cn('rounded-lg border border-slate-200 bg-white', className)}>
        <TableSkeleton rows={6} columns={Math.min(columns.length, 6)} />
      </div>
    );
  }

  if (!isLoading && data.length === 0) {
    return (
      <EmptyState
        title={isFiltered ? 'Không tìm thấy kết quả phù hợp' : emptyTitle}
        description={
          isFiltered
            ? 'Không có bản ghi nào khớp với từ khóa hoặc bộ lọc đang chọn. Hãy thử điều chỉnh lại điều kiện lọc.'
            : emptyDescription
        }
        isFiltered={isFiltered}
        onResetFilters={onResetFilters}
        action={!isFiltered ? emptyAction : undefined}
        className={className}
      />
    );
  }

  const handleHeaderSort = (sortableId?: string) => {
    if (!sortableId || !onSortChange) return;
    if (sortBy === sortableId) {
      onSortChange(sortableId, sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      onSortChange(sortableId, 'desc');
    }
  };

  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xs transition-opacity',
        isFetching && 'opacity-75',
        className,
      )}
    >
      {/* Danh sách dạng thẻ cho Mobile (nếu truyền renderMobileCard) */}
      {renderMobileCard && (
        <div className="divide-y divide-slate-200 md:hidden">
          {data.map((row, idx) => (
            <div
              key={getRowId ? getRowId(row, idx) : idx}
              role={onRowClick ? 'button' : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              onClick={() => onRowClick?.(row)}
              onKeyDown={(e) => {
                if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onRowClick(row);
                }
              }}
              className={cn('p-4', onRowClick && 'cursor-pointer active:bg-slate-50')}
            >
              {renderMobileCard(row)}
            </div>
          ))}
        </div>
      )}

      {/* Bảng dữ liệu chuẩn cho Tablet / Desktop */}
      <div className={cn('overflow-x-auto', renderMobileCard && 'hidden md:block')}>
        <table className="w-full border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-600">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const meta = header.column.columnDef.meta;
                  const sortableId = meta?.sortableId;
                  const isSorted = Boolean(sortableId && sortBy === sortableId);

                  return (
                    <th
                      key={header.id}
                      scope="col"
                      className={cn(
                        'px-4 py-3 whitespace-nowrap select-none bg-slate-50',
                        meta?.align === 'right' && 'text-right',
                        meta?.align === 'center' && 'text-center',
                        meta?.sticky === 'left' &&
                          'sticky left-0 z-20 shadow-[1px_0_0_0_#e2e8f0]',
                        meta?.sticky === 'right' &&
                          'sticky right-0 z-20 shadow-[-1px_0_0_0_#e2e8f0]',
                        meta?.className,
                      )}
                    >
                      {header.isPlaceholder ? null : sortableId && onSortChange ? (
                        <button
                          type="button"
                          onClick={() => handleHeaderSort(sortableId)}
                          className={cn(
                            'inline-flex items-center gap-1 font-semibold uppercase tracking-wider hover:text-primary-700 focus-visible:outline-none focus-visible:underline',
                            isSorted && 'text-primary-700',
                          )}
                        >
                          <span>
                            {flexRender(header.column.columnDef.header, header.getContext())}
                          </span>
                          {isSorted ? (
                            sortOrder === 'asc' ? (
                              <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                            ) : (
                              <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3.5 w-3.5 opacity-40" aria-hidden="true" />
                          )}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-100">
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                onClick={() => onRowClick?.(row.original)}
                className={cn(
                  'group transition-colors hover:bg-primary-50/45',
                  onRowClick && 'cursor-pointer',
                )}
              >
                {row.getVisibleCells().map((cell) => {
                  const meta = cell.column.columnDef.meta;
                  return (
                    <td
                      key={cell.id}
                      className={cn(
                        'px-4 py-3 align-middle text-slate-800 bg-white group-hover:bg-[#f6f9fd]',
                        meta?.align === 'right' && 'text-right tabular-nums',
                        meta?.align === 'center' && 'text-center',
                        meta?.sticky === 'left' &&
                          'sticky left-0 z-10 shadow-[1px_0_0_0_#f1f5f9]',
                        meta?.sticky === 'right' &&
                          'sticky right-0 z-10 shadow-[-1px_0_0_0_#f1f5f9]',
                        meta?.className,
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Thanh phân trang */}
      {pagination && (
        <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/70 px-4 py-2.5 text-xs text-slate-600 sm:flex-row">
          <div className="flex items-center gap-3">
            <span>
              Hiển thị{' '}
              <strong className="font-semibold text-slate-900 tabular-nums">
                {pagination.total === 0
                  ? 0
                  : (pagination.page - 1) * pagination.limit + 1}
                –{Math.min(pagination.page * pagination.limit, pagination.total)}
              </strong>{' '}
              trên tổng số{' '}
              <strong className="font-semibold text-slate-900 tabular-nums">
                {pagination.total}
              </strong>{' '}
              bản ghi
            </span>

            {onLimitChange && (
              <label className="inline-flex items-center gap-1.5">
                <span className="text-slate-500">| Số dòng:</span>
                <select
                  aria-label="Số dòng hiển thị mỗi trang"
                  value={pagination.limit}
                  onChange={(e) => onLimitChange(Number(e.target.value))}
                  className="h-7 rounded border border-slate-300 bg-white px-2 text-xs font-medium text-slate-700 focus:border-primary-600 focus:outline-none"
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size} / trang
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          {onPageChange && pagination.totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={!pagination.hasPrevPage}
                onClick={() => onPageChange(pagination.page - 1)}
                leftIcon={<ChevronLeft className="h-3.5 w-3.5" />}
              >
                Trước
              </Button>
              <span className="px-2 font-medium text-slate-700 tabular-nums">
                Trang {pagination.page} / {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={!pagination.hasNextPage}
                onClick={() => onPageChange(pagination.page + 1)}
                rightIcon={<ChevronRight className="h-3.5 w-3.5" />}
              >
                Sau
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
