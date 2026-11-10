import { apiDelete, apiGet, apiGetPaginated, apiPatch, apiPost, apiPut } from '@/lib/http';
import type { Paginated } from '@/shared/types';
import type {
  AssetPricingListQuery,
  AssetPricingRule,
  CreateAssetPricingPayload,
  UpdateAssetPricingPayload,
  ValuationCalculationResult,
} from '../types/asset-pricing.types';

export const assetPricingApi = {
  list(query: AssetPricingListQuery): Promise<Paginated<AssetPricingRule>> {
    return apiGetPaginated<AssetPricingRule>(
      '/asset-pricing-rules',
      query as Record<string, unknown>,
    );
  },

  calculate(params: { landCategory: string; area: number }): Promise<ValuationCalculationResult> {
    return apiGet<ValuationCalculationResult>('/asset-pricing-rules/calculate', {
      params,
    });
  },

  create(payload: CreateAssetPricingPayload): Promise<AssetPricingRule> {
    return apiPost<AssetPricingRule, CreateAssetPricingPayload>(
      '/asset-pricing-rules',
      payload,
    );
  },

  update(id: string, payload: UpdateAssetPricingPayload): Promise<AssetPricingRule> {
    return apiPut<AssetPricingRule, UpdateAssetPricingPayload>(
      `/asset-pricing-rules/${id}`,
      payload,
    );
  },

  reorder(ruleIds: string[]): Promise<void> {
    return apiPatch<void, { ruleIds: string[] }>('/asset-pricing-rules/reorder', { ruleIds });
  },

  delete(id: string): Promise<AssetPricingRule> {
    return apiDelete<AssetPricingRule>(`/asset-pricing-rules/${id}`);
  },
};

