import { describe, expect, it } from 'vitest';
import { numberToVietnameseWords, vndToWords } from './number-to-words';

describe('numberToVietnameseWords', () => {
  it.each([
    [0, 'Không'],
    [5, 'Năm'],
    [10, 'Mười'],
    [15, 'Mười lăm'],
    [21, 'Hai mươi mốt'],
    [25, 'Hai mươi lăm'],
    [105, 'Một trăm linh năm'],
    [110, 'Một trăm mười'],
    [1_000, 'Một nghìn'],
    [1_005, 'Một nghìn không trăm linh năm'],
    [1_050_000, 'Một triệu không trăm năm mươi nghìn'],
    [1_000_005, 'Một triệu không trăm linh năm'],
    [150_000_000, 'Một trăm năm mươi triệu'],
    [1_000_000_000, 'Một tỷ'],
    [2_500_000_000, 'Hai tỷ năm trăm triệu'],
    [1_000_000_001, 'Một tỷ không trăm linh một'],
    [1_000_000_000_000, 'Một nghìn tỷ'],
  ])('%d -> %s', (input, expected) => {
    expect(numberToVietnameseWords(input)).toBe(expected);
  });

  it('thêm hậu tố "đồng" khi đọc tiền', () => {
    expect(vndToWords(100_000_000)).toBe('Một trăm triệu đồng');
    expect(vndToWords(null)).toBe('');
  });
});

