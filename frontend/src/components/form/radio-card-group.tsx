import type { ReactNode } from 'react';
import {
  useController,
  type Control,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form';
import { cn } from '@/lib/utils';
import { FieldWrapper } from './field-wrapper';

export interface RadioCardOption<T extends string = string> {
  value: T;
  title: ReactNode;
  description?: ReactNode;
  badge?: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
}

export interface RadioCardGroupProps<T extends string = string> {
  label?: ReactNode;
  required?: boolean;
  value: T;
  onChange: (value: T) => void;
  options: readonly RadioCardOption<T>[];
  columns?: 1 | 2 | 3;
  hint?: ReactNode;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export function RadioCardGroup<T extends string = string>({
  label,
  required,
  value,
  onChange,
  options,
  columns = 2,
  hint,
  error,
  disabled,
  className,
}: RadioCardGroupProps<T>) {
  const colClass =
    columns === 1 ? 'grid-cols-1' : columns === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2';

  return (
    <FieldWrapper label={label} required={required} hint={hint} error={error} className={className}>
      {({ describedBy }) => (
        <div
          role="radiogroup"
          aria-describedby={describedBy}
          className={cn('grid grid-cols-1 gap-3', colClass)}
        >
          {options.map((opt) => {
            const isSelected = value === opt.value;
            const isDisabled = Boolean(disabled || opt.disabled);

            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                disabled={isDisabled}
                onClick={() => !isDisabled && onChange(opt.value)}
                className={cn(
                  'flex items-start gap-3 rounded-lg border p-3.5 text-left transition-all duration-150',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600/30',
                  isSelected
                    ? 'border-primary-600 bg-primary-50/60 ring-1 ring-primary-600'
                    : 'border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50/50',
                  isDisabled && 'cursor-not-allowed opacity-55',
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                    isSelected ? 'border-primary-600 bg-primary-600' : 'border-slate-400 bg-white',
                  )}
                >
                  {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        'text-sm font-semibold',
                        isSelected ? 'text-primary-800' : 'text-slate-900',
                      )}
                    >
                      {opt.title}
                    </span>
                    {opt.badge}
                  </div>
                  {opt.description && (
                    <p className="mt-1 text-xs text-slate-600 leading-relaxed">{opt.description}</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </FieldWrapper>
  );
}

export interface FormRadioCardGroupProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
  TOption extends string = string,
> extends Omit<RadioCardGroupProps<TOption>, 'value' | 'onChange' | 'error'> {
  control: Control<TFieldValues>;
  name: TName;
}

export function FormRadioCardGroup<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
  TOption extends string = string,
>({ control, name, ...rest }: FormRadioCardGroupProps<TFieldValues, TName, TOption>) {
  const {
    field,
    fieldState: { error },
  } = useController({ control, name });

  return (
    <RadioCardGroup<TOption>
      {...rest}
      value={field.value as TOption}
      onChange={field.onChange}
      error={error?.message}
    />
  );
}

