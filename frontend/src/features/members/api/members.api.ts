import { apiDelete, apiGet, apiGetPaginated, apiPost, apiPut } from '@/lib/http';
import type { Paginated } from '@/shared/types';
import type {
  CreateMemberPayload,
  DeleteMemberResult,
  Member,
  MemberListQuery,
  UpdateMemberPayload,
} from '../types/member.types';

export const membersApi = {
  list(query: MemberListQuery): Promise<Paginated<Member>> {
    return apiGetPaginated<Member>('/members', query as Record<string, unknown>);
  },

  getById(id: string): Promise<Member> {
    return apiGet<Member>(`/members/${id}`);
  },

  create(payload: CreateMemberPayload): Promise<Member> {
    return apiPost<Member, CreateMemberPayload>('/members', payload);
  },

  update(id: string, payload: UpdateMemberPayload): Promise<Member> {
    return apiPut<Member, UpdateMemberPayload>(`/members/${id}`, payload);
  },

  remove(id: string, reason?: string): Promise<DeleteMemberResult> {
    return apiDelete<DeleteMemberResult>(`/members/${id}`, {
      data: reason ? { reason } : undefined,
    });
  },
};
