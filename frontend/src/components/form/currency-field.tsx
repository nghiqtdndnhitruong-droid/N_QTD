import {
  forwardRef,
  memo,
  useRef,
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
import { formatCurrencyInput, formatNumberVN, vndToWords } from '@/shared/format';
import { FieldWrapper, getInputControlClasses } from './field-wrapper';

export interface CurrencyInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'size'> {
  label?: ReactNode;
  value: number | null | undefined;
  onValueChange: (value: number | null) => void;
  hint?: ReactNode;
  error?: string;
  extraRight?: ReactNode;
  showWords?: boolean;
  suffix?: string;
  wrapperClassName?: string;
}

/**
 * Trường nhập số tiền VNĐ:
 * - Tự động thêm dấu chấm phân cách hàng nghìn (150.000.000) khi đang gõ.
 * - Giữ đúng vị trí con trỏ kể cả khi gõ hoặc xóa ở giữa chuỗi.
 * - Hiển thị số tiền đọc bằng chữ tiếng Việt ngay bên dưới để đối chiếu tránh nhập nhầm số 0.
 */
export const CurrencyInput = memo(
  forwardRef<HTMLInputElement, CurrencyInputProps>(function CurrencyInput(
    {
      id,
      label,
      required,
      value,
      onValueChange,
      hint,
      error,
      extraRight,
      showWords = true,
      suffix = 'VNĐ',
      disabled,
      readOnly,
      className,
      wrapperClassName,
      placeholder = '0',
      ...rest
    },
    forwardedRef,
  ) {
    const innerRef = useRef<HTMLInputElement | null>(null);

    const setRefs = (el: HTMLInputElement | null) => {
      innerRef.current = el;
      if (typeof forwardedRef === 'function') forwardedRef(el);
      else if (forwardedRef) forwardedRef.current = el;
    };

    const displayValue =
      value !== null && value !== undefined && !Number.isNaN(value) ? formatNumberVN(value) : '';

    const wordsHint =
      showWords && value !== null && value !== undefined && value > 0
        ? `Bằng chữ: ${vndToWords(value)}`
        : hint;

    return (
      <FieldWrapper
        id={id}
        label={label}
        required={required}
        hint={wordsHint}
        error={error}
        extraRight={extraRight}
        className={wrapperClassName}
      >
        {({ inputId, describedBy, hasError }) => (
          <div className="relative flex items-center">
            <input
              {...rest}
              ref={setRefs}
              id={inputId}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              disabled={disabled}
              readOnly={readOnly}
              placeholder={placeholder}
              value={displayValue}
              aria-required={required || undefined}
              aria-invalid={hasError || undefined}
              aria-describedby={describedBy}
              onChange={(e) => {
                const raw = e.target.value;
                const caret = e.target.selectionStart ?? raw.length;
                const formatted = formatCurrencyInput(raw, caret);
                onValueChange(formatted.value);
                requestAnimationFrame(() => {
                  if (innerRef.current && document.activeElement === innerRef.current) {
                    innerRef.current.setSelectionRange(formatted.caret, formatted.caret);
                  }
                });
              }}
              className={getInputControlClasses({
                hasError,
                disabled,
                readOnly,
                className: cn('h-9 pr-14 font-semibold tabular-nums', className),
              })}
            />
            <span className="pointer-events-none absolute right-3 select-none text-xs font-medium text-slate-500">
              {suffix}
            </span>
          </div>
        )}
      </FieldWrapper>
    );
  }),
);

export interface FormCurrencyFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> extends Omit<CurrencyInputProps, 'name' | 'value' | 'onValueChange' | 'onBlur' | 'error'> {
  control: Control<TFieldValues>;
  name: TName;
}

export function FormCurrencyField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({ control, name, ...rest }: FormCurrencyFieldProps<TFieldValues, TName>) {
  const {
    field,
    fieldState: { error },
  } = useController({ control, name });

  return (
    <CurrencyInput
      {...rest}
      ref={field.ref}
      name={field.name}
      value={field.value as number | null | undefined}
      onValueChange={(val) => field.onChange(val ?? 0)}
      onBlur={field.onBlur}
      error={error?.message}
    />
  );
}
