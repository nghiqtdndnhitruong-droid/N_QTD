import { forwardRef, memo, type ReactNode, type TextareaHTMLAttributes } from 'react';
import {
  useController,
  type Control,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form';
import { FieldWrapper, getInputControlClasses } from './field-wrapper';

export interface TextareaInputProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string;
  wrapperClassName?: string;
}

export const TextareaInput = memo(
  forwardRef<HTMLTextAreaElement, TextareaInputProps>(function TextareaInput(
    {
      id,
      label,
      required,
      hint,
      error,
      disabled,
      readOnly,
      rows = 3,
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
          <textarea
            ref={ref}
            id={inputId}
            rows={rows}
            disabled={disabled}
            readOnly={readOnly}
            aria-required={required || undefined}
            aria-invalid={hasError || undefined}
            aria-describedby={describedBy}
            className={getInputControlClasses({
              hasError,
              disabled,
              readOnly,
              className,
            })}
            {...rest}
          />
        )}
      </FieldWrapper>
    );
  }),
);

export interface FormTextareaFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> extends Omit<TextareaInputProps, 'name' | 'value' | 'onChange' | 'onBlur' | 'error'> {
  control: Control<TFieldValues>;
  name: TName;
}

export function FormTextareaField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({ control, name, ...rest }: FormTextareaFieldProps<TFieldValues, TName>) {
  const {
    field,
    fieldState: { error },
  } = useController({ control, name });

  return (
    <TextareaInput
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

