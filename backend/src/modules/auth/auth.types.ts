import { UserRole, AccountStatus, IdDocumentType, Gender } from '@prisma/client';

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
  idType: IdDocumentType;
  idNumber: string | null;
  idIssueDate: string | null;
  idIssuePlace: string | null;
  yearOfBirth: number | null;
  gender: Gender | null;
}

export interface AuthUserResponse {
  id: string;
  username: string;
  fullName: string;
  title: string;
  roles: UserRole[];
  role: UserRole;
  status: AccountStatus;
  permissions: Permission[];
  profile?: UserProfileData;
  createdAt: string;
  lastLoginAt?: string | null;
}

export interface LoginResult {
  accessToken: string;
  expiresIn: number;
  user: AuthUserResponse;
}

export interface TokenPayload {
  userId: string;
  username: string;
  role: UserRole;
}

