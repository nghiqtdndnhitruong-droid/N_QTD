import type { ListQueryParams } from '@/shared/types';

export interface AssetPricingRule {
  id: string;
  landCategory: string;
  pricePerSqMeter: number;
  effectiveDate: string;
  isActive: boolean;
  note: string | null;
  sortOrder?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAssetPricingPayload {
  landCategory: string;
  pricePerSqMeter: number;
  effectiveDate: string;
  isActive?: boolean;
  note?: string;
}

export type UpdateAssetPricingPayload = Partial<CreateAssetPricingPayload>;

export interface AssetPricingListQuery extends ListQueryParams {
  landCategory?: string;
  isActive?: boolean;
}

export interface ValuationCalculationResult {
  landCategory: string;
  pricePerSqMeter: number;
  area: number;
  valuationAmount: number;
  effectiveDate: string;
}

