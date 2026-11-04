import {
  apiDelete,
  apiGet,
  apiGetPaginated,
  apiPatch,
  apiPost,
  apiPut,
} from '@/lib/http';
import type { LoanStatus, Paginated } from '@/shared/types';
import type {
  Collateral,
  CreateCollateralPayload,
  CreateLoanValuationPayload,
  CreateDisbursementPayload,
  CreateLoanPayload,
  CreateRelatedPersonPayload,
  CreateRepaymentPayload,
  DeleteLoanResult,
  Disbursement,
  InterestEstimate,
  Loan,
  LoanListQuery,
  LoanValuation,
  LoanSummary,
  NextInterestPeriodInfo,
  RelatedPerson,
  Repayment,
  UpdateCollateralPayload,
  UpdateDisbursementPayload,
  UpdateLoanPayload,
  UpdateLoanValuationPayload,
  UpdateRelatedPersonPayload,
  UpdateRepaymentPayload,
} from '../types/loan.types';

export const loansApi = {
  list(query: LoanListQuery): Promise<Paginated<Loan>> {
    return apiGetPaginated<Loan>('/loans', query as Record<string, unknown>);
  },

  getById(id: string): Promise<Loan> {
    return apiGet<Loan>(`/loans/${id}`);
  },

  getSummary(id: string): Promise<LoanSummary> {
    return apiGet<LoanSummary>(`/loans/${id}/summary`);
  },

  create(payload: CreateLoanPayload): Promise<Loan> {
    return apiPost<Loan, CreateLoanPayload>('/loans', payload);
  },

  update(id: string, payload: UpdateLoanPayload): Promise<Loan> {
    return apiPut<Loan, UpdateLoanPayload>(`/loans/${id}`, payload);
  },

  updateStatus(id: string, status: LoanStatus): Promise<Loan> {
    return apiPatch<Loan, { status: LoanStatus }>(`/loans/${id}/status`, { status });
  },

  remove(id: string, reason?: string): Promise<DeleteLoanResult> {
    return apiDelete<DeleteLoanResult>(`/loans/${id}`, {
      data: reason ? { reason } : undefined,
    });
  },

  // Tài sản thế chấp
  listCollaterals(loanId: string): Promise<Collateral[]> {
    return apiGet<Collateral[]>(`/loans/${loanId}/collaterals`);
  },

  addCollateral(loanId: string, payload: CreateCollateralPayload): Promise<Collateral> {
    return apiPost<Collateral, CreateCollateralPayload>(
      `/loans/${loanId}/collaterals`,
      payload,
    );
  },

  updateCollateral(collateralId: string, payload: UpdateCollateralPayload): Promise<Collateral> {
    return apiPut<Collateral, UpdateCollateralPayload>(
      `/collaterals/${collateralId}`,
      payload,
    );
  },

  deleteCollateral(collateralId: string): Promise<void> {
    return apiDelete(`/collaterals/${collateralId}`);
  },

  // Định giá tài sản khoản vay
  listValuations(loanId: string): Promise<LoanValuation[]> {
    return apiGet<LoanValuation[]>(`/loans/${loanId}/valuations`);
  },

  addValuation(loanId: string, payload: CreateLoanValuationPayload): Promise<LoanValuation> {
    return apiPost<LoanValuation, CreateLoanValuationPayload>(
      `/loans/${loanId}/valuations`,
      payload
    );
  },

  updateValuation(
    loanId: string,
    valuationId: string,
    payload: UpdateLoanValuationPayload
  ): Promise<LoanValuation> {
    return apiPut<LoanValuation, UpdateLoanValuationPayload>(
      `/loans/${loanId}/valuations/${valuationId}`,
      payload
    );
  },

  updateCommonValuationSettings(
    loanId: string,
    payload: { valuationType?: string; valuationDate?: string | null }
  ): Promise<{ count: number }> {
    return apiPut<{ count: number }>(`/loans/${loanId}/valuations/common`, payload);
  },

  deleteValuation(loanId: string, valuationId: string): Promise<void> {
    return apiDelete(`/loans/${loanId}/valuations/${valuationId}`);
  },

  // Người liên quan (chỉ áp dụng cho vay thế chấp >= 140.000.000)
  listRelatedPersons(loanId: string): Promise<RelatedPerson[]> {
    return apiGet<RelatedPerson[]>(`/loans/${loanId}/related-persons`);
  },

  addRelatedPerson(loanId: string, payload: CreateRelatedPersonPayload): Promise<RelatedPerson> {
    return apiPost<RelatedPerson, CreateRelatedPersonPayload>(
      `/loans/${loanId}/related-persons`,
      payload,
    );
  },

  updateRelatedPerson(
    loanId: string,
    personId: string,
    payload: UpdateRelatedPersonPayload,
  ): Promise<RelatedPerson> {
    return apiPut<RelatedPerson, UpdateRelatedPersonPayload>(
      `/loans/${loanId}/related-persons/${personId}`,
      payload,
    );
  },

  deleteRelatedPerson(
    loanId: string,
    personId: string,
    reason?: string,
  ): Promise<RelatedPerson> {
    return apiDelete<RelatedPerson>(`/loans/${loanId}/related-persons/${personId}`, {
      data: reason ? { reason } : undefined,
    });
  },

  // Giải ngân
  listDisbursements(loanId: string): Promise<Disbursement[]> {
    return apiGet<Disbursement[]>(`/loans/${loanId}/disbursements`);
  },

  createDisbursement(
    loanId: string,
    payload: CreateDisbursementPayload,
  ): Promise<{ disbursement: Disbursement; maturityDate?: string }> {
    return apiPost<{ disbursement: Disbursement; maturityDate?: string }, CreateDisbursementPayload>(
      `/loans/${loanId}/disbursements`,
      payload,
    );
  },

  updateDisbursement(
    disbursementId: string,
    payload: UpdateDisbursementPayload,
  ): Promise<Disbursement> {
    return apiPut<Disbursement, UpdateDisbursementPayload>(
      `/disbursements/${disbursementId}`,
      payload,
    );
  },

  deleteDisbursement(disbursementId: string, reason?: string): Promise<Disbursement> {
    return apiDelete<Disbursement>(`/disbursements/${disbursementId}`, {
      data: reason ? { reason } : undefined,
    });
  },

  // Trả nợ
  listRepayments(loanId: string): Promise<Repayment[]> {
    return apiGet<Repayment[]>(`/loans/${loanId}/repayments`);
  },

  getNextInterestPeriod(loanId: string): Promise<NextInterestPeriodInfo> {
    return apiGet<NextInterestPeriodInfo>(`/loans/${loanId}/repayments/next-interest-period`);
  },

  estimateInterest(
    loanId: string,
    params: { days?: number; asOfDate?: string },
  ): Promise<InterestEstimate> {
    return apiGet<InterestEstimate>(`/loans/${loanId}/repayments/estimate-interest`, {
      params,
    });
  },

  createRepayment(
    loanId: string,
    payload: CreateRepaymentPayload,
  ): Promise<{
    repayment: Repayment;
    remainingPrincipalBalance: number;
    isFullySettled: boolean;
  }> {
    return apiPost(`/loans/${loanId}/repayments`, payload);
  },

  updateRepayment(
    repaymentId: string,
    payload: UpdateRepaymentPayload,
  ): Promise<{
    repayment: Repayment;
    remainingPrincipalBalance: number;
    isFullySettled: boolean;
  }> {
    return apiPut(`/repayments/${repaymentId}`, payload);
  },

  deleteRepayment(
    repaymentId: string,
    reason?: string,
  ): Promise<{
    repayment: Repayment;
    remainingPrincipalBalance: number;
    isFullySettled: boolean;
  }> {
    return apiDelete(`/repayments/${repaymentId}`, {
      data: reason ? { reason } : undefined,
    });
  },
};
