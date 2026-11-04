import {
  forwardRef,
  memo,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import {
  useController,
  type Control,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form';
import { cn } from '@/lib/utils';
import { FieldWrapper, getInputControlClasses } from './field-wrapper';

export interface NumberInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'size'> {
  label?: ReactNode;
  value: number | null | undefined;
  onValueChange: (value: number | null) => void;
  unit?: string;
  allowDecimal?: boolean;
  hint?: ReactNode;
  error?: string;
  wrapperClassName?: string;
}

export const NumberInput = memo(
  forwardRef<HTMLInputElement, NumberInputProps>(function NumberInput(
    {
      id,
      label,
      required,
      value,
      onValueChange,
      unit,
      allowDecimal = false,
      hint,
      error,
      disabled,
      readOnly,
      className,
      wrapperClassName,
      step,
      ...rest
    },
    ref,
  ) {
    const isDecimal =
      allowDecimal ||
      (step !== undefined && step !== 1 && step !== '1' && step !== 0 && step !== '0');
    const resolvedStep = step !== undefined ? step : isDecimal ? 'any' : 1;

    return (
      <FieldWrapper
        id={id}
        label={label}
        required={required}
        hint={hint}
        error={error}
        className={wrapperClassName}
      >
        {({ inputId, describedBy, hasError }) => (
          <div className="relative flex items-center">
            <input
              {...rest}
              ref={ref}
              id={inputId}
              type="number"
              step={resolvedStep}
              inputMode={isDecimal ? 'decimal' : 'numeric'}
              disabled={disabled}
              readOnly={readOnly}
              value={value ?? ''}
              aria-required={required || undefined}
              aria-invalid={hasError || undefined}
              aria-describedby={describedBy}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === '') {
                  onValueChange(null);
                  return;
                }
                const num = isDecimal ? parseFloat(raw) : parseInt(raw, 10);
                onValueChange(Number.isNaN(num) ? null : num);
              }}
              className={getInputControlClasses({
                hasError,
                disabled,
                readOnly,
                className: cn('h-9 tabular-nums', unit ? 'pr-12' : '', className),
              })}
            />
            {unit && (
              <span className="pointer-events-none absolute right-3 select-none text-xs font-medium text-slate-500">
                {unit}
              </span>
            )}
          </div>
        )}
      </FieldWrapper>
    );
  }),
);

export interface FormNumberFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> extends Omit<NumberInputProps, 'name' | 'value' | 'onValueChange' | 'onBlur' | 'error'> {
  control: Control<TFieldValues>;
  name: TName;
}

export function FormNumberField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({ control, name, ...rest }: FormNumberFieldProps<TFieldValues, TName>) {
  const {
    field,
    fieldState: { error },
  } = useController({ control, name });

  return (
    <NumberInput
      {...rest}
      ref={field.ref}
      name={field.name}
      value={field.value as number | null | undefined}
      onValueChange={(val) => field.onChange(val)}
      onBlur={field.onBlur}
      error={error?.message}
    />
  );
}

