import { apiDelete, apiGet, apiGetPaginated, apiPost, apiPut } from '@/lib/http';
import type { LoanTermType, LoanType, Paginated } from '@/shared/types';
import type {
  CreateInterestRatePayload,
  InterestRateConfig,
  InterestRateListQuery,
  UpdateInterestRatePayload,
} from '../types/interest-rate.types';

export const interestRatesApi = {
  list(query: InterestRateListQuery): Promise<Paginated<InterestRateConfig>> {
    return apiGetPaginated<InterestRateConfig>(
      '/interest-rates',
      query as Record<string, unknown>,
    );
  },

  getCurrent(
    params: { loanType?: LoanType; termType?: LoanTermType | null } | LoanTermType,
  ): Promise<InterestRateConfig> {
    const queryParams: Record<string, unknown> = {};
    if (typeof params === 'string') {
      queryParams.loanType = 'THE_CHAP';
      queryParams.termType = params;
    } else if (params) {
      if (params.loanType) queryParams.loanType = params.loanType;
      if (params.termType) queryParams.termType = params.termType;
    }
    return apiGet<InterestRateConfig>('/interest-rates/current', {
      params: queryParams,
    });
  },

  getById(id: string): Promise<InterestRateConfig> {
    return apiGet<InterestRateConfig>(`/interest-rates/${id}`);
  },

  create(payload: CreateInterestRatePayload): Promise<InterestRateConfig> {
    return apiPost<InterestRateConfig, CreateInterestRatePayload>('/interest-rates', payload);
  },

  update(id: string, payload: UpdateInterestRatePayload): Promise<InterestRateConfig> {
    return apiPut<InterestRateConfig, UpdateInterestRatePayload>(`/interest-rates/${id}`, payload);
  },

  delete(id: string): Promise<{ id: string }> {
    return apiDelete<{ id: string }>(`/interest-rates/${id}`);
  },
};

