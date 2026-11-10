import type { ListQueryParams, LoanTermType, LoanType } from '@/shared/types';

export interface InterestRateTier {
  minAmount: number;
  maxAmount: number;
  annualRate: number;
}

export interface InterestRateConfig {
  id: string;
  effectiveDate: string;
  loanType: LoanType;
  termType: LoanTermType | null;
  tiers: InterestRateTier[];
  isActive: boolean;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInterestRatePayload {
  effectiveDate: string;
  loanType: LoanType;
  termType?: LoanTermType | null;
  tiers: InterestRateTier[];
  isActive?: boolean;
  note?: string;
}

export interface UpdateInterestRatePayload {
  effectiveDate?: string;
  loanType?: LoanType;
  termType?: LoanTermType | null;
  tiers?: InterestRateTier[];
  isActive?: boolean;
  note?: string;
}

export interface InterestRateListQuery extends ListQueryParams {
  loanType?: LoanType;
  termType?: LoanTermType;
  isActive?: boolean;
}

