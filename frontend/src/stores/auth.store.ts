import { create } from 'zustand';

export type UserRole = 'CREDIT_OFFICER' | 'ADMIN';

export type Permission =
  | 'dashboard:view'
  | 'member:view'
  | 'member:create'
  | 'member:update'
  | 'member:delete'
  | 'loan:view'
  | 'loan:create'
  | 'loan:update'
  | 'loan:delete'
  | 'loan:change-status'
  | 'collateral:view'
  | 'collateral:create'
  | 'collateral:update'
  | 'collateral:delete'
  | 'disbursement:view'
  | 'disbursement:create'
  | 'disbursement:update'
  | 'disbursement:delete'
  | 'repayment:view'
  | 'repayment:create'
  | 'repayment:update'
  | 'repayment:delete'
  | 'interest-rate:view'
  | 'interest-rate:create'
  | 'asset-pricing:view'
  | 'asset-pricing:create'
  | 'asset-pricing:update'
  | 'area:view'
  | 'area:manage'
  | 'report:view'
  | 'report:export'
  | 'document:print'
  | 'user:view'
  | 'user:manage'
  | 'role:manage';

export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  CREDIT_OFFICER: [
    'dashboard:view',
    'member:view',
    'member:create',
    'member:update',
    'member:delete',
    'loan:view',
    'loan:create',
    'loan:update',
    'loan:delete',
    'loan:change-status',
    'collateral:view',
    'collateral:create',
    'collateral:update',
    'collateral:delete',
    'disbursement:view',
    'disbursement:create',
    'disbursement:update',
    'disbursement:delete',
    'repayment:view',
    'repayment:create',
    'repayment:update',
    'repayment:delete',
    'interest-rate:view',
    'asset-pricing:view',
    'area:view',
    'area:manage',
    'report:view',
    'report:export',
    'document:print',
  ],
  ADMIN: [
    'dashboard:view',
    'member:view',
    'member:create',
    'member:update',
    'member:delete',
    'loan:view',
    'loan:create',
    'loan:update',
    'loan:delete',
    'loan:change-status',
    'collateral:view',
    'collateral:create',
    'collateral:update',
    'collateral:delete',
    'disbursement:view',
    'disbursement:create',
    'disbursement:update',
    'disbursement:delete',
    'repayment:view',
    'repayment:create',
    'repayment:update',
    'repayment:delete',
    'interest-rate:view',
    'interest-rate:create',
    'asset-pricing:view',
    'asset-pricing:create',
    'asset-pricing:update',
    'area:view',
    'area:manage',
    'report:view',
    'report:export',
    'document:print',
    'user:view',
    'user:manage',
    'role:manage',
  ],
};

export const ROLE_LABELS: Record<UserRole, string> = {
  CREDIT_OFFICER: 'Cán bộ tín dụng',
  ADMIN: 'Quản trị hệ thống',
};

export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  title: string;
  roles: UserRole[];
  permissions: Permission[];
}

interface AuthState {
  /** Access token chỉ giữ trong bộ nhớ (không ghi vào localStorage để tránh XSS). */
  accessToken: string | null;
  user: AuthUser | null;
  isInitialized: boolean;
  setSession: (payload: { accessToken: string; user: AuthUser }) => void;
  clearSession: () => void;
  setInitialized: (initialized: boolean) => void;
  /** Chỉ dùng trong môi trường DEV/Mock để kiểm thử nhanh quyền hiển thị theo vai trò. */
  switchMockRole: (role: UserRole) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  user: null,
  isInitialized: false,
  setSession: ({ accessToken, user }) =>
    set({
      accessToken,
      user,
      isInitialized: true,
    }),
  clearSession: () =>
    set({
      accessToken: null,
      user: null,
      isInitialized: true,
    }),
  setInitialized: (isInitialized) => set({ isInitialized }),
  switchMockRole: (role) => {
    const current = get().user;
    if (!current) return;
    set({
      user: {
        ...current,
        roles: [role],
        title: ROLE_LABELS[role],
        permissions: [...ROLE_PERMISSIONS[role]],
      },
    });
  },
}));

