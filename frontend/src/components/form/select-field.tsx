import {
  forwardRef,
  memo,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react';
import {
  useController,
  type Control,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FieldWrapper, getInputControlClasses } from './field-wrapper';

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  disabled?: boolean;
}

export interface SelectInputProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: ReactNode;
  options: readonly SelectOption[];
  placeholder?: string;
  hint?: ReactNode;
  error?: string;
  wrapperClassName?: string;
}

export const SelectInput = memo(
  forwardRef<HTMLSelectElement, SelectInputProps>(function SelectInput(
    {
      id,
      label,
      required,
      options,
      placeholder,
      hint,
      error,
      disabled,
      className,
      wrapperClassName,
      ...rest
    },
    ref,
  ) {
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
          <div className="relative">
            <select
              ref={ref}
              id={inputId}
              disabled={disabled}
              aria-required={required || undefined}
              aria-invalid={hasError || undefined}
              aria-describedby={describedBy}
              className={getInputControlClasses({
                hasError,
                disabled,
                className: cn('h-9 appearance-none pr-9', className),
              })}
              {...rest}
            >
              {placeholder && <option value="">{placeholder}</option>}
              {options.map((opt) => (
                <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
          </div>
        )}
      </FieldWrapper>
    );
  }),
);

export interface FormSelectFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> extends Omit<SelectInputProps, 'name' | 'value' | 'onChange' | 'onBlur' | 'error'> {
  control: Control<TFieldValues>;
  name: TName;
}

export function FormSelectField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({ control, name, ...rest }: FormSelectFieldProps<TFieldValues, TName>) {
  const {
    field,
    fieldState: { error },
  } = useController({ control, name });

  return (
    <SelectInput
      {...rest}
      ref={field.ref}
      name={field.name}
      value={(field.value as string | undefined) ?? ''}
      onChange={field.onChange}
      onBlur={field.onBlur}
      error={error?.message}
    />
  );
}

