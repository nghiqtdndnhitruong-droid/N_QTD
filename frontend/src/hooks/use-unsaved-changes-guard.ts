import { useEffect } from 'react';
import { useBlocker } from 'react-router';

export interface UnsavedChangesGuard {
  isBlocked: boolean;
  proceed: () => void;
  reset: () => void;
}

/**
 * Cảnh báo khi người dùng rời trang hoặc đóng tab mà dữ liệu Form chưa lưu.
 */
export function useUnsavedChangesGuard(isDirty: boolean): UnsavedChangesGuard {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  return {
    isBlocked: blocker.state === 'blocked',
    proceed: () => {
      if (blocker.state === 'blocked') blocker.proceed();
    },
    reset: () => {
      if (blocker.state === 'blocked') blocker.reset();
    },
  };
}

