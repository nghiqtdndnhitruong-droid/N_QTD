import { format, isValid, parse, parseISO } from 'date-fns';

/**
 * Quy ước ngày tháng:
 * - Hiển thị cho người dùng: dd/MM/yyyy
 * - Gửi lên API:              yyyy-MM-dd (khớp dateStringSchema của Backend)
 */
export const DISPLAY_DATE_FORMAT = 'dd/MM/yyyy';
export const API_DATE_FORMAT = 'yyyy-MM-dd';
export const API_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** Chuyển chuỗi ISO / yyyy-MM-dd / Date thành Date hợp lệ, hoặc null. */
export function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : parseISO(value);
  return isValid(date) ? date : null;
}

/** "2026-02-15" | ISO -> "15/02/2026" */
export function formatDateVN(value: string | Date | null | undefined, fallback = '—'): string {
  const date = toDate(value);
  return date ? format(date, DISPLAY_DATE_FORMAT) : fallback;
}

/** ISO -> "15/02/2026 14:30" */
export function formatDateTimeVN(value: string | Date | null | undefined, fallback = '—'): string {
  const date = toDate(value);
  return date ? format(date, `${DISPLAY_DATE_FORMAT} HH:mm`) : fallback;
}

/** Date -> "2026-02-15" */
export function toApiDate(date: Date): string {
  return format(date, API_DATE_FORMAT);
}

/**
 * "15/02/2026" -> "2026-02-15"; trả về null nếu không phải ngày hợp lệ
 * (bao gồm các ngày không tồn tại như 31/02/2026).
 */
export function parseDateVN(input: string): string | null {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(input)) return null;
  const date = parse(input, DISPLAY_DATE_FORMAT, new Date());
  if (!isValid(date) || format(date, DISPLAY_DATE_FORMAT) !== input) return null;
  return toApiDate(date);
}

/**
 * Tự chèn dấu "/" khi người dùng gõ:
 * - Gõ 2 số ngày (VD: "15") -> tự thêm "/" thành "15/"
 * - Gõ tiếp 2 số tháng (VD: "15/02") -> tự thêm "/" thành "15/02/"
 * - Gõ năm (VD: "15022026") -> "15/02/2026"
 */
export function maskDateInput(input: string, isDeleting = false): string {
  if (!input) return '';
  const digits = input.replace(/\D/g, '').slice(0, 8);
  if (digits.length === 0) return '';
  if (digits.length === 1) {
    if (input.endsWith('/') && !isDeleting) {
      return `0${digits}/`;
    }
    return digits;
  }
  if (digits.length === 2) {
    return isDeleting ? digits : `${digits}/`;
  }
  if (digits.length === 3) {
    if (input.endsWith('/') && !isDeleting) {
      return `${digits.slice(0, 2)}/0${digits.slice(2)}/`;
    }
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }
  if (digits.length === 4) {
    return isDeleting
      ? `${digits.slice(0, 2)}/${digits.slice(2)}`
      : `${digits.slice(0, 2)}/${digits.slice(2)}/`;
  }
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** Kiểm tra chuỗi yyyy-MM-dd là ngày có thật. */
export function isValidApiDate(value: string): boolean {
  if (!API_DATE_REGEX.test(value)) return false;
  const date = parseISO(value);
  return isValid(date) && format(date, API_DATE_FORMAT) === value;
}

