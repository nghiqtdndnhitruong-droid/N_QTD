import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query';
import type { LoanStatus } from '@/shared/types';
import { loansApi } from '../api/loans.api';
import type {
  CreateCollateralPayload,
  CreateLoanValuationPayload,
  UpdateLoanValuationPayload,
  CreateDisbursementPayload,
  CreateLoanPayload,
  CreateRelatedPersonPayload,
  CreateRepaymentPayload,
  LoanListQuery,
  UpdateCollateralPayload,
  UpdateDisbursementPayload,
  UpdateLoanPayload,
  UpdateRelatedPersonPayload,
  UpdateRepaymentPayload,
} from '../types/loan.types';

export function useLoansList(query: LoanListQuery) {
  return useQuery({
    queryKey: queryKeys.loans.list(query as Record<string, unknown>),
    queryFn: () => loansApi.list(query),
    placeholderData: keepPreviousData,
  });
}

export function useLoanDetail(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.loans.detail(id ?? ''),
    queryFn: () => loansApi.getById(id!),
    enabled: Boolean(id),
  });
}

export function useLoanSummary(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.loans.summary(id ?? ''),
    queryFn: () => loansApi.getSummary(id!),
    enabled: Boolean(id),
  });
}

export function useInterestEstimate(loanId: string | undefined, days: number) {
  return useQuery({
    queryKey: queryKeys.loans.interestEstimate(loanId ?? '', { days }),
    queryFn: () => loansApi.estimateInterest(loanId!, { days }),
    enabled: Boolean(loanId && days > 0),
  });
}

export function useNextInterestPeriod(loanId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['loans', loanId, 'next-interest-period'],
    queryFn: () => loansApi.getNextInterestPeriod(loanId!),
    enabled: Boolean(loanId) && enabled,
  });
}

function invalidateLoanEverything(qc: ReturnType<typeof useQueryClient>, loanId: string) {
  void qc.invalidateQueries({ queryKey: queryKeys.loans.detail(loanId) });
  void qc.invalidateQueries({ queryKey: queryKeys.loans.summary(loanId) });
  void qc.invalidateQueries({ queryKey: queryKeys.loans.lists() });
  void qc.invalidateQueries({ queryKey: ['loans', loanId, 'related-persons'] });
  void qc.invalidateQueries({ queryKey: ['loans', loanId, 'collaterals'] });
  void qc.invalidateQueries({ queryKey: ['loans', loanId, 'valuations'] });
  void qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
  void qc.invalidateQueries({ queryKey: queryKeys.reports.all });
}

export function useCreateLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateLoanPayload) => loansApi.create(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.loans.lists() });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}

export function useUpdateLoan(loanId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateLoanPayload) => loansApi.update(loanId, payload),
    onSuccess: () => invalidateLoanEverything(qc, loanId),
  });
}

export function useUpdateLoanStatus(loanId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (status: LoanStatus) => loansApi.updateStatus(loanId, status),
    onSuccess: () => invalidateLoanEverything(qc, loanId),
  });
}

export function useDeleteLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      loansApi.remove(id, reason),
    onSuccess: (_res, vars) => {
      qc.removeQueries({ queryKey: queryKeys.loans.detail(vars.id) });
      qc.removeQueries({ queryKey: queryKeys.loans.summary(vars.id) });
      void qc.invalidateQueries({ queryKey: queryKeys.loans.lists() });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      void qc.invalidateQueries({ queryKey: queryKeys.reports.all });
    },
  });
}

export function useAddCollateral(loanId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCollateralPayload) => loansApi.addCollateral(loanId, payload),
    onSuccess: () => invalidateLoanEverything(qc, loanId),
  });
}

export function useUpdateCollateral(loanId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateCollateralPayload }) =>
      loansApi.updateCollateral(id, payload),
    onSuccess: () => invalidateLoanEverything(qc, loanId),
  });
}

export function useDeleteCollateral(loanId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (collateralId: string) => loansApi.deleteCollateral(collateralId),
    onSuccess: () => invalidateLoanEverything(qc, loanId),
  });
}

export function useCreateDisbursement(loanId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateDisbursementPayload) =>
      loansApi.createDisbursement(loanId, payload),
    onSuccess: () => invalidateLoanEverything(qc, loanId),
  });
}

export function useUpdateDisbursement(loanId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateDisbursementPayload }) =>
      loansApi.updateDisbursement(id, payload),
    onSuccess: () => invalidateLoanEverything(qc, loanId),
  });
}

export function useDeleteDisbursement(loanId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      loansApi.deleteDisbursement(id, reason),
    onSuccess: () => invalidateLoanEverything(qc, loanId),
  });
}

export function useCreateRepayment(loanId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateRepaymentPayload) => loansApi.createRepayment(loanId, payload),
    onSuccess: () => invalidateLoanEverything(qc, loanId),
  });
}

export function useUpdateRepayment(loanId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateRepaymentPayload }) =>
      loansApi.updateRepayment(id, payload),
    onSuccess: () => invalidateLoanEverything(qc, loanId),
  });
}

export function useDeleteRepayment(loanId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      loansApi.deleteRepayment(id, reason),
    onSuccess: () => invalidateLoanEverything(qc, loanId),
  });
}

export function useRelatedPersons(loanId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['loans', loanId, 'related-persons'],
    queryFn: () => loansApi.listRelatedPersons(loanId!),
    enabled: Boolean(loanId) && enabled,
  });
}

export function useAddRelatedPerson(loanId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateRelatedPersonPayload) =>
      loansApi.addRelatedPerson(loanId, payload),
    onSuccess: () => invalidateLoanEverything(qc, loanId),
  });
}

export function useUpdateRelatedPerson(loanId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateRelatedPersonPayload }) =>
      loansApi.updateRelatedPerson(loanId, id, payload),
    onSuccess: () => invalidateLoanEverything(qc, loanId),
  });
}

export function useDeleteRelatedPerson(loanId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      loansApi.deleteRelatedPerson(loanId, id, reason),
    onSuccess: () => invalidateLoanEverything(qc, loanId),
  });
}

export function useLoanValuations(loanId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['loans', loanId, 'valuations'],
    queryFn: () => loansApi.listValuations(loanId!),
    enabled: Boolean(loanId) && enabled,
  });
}

export function useAddLoanValuation(loanId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateLoanValuationPayload) =>
      loansApi.addValuation(loanId, payload),
    onSuccess: () => invalidateLoanEverything(qc, loanId),
  });
}

export function useUpdateLoanValuation(loanId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateLoanValuationPayload }) =>
      loansApi.updateValuation(loanId, id, payload),
    onSuccess: () => invalidateLoanEverything(qc, loanId),
  });
}

export function useDeleteLoanValuation(loanId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => loansApi.deleteValuation(loanId, id),
    onSuccess: () => invalidateLoanEverything(qc, loanId),
  });
}
