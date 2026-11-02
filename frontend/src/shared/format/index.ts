export * from './currency';
export * from './date';
export * from './number-to-words';

/** "0912345678" -> "0912 345 678" */
export function formatPhoneVN(value: string | null | undefined): string {
  if (!value) return '—';
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 10) return value;
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
}

