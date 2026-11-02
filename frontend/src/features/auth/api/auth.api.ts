import { env } from '@/config/env';
import { apiGet, apiPost } from '@/lib/http';
import {
  ROLE_LABELS,
  ROLE_PERMISSIONS,
  type AuthUser,
  type UserRole,
} from '@/stores/auth.store';

export interface LoginPayload {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  expiresIn: number;
  user: AuthUser;
}

const MOCK_SESSION_KEY = 'qtd.devMockUserRole';

const MOCK_USERS: Record<UserRole, { password: string; user: AuthUser }> = {
  CREDIT_OFFICER: {
    password: 'Password@123',
    user: {
      id: 'mock-user-cbtd-01',
      username: 'cbtd',
      fullName: 'Nguyễn Minh Tâm',
      title: ROLE_LABELS.CREDIT_OFFICER,
      roles: ['CREDIT_OFFICER'],
      permissions: [...ROLE_PERMISSIONS.CREDIT_OFFICER],
    },
  },
  ADMIN: {
    password: 'Password@123',
    user: {
      id: 'mock-user-admin-01',
      username: 'admin',
      fullName: 'Trần Quốc Bảo',
      title: ROLE_LABELS.ADMIN,
      roles: ['ADMIN'],
      permissions: [...ROLE_PERMISSIONS.ADMIN],
    },
  },
};

/**
 * [MOCK AUTH] Backend hiện chưa có module /auth.
 * Khi VITE_ENABLE_MOCK=true (chỉ ở DEV), sử dụng phiên giả lập có đánh dấu rõ.
 * Khi Backend triển khai xong POST /api/v1/auth/login, chỉ cần tắt VITE_ENABLE_MOCK.
 */
export async function loginApi(payload: LoginPayload): Promise<LoginResponse> {
  if (env.enableMock) {
    await new Promise((r) => setTimeout(r, 300));
    const normalized = payload.username.trim().toLowerCase();
    const role: UserRole | null =
      normalized === 'admin'
        ? 'ADMIN'
        : normalized === 'cbtd' || normalized === 'canbo'
          ? 'CREDIT_OFFICER'
          : null;

    const record = role ? MOCK_USERS[role] : null;
    if (!record || payload.password !== record.password) {
      throw new Error(
        'Tên đăng nhập hoặc mật khẩu không đúng (Gợi ý DEV: cbtd / Password@123 hoặc admin / Password@123)',
      );
    }

    try {
      window.sessionStorage.setItem(MOCK_SESSION_KEY, role!);
    } catch {
      // Bỏ qua
    }

    return {
      accessToken: `mock-jwt-${role}-${Date.now()}`,
      expiresIn: 86_400,
      user: record.user,
    };
  }

  return apiPost<LoginResponse, LoginPayload>('/auth/login', payload);
}

export async function restoreSessionApi(): Promise<LoginResponse | null> {
  if (env.enableMock) {
    try {
      const savedRole = (window.sessionStorage.getItem(MOCK_SESSION_KEY) as UserRole | null) ?? 'CREDIT_OFFICER';
      const record = MOCK_USERS[savedRole] ?? MOCK_USERS.CREDIT_OFFICER;
      return {
        accessToken: `mock-jwt-${savedRole}`,
        expiresIn: 86_400,
        user: record.user,
      };
    } catch {
      return {
        accessToken: 'mock-jwt-CREDIT_OFFICER',
        expiresIn: 86_400,
        user: MOCK_USERS.CREDIT_OFFICER.user,
      };
    }
  }

  try {
    const refresh = await apiPost<{ accessToken: string; expiresIn: number }>('/auth/refresh');
    const user = await apiGet<AuthUser>('/auth/me', {
      headers: { Authorization: `Bearer ${refresh.accessToken}` },
    });
    return {
      accessToken: refresh.accessToken,
      expiresIn: refresh.expiresIn,
      user,
    };
  } catch {
    return null;
  }
}

export async function logoutApi(): Promise<void> {
  if (env.enableMock) {
    try {
      window.sessionStorage.removeItem(MOCK_SESSION_KEY);
    } catch {
      // Bỏ qua
    }
    return;
  }
  await apiPost('/auth/logout');
}

