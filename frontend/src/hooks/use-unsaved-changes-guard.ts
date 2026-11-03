import { useEffect, useRef } from 'react';
import { useBlocker } from 'react-router';

export interface UnsavedChangesGuard {
  isBlocked: boolean;
  proceed: () => void;
  reset: () => void;
  bypass: () => void;
}

/**
 * Cảnh báo khi người dùng rời trang hoặc đóng tab mà dữ liệu Form chưa lưu.
 */
export function useUnsavedChangesGuard(isDirty: boolean): UnsavedChangesGuard {
  const isBypassedRef = useRef(false);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !isBypassedRef.current && isDirty && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (!isDirty || isBypassedRef.current) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isBypassedRef.current) return;
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
    bypass: () => {
      isBypassedRef.current = true;
    },
  };
}
