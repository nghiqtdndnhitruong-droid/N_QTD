import { create } from 'zustand';
import { queryClient } from '@/lib/query';

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
  | 'interest-rate:update'
  | 'interest-rate:delete'
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
    'interest-rate:update',
    'interest-rate:delete',
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

export interface UserProfileData {
  fullName: string;
  idType: 'CAN_CUOC_CONG_DAN' | 'CAN_CUOC';
  idNumber: string | null;
  idIssueDate: string | null;
  idIssuePlace: string | null;
  yearOfBirth: number | null;
  gender: 'NAM' | 'NU' | null;
}

export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  title: string;
  roles: UserRole[];
  role?: UserRole;
  status?: string;
  permissions: Permission[];
  profile?: UserProfileData;
  createdAt?: string;
  lastLoginAt?: string | null;
}

interface AuthState {
  /** Access token chỉ giữ trong bộ nhớ (không ghi vào localStorage để tránh XSS). */
  accessToken: string | null;
  user: AuthUser | null;
  isInitialized: boolean;
  setSession: (payload: { accessToken: string; user: AuthUser }) => void;
  updateUserProfile: (profile: UserProfileData) => void;
  clearSession: () => void;
  setInitialized: (initialized: boolean) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  user: null,
  isInitialized: false,
  setSession: ({ accessToken, user }) => {
    const current = get().user;
    if (!current || current.id !== user.id) {
      queryClient.clear();
    }
    set({
      accessToken,
      user,
      isInitialized: true,
    });
  },
  updateUserProfile: (profile) => {
    const current = get().user;
    if (!current) return;
    set({
      user: {
        ...current,
        fullName: profile.fullName || current.fullName,
        profile,
      },
    });
  },
  clearSession: () => {
    queryClient.clear();
    set({
      accessToken: null,
      user: null,
      isInitialized: true,
    });
  },
  setInitialized: (isInitialized) => set({ isInitialized }),
}));

