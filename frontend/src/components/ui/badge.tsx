import type { HTMLAttributes, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LOAN_STATUS_META, type BadgeTone } from '@/shared/constants';
import type { LoanStatus } from '@/shared/types';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  dot?: boolean;
  icon?: ReactNode;
}

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: 'bg-slate-100 text-slate-700 ring-slate-200',
  primary: 'bg-primary-50 text-primary-700 ring-primary-200',
  info: 'bg-info-50 text-info-700 ring-sky-200',
  success: 'bg-success-50 text-success-700 ring-emerald-200',
  warning: 'bg-warning-50 text-warning-700 ring-amber-200',
  danger: 'bg-danger-50 text-danger-700 ring-red-200',
};

const DOT_CLASSES: Record<BadgeTone, string> = {
  neutral: 'bg-slate-500',
  primary: 'bg-primary-600',
  info: 'bg-info-600',
  success: 'bg-success-600',
  warning: 'bg-warning-600',
  danger: 'bg-danger-600',
};

export function Badge({
  tone = 'neutral',
  dot = false,
  icon,
  className,
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap',
        TONE_CLASSES[tone],
        className,
      )}
      {...rest}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', DOT_CLASSES[tone])} aria-hidden />}
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  );
}

/**
 * Badge hiển thị trạng thái khoản vay – luôn kèm cả nhãn chữ và dấu hiệu nhận biết cho trạng thái Quá hạn.
 */
export function LoanStatusBadge({ status, className }: { status: LoanStatus; className?: string }) {
  const meta = LOAN_STATUS_META[status];
  return (
    <Badge
      tone={meta.tone}
      dot={status !== 'QUA_HAN'}
      icon={status === 'QUA_HAN' ? <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> : undefined}
      title={meta.description}
      className={className}
    >
      {meta.label}
    </Badge>
  );
}

