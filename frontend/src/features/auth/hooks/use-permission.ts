import { useCallback } from 'react';
import { useAuthStore, type Permission, type UserRole } from '@/stores/auth.store';

export function usePermission() {
  const permissions = useAuthStore((s) => s.user?.permissions ?? []);
  const roles = useAuthStore((s) => s.user?.roles ?? []);

  const can = useCallback(
    (perm: Permission | readonly Permission[]): boolean => {
      if (Array.isArray(perm)) {
        return perm.every((p) => permissions.includes(p));
      }
      return permissions.includes(perm as Permission);
    },
    [permissions],
  );

  const canAny = useCallback(
    (perms: readonly Permission[]): boolean => perms.some((p) => permissions.includes(p)),
    [permissions],
  );

  const hasRole = useCallback((role: UserRole): boolean => roles.includes(role), [roles]);

  return { can, canAny, hasRole, permissions, roles };
}

