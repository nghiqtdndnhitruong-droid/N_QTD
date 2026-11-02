/**
 * Định dạng và phân tích số tiền VNĐ.
 * Quy ước: số tiền luôn là số nguyên VNĐ, phân cách hàng nghìn bằng dấu chấm.
 */

const VND_FORMATTER = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });

/** 150000000 -> "150.000.000" */
export function formatNumberVN(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '';
  return VND_FORMATTER.format(value);
}

/** 150000000 -> "150.000.000 ₫" */
export function formatVND(value: number | null | undefined, fallback = '—'): string {
  if (value === null || value === undefined || Number.isNaN(value)) return fallback;
  return `${VND_FORMATTER.format(value)} ₫`;
}

/** Chỉ giữ lại chữ số: "1.500.000 ₫" -> "1500000" */
export function digitsOnly(input: string): string {
  return input.replace(/\D/g, '');
}

/** "1.500.000" -> 1500000 ; "" -> null */
export function parseVND(input: string): number | null {
  const digits = digitsOnly(input);
  if (digits === '') return null;
  return Number(digits);
}

/** Thêm dấu chấm phân cách hàng nghìn cho chuỗi chữ số: "1500000" -> "1.500.000" */
export function groupThousands(digits: string): string {
  const normalized = digits.replace(/^0+(?=\d)/, '');
  return normalized.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export interface CurrencyInputResult {
  /** Chuỗi hiển thị đã định dạng */
  display: string;
  /** Giá trị số (null nếu rỗng) */
  value: number | null;
  /** Vị trí con trỏ mới sau khi định dạng */
  caret: number;
}

/**
 * Định dạng lại chuỗi người dùng vừa gõ và tính vị trí con trỏ mới
 * sao cho con trỏ đứng sau đúng số chữ số như trước khi định dạng.
 * Hàm thuần – dễ kiểm thử.
 */
export function formatCurrencyInput(
  raw: string,
  caret: number,
  maxDigits = 15,
): CurrencyInputResult {
  if (raw.trim().startsWith('.') && /^0+$/.test(digitsOnly(raw))) {
    return { display: '', value: null, caret: 0 };
  }
  const digitsBeforeCaret = digitsOnly(raw.slice(0, caret)).length;
  let digits = digitsOnly(raw);
  const leadingZeros = digits.length - digits.replace(/^0+(?=\d)/, '').length;
  digits = digits.slice(leadingZeros).slice(0, maxDigits);

  if (digits === '') return { display: '', value: null, caret: 0 };

  const display = groupThousands(digits);
  const targetDigits = Math.min(Math.max(digitsBeforeCaret - leadingZeros, 0), digits.length);

  let newCaret = 0;
  let seen = 0;
  while (newCaret < display.length && seen < targetDigits) {
    if (/\d/.test(display.charAt(newCaret))) seen += 1;
    newCaret += 1;
  }

  return { display, value: Number(digits), caret: newCaret };
}

/** 8.5 -> "8,5 %/năm" */
export function formatInterestRate(rate: number | null | undefined): string {
  if (rate === null || rate === undefined) return '—';
  return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(rate)} %/năm`;
}

/** 1250.5 -> "1.250,5 m²" */
export function formatArea(area: number | null | undefined): string {
  if (area === null || area === undefined) return '—';
  return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(area)} m²`;
}

