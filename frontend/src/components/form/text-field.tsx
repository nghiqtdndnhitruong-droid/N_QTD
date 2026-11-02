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
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FieldWrapper, getInputControlClasses } from './field-wrapper';

export interface TextInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string;
  extraRight?: ReactNode;
  isLoading?: boolean;
  isValidIndicator?: boolean;
  leftAddon?: ReactNode;
  rightAddon?: ReactNode;
  wrapperClassName?: string;
}

export const TextInput = memo(
  forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
    {
      id,
      label,
      required,
      hint,
      error,
      extraRight,
      isLoading = false,
      isValidIndicator = false,
      leftAddon,
      rightAddon,
      disabled,
      readOnly,
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
        extraRight={extraRight}
        className={wrapperClassName}
      >
        {({ inputId, describedBy, hasError }) => (
          <div className="relative flex items-center">
            {leftAddon && (
              <span className="pointer-events-none absolute left-3 flex items-center text-slate-400">
                {leftAddon}
              </span>
            )}
            <input
              ref={ref}
              id={inputId}
              disabled={disabled}
              readOnly={readOnly}
              aria-required={required || undefined}
              aria-invalid={hasError || undefined}
              aria-describedby={describedBy}
              className={getInputControlClasses({
                hasError,
                disabled,
                readOnly,
                className: cn(
                  'h-9',
                  leftAddon ? 'pl-9' : '',
                  rightAddon || isLoading || hasError || isValidIndicator ? 'pr-9' : '',
                  className,
                ),
              })}
              {...rest}
            />
            {(isLoading || hasError || isValidIndicator || rightAddon) && (
              <span className="absolute right-3 flex items-center gap-1 text-xs text-slate-500">
                {isLoading ? (
                  <Loader2
                    className="h-4 w-4 animate-spin text-primary-600"
                    aria-label="Đang kiểm tra"
                  />
                ) : hasError ? (
                  <AlertCircle className="h-4 w-4 text-danger-600" aria-hidden="true" />
                ) : isValidIndicator ? (
                  <CheckCircle2 className="h-4 w-4 text-success-600" aria-hidden="true" />
                ) : (
                  rightAddon
                )}
              </span>
            )}
          </div>
        )}
      </FieldWrapper>
    );
  }),
);

export interface FormTextFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> extends Omit<TextInputProps, 'name' | 'value' | 'onChange' | 'onBlur' | 'error'> {
  control: Control<TFieldValues>;
  name: TName;
  digitsOnly?: boolean;
}

export function FormTextField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({ control, name, digitsOnly = false, ...rest }: FormTextFieldProps<TFieldValues, TName>) {
  const {
    field,
    fieldState: { error },
  } = useController({ control, name });

  return (
    <TextInput
      {...rest}
      ref={field.ref}
      name={field.name}
      value={(field.value as string | undefined) ?? ''}
      onBlur={field.onBlur}
      inputMode={digitsOnly ? 'numeric' : rest.inputMode}
      onChange={(e) => {
        const next = digitsOnly ? e.target.value.replace(/\D/g, '') : e.target.value;
        field.onChange(next);
      }}
      error={error?.message}
    />
  );
}

