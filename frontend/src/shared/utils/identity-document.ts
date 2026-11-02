import { addDays, addMonths, differenceInCalendarDays, subDays } from 'date-fns';
import { Gender, IdDocumentType, LoanType } from '../types/enums';
import { formatDateVN, toDate } from '../format';

export const RELATED_PERSON_MIN_LOAN_AMOUNT = 140_000_000;

export interface ParsedCitizenIdInfo {
  gender: Gender;
  yearOfBirth: number;
  centuryCode: '0' | '1' | '2' | '3';
}

/**
 * Tự động xác định giới tính và năm sinh từ số CCCD / Thẻ căn cước 12 chữ số.
 * Quy tắc mã hóa CCCD Việt Nam (PPP G YY NNNNNN):
 * - 3 chữ số đầu (index 0..2): Mã tỉnh/thành phố (ví dụ 084)
 * - Chữ số thứ 4 (index 3): Mã thế kỷ và giới tính:
 *   + '0': Nam - Thế kỷ 20 (1900 + YY) -> VD: 084071... => Nam, 1971
 *   + '1': Nữ  - Thế kỷ 20 (1900 + YY) -> VD: 084182... => Nữ, 1982
 *   + '2': Nam - Thế kỷ 21 (2000 + YY) -> VD: 084202... => Nam, 2002
 *   + '3': Nữ  - Thế kỷ 21 (2000 + YY) -> VD: 084304... => Nữ, 2004
 * - 2 chữ số tiếp theo (index 4..5): 2 số cuối năm sinh (YY)
 */
export function parseCitizenIdInfo(rawIdNumber?: string | null): ParsedCitizenIdInfo | null {
  const cleaned = (rawIdNumber ?? '').trim();
  // Cho phép giải mã sớm ngay khi nhập từ 6 ký tự số đầu tiên trở lên (hoặc đủ 12 số)
  if (cleaned.length < 6 || !/^\d+$/.test(cleaned)) {
    return null;
  }

  const centuryGenderChar = cleaned[3];
  const birthYearSuffix = Number.parseInt(cleaned.slice(4, 6), 10);
  if (Number.isNaN(birthYearSuffix)) {
    return null;
  }

  let gender: Gender;
  let centuryBase: number;

  switch (centuryGenderChar) {
    case '0':
      gender = Gender.NAM;
      centuryBase = 1900;
      break;
    case '1':
      gender = Gender.NU;
      centuryBase = 1900;
      break;
    case '2':
      gender = Gender.NAM;
      centuryBase = 2000;
      break;
    case '3':
      gender = Gender.NU;
      centuryBase = 2000;
      break;
    default:
      return null;
  }

  const yearOfBirth = centuryBase + birthYearSuffix;
  const currentYear = new Date().getFullYear();
  if (yearOfBirth < 1900 || yearOfBirth > currentYear) {
    return null;
  }

  return {
    gender,
    yearOfBirth,
    centuryCode: centuryGenderChar,
  };
}

/**
 * Tự động xác định nơi cấp chuẩn theo loại giấy tờ định danh:
 * - CAN_CUOC_CONG_DAN -> "Cục Cảnh Sát QLHC về TTXH"
 * - CAN_CUOC -> "Bộ Công An"
 */
export function getCanonicalIdIssuePlace(idType?: IdDocumentType | string | null): string {
  if (!idType) return '';
  switch (idType) {
    case IdDocumentType.CAN_CUOC_CONG_DAN:
      return 'Cục Cảnh Sát QLHC về TTXH';
    case IdDocumentType.CAN_CUOC:
      return 'Bộ Công An';
    default:
      return 'Cục Cảnh Sát QLHC về TTXH';
  }
}

/**
 * Kiểm tra định dạng số điện thoại Việt Nam (khi có nhập).
 */
export function isValidVietnamesePhone(phone?: string | null): boolean {
  if (!phone) return true;
  const cleaned = phone.trim().replace(/\s+/g, '');
  if (!cleaned) return true;
  return /^(0|\+84)(3|5|7|8|9|2)\d{8,9}$/.test(cleaned) || /^0\d{9,10}$/.test(cleaned);
}

/**
 * Chuẩn hóa số điện thoại tùy chọn (trả về null nếu rỗng).
 */
export function normalizeOptionalPhoneNumber(phone?: string | null): string | null {
  if (phone === undefined || phone === null) return null;
  const trimmed = phone.trim().replace(/\s+/g, '');
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Kiểm tra khoản vay có thuộc diện được phép / bắt buộc khai báo Người liên quan hay không.
 * Điều kiện duy nhất: Vay Thế chấp (THE_CHAP) VÀ Số tiền vay >= 140.000.000 đồng.
 */
export function isLoanEligibleForRelatedPerson(
  loanType?: LoanType | string | null,
  loanAmount?: number | string | null
): boolean {
  if (!loanType || loanAmount === undefined || loanAmount === null) return false;
  return (
    loanType === LoanType.THE_CHAP &&
    Number(loanAmount) >= RELATED_PERSON_MIN_LOAN_AMOUNT
  );
}

/**
 * Xác định diện tích tính định giá thực tế:
 * - Ưu tiên diện tích thực tế (actualArea > 0)
 * - Nếu không có thì dùng diện tích trên giấy chứng nhận (area)
 */
export function resolveEffectiveCollateralArea(
  certificateArea: number,
  actualArea?: number | null
): { effectiveArea: number; areaSource: 'ACTUAL_AREA' | 'CERTIFICATE_AREA' } {
  if (actualArea !== undefined && actualArea !== null && Number(actualArea) > 0) {
    return {
      effectiveArea: Number(actualArea),
      areaSource: 'ACTUAL_AREA',
    };
  }
  return {
    effectiveArea: Number(certificateArea) || 0,
    areaSource: 'CERTIFICATE_AREA',
  };
}

/**
 * Tính giá trị định giá tài sản = Diện tích tính định giá × Đơn giá 1 m²
 * Luôn làm tròn xuống số nguyên đồng (Math.floor) và khử sai số dấu phẩy động IEEE-754.
 */
export function calculateFlooredValuationAmount(
  effectiveArea: number,
  pricePerSqMeter: number
): number {
  if (effectiveArea <= 0 || pricePerSqMeter < 0) {
    return 0;
  }
  const exactProduct = Number((effectiveArea * pricePerSqMeter).toFixed(6));
  return Math.floor(exactProduct);
}

/**
 * Ghép chuỗi địa chỉ hành chính sạch:
 * - Khi có chọn Ấp: "Địa chỉ chi tiết, Ấp X, Xã Y, Tỉnh Z"
 * - Khi không chọn Ấp: "Địa chỉ chi tiết, Xã Y, Tỉnh Z"
 */
export function formatLocationAddress(params: {
  provinceName?: string | null;
  communeName?: string | null;
  hamletName?: string | null;
  addressDetail?: string | null;
  fallbackAddress?: string | null;
}): string {
  const parts = [
    params.addressDetail?.trim(),
    params.hamletName?.trim(),
    params.communeName?.trim(),
    params.provinceName?.trim(),
  ].filter((p): p is string => Boolean(p && p.length > 0));

  if (parts.length > 0) {
    return parts.join(', ');
  }
  return params.fallbackAddress?.trim() || '';
}

/**
 * Tính số ngày và ngày kết thúc cho khoảng thời gian N tháng tính từ ngày bắt đầu.
 * Xử lý chính xác từng tháng theo lịch thực tế (28, 29, 30, 31 ngày) và qua năm.
 * Quy tắc: Ngày kết thúc = startDate + N tháng - 1 ngày.
 */
export function calculateMonthsPeriod(
  startDate: Date | string,
  months: number
): { days: number; endDate: Date } {
  const start = toDate(startDate) ?? new Date();
  const nextTarget = addMonths(start, months);
  const endDate = subDays(nextTarget, 1);
  const days = Math.max(1, differenceInCalendarDays(endDate, start) + 1);

  return { days, endDate };
}

/**
 * Tính ngày kết thúc kỳ thu lãi từ ngày bắt đầu và số ngày.
 * Ngày bắt đầu + (days - 1) ngày.
 */
export function calculateInterestEndDate(
  startDate: Date | string,
  days: number
): Date {
  const start = toDate(startDate) ?? new Date();
  const safeDays = Math.max(1, Math.round(days));
  return addDays(start, safeDays - 1);
}

/**
 * Tự động tạo nội dung giao dịch thu lãi theo quy định của Quỹ:
 * "Thu lãi HĐTC [Số khế ước] từ ngày [Ngày bắt đầu] đến ngày [Ngày kết thúc] số tiền là: [Số tiền] đồng"
 */
export function generateInterestRepaymentNote(params: {
  contractNumber?: string | null;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  interestAmount?: number | null;
}): string {
  const contractNumber = params.contractNumber?.trim() || '......';
  const startStr = params.startDate ? formatDateVN(params.startDate) : '...';
  const endStr = params.endDate ? formatDateVN(params.endDate) : '...';
  const amountStr = params.interestAmount
    ? `${Math.round(params.interestAmount).toLocaleString('vi-VN')} đồng`
    : '0 đồng';

  return `Thu lãi HĐTC ${contractNumber} từ ngày ${startStr} đến ngày ${endStr} số tiền là: ${amountStr}`;
}


