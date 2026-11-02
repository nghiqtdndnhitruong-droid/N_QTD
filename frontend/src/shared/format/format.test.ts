import { describe, expect, it } from 'vitest';
import { formatCurrencyInput, formatVND, parseVND } from './currency';
import { formatDateVN, isValidApiDate, maskDateInput, parseDateVN } from './date';

describe('currency', () => {
  it('định dạng số tiền VNĐ', () => {
    expect(formatVND(150_000_000)).toBe('150.000.000 ₫');
    expect(formatVND(null)).toBe('—');
  });

  it('phân tích chuỗi tiền', () => {
    expect(parseVND('1.500.000 ₫')).toBe(1_500_000);
    expect(parseVND('')).toBeNull();
  });

  describe('formatCurrencyInput – giữ đúng vị trí con trỏ', () => {
    it('gõ thêm chữ số ở cuối', () => {
      expect(formatCurrencyInput('1.0000', 6)).toEqual({ display: '10.000', value: 10_000, caret: 6 });
    });

    it('gõ chữ số ở giữa', () => {
      // "1.000" -> gõ "5" sau "1" => "15.000" (raw "15.000", caret 2)
      const r = formatCurrencyInput('15.000', 2);
      expect(r.display).toBe('15.000');
      expect(r.caret).toBe(2);
    });

    it('xoá làm mất một nhóm', () => {
      // "1.000" xoá "1" => ".000", caret 0
      expect(formatCurrencyInput('.000', 0)).toEqual({ display: '', value: null, caret: 0 });
      // "12.345" xoá "2" => "1.345", caret 1 -> "1.345"
      expect(formatCurrencyInput('1.345', 1)).toEqual({ display: '1.345', value: 1345, caret: 1 });
    });

    it('bỏ ký tự không phải số và số 0 ở đầu', () => {
      expect(formatCurrencyInput('00abc12', 7)).toEqual({ display: '12', value: 12, caret: 2 });
    });

    it('giới hạn số chữ số', () => {
      expect(formatCurrencyInput('1234567', 7, 5).value).toBe(12345);
    });
  });
});

describe('date', () => {
  it('định dạng hiển thị dd/MM/yyyy', () => {
    expect(formatDateVN('2026-02-15')).toBe('15/02/2026');
    expect(formatDateVN('2026-02-15T10:00:00.000Z')).toMatch(/^1[56]\/02\/2026$/);
    expect(formatDateVN(null)).toBe('—');
  });

  it('chuyển ngày người dùng nhập sang định dạng API', () => {
    expect(parseDateVN('15/02/2026')).toBe('2026-02-15');
    expect(parseDateVN('31/02/2026')).toBeNull();
    expect(parseDateVN('1/2/2026')).toBeNull();
  });

  it('tự chèn dấu "/" khi gõ', () => {
    expect(maskDateInput('15')).toBe('15');
    expect(maskDateInput('1502')).toBe('15/02');
    expect(maskDateInput('15022026')).toBe('15/02/2026');
    expect(maskDateInput('15/02/20269')).toBe('15/02/2026');
  });

  it('kiểm tra ngày API hợp lệ', () => {
    expect(isValidApiDate('2026-02-28')).toBe(true);
    expect(isValidApiDate('2026-02-30')).toBe(false);
    expect(isValidApiDate('15/02/2026')).toBe(false);
  });
});

