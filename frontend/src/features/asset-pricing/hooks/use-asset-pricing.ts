import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query';
import { assetPricingApi } from '../api/asset-pricing.api';
import type {
  AssetPricingListQuery,
  CreateAssetPricingPayload,
  UpdateAssetPricingPayload,
} from '../types/asset-pricing.types';

export function useAssetPricingList(query: AssetPricingListQuery) {
  return useQuery({
    queryKey: queryKeys.assetPricing.list(query as Record<string, unknown>),
    queryFn: () => assetPricingApi.list(query),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
  });
}

export function useCreateAssetPricing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAssetPricingPayload) => assetPricingApi.create(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.assetPricing.all });
    },
  });
}

export function useUpdateAssetPricing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateAssetPricingPayload }) =>
      assetPricingApi.update(id, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.assetPricing.all });
    },
  });
}

export function useReorderAssetPricing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ruleIds: string[]) => assetPricingApi.reorder(ruleIds),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.assetPricing.all });
    },
  });
}

export function useDeleteAssetPricing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => assetPricingApi.delete(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.assetPricing.all });
    },
  });
}

