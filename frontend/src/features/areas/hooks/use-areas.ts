import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query';
import { areasApi } from '../api/areas.api';
import type {
  CreateAreaGroupPayload,
  CreateCommunePayload,
  CreateHamletPayload,
  CreateProvincePayload,
  UpdateAreaGroupPayload,
  UpdateHamletPayload,
} from '../types/area.types';

export function useAreaTree(includeInactive = false) {
  return useQuery({
    queryKey: queryKeys.areas.tree(includeInactive),
    queryFn: () => areasApi.getTree(includeInactive),
    staleTime: 60_000,
  });
}

export function useProvinces() {
  return useQuery({
    queryKey: queryKeys.areas.provinces(),
    queryFn: () => areasApi.getProvinces(),
    staleTime: 60_000,
  });
}

export function useCommunesByProvince(provinceId: string | undefined | null) {
  return useQuery({
    queryKey: queryKeys.areas.communes(provinceId ?? ''),
    queryFn: () => areasApi.getCommunesByProvince(provinceId!),
    enabled: Boolean(provinceId),
    staleTime: 60_000,
  });
}

export function useHamletsByCommune(communeId: string | undefined | null) {
  return useQuery({
    queryKey: queryKeys.areas.hamlets(communeId ?? ''),
    queryFn: () => areasApi.getHamletsByCommune(communeId!),
    enabled: Boolean(communeId),
    staleTime: 30_000,
  });
}

export function useCreateProvince() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateProvincePayload) => areasApi.createProvince(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.areas.all });
    },
  });
}

export function useDeleteProvince() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => areasApi.deleteProvince(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.areas.all });
    },
  });
}

export function useCreateCommune() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCommunePayload) => areasApi.createCommune(payload),
    onSuccess: (created) => {
      void qc.invalidateQueries({ queryKey: queryKeys.areas.all });
      void qc.invalidateQueries({ queryKey: queryKeys.areas.communes(created.provinceId) });
    },
  });
}

export function useCreateHamlet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateHamletPayload) => areasApi.createHamlet(payload),
    onSuccess: (created) => {
      void qc.invalidateQueries({ queryKey: queryKeys.areas.all });
      void qc.invalidateQueries({ queryKey: queryKeys.areas.hamlets(created.communeId) });
    },
  });
}

export function useUpdateHamlet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateHamletPayload }) =>
      areasApi.updateHamlet(id, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.areas.all });
    },
  });
}

export function useDeleteCommune() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => areasApi.deleteCommune(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.areas.all });
    },
  });
}

export function useDeleteHamlet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => areasApi.deleteHamlet(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.areas.all });
    },
  });
}

export function useAreaGroups() {
  return useQuery({
    queryKey: queryKeys.areas.groups(),
    queryFn: () => areasApi.getAreaGroups(),
    staleTime: 30_000,
  });
}

export function useCreateAreaGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAreaGroupPayload) => areasApi.createAreaGroup(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.areas.groups() });
    },
  });
}

export function useUpdateAreaGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateAreaGroupPayload }) =>
      areasApi.updateAreaGroup(id, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.areas.groups() });
    },
  });
}

export function useDeleteAreaGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => areasApi.deleteAreaGroup(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.areas.groups() });
    },
  });
}


