import { apiGet, apiPost, apiPut } from '@/lib/http';
import {
  type AuthUser,
  type UserProfileData,
  useAuthStore,
} from '@/stores/auth.store';

const TOKEN_KEY = 'qtd.accessToken';

export interface LoginPayload {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  expiresIn: number;
  user: AuthUser;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateProfilePayload {
  fullName: string;
  idType: 'CAN_CUOC_CONG_DAN' | 'CAN_CUOC';
  idNumber?: string | null;
  idIssueDate?: string | null;
  idIssuePlace?: string | null;
  yearOfBirth?: number | null;
  gender?: 'NAM' | 'NU' | null;
}

export async function loginApi(payload: LoginPayload): Promise<LoginResponse> {
  const res = await apiPost<LoginResponse, LoginPayload>('/auth/login', payload);
  if (res?.accessToken) {
    try {
      sessionStorage.setItem(TOKEN_KEY, res.accessToken);
    } catch {
      // Bỏ qua nếu môi trường không cho phép truy cập sessionStorage
    }
  }
  return res;
}

export async function restoreSessionApi(): Promise<LoginResponse | null> {
  try {
    let token: string | null = null;
    try {
      token = sessionStorage.getItem(TOKEN_KEY);
    } catch {
      // fallback
    }
    if (!token) {
      token = useAuthStore.getState().accessToken;
    }
    if (!token) {
      return null;
    }

    const user = await apiGet<AuthUser>('/auth/me');
    return {
      accessToken: token,
      expiresIn: 86400,
      user,
    };
  } catch {
    try {
      sessionStorage.removeItem(TOKEN_KEY);
    } catch {
      // ignore
    }
    return null;
  }
}

export async function logoutApi(): Promise<void> {
  try {
    await apiPost('/auth/logout');
  } catch {
    // Bỏ qua lỗi mạng khi logout
  } finally {
    try {
      sessionStorage.removeItem(TOKEN_KEY);
    } catch {
      // ignore
    }
  }
}

export async function getProfileApi(): Promise<UserProfileData> {
  return apiGet<UserProfileData>('/auth/profile');
}

export async function updateProfileApi(payload: UpdateProfilePayload): Promise<UserProfileData> {
  return apiPut<UserProfileData, UpdateProfilePayload>('/auth/profile', payload);
}

export async function changePasswordApi(payload: ChangePasswordPayload): Promise<{ message: string }> {
  return apiPut<{ message: string }, ChangePasswordPayload>('/auth/change-password', payload);
}
