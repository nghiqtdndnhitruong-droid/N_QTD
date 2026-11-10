import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query';
import type { LoanTermType, LoanType } from '@/shared/types';
import { interestRatesApi } from '../api/interest-rates.api';
import type {
  CreateInterestRatePayload,
  InterestRateListQuery,
  UpdateInterestRatePayload,
} from '../types/interest-rate.types';

export function useInterestRatesList(query: InterestRateListQuery) {
  return useQuery({
    queryKey: queryKeys.interestRates.list(query as Record<string, unknown>),
    queryFn: () => interestRatesApi.list(query),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
  });
}

export function useCurrentInterestRate(
  params: { loanType?: LoanType; termType?: LoanTermType | null } | LoanTermType,
) {
  const key =
    typeof params === 'string'
      ? `THE_CHAP_${params}`
      : `${params?.loanType ?? 'THE_CHAP'}_${params?.termType ?? 'ALL'}`;

  return useQuery({
    queryKey: queryKeys.interestRates.current(key),
    queryFn: () => interestRatesApi.getCurrent(params),
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
      void qc.invalidateQueries({ queryKey: queryKeys.loans.all });
    },
  });
}

export function useUpdateInterestRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateInterestRatePayload }) =>
      interestRatesApi.update(id, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.interestRates.all });
      void qc.invalidateQueries({ queryKey: queryKeys.loans.all });
    },
  });
}

export function useDeleteInterestRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => interestRatesApi.delete(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.interestRates.all });
      void qc.invalidateQueries({ queryKey: queryKeys.loans.all });
    },
  });
}

