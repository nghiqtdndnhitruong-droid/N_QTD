import { useQuery } from '@tanstack/react-query';
import {
  getDatabaseStatsApi,
  getDisbursedLoansApi,
  getMaturityLoansApi,
  getUnpaidInterestLoansApi,
} from '../api/reports.api';

export function useDisbursedLoans(params: { fromDate?: string; toDate?: string }, enabled = true) {
  return useQuery({
    queryKey: ['reports', 'disbursed-loans', params.fromDate, params.toDate],
    queryFn: () => getDisbursedLoansApi(params),
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useMaturityLoans(
  params: { month?: number | string; year?: number | string },
  enabled = true
) {
  return useQuery({
    queryKey: ['reports', 'maturity-loans', params.month, params.year],
    queryFn: () => getMaturityLoansApi(params),
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useUnpaidInterestLoans(
  params: { months?: string | number; search?: string },
  enabled = true
) {
  return useQuery({
    queryKey: ['reports', 'unpaid-interest', params.months, params.search],
    queryFn: () => getUnpaidInterestLoansApi(params),
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useDatabaseStats(enabled = true) {
  return useQuery({
    queryKey: ['system', 'database-stats'],
    queryFn: () => getDatabaseStatsApi(),
    enabled,
    staleTime: 30 * 1000,
  });
}


