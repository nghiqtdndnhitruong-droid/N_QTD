import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';

export interface TableUrlState<TFilters extends Record<string, string | undefined>> {
  page: number;
  limit: number;
  search: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  filters: TFilters;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  setSearch: (search: string) => void;
  setSorting: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  setFilter: <K extends keyof TFilters>(key: K, value: TFilters[K]) => void;
  resetFilters: () => void;
  activeFilterCount: number;
}

interface Options<TFilters extends Record<string, string | undefined>> {
  defaultLimit?: number;
  defaultSortBy?: string;
  defaultSortOrder?: 'asc' | 'desc';
  filterKeys: readonly (keyof TFilters & string)[];
}

/**
 * Đồng bộ trạng thái phân trang, tìm kiếm, sắp xếp và bộ lọc của bảng dữ liệu lên URL.
 * Giúp chia sẻ link đang lọc và F5 không mất trạng thái.
 */
export function useTableUrlState<TFilters extends Record<string, string | undefined>>(
  options: Options<TFilters>,
): TableUrlState<TFilters> {
  const {
    defaultLimit = 10,
    defaultSortBy = 'createdAt',
    defaultSortOrder = 'desc',
    filterKeys,
  } = options;

  const [searchParams, setSearchParams] = useSearchParams();

  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const limit = Math.min(100, Math.max(5, Number(searchParams.get('limit')) || defaultLimit));
  const search = searchParams.get('search') ?? '';
  const sortBy = searchParams.get('sortBy') ?? defaultSortBy;
  const sortOrder = (searchParams.get('sortOrder') === 'asc' ? 'asc' : defaultSortOrder) as
    | 'asc'
    | 'desc';

  const filters = useMemo(() => {
    const result = {} as TFilters;
    for (const key of filterKeys) {
      const value = searchParams.get(key) ?? undefined;
      result[key] = value as TFilters[typeof key];
    }
    return result;
  }, [searchParams, filterKeys]);

  const activeFilterCount = useMemo(() => {
    let count = search.trim() ? 1 : 0;
    for (const key of filterKeys) {
      if (filters[key]) count += 1;
    }
    return count;
  }, [search, filters, filterKeys]);

  const updateParams = useCallback(
    (mutator: (next: URLSearchParams) => void, resetPage = true) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          mutator(next);
          if (resetPage) next.delete('page');
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setPage = useCallback(
    (nextPage: number) => {
      updateParams((next) => {
        if (nextPage <= 1) next.delete('page');
        else next.set('page', String(nextPage));
      }, false);
    },
    [updateParams],
  );

  const setLimit = useCallback(
    (nextLimit: number) => {
      updateParams((next) => {
        if (nextLimit === defaultLimit) next.delete('limit');
        else next.set('limit', String(nextLimit));
      });
    },
    [updateParams, defaultLimit],
  );

  const setSearch = useCallback(
    (nextSearch: string) => {
      updateParams((next) => {
        const trimmed = nextSearch.trim();
        if (!trimmed) next.delete('search');
        else next.set('search', trimmed);
      });
    },
    [updateParams],
  );

  const setSorting = useCallback(
    (nextSortBy: string, nextSortOrder: 'asc' | 'desc') => {
      updateParams((next) => {
        next.set('sortBy', nextSortBy);
        next.set('sortOrder', nextSortOrder);
      }, false);
    },
    [updateParams],
  );

  const setFilter = useCallback(
    <K extends keyof TFilters>(key: K, value: TFilters[K]) => {
      updateParams((next) => {
        if (!value) next.delete(String(key));
        else next.set(String(key), String(value));
      });
    },
    [updateParams],
  );

  const resetFilters = useCallback(() => {
    updateParams((next) => {
      next.delete('search');
      for (const key of filterKeys) {
        next.delete(key);
      }
    });
  }, [updateParams, filterKeys]);

  return {
    page,
    limit,
    search,
    sortBy,
    sortOrder,
    filters,
    setPage,
    setLimit,
    setSearch,
    setSorting,
    setFilter,
    resetFilters,
    activeFilterCount,
  };
}

