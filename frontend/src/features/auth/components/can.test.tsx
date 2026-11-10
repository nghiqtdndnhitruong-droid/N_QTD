import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { ROLE_PERMISSIONS, useAuthStore } from '@/stores/auth.store';
import { Can } from './can';

describe('RBAC <Can /> component', () => {
  beforeEach(() => {
    useAuthStore.getState().setSession({
      accessToken: 'test-token',
      user: {
        id: 'u1',
        username: 'cbtd',
        fullName: 'Cán bộ A',
        title: 'Cán bộ tín dụng',
        roles: ['CREDIT_OFFICER'],
        permissions: [...ROLE_PERMISSIONS.CREDIT_OFFICER],
      },
    });
  });

  it('hiển thị thao tác thuộc quyền Cán bộ tín dụng và ẩn thao tác chỉ dành cho Admin', () => {
    render(
      <div>
        <Can perm="loan:create">
          <button type="button">Lập hồ sơ vay</button>
        </Can>
        <Can perm="interest-rate:create">
          <button type="button">Ban hành bảng lãi suất</button>
        </Can>
      </div>,
    );

    expect(screen.getByText('Lập hồ sơ vay')).toBeInTheDocument();
    expect(screen.queryByText('Ban hành bảng lãi suất')).not.toBeInTheDocument();
  });

  it('hiển thị nút quản trị khi người dùng có vai trò ADMIN', () => {
    useAuthStore.getState().setSession({
      accessToken: 'test-admin-token',
      user: {
        id: 'u-admin',
        username: 'ADMIN',
        fullName: 'Quản trị viên',
        title: 'Quản trị hệ thống',
        roles: ['ADMIN'],
        permissions: [...ROLE_PERMISSIONS.ADMIN],
      },
    });

    render(
      <Can perm="interest-rate:create">
        <button type="button">Ban hành bảng lãi suất</button>
      </Can>,
    );

    expect(screen.getByText('Ban hành bảng lãi suất')).toBeInTheDocument();
  });
});

