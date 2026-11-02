import { Gender, IdDocumentType, LoanType } from '@prisma/client';
import { AppError } from '../errors/app-error';
import { ErrorCode } from '../errors/error-codes';

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
export function parseCitizenIdInfo(rawIdNumber: string): ParsedCitizenIdInfo | null {
  const cleaned = (rawIdNumber ?? '').trim();
  if (!/^\d{12}$/.test(cleaned)) {
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
 * Bắt buộc trích xuất giới tính và năm sinh từ số CCCD 12 số (ném lỗi nghiệp vụ nếu không hợp lệ).
 */
export function requireValidCitizenIdInfo(
  rawIdNumber: string,
  entityLabel = 'Người khai báo'
): ParsedCitizenIdInfo {
  const cleaned = (rawIdNumber ?? '').trim();
  if (!/^\d{12}$/.test(cleaned)) {
    throw AppError.badRequest(
      `Số giấy tờ của ${entityLabel} phải gồm đúng 12 chữ số (CCCD / Thẻ căn cước)`,
      ErrorCode.VALIDATION_ERROR
    );
  }

  const parsed = parseCitizenIdInfo(cleaned);
  if (!parsed) {
    throw AppError.badRequest(
      `Số giấy tờ "${cleaned}" của ${entityLabel} có mã giới tính/năm sinh (ký tự thứ 4-6) không hợp lệ theo chuẩn CCCD (mã giới tính hợp lệ: 0, 1, 2, 3)`,
      ErrorCode.VALIDATION_ERROR
    );
  }

  return parsed;
}

/**
 * Tự động xác định nơi cấp chuẩn theo loại giấy tờ định danh.
 * - CAN_CUOC_CONG_DAN -> "Cục Cảnh Sát QLHC về TTXH"
 * - CAN_CUOC -> "Bộ Công An"
 */
export function getCanonicalIdIssuePlace(idType: IdDocumentType): string {
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
 * Chuẩn hóa số điện thoại tùy chọn (trả về null nếu rỗng).
 */
export function normalizeOptionalPhoneNumber(phone?: string | null): string | null {
  if (phone === undefined || phone === null) {
    return null;
  }
  const trimmed = phone.trim().replace(/\s+/g, '');
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Kiểm tra định dạng số điện thoại Việt Nam (khi có nhập).
 */
export function isValidVietnamesePhone(phone: string): boolean {
  const cleaned = phone.trim().replace(/\s+/g, '');
  return /^(0|\+84)(3|5|7|8|9|2)\d{8,9}$/.test(cleaned) || /^0\d{9,10}$/.test(cleaned);
}

/**
 * Kiểm tra khoản vay có thuộc diện được phép / bắt buộc quản lý Người liên quan hay không.
 * Điều kiện duy nhất: Vay Thế chấp (THE_CHAP) VÀ Số tiền vay >= 140.000.000 đồng.
 */
export function isLoanEligibleForRelatedPerson(
  loanType: LoanType,
  loanAmount: number
): boolean {
  return (
    loanType === LoanType.THE_CHAP &&
    Number(loanAmount) >= RELATED_PERSON_MIN_LOAN_AMOUNT
  );
}

/**
 * Xác định diện tích tính định giá thực tế:
 * - Nếu có diện tích thực (actualArea > 0) thì lấy actualArea.
 * - Nếu bỏ trống actualArea thì lấy diện tích trên giấy chứng nhận (area).
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
    effectiveArea: Number(certificateArea),
    areaSource: 'CERTIFICATE_AREA',
  };
}

/**
 * Tính giá trị định giá tài sản = Diện tích tính định giá × Đơn giá 1 m²
 * Luôn làm tròn xuống số nguyên đồng (Math.floor) và xử lý chống sai số dấu phẩy động IEEE-754.
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

