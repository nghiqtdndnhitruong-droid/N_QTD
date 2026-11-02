import type { ListQueryParams, LoanTermType } from '@/shared/types';

export interface InterestRateTier {
  minAmount: number;
  maxAmount: number;
  annualRate: number;
}

export interface InterestRateConfig {
  id: string;
  effectiveDate: string;
  termType: LoanTermType;
  tiers: InterestRateTier[];
  isActive: boolean;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInterestRatePayload {
  effectiveDate: string;
  termType: LoanTermType;
  tiers: InterestRateTier[];
  isActive?: boolean;
  note?: string;
}

export interface InterestRateListQuery extends ListQueryParams {
  termType?: LoanTermType;
  isActive?: boolean;
}

