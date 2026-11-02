import { LoanTermType, InterestRateConfig } from '@prisma/client';
import { PaginationQuery } from '../../shared/types';

export interface InterestRateTierDto {
  minAmount: number;
  maxAmount: number;
  annualRate: number; // Ví dụ: 12.6 tương ứng 12.6%/năm
}

export interface CreateInterestRateConfigDto {
  effectiveDate: string | Date;
  termType: LoanTermType;
  tiers: InterestRateTierDto[];
  isActive?: boolean;
  note?: string;
}

export interface InterestRateFilterQuery extends PaginationQuery {
  termType?: LoanTermType;
  isActive?: boolean;
}

export type InterestRateConfigEntity = InterestRateConfig;

