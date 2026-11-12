import {
  forwardRef,
  memo,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  useController,
  type Control,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form';
import { Popover as PopoverPrimitive } from 'radix-ui';
import { DayPicker } from 'react-day-picker';
import { vi } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import {
  formatDateVN,
  maskDateInput,
  parseDateVN,
  toApiDate,
  toDate,
} from '@/shared/format';
import { FieldWrapper, getInputControlClasses } from './field-wrapper';

export interface DateInputProps {
  id?: string;
  name?: string;
  label?: ReactNode;
  required?: boolean;
  /** Giá trị lưu trữ theo định dạng chuẩn API: YYYY-MM-DD (hoặc chuỗi rỗng). */
  value: string | null | undefined;
  onValueChange: (apiDate: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  hint?: ReactNode;
  error?: string;
  disabled?: boolean;
  readOnly?: boolean;
  wrapperClassName?: string;
  extraRight?: ReactNode;
}

/**
 * Trường ngày tháng hỗ trợ song song:
 * 1. Gõ phím trực tiếp định dạng dd/mm/yyyy (tự chèn dấu "/") cho cán bộ nhập liệu nhanh.
 * 2. Bấm biểu tượng lịch để mở Popover chọn ngày trực quan.
 * Giá trị đầu ra luôn chuẩn hóa về YYYY-MM-DD khớp với Backend.
 */
export const DateInput = memo(
  forwardRef<HTMLInputElement, DateInputProps>(function DateInput(
    {
      id,
      name,
      label,
      required,
      value,
      onValueChange,
      onBlur,
      placeholder = 'dd/mm/yyyy',
      hint,
      error,
      disabled,
      readOnly,
      wrapperClassName,
      extraRight,
    },
    ref,
  ) {
    const [text, setText] = useState<string>(() => (value ? formatDateVN(value, '') : ''));
    const [open, setOpen] = useState(false);

    useEffect(() => {
      const formatted = value ? formatDateVN(value, '') : '';
      setText(formatted);
    }, [value]);

    const selectedDate = toDate(value) ?? undefined;

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
            <input
              ref={ref}
              id={inputId}
              name={name}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder={placeholder}
              disabled={disabled}
              readOnly={readOnly}
              value={text}
              aria-required={required || undefined}
              aria-invalid={hasError || undefined}
              aria-describedby={describedBy}
              onChange={(e) => {
                const masked = maskDateInput(e.target.value);
                setText(masked);
                if (masked === '') {
                  onValueChange('');
                } else if (masked.length === 10) {
                  const parsed = parseDateVN(masked);
                  onValueChange(parsed ?? masked);
                }
              }}
              onBlur={() => {
                if (text && text.length < 10) {
                  // Giữ chuỗi lỗi để Zod báo ngày không hợp lệ
                  onValueChange(text);
                }
                onBlur?.();
              }}
              className={getInputControlClasses({
                hasError,
                disabled,
                readOnly,
                className: 'h-9 pr-9 tabular-nums',
              })}
            />

            {!disabled && !readOnly && (
              <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
                <PopoverPrimitive.Trigger asChild>
                  <button
                    type="button"
                    aria-label="Chọn ngày từ lịch"
                    className="absolute right-2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600/30"
                  >
                    <CalendarIcon className="h-4 w-4" />
                  </button>
                </PopoverPrimitive.Trigger>
                <PopoverPrimitive.Portal>
                  <PopoverPrimitive.Content
                    align="end"
                    sideOffset={6}
                    className="z-50 rounded-lg border border-slate-200 bg-white p-3 shadow-xl"
                  >
                    <DayPicker
                      mode="single"
                      locale={vi}
                      selected={selectedDate}
                      defaultMonth={selectedDate}
                      captionLayout="dropdown"
                      startMonth={new Date(1940, 0)}
                      endMonth={new Date(2040, 11)}
                      onSelect={(date) => {
                        if (date) {
                          const apiStr = toApiDate(date);
                          setText(formatDateVN(apiStr, ''));
                          onValueChange(apiStr);
                          setOpen(false);
                        }
                      }}
                      classNames={{
                        months: 'flex flex-col',
                        month_caption: 'flex items-center justify-between pb-2 text-sm font-semibold text-slate-900',
                        nav: 'flex items-center gap-1',
                        button_previous: 'rounded p-1 hover:bg-slate-100 text-slate-600',
                        button_next: 'rounded p-1 hover:bg-slate-100 text-slate-600',
                        weekdays: 'grid grid-cols-7 text-center text-xs font-medium text-slate-500 pb-1',
                        week: 'grid grid-cols-7 text-center',
                        day: 'h-8 w-8 text-xs rounded-md hover:bg-primary-50',
                        day_button: 'h-8 w-8 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600',
                        selected: 'bg-primary-600 text-white hover:bg-primary-700 font-semibold',
                        today: 'font-bold text-primary-700 underline',
                      }}
                    />
                  </PopoverPrimitive.Content>
                </PopoverPrimitive.Portal>
              </PopoverPrimitive.Root>
            )}
          </div>
        )}
      </FieldWrapper>
    );
  }),
);

export interface FormDateFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> extends Omit<DateInputProps, 'name' | 'value' | 'onValueChange' | 'onBlur' | 'error'> {
  control: Control<TFieldValues>;
  name: TName;
}

export function FormDateField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({ control, name, ...rest }: FormDateFieldProps<TFieldValues, TName>) {
  const {
    field,
    fieldState: { error },
  } = useController({ control, name });

  return (
    <DateInput
      {...rest}
      ref={field.ref}
      name={field.name}
      value={(field.value as string | null | undefined) ?? ''}
      onValueChange={field.onChange}
      onBlur={field.onBlur}
      error={error?.message}
    />
  );
}

