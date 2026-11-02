import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StepItem {
  id: string;
  title: string;
  description?: string;
  optional?: boolean;
}

export interface StepperProps {
  steps: readonly StepItem[];
  currentIndex: number;
  onStepClick?: (index: number) => void;
  maxReachableIndex?: number;
}

export function Stepper({
  steps,
  currentIndex,
  onStepClick,
  maxReachableIndex = currentIndex,
}: StepperProps) {
  return (
    <nav aria-label="Tiến trình các bước">
      <ol className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-6">
        {steps.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isClickable = Boolean(onStepClick && index <= maxReachableIndex);

          return (
            <li key={step.id} className="min-w-0">
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && onStepClick?.(index)}
                aria-current={isCurrent ? 'step' : undefined}
                className={cn(
                  'flex w-full items-start gap-2.5 rounded-lg border p-3 text-left transition-colors',
                  isCurrent
                    ? 'border-primary-600 bg-primary-50/70'
                    : isCompleted
                      ? 'border-emerald-200 bg-white hover:bg-slate-50'
                      : 'border-slate-200 bg-slate-50/60 opacity-75',
                  isClickable ? 'cursor-pointer' : 'cursor-default',
                )}
              >
                <span
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                    isCurrent
                      ? 'bg-primary-600 text-white'
                      : isCompleted
                        ? 'bg-success-600 text-white'
                        : 'bg-slate-200 text-slate-600',
                  )}
                >
                  {isCompleted ? <Check className="h-3.5 w-3.5" aria-hidden /> : index + 1}
                </span>
                <span className="min-w-0">
                  <span
                    className={cn(
                      'block truncate text-xs font-semibold',
                      isCurrent ? 'text-primary-800' : 'text-slate-800',
                    )}
                  >
                    {step.title}
                  </span>
                  {step.description && (
                    <span className="mt-0.5 block truncate text-[11px] text-slate-500">
                      {step.description}
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

