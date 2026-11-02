import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query';
import type { LoanTermType } from '@/shared/types';
import { interestRatesApi } from '../api/interest-rates.api';
import type {
  CreateInterestRatePayload,
  InterestRateListQuery,
} from '../types/interest-rate.types';

export function useInterestRatesList(query: InterestRateListQuery) {
  return useQuery({
    queryKey: queryKeys.interestRates.list(query as Record<string, unknown>),
    queryFn: () => interestRatesApi.list(query),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
  });
}

export function useCurrentInterestRate(termType: LoanTermType) {
  return useQuery({
    queryKey: queryKeys.interestRates.current(termType),
    queryFn: () => interestRatesApi.getCurrent(termType),
    staleTime: 5 * 60_000,
    retry: false,
  });
}

export function useCreateInterestRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateInterestRatePayload) => interestRatesApi.create(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.interestRates.all });
    },
  });
}

