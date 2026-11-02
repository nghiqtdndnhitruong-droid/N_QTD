import { useId, type ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FieldWrapperProps {
  id?: string;
  label?: ReactNode;
  required?: boolean;
  hint?: ReactNode;
  error?: string;
  extraRight?: ReactNode;
  className?: string;
  children: (ids: {
    inputId: string;
    describedBy: string | undefined;
    hasError: boolean;
  }) => ReactNode;
}

/**
 * Chuẩn hóa giao diện Label, dấu bắt buộc (*), thông báo lỗi và aria-describedby cho mọi trường nhập.
 */
export function FieldWrapper({
  id,
  label,
  required,
  hint,
  error,
  extraRight,
  className,
  children,
}: FieldWrapperProps) {
  const autoId = useId();
  const inputId = id ?? `field-${autoId}`;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;

  const hasError = Boolean(error);
  const describedBy =
    [hasError ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('space-y-1.5', className)}>
      {(label || extraRight) && (
        <div className="flex items-baseline justify-between gap-2">
          {label && (
            <label
              htmlFor={inputId}
              className="block text-xs font-medium text-slate-700 select-none"
            >
              {label}
              {required && (
                <span className="ml-0.5 font-semibold text-danger-600" aria-hidden="true">
                  *
                </span>
              )}
            </label>
          )}
          {extraRight && <div className="text-xs text-slate-500">{extraRight}</div>}
        </div>
      )}

      {children({ inputId, describedBy, hasError })}

      {hasError ? (
        <p
          id={errorId}
          role="alert"
          className="flex items-start gap-1.5 text-xs font-medium text-danger-600"
        >
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : (
        hint && (
          <p id={hintId} className="text-xs text-slate-500">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

/**
 * Lớp CSS chuẩn cho mọi ô nhập liệu (Default / Hover / Focus / Error / Disabled / Read-only).
 */
export function getInputControlClasses(options: {
  hasError?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
}): string {
  const { hasError, disabled, readOnly, className } = options;
  return cn(
    'w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400',
    'transition-[border-color,box-shadow,background-color] duration-150',
    'focus:outline-none',
    hasError
      ? 'border-danger-600 hover:border-danger-700 focus:border-danger-600 focus:ring-2 focus:ring-danger-600/20'
      : 'border-slate-300 hover:border-slate-400 focus:border-primary-600 focus:ring-2 focus:ring-primary-600/20',
    readOnly && 'bg-slate-50 text-slate-700 focus:ring-0 focus:border-slate-300',
    disabled &&
      'bg-slate-100 text-slate-500 border-slate-200 hover:border-slate-200 cursor-not-allowed',
    className,
  );
}

