import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { queryClient } from '@/lib/query';
import { TooltipProvider } from '@/components/ui';
import { ErrorBoundary } from '@/components/feedback';
import { useThemeStore } from '@/stores/theme.store';

export function AppProviders({ children }: { children: ReactNode }) {
  const resolvedTheme = useThemeStore((s) => s.resolvedTheme);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          {children}
          <Toaster
            position="top-right"
            richColors
            expand={false}
            theme={resolvedTheme}
            toastOptions={{
              className: 'text-xs font-sans',
            }}
          />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

