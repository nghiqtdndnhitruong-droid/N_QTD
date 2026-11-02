import { apiGet, apiGetPaginated, apiPost } from '@/lib/http';
import type { LoanTermType, Paginated } from '@/shared/types';
import type {
  CreateInterestRatePayload,
  InterestRateConfig,
  InterestRateListQuery,
} from '../types/interest-rate.types';

export const interestRatesApi = {
  list(query: InterestRateListQuery): Promise<Paginated<InterestRateConfig>> {
    return apiGetPaginated<InterestRateConfig>(
      '/interest-rates',
      query as Record<string, unknown>,
    );
  },

  getCurrent(termType: LoanTermType): Promise<InterestRateConfig> {
    return apiGet<InterestRateConfig>('/interest-rates/current', {
      params: { termType },
    });
  },

  getById(id: string): Promise<InterestRateConfig> {
    return apiGet<InterestRateConfig>(`/interest-rates/${id}`);
  },

  create(payload: CreateInterestRatePayload): Promise<InterestRateConfig> {
    return apiPost<InterestRateConfig, CreateInterestRatePayload>('/interest-rates', payload);
  },
};

