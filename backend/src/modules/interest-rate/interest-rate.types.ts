import { LoanTermType, LoanType, InterestRateConfig } from '@prisma/client';
import { PaginationQuery } from '../../shared/types';

export interface InterestRateTierDto {
  minAmount: number;
  maxAmount: number;
  annualRate: number; // Ví dụ: 12.6 tương ứng 12.6%/năm
}

export interface CreateInterestRateConfigDto {
  effectiveDate: string | Date;
  loanType?: LoanType;
  termType?: LoanTermType | null;
  tiers: InterestRateTierDto[];
  isActive?: boolean;
  note?: string;
}

export interface UpdateInterestRateConfigDto {
  effectiveDate?: string | Date;
  loanType?: LoanType;
  termType?: LoanTermType | null;
  tiers?: InterestRateTierDto[];
  isActive?: boolean;
  note?: string;
}

export interface InterestRateFilterQuery extends PaginationQuery {
  loanType?: LoanType;
  termType?: LoanTermType;
  isActive?: boolean;
}

export type InterestRateConfigEntity = InterestRateConfig;

