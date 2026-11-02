import { AssetPricingRule } from '@prisma/client';
import { PaginationQuery } from '../../shared/types';

export interface CreateAssetPricingRuleDto {
  landCategory: string; // "Đất ruộng", "Cập kênh", "Cập đường lộ"...
  pricePerSqMeter: number; // Đơn giá VNĐ / m²
  effectiveDate: string | Date;
  isActive?: boolean;
  note?: string;
}

export interface UpdateAssetPricingRuleDto extends Partial<CreateAssetPricingRuleDto> {}

export interface AssetPricingFilterQuery extends PaginationQuery {
  landCategory?: string;
  isActive?: boolean;
}

export type AssetPricingRuleEntity = AssetPricingRule;

