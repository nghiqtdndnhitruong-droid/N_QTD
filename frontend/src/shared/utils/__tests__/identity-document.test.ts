import { describe, expect, it } from 'vitest';
import { Gender, IdDocumentType, LoanType } from '@/shared/types';
import { toApiDate } from '@/shared/format';
import {
  calculateFlooredValuationAmount,
  calculateInterestEndDate,
  calculateMonthsPeriod,
  formatLocationAddress,
  generateInterestRepaymentNote,
  getCanonicalIdIssuePlace,
  isLoanEligibleForRelatedPerson,
  isValidVietnamesePhone,
  parseCitizenIdInfo,
  resolveEffectiveCollateralArea,
} from '../identity-document';

describe('identity-document utilities', () => {
  describe('parseCitizenIdInfo', () => {
    it('giải mã chính xác CCCD thế kỷ 20 cho Nam (ký tự thứ 4 = 0: 1900s)', () => {
      // 084 0 71 000123 -> Nam sinh 1971
      const res = parseCitizenIdInfo('084071000123');
      expect(res).toMatchObject({ gender: Gender.NAM, yearOfBirth: 1971, centuryCode: '0' });
    });

    it('giải mã chính xác CCCD thế kỷ 20 cho Nữ (ký tự thứ 4 = 1: 1900s)', () => {
      // 084 1 82 000123 -> Nữ sinh 1982
      const res = parseCitizenIdInfo('084182000123');
      expect(res).toMatchObject({ gender: Gender.NU, yearOfBirth: 1982, centuryCode: '1' });
    });

    it('giải mã chính xác CCCD thế kỷ 21 cho Nam (ký tự thứ 4 = 2: 2000s)', () => {
      // 084 2 02 000123 -> Nam sinh 2002
      const res = parseCitizenIdInfo('084202000123');
      expect(res).toMatchObject({ gender: Gender.NAM, yearOfBirth: 2002, centuryCode: '2' });
    });

    it('giải mã chính xác CCCD thế kỷ 21 cho Nữ (ký tự thứ 4 = 3: 2000s)', () => {
      // 084 3 04 000123 -> Nữ sinh 2004
      const res = parseCitizenIdInfo('084304000123');
      expect(res).toMatchObject({ gender: Gender.NU, yearOfBirth: 2004, centuryCode: '3' });
    });

    it('giải mã ngay khi nhập đủ 6 ký tự đầu (PPP G YY)', () => {
      const res = parseCitizenIdInfo('084071');
      expect(res).toMatchObject({ gender: Gender.NAM, yearOfBirth: 1971 });
    });

    it('trả về null nếu mã thế kỷ không nằm trong [0, 1, 2, 3]', () => {
      expect(parseCitizenIdInfo('084400000000')).toBeNull();
      expect(parseCitizenIdInfo('084900000000')).toBeNull();
    });

    it('trả về null nếu dưới 6 số hoặc chứa ký tự không phải số', () => {
      expect(parseCitizenIdInfo('08407')).toBeNull();
      expect(parseCitizenIdInfo('0840')).toBeNull();
      expect(parseCitizenIdInfo('084071ABC123')).toBeNull();
      expect(parseCitizenIdInfo(null)).toBeNull();
      expect(parseCitizenIdInfo(undefined)).toBeNull();
    });
  });

  describe('getCanonicalIdIssuePlace', () => {
    it('gán đúng Cục CSQLHC về TTXH cho Căn cước công dân', () => {
      expect(getCanonicalIdIssuePlace(IdDocumentType.CAN_CUOC_CONG_DAN)).toBe(
        'Cục CSQLHC về TTXH',
      );
    });

    it('gán đúng Bộ Công An cho Căn cước mới', () => {
      expect(getCanonicalIdIssuePlace(IdDocumentType.CAN_CUOC)).toBe('Bộ Công An');
    });
  });

  describe('isLoanEligibleForRelatedPerson', () => {
    it('đủ điều kiện khi là Thế chấp và số tiền >= 140.000.000 đ', () => {
      expect(isLoanEligibleForRelatedPerson(LoanType.THE_CHAP, 140_000_000)).toBe(true);
      expect(isLoanEligibleForRelatedPerson(LoanType.THE_CHAP, 250_000_000)).toBe(true);
    });

    it('không đủ điều kiện khi là Thế chấp nhưng số tiền < 140.000.000 đ', () => {
      expect(isLoanEligibleForRelatedPerson(LoanType.THE_CHAP, 139_999_999)).toBe(false);
      expect(isLoanEligibleForRelatedPerson(LoanType.THE_CHAP, 50_000_000)).toBe(false);
    });

    it('không áp dụng cho Tín chấp dù số tiền bất kỳ', () => {
      expect(isLoanEligibleForRelatedPerson(LoanType.TIN_CHAP, 140_000_000)).toBe(false);
      expect(isLoanEligibleForRelatedPerson(LoanType.TIN_CHAP, 500_000_000)).toBe(false);
    });
  });

  describe('resolveEffectiveCollateralArea & calculateFlooredValuationAmount', () => {
    it('ưu tiên diện tích thực tế nếu có và > 0', () => {
      expect(resolveEffectiveCollateralArea(1000, 1200)).toEqual({
        effectiveArea: 1200,
        areaSource: 'ACTUAL_AREA',
      });
      expect(resolveEffectiveCollateralArea(1000, 850.5)).toEqual({
        effectiveArea: 850.5,
        areaSource: 'ACTUAL_AREA',
      });
    });

    it('sử dụng diện tích trên giấy chứng nhận nếu không có diện tích thực', () => {
      expect(resolveEffectiveCollateralArea(1000, null)).toEqual({
        effectiveArea: 1000,
        areaSource: 'CERTIFICATE_AREA',
      });
      expect(resolveEffectiveCollateralArea(1000, undefined)).toEqual({
        effectiveArea: 1000,
        areaSource: 'CERTIFICATE_AREA',
      });
      expect(resolveEffectiveCollateralArea(1000, 0)).toEqual({
        effectiveArea: 1000,
        areaSource: 'CERTIFICATE_AREA',
      });
    });

    it('tính giá trị định giá làm tròn xuống (floor) theo đơn vị 1.000.000đ chính xác theo Task B', () => {
      // 4488 m2 * 150.000 đ/m2 = 673.200.000 đ -> làm tròn xuống 673.000.000 đ
      expect(calculateFlooredValuationAmount(4488, 150_000)).toBe(673_000_000);

      // 1200 m2 * 100.000 đ/m2 = 120.000.000 đ -> 120.000.000 đ
      expect(calculateFlooredValuationAmount(1200, 100_000)).toBe(120_000_000);

      // 123.456 m2 * 100.000 đ/m2 = 12.345.600 đ -> 12.000.000 đ
      expect(calculateFlooredValuationAmount(123.456, 100_000)).toBe(12_000_000);
    });
  });

  describe('isValidVietnamesePhone', () => {
    it('xác thực đúng số điện thoại VN', () => {
      expect(isValidVietnamesePhone('0912345678')).toBe(true);
      expect(isValidVietnamesePhone('0834567890')).toBe(true);
      expect(isValidVietnamesePhone('0321123456')).toBe(true);
      expect(isValidVietnamesePhone('+84912345678')).toBe(true);
      expect(isValidVietnamesePhone('')).toBe(true);
      expect(isValidVietnamesePhone(null)).toBe(true);
    });

    it('từ chối số điện thoại không hợp lệ', () => {
      expect(isValidVietnamesePhone('1912345678')).toBe(false);
      expect(isValidVietnamesePhone('091234567')).toBe(false);
      expect(isValidVietnamesePhone('091234abcd')).toBe(false);
      expect(isValidVietnamesePhone('phone123')).toBe(false);
    });
  });

  describe('formatLocationAddress', () => {
    it('định dạng đầy đủ khi có Ấp, Xã, Tỉnh', () => {
      expect(
        formatLocationAddress({
          addressDetail: 'Số 10',
          hamletName: 'Ấp Nô Lựa',
          communeName: 'Xã Nhị Trường',
          provinceName: 'Tỉnh Vĩnh Long',
        }),
      ).toBe('Số 10, Ấp Nô Lựa, Xã Nhị Trường, Tỉnh Vĩnh Long');
    });

    it('cho phép bỏ trống Ấp mà không sinh ra dấu phẩy thừa', () => {
      expect(
        formatLocationAddress({
          addressDetail: 'Số 10',
          hamletName: undefined,
          communeName: 'Xã Nhị Trường',
          provinceName: 'Tỉnh Vĩnh Long',
        }),
      ).toBe('Số 10, Xã Nhị Trường, Tỉnh Vĩnh Long');
    });
  });

  describe('calculateMonthsPeriod', () => {
    it('tính chính xác 3 tháng theo lịch thực tế (vd từ 01/01/2026)', () => {
      // 01/01/2026 -> +3 months: 31/03/2026. Tháng 1 (31) + Tháng 2 (28) + Tháng 3 (31) = 90 ngày
      const { days, endDate } = calculateMonthsPeriod('2026-01-01', 3);
      expect(days).toBe(90);
      expect(toApiDate(endDate)).toBe('2026-03-31');
    });

    it('tính chính xác khi qua năm nhuận (vd năm 2024)', () => {
      // 01/01/2024 -> +3 months: 31/03/2024. Tháng 1 (31) + Tháng 2 nhuận (29) + Tháng 3 (31) = 91 ngày
      const { days, endDate } = calculateMonthsPeriod('2024-01-01', 3);
      expect(days).toBe(91);
      expect(toApiDate(endDate)).toBe('2024-03-31');
    });

    it('tính chính xác 4 tháng và 5 tháng', () => {
      const period4 = calculateMonthsPeriod('2026-01-01', 4);
      expect(period4.days).toBe(120); // Jan(31) + Feb(28) + Mar(31) + Apr(30) = 120
      expect(toApiDate(period4.endDate)).toBe('2026-04-30');

      const period5 = calculateMonthsPeriod('2026-01-01', 5);
      expect(period5.days).toBe(151); // 120 + May(31) = 151
      expect(toApiDate(period5.endDate)).toBe('2026-05-31');
    });
  });

  describe('calculateInterestEndDate', () => {
    it('cộng chính xác số ngày vào ngày bắt đầu', () => {
      const end = calculateInterestEndDate('2026-01-01', 90);
      expect(toApiDate(end)).toBe('2026-03-31');
    });
  });

  describe('generateInterestRepaymentNote', () => {
    it('sinh đúng khuôn mẫu chuẩn', () => {
      const note = generateInterestRepaymentNote({
        contractNumber: 'KU-2026-001',
        startDate: '2026-01-01',
        endDate: '2026-04-01',
        interestAmount: 2500000,
      });
      expect(note).toBe(
        'Thu lãi HĐTC KU-2026-001 từ ngày 01/01/2026 đến ngày 01/04/2026 số tiền là: 2.500.000 đồng',
      );
    });

    it('xử lý linh hoạt khi chưa có số khế ước', () => {
      const note = generateInterestRepaymentNote({
        contractNumber: null,
        startDate: '2026-01-01',
        endDate: '2026-04-01',
        interestAmount: 0,
      });
      expect(note).toContain('từ ngày 01/01/2026 đến ngày 01/04/2026 số tiền là: 0 đồng');
    });
  });
});
