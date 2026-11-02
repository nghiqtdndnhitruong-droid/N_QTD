import { toast } from 'sonner';
import { ApiError } from '@/lib/http/api-error';
import { getFriendlyError } from '@/shared/constants/error-messages';

export function notifySuccess(title: string, description?: string): void {
  toast.success(title, {
    description,
    duration: 3500,
  });
}

export function notifyInfo(title: string, description?: string): void {
  toast.info(title, {
    description,
    duration: 4000,
  });
}

export function notifyWarning(title: string, description?: string): void {
  toast.warning(title, {
    description,
    duration: 5500,
  });
}

export function notifyError(title: string, description?: string): void {
  toast.error(title, {
    description,
    duration: 8000,
    closeButton: true,
  });
}

/**
 * Hiển thị thông báo lỗi từ API, kèm nguyên nhân và gợi ý hướng xử lý.
 */
export function notifyApiError(error: unknown, fallbackTitle?: string): void {
  if (error instanceof ApiError) {
    const friendly = getFriendlyError(error.errorCode, error.message);
    toast.error(error.message || friendly.title, {
      description: friendly.suggestion,
      duration: 8500,
      closeButton: true,
    });
    return;
  }

  const message =
    error instanceof Error
      ? error.message
      : fallbackTitle || 'Đã xảy ra lỗi không xác định. Vui lòng thử lại.';
  notifyError(message);
}

