import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getUsersApi,
  createUserApi,
  updateUserApi,
  updateUserStatusApi,
  resetUserPasswordApi,
  deleteUserApi,
  type CreateUserPayload,
  type UpdateUserPayload,
} from '../api/users.api';

export const USERS_QUERY_KEY = ['users'] as const;

export function useUsersList(params?: {
  search?: string;
  status?: 'ACTIVE' | 'LOCKED';
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: [...USERS_QUERY_KEY, params],
    queryFn: () => getUsersApi(params),
    staleTime: 10_000,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateUserPayload) => createUserApi(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateUserPayload }) =>
      updateUserApi(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
    },
  });
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ACTIVE' | 'LOCKED' }) =>
      updateUserStatusApi(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
    },
  });
}

export function useResetUserPassword() {
  return useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword: string }) =>
      resetUserPasswordApi(id, newPassword),
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteUserApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
    },
  });
}

