import { apiDelete, apiGet, apiGetPaginated, apiPatch, apiPost, apiPut } from '@/lib/http';
import type { Paginated } from '@/shared/types';
import type { AuthUser } from '@/stores/auth.store';

export interface CreateUserPayload {
  username: string;
  password: string;
  fullName: string;
  idType?: 'CAN_CUOC_CONG_DAN' | 'CAN_CUOC';
  idNumber?: string | null;
  idIssueDate?: string | null;
  idIssuePlace?: string | null;
  yearOfBirth?: number | null;
  gender?: 'NAM' | 'NU' | null;
}

export interface UpdateUserPayload {
  fullName?: string;
  idType?: 'CAN_CUOC_CONG_DAN' | 'CAN_CUOC';
  idNumber?: string | null;
  idIssueDate?: string | null;
  idIssuePlace?: string | null;
  yearOfBirth?: number | null;
  gender?: 'NAM' | 'NU' | null;
  status?: 'ACTIVE' | 'LOCKED';
}

export async function getUsersApi(params?: {
  search?: string;
  status?: 'ACTIVE' | 'LOCKED';
  page?: number;
  limit?: number;
}): Promise<Paginated<AuthUser>> {
  return apiGetPaginated<AuthUser>('/users', params);
}

export async function getUserByIdApi(id: string): Promise<AuthUser> {
  return apiGet<AuthUser>(`/users/${id}`);
}

export async function createUserApi(payload: CreateUserPayload): Promise<AuthUser> {
  return apiPost<AuthUser, CreateUserPayload>('/users', payload);
}

export async function updateUserApi(id: string, payload: UpdateUserPayload): Promise<AuthUser> {
  return apiPut<AuthUser, UpdateUserPayload>(`/users/${id}`, payload);
}

export async function updateUserStatusApi(id: string, status: 'ACTIVE' | 'LOCKED'): Promise<AuthUser> {
  return apiPatch<AuthUser, { status: 'ACTIVE' | 'LOCKED' }>(`/users/${id}/status`, { status });
}

export async function resetUserPasswordApi(id: string, newPassword: string): Promise<{ message: string }> {
  return apiPatch<{ message: string }, { newPassword: string }>(`/users/${id}/reset-password`, { newPassword });
}

export async function deleteUserApi(id: string): Promise<{ message: string }> {
  return apiDelete<{ message: string }>(`/users/${id}`);
}
