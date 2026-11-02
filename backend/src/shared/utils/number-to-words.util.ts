/**
 * Đọc số tiền và diện tích thành chữ tiếng Việt theo chuẩn chứng từ tài chính.
 */

const DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'] as const;

function digitWord(d: number): string {
  return DIGITS[d] ?? '';
}

function readTriple(n: number, full: boolean): string {
  const hundreds = Math.floor(n / 100);
  const tens = Math.floor((n % 100) / 10);
  const units = n % 10;
  const words: string[] = [];

  if (hundreds > 0 || full) {
    words.push(digitWord(hundreds), 'trăm');
  }

  if (tens === 0) {
    if (units > 0 && (hundreds > 0 || full)) words.push('linh');
  } else if (tens === 1) {
    words.push('mười');
  } else {
    words.push(digitWord(tens), 'mươi');
  }

  if (units > 0) {
    if (units === 1 && tens >= 2) words.push('mốt');
    else if (units === 5 && tens >= 1) words.push('lăm');
    else words.push(digitWord(units));
  }

  return words.join(' ');
}

const GROUP_UNITS = ['', 'nghìn', 'triệu'] as const;

function readBelowBillion(n: number, isLeading: boolean): string {
  const groups: number[] = [];
  let rest = n;
  while (rest > 0) {
    groups.unshift(rest % 1000);
    rest = Math.floor(rest / 1000);
  }
  while (!isLeading && groups.length < 3) groups.unshift(0);

  const parts: string[] = [];
  groups.forEach((g, index) => {
    if (g === 0) return;
    const unitIndex = groups.length - 1 - index;
    const hasPrevious = parts.length > 0 || !isLeading;
    const text = readTriple(g, hasPrevious);
    const unit = GROUP_UNITS[unitIndex] ?? '';
    parts.push(unit ? `${text} ${unit}` : text);
  });
  return parts.join(' ');
}

const BILLION = 1_000_000_000;

function readNumber(n: number, isLeading: boolean): string {
  if (n < BILLION) return readBelowBillion(n, isLeading);
  const high = Math.floor(n / BILLION);
  const low = n % BILLION;
  const highText = `${readNumber(high, isLeading)} tỷ`;
  return low > 0 ? `${highText} ${readBelowBillion(low, false)}` : highText;
}

export function numberToVietnameseWords(value: number): string {
  if (!Number.isFinite(value)) return '';
  const n = Math.floor(Math.abs(value));
  if (n === 0) return 'Không';

  const text = readNumber(n, true).replace(/\s+/g, ' ').trim();
  const sign = value < 0 ? 'âm ' : '';
  const result = sign + text;
  return result.charAt(0).toUpperCase() + result.slice(1);
}

/** 150000000 -> "Một trăm năm mươi triệu đồng" */
export function vndToWords(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '';
  return `${numberToVietnameseWords(value)} đồng`;
}

/**
 * Đọc diện tích đất ra chữ tiếng Việt.
 * Ví dụ: 1250 -> "Một nghìn hai trăm năm mươi mét vuông"
 *        1250.5 -> "Một nghìn hai trăm năm mươi phẩy năm mét vuông"
 */
export function areaToWords(area: number | null | undefined): string {
  if (area === null || area === undefined || !Number.isFinite(area) || area <= 0) return '';
  const rounded = Number(area.toFixed(2));
  const intPart = Math.floor(rounded);
  const decPart = Math.round((rounded - intPart) * 100);

  let text = numberToVietnameseWords(intPart);
  if (decPart > 0) {
    if (decPart % 10 === 0) {
      text += ` phẩy ${digitWord(decPart / 10)}`;
    } else {
      text += ` phẩy ${numberToVietnameseWords(decPart).toLowerCase()}`;
    }
  }
  return `${text} mét vuông`;
}

