import type { ReactNode } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AlertTone = 'info' | 'success' | 'warning' | 'danger';

export interface AlertProps {
  tone?: AlertTone;
  title?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

const ALERT_STYLES: Record<
  AlertTone,
  { container: string; iconColor: string; Icon: typeof Info }
> = {
  info: {
    container: 'border-sky-200 bg-info-50/80 text-slate-800',
    iconColor: 'text-info-600',
    Icon: Info,
  },
  success: {
    container: 'border-emerald-200 bg-success-50/80 text-slate-800',
    iconColor: 'text-success-600',
    Icon: CheckCircle2,
  },
  warning: {
    container: 'border-amber-200 bg-warning-50/90 text-slate-800',
    iconColor: 'text-warning-600',
    Icon: AlertTriangle,
  },
  danger: {
    container: 'border-red-200 bg-danger-50/90 text-slate-900',
    iconColor: 'text-danger-600',
    Icon: AlertCircle,
  },
};

export function Alert({
  tone = 'info',
  title,
  children,
  actions,
  className,
}: AlertProps) {
  const { container, iconColor, Icon } = ALERT_STYLES[tone];

  return (
    <div
      role={tone === 'danger' || tone === 'warning' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-3 rounded-lg border p-3.5 text-xs leading-relaxed',
        container,
        className,
      )}
    >
      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', iconColor)} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title && <div className="font-semibold text-slate-900">{title}</div>}
        {children && <div className={cn(title ? 'mt-0.5 text-slate-700' : '')}>{children}</div>}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}

