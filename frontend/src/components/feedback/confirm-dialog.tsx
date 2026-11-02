import type { ReactNode } from 'react';
import { AlertDialog as AlertDialogPrimitive } from 'radix-ui';
import { AlertTriangle, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  tone?: 'primary' | 'danger';
  isLoading?: boolean;
  confirmDisabled?: boolean;
  onConfirm: () => void;
}

/**
 * Hộp thoại xác nhận trước các thao tác quan trọng (Giải ngân, Thu nợ, Chuyển trạng thái, Xóa TSTC).
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy bỏ',
  tone = 'primary',
  isLoading = false,
  confirmDisabled = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px]" />
        <AlertDialogPrimitive.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2',
            'rounded-lg border border-slate-200 bg-white shadow-xl focus:outline-none',
          )}
        >
          <div className="p-6">
            <div className="flex items-start gap-3.5">
              <div
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                  tone === 'danger'
                    ? 'bg-danger-100 text-danger-600'
                    : 'bg-primary-50 text-primary-600',
                )}
              >
                {tone === 'danger' ? (
                  <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <HelpCircle className="h-5 w-5" aria-hidden="true" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <AlertDialogPrimitive.Title className="text-base font-semibold text-slate-900">
                  {title}
                </AlertDialogPrimitive.Title>
                {description && (
                  <AlertDialogPrimitive.Description className="mt-1 text-xs text-slate-600 leading-relaxed">
                    {description}
                  </AlertDialogPrimitive.Description>
                )}
              </div>
            </div>

            {children && <div className="mt-4">{children}</div>}
          </div>

          <div className="flex items-center justify-end gap-2 rounded-b-lg border-t border-slate-100 bg-slate-50/70 px-6 py-3.5">
            <AlertDialogPrimitive.Cancel asChild>
              <Button variant="outline" disabled={isLoading}>
                {cancelText}
              </Button>
            </AlertDialogPrimitive.Cancel>
            <Button
              variant={tone === 'danger' ? 'danger' : 'primary'}
              isLoading={isLoading}
              disabled={confirmDisabled}
              onClick={onConfirm}
            >
              {confirmText}
            </Button>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}

