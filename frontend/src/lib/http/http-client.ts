import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import { env } from '@/config/env';
import type { ApiErrorResponse, ApiResponse, Paginated, PaginatedResponse } from '@/shared/types';
import { ApiError, type FieldErrorMap } from './api-error';

type TokenGetter = () => string | null;
type TokenRefresher = () => Promise<string | null>;
type UnauthorizedHandler = () => void;

let getAccessToken: TokenGetter = () => null;
let refreshAccessToken: TokenRefresher = async () => null;
let onUnauthorized: UnauthorizedHandler = () => undefined;

/**
 * Đăng ký các callback từ authStore mà không tạo circular dependency.
 */
export function configureHttpAuth(handlers: {
  getAccessToken: TokenGetter;
  refreshAccessToken: TokenRefresher;
  onUnauthorized: UnauthorizedHandler;
}): void {
  getAccessToken = handlers.getAccessToken;
  refreshAccessToken = handlers.refreshAccessToken;
  onUnauthorized = handlers.onUnauthorized;
}

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

export const httpClient: AxiosInstance = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 20_000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  withCredentials: true,
});

// 1. Request interceptor: gắn Bearer token từ bộ nhớ
httpClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Hàng đợi chống gọi /auth/refresh trùng lặp khi nhiều request cùng gặp 401
let refreshPromise: Promise<string | null> | null = null;

function extractFieldErrors(errors: unknown, errorCode?: string, fallbackMessage?: string): FieldErrorMap {
  const map: FieldErrorMap = {};

  if (Array.isArray(errors)) {
    for (const item of errors) {
      if (item && typeof item === 'object') {
        const rec = item as { field?: string; path?: string; message?: string };
        const key = (rec.field || rec.path || '').replace(/^body\./, '');
        if (key && typeof rec.message === 'string') {
          map[key] = [...(map[key] ?? []), rec.message];
        }
      }
    }
  } else if (errors && typeof errors === 'object') {
    for (const [k, v] of Object.entries(errors)) {
      if (Array.isArray(v) && v.every((s) => typeof s === 'string')) {
        map[k] = v;
      }
    }
  }

  if (Object.keys(map).length === 0 && errorCode && fallbackMessage) {
    if (errorCode === 'COLLATERAL_ASSET_CODE_EXISTS') {
      map.assetCode = [fallbackMessage];
    } else if (errorCode === 'MEMBER_CODE_EXISTS') {
      map.memberCode = [fallbackMessage];
    } else if (errorCode === 'MEMBER_ID_NUMBER_EXISTS') {
      map.idNumber = [fallbackMessage];
    } else if (errorCode === 'AREA_ALREADY_EXISTS') {
      map.name = [fallbackMessage];
    }
  }

  return map;
}

function normalizeAxiosError(error: AxiosError<ApiErrorResponse>): ApiError {
  if (!error.response) {
    return new ApiError({
      message: 'Không kết nối được tới máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.',
      status: 0,
      errorCode: 'NETWORK_ERROR',
      isNetworkError: true,
    });
  }

  const { status, data } = error.response;
  const fieldErrors = extractFieldErrors(data?.errors, data?.errorCode, data?.message);

  return new ApiError({
    message: data?.message || `Yêu cầu thất bại (HTTP ${status})`,
    status,
    errorCode: data?.errorCode,
    fieldErrors,
  });
}

// 2. Response interceptor: xử lý 401 refresh + chuẩn hóa lỗi
httpClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest = error.config as RetryableConfig | undefined;
    const status = error.response?.status;
    const isAuthEndpoint = originalRequest?.url?.includes('/auth/');

    if (status === 401 && originalRequest && !originalRequest._retried && !isAuthEndpoint) {
      originalRequest._retried = true;
      try {
        if (!refreshPromise) {
          refreshPromise = refreshAccessToken().finally(() => {
            refreshPromise = null;
          });
        }
        const newToken = await refreshPromise;
        if (newToken) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return httpClient(originalRequest);
        }
      } catch {
        // Refresh thất bại -> chuyển xuống onUnauthorized
      }
      onUnauthorized();
    }

    return Promise.reject(normalizeAxiosError(error));
  },
);

/**
 * Các hàm gọi API đã bóc sẵn `data` từ `ApiResponse<T>` / `PaginatedResponse<T>`.
 */
export async function apiGet<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const res = await httpClient.get<ApiResponse<T>>(url, config);
  return res.data.data as T;
}

export async function apiGetPaginated<T>(
  url: string,
  params?: Record<string, unknown>,
  config?: AxiosRequestConfig,
): Promise<Paginated<T>> {
  const cleanParams: Record<string, unknown> = {};
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') {
        cleanParams[k] = v;
      }
    }
  }
  const res = await httpClient.get<PaginatedResponse<T>>(url, {
    ...config,
    params: cleanParams,
  });
  return {
    items: res.data.data ?? [],
    pagination: res.data.pagination,
  };
}

export async function apiPost<T, B = unknown>(
  url: string,
  body?: B,
  config?: AxiosRequestConfig,
): Promise<T> {
  const res = await httpClient.post<ApiResponse<T>>(url, body, config);
  return res.data.data as T;
}

export async function apiPut<T, B = unknown>(
  url: string,
  body?: B,
  config?: AxiosRequestConfig,
): Promise<T> {
  const res = await httpClient.put<ApiResponse<T>>(url, body, config);
  return res.data.data as T;
}

export async function apiPatch<T, B = unknown>(
  url: string,
  body?: B,
  config?: AxiosRequestConfig,
): Promise<T> {
  const res = await httpClient.patch<ApiResponse<T>>(url, body, config);
  return res.data.data as T;
}

export async function apiDelete<T = void>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const res = await httpClient.delete<ApiResponse<T>>(url, config);
  return res.data.data as T;
}

