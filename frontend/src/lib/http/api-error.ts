import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { getFriendlyError } from '@/shared/constants/error-messages';

export type FieldErrorMap = Record<string, string[]>;

/**
 * Lỗi API đã chuẩn hóa để UI/Form xử lý thống nhất.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly errorCode: string;
  readonly fieldErrors: FieldErrorMap;
  readonly suggestion: string | undefined;
  readonly isNetworkError: boolean;

  constructor(params: {
    message: string;
    status: number;
    errorCode?: string;
    fieldErrors?: FieldErrorMap;
    isNetworkError?: boolean;
  }) {
    const friendly = getFriendlyError(params.errorCode, params.message);
    super(params.message || friendly.title);
    this.name = 'ApiError';
    this.status = params.status;
    this.errorCode = params.errorCode ?? 'UNKNOWN_ERROR';
    this.fieldErrors = params.fieldErrors ?? {};
    this.suggestion = friendly.suggestion;
    this.isNetworkError = Boolean(params.isNetworkError);
  }

  get friendlyTitle(): string {
    return getFriendlyError(this.errorCode, this.message).title;
  }

  get hasFieldErrors(): boolean {
    return Object.keys(this.fieldErrors).length > 0;
  }
}

/**
 * Gán lỗi validation từ Backend vào các trường của React Hook Form
 * và tự động focus/cuộn tới trường lỗi đầu tiên.
 * @returns true nếu có ít nhất 1 lỗi gắn được vào trường.
 */
export function applyServerErrorsToForm<TFieldValues extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<TFieldValues>,
): boolean {
  if (!(error instanceof ApiError) || !error.hasFieldErrors) return false;

  let firstField: string | null = null;
  for (const [fieldPath, messages] of Object.entries(error.fieldErrors)) {
    const firstMsg = messages[0];
    if (!firstMsg || fieldPath === 'root') continue;
    if (!firstField) firstField = fieldPath;
    setError(fieldPath as Path<TFieldValues>, {
      type: 'server',
      message: firstMsg,
    });
  }

  if (firstField && typeof document !== 'undefined') {
    const el = document.querySelector<HTMLElement>(`[name="${CSS.escape(firstField)}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.focus({ preventScroll: true });
    }
  }

  return firstField !== null;
}

