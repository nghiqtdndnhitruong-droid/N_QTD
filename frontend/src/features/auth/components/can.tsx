import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuthStore, type Permission } from '@/stores/auth.store';
import { usePermission } from '../hooks/use-permission';

/**
 * Hiển thị `children` chỉ khi người dùng hiện tại có quyền `perm`.
 */
export function Can({
  perm,
  fallback = null,
  children,
}: {
  perm: Permission | readonly Permission[];
  fallback?: ReactNode;
  children: ReactNode;
}) {
  const { can } = usePermission();
  return can(perm) ? <>{children}</> : <>{fallback}</>;
}

/**
 * Bảo vệ các route yêu cầu đăng nhập.
 */
export function ProtectedRoute() {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  if (!user) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }

  return <Outlet />;
}

/**
 * Bảo vệ các route yêu cầu quyền cụ thể (ví dụ: Quản trị người dùng, Tạo khoản vay).
 */
export function RequirePermission({
  perm,
  children,
}: {
  perm: Permission | readonly Permission[];
  children?: ReactNode;
}) {
  const { can } = usePermission();
  if (!can(perm)) {
    return <Navigate to="/403" replace />;
  }
  return children ? <>{children}</> : <Outlet />;
}

