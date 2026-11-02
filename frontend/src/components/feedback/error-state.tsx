import { AlertTriangle, RotateCw } from 'lucide-react';
import { ApiError } from '@/lib/http/api-error';
import { getFriendlyError } from '@/shared/constants/error-messages';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';

export interface ErrorStateProps {
  error?: unknown;
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  error,
  title,
  description,
  onRetry,
  className,
}: ErrorStateProps) {
  let resolvedTitle = title;
  let resolvedSuggestion = description;

  if (error instanceof ApiError) {
    const friendly = getFriendlyError(error.errorCode, error.message);
    resolvedTitle = resolvedTitle ?? (error.message || friendly.title);
    resolvedSuggestion = resolvedSuggestion ?? friendly.suggestion;
  } else if (error instanceof Error) {
    resolvedTitle = resolvedTitle ?? error.message;
  }

  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-red-200 bg-danger-50/40 px-6 py-10 text-center',
        className,
      )}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-danger-100 text-danger-600">
        <AlertTriangle className="h-5 w-5" aria-hidden="true" />
      </div>
      <h3 className="mt-3 text-sm font-semibold text-slate-900">
        {resolvedTitle || 'Không thể tải dữ liệu'}
      </h3>
      {resolvedSuggestion && (
        <p className="mt-1 max-w-md text-xs text-slate-600">{resolvedSuggestion}</p>
      )}
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          leftIcon={<RotateCw className="h-3.5 w-3.5" />}
          onClick={onRetry}
        >
          Thử lại
        </Button>
      )}
    </div>
  );
}

