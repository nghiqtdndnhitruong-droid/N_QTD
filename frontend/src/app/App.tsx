import { useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { Loader2 } from 'lucide-react';
import { configureHttpAuth } from '@/lib/http';
import { useAuthStore } from '@/stores/auth.store';
import { restoreSessionApi } from '@/features/auth/api/auth.api';
import { AppProviders } from './providers';
import { appRouter } from './router';

// Kết nối httpClient với authStore (không tạo circular dependency)
configureHttpAuth({
  getAccessToken: () => {
    const memoryToken = useAuthStore.getState().accessToken;
    if (memoryToken) return memoryToken;
    try {
      return sessionStorage.getItem('qtd.accessToken');
    } catch {
      return null;
    }
  },
  refreshAccessToken: async () => {
    const session = await restoreSessionApi();
    if (session) {
      useAuthStore.getState().setSession({
        accessToken: session.accessToken,
        user: session.user,
      });
      return session.accessToken;
    }
    return null;
  },
  onUnauthorized: () => {
    try {
      sessionStorage.removeItem('qtd.accessToken');
    } catch {
      // ignore
    }
    useAuthStore.getState().clearSession();
  },
});

export function App() {
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const setSession = useAuthStore((s) => s.setSession);
  const setInitialized = useAuthStore((s) => s.setInitialized);

  useEffect(() => {
    let mounted = true;
    restoreSessionApi()
      .then((session) => {
        if (!mounted) return;
        if (session) {
          setSession({ accessToken: session.accessToken, user: session.user });
        } else {
          setInitialized(true);
        }
      })
      .catch(() => {
        if (mounted) setInitialized(true);
      });
    return () => {
      mounted = false;
    };
  }, [setSession, setInitialized]);

  if (!isInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Loader2 className="h-5 w-5 animate-spin text-primary-600" />
          <span>Đang khởi tạo phiên làm việc...</span>
        </div>
      </div>
    );
  }

  return (
    <AppProviders>
      <RouterProvider router={appRouter} />
    </AppProviders>
  );
}

