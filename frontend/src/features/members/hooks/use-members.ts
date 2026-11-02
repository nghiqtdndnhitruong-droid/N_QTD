import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query';
import { membersApi } from '../api/members.api';
import type {
  CreateMemberPayload,
  MemberListQuery,
  UpdateMemberPayload,
} from '../types/member.types';

export function useMembersList(query: MemberListQuery) {
  return useQuery({
    queryKey: queryKeys.members.list(query as Record<string, unknown>),
    queryFn: () => membersApi.list(query),
    placeholderData: keepPreviousData,
  });
}

export function useMemberDetail(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.members.detail(id ?? ''),
    queryFn: () => membersApi.getById(id!),
    enabled: Boolean(id),
  });
}

export function useCreateMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateMemberPayload) => membersApi.create(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.members.lists() });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}

export function useUpdateMember(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateMemberPayload) => membersApi.update(id, payload),
    onSuccess: (updated) => {
      qc.setQueryData(queryKeys.members.detail(id), updated);
      void qc.invalidateQueries({ queryKey: queryKeys.members.lists() });
    },
  });
}

export function useDeleteMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      membersApi.remove(id, reason),
    onSuccess: (_res, vars) => {
      qc.removeQueries({ queryKey: queryKeys.members.detail(vars.id) });
      void qc.invalidateQueries({ queryKey: queryKeys.members.lists() });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}
