import { describe, expect, it } from 'vitest';

/**
 * Thuật toán chuẩn hoá và gộp dữ liệu tài sản theo quy tắc merged_asset_* của Quỹ
 */
export function mergeAssetValues<T>(
  items: T[] | undefined,
  extractor: (item: T) => string | number | null | undefined,
  fallbackValue: string = '……',
): string {
  if (!items || items.length === 0) {
    return fallbackValue;
  }

  const values: string[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    const raw = extractor(item);
    if (raw === null || raw === undefined) continue;
    const str = String(raw).trim();
    if (str.length === 0) continue;

    const normalizedKey = str.replace(/\s+/g, ' ').toLowerCase();
    if (!seen.has(normalizedKey)) {
      seen.add(normalizedKey);
      values.push(str);
    }
  }

  if (values.length === 0) {
    return fallbackValue;
  }

  return values.join('; ');
}

describe('merged_asset_* deduplication rules', () => {
  it('Ví dụ 1: Các tài sản có giá trị khác nhau -> nối bằng dấu chấm phẩy', () => {
    const assets = [{ sheetNo: '1' }, { sheetNo: '2' }];
    const res = mergeAssetValues(assets, (a) => a.sheetNo);
    expect(res).toBe('1; 2');
  });

  it('Ví dụ 2: Các tài sản có giá trị giống nhau -> chỉ hiển thị 1 lần duy nhất', () => {
    const assets = [{ sheetNo: '1' }, { sheetNo: '1' }];
    const res = mergeAssetValues(assets, (a) => a.sheetNo);
    expect(res).toBe('1');
    expect(res).not.toBe('1; 1');
  });

  it('Ví dụ 3: Có 3 tài sản, một số giá trị trùng nhau -> giữ thứ tự và loại bỏ trùng', () => {
    const assets = [{ plotNo: '100' }, { plotNo: '100' }, { plotNo: '200' }];
    const res = mergeAssetValues(assets, (a) => a.plotNo);
    expect(res).toBe('100; 200');
  });

  it('Quy tắc C: Dữ liệu 100; 100; 150; 150; 200 -> kết quả là 100; 150; 200', () => {
    const assets = [
      { area: 100 },
      { area: 100 },
      { area: 150 },
      { area: 150 },
      { area: 200 },
    ];
    const res = mergeAssetValues(assets, (a) => a.area);
    expect(res).toBe('100; 150; 200');
  });

  it('Chuẩn hoá khoảng trắng thừa: " 100 " và "100" không coi là 2 giá trị khác nhau', () => {
    const assets = [{ code: 'BK 123456 ' }, { code: '  BK 123456' }, { code: 'CS 999' }];
    const res = mergeAssetValues(assets, (a) => a.code);
    expect(res).toBe('BK 123456; CS 999');
  });

  it('Xử lý giá trị trống: Bỏ qua null, undefined, chuỗi rỗng và không sinh dấu chấm phẩy thừa', () => {
    const assets = [
      { bookNo: 'SỔ 1' },
      { bookNo: null },
      { bookNo: '' },
      { bookNo: undefined },
      { bookNo: 'SỔ 2' },
    ];
    const res = mergeAssetValues(assets, (a) => a.bookNo);
    expect(res).toBe('SỔ 1; SỔ 2');
  });

  it('Khi tất cả tài sản đều rỗng -> trả về fallbackValue', () => {
    const assets = [{ bookNo: null }, { bookNo: '' }];
    const res = mergeAssetValues(assets, (a) => a.bookNo, '……');
    expect(res).toBe('……');
  });

  it('Giữ nguyên thứ tự mảng ban đầu, không tự ý sắp xếp lại', () => {
    const assets = [{ sheet: 'Z' }, { sheet: 'A' }, { sheet: 'M' }];
    const res = mergeAssetValues(assets, (a) => a.sheet);
    expect(res).toBe('Z; A; M');
  });
});

