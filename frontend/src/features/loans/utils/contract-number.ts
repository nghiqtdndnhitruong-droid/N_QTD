/**
 * Tiện ích định dạng và tạo Số khế ước nhận nợ / Số hợp đồng thế chấp
 * Chuẩn định dạng: Năm.Tháng.Số ngẫu nhiên (Ví dụ: 26.11.020)
 * - 2 số đầu: Năm (YY)
 * - 2 số tiếp: Tháng (MM)
 * - Phần sau dấu chấm thứ 2: Tự do nhập (số thứ tự, ngẫu nhiên, v.v.)
 */

export function formatContractNumber(input: string, prev = ''): string {
  if (!input) return '';

  // Xử lý khi người dùng nhấn backspace xóa dấu chấm ở cuối
  if (prev && prev.endsWith('.') && input === prev.slice(0, -1)) {
    // Xóa tiếp ký tự số ngay trước dấu chấm để trải nghiệm xóa tự nhiên, không bị kẹt dấu chấm
    return input.slice(0, -1);
  }

  const parts = input.split('.');

  // 1. Chưa có dấu chấm nào
  if (parts.length === 1) {
    const raw = (parts[0] ?? '').replace(/\D/g, '');
    if (raw.length <= 2) {
      if (raw.length === 2 && input.length >= prev.length) {
        return `${raw}.`;
      }
      return raw;
    }
    // Trường hợp dán hoặc gõ liên tục nhiều số không có dấu chấm: e.g. '2611020'
    const yy = raw.slice(0, 2);
    const mm = raw.slice(2, 4);
    const rest = raw.slice(4);
    if (raw.length === 3) {
      return `${yy}.${raw[2] ?? ''}`;
    }
    if (raw.length === 4) {
      return `${yy}.${mm}.`;
    }
    return `${yy}.${mm}.${rest}`;
  }

  // 2. Đã có 1 dấu chấm: YY.MM
  if (parts.length === 2) {
    const yy = (parts[0] ?? '').replace(/\D/g, '').slice(0, 2);
    const rawMonth = (parts[1] ?? '').replace(/\D/g, '');
    if (rawMonth.length <= 2) {
      if (rawMonth.length === 2 && input.length >= prev.length) {
        return `${yy}.${rawMonth}.`;
      }
      return `${yy}.${rawMonth}`;
    }
    // Tháng vượt quá 2 số -> chuyển sang phần số cuối
    const mm = rawMonth.slice(0, 2);
    const rest = (parts[1] ?? '').slice(2);
    return `${yy}.${mm}.${rest}`;
  }

  // 3. Đã có từ 2 dấu chấm trở lên: YY.MM.<phần còn lại cho phép nhập tự do>
  const yy = (parts[0] ?? '').replace(/\D/g, '').slice(0, 2);
  const mm = (parts[1] ?? '').replace(/\D/g, '').slice(0, 2);
  const rest = parts.slice(2).join('.');
  return `${yy}.${mm}.${rest}`;
}

/**
 * Sinh số khế ước / hợp đồng thế chấp mặc định theo thời gian hiện tại
 * Ví dụ: 26.11.020
 */
export function generateDefaultContractNumber(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const randomSeq = String(Math.floor(Math.random() * 900) + 100).padStart(3, '0');
  return `${yy}.${mm}.${randomSeq}`;
}
