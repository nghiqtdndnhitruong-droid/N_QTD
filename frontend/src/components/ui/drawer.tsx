import type { HTMLAttributes, ReactNode } from 'react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Drawer = DialogPrimitive.Root;
export const DrawerTrigger = DialogPrimitive.Trigger;
export const DrawerClose = DialogPrimitive.Close;

export interface DrawerContentProps extends DialogPrimitive.DialogContentProps {
  size?: 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
  side?: 'right' | 'left';
}

const WIDTH_CLASSES: Record<NonNullable<DrawerContentProps['size']>, string> = {
  md: 'sm:max-w-md',
  lg: 'sm:max-w-xl',
  xl: 'sm:max-w-2xl',
  '2xl': 'sm:max-w-3xl lg:max-w-4xl',
  '3xl': 'sm:max-w-4xl lg:max-w-5xl xl:max-w-6xl',
  '4xl': 'sm:max-w-5xl lg:max-w-6xl xl:max-w-7xl',
};

export function DrawerContent({
  className,
  children,
  size = 'lg',
  side = 'right',
  ...props
}: DrawerContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-[1px]" />
      <DialogPrimitive.Content
        className={cn(
          'fixed inset-y-0 z-50 flex w-full flex-col bg-white shadow-2xl focus:outline-none',
          side === 'right' ? 'right-0 border-l border-slate-200' : 'left-0 border-r border-slate-200',
          WIDTH_CLASSES[size],
          className,
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DrawerHeader({
  title,
  description,
  children,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4',
        className,
      )}
    >
      <div>
        <DialogPrimitive.Title className="text-base font-semibold text-slate-900">
          {title}
        </DialogPrimitive.Title>
        {description && (
          <DialogPrimitive.Description className="mt-1 text-xs text-slate-500">
            {description}
          </DialogPrimitive.Description>
        )}
        {children}
      </div>
      <DialogPrimitive.Close
        aria-label="Đóng ngăn trượt"
        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600/30"
      >
        <X className="h-4 w-4" />
      </DialogPrimitive.Close>
    </div>
  );
}

export function DrawerBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex-1 overflow-y-auto px-6 py-5', className)} {...props} />;
}

export function DrawerFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-3.5',
        className,
      )}
      {...props}
    />
  );
}

