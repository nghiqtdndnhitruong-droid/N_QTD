import { z } from 'zod';
import { isValidApiDate } from '../format/date';
import { isValidVietnamesePhone, parseCitizenIdInfo } from '../utils/identity-document';

/** Số tiền VNĐ nguyên dương (> 0). */
export const positiveVndSchema = (label = 'Số tiền') =>
  z
    .number({
      required_error: `${label} là bắt buộc`,
      invalid_type_error: `${label} phải là số`,
    })
    .int(`${label} phải là số nguyên (VNĐ)`)
    .positive(`${label} phải lớn hơn 0`);

/** Số tiền VNĐ không âm (>= 0). */
export const nonNegativeVndSchema = (label = 'Số tiền') =>
  z
    .number({
      required_error: `${label} là bắt buộc`,
      invalid_type_error: `${label} phải là số`,
    })
    .int(`${label} phải là số nguyên (VNĐ)`)
    .nonnegative(`${label} không được âm`);

/** Chuỗi ngày định dạng YYYY-MM-DD hợp lệ. */
export const apiDateStringSchema = (label = 'Ngày') =>
  z
    .string({ required_error: `${label} là bắt buộc` })
    .trim()
    .min(1, `${label} là bắt buộc`)
    .refine(isValidApiDate, `${label} không hợp lệ (định dạng chuẩn dd/mm/yyyy)`);

/** Chuỗi ngày tùy chọn (cho phép rỗng hoặc null). */
export const optionalApiDateStringSchema = (label = 'Ngày') =>
  z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((v) => (v === '' ? undefined : v))
    .refine((v) => !v || isValidApiDate(v), `${label} không hợp lệ`);

/** Số CCCD / Thẻ căn cước 12 chữ số. */
export const idNumberSchema = z
  .string({ required_error: 'Số giấy tờ tùy thân là bắt buộc' })
  .trim()
  .regex(/^\d{12}$/, 'Số CCCD / Thẻ căn cước phải gồm đúng 12 chữ số')
  .refine((val) => parseCitizenIdInfo(val) !== null, {
    message: 'Số CCCD không đúng quy tắc mã hóa giới tính & năm sinh (ký tự thứ 4 phải là 0, 1, 2 hoặc 3)',
  });

/** Năm sinh hợp lệ (từ 1900 đến năm hiện tại, đủ 18 tuổi khi cần). */
export const yearOfBirthSchema = (minAge = 18) => {
  const currentYear = new Date().getFullYear();
  return z
    .number({
      required_error: 'Năm sinh là bắt buộc',
      invalid_type_error: 'Năm sinh phải là số',
    })
    .int('Năm sinh phải là số nguyên')
    .min(1900, 'Năm sinh không hợp lệ (tối thiểu 1900)')
    .max(currentYear - minAge, `Người này phải từ ${minAge} tuổi trở lên`);
};

/** Số điện thoại Việt Nam (10 chữ số, bắt đầu bằng 0). */
export const phoneVNSSchema = z
  .string()
  .trim()
  .regex(/^0\d{9}$/, 'Số điện thoại phải gồm 10 chữ số và bắt đầu bằng số 0');

/** Số điện thoại tùy chọn (cho phép rỗng, nếu nhập phải đúng định dạng VN). */
export const optionalPhoneVNSchema = z
  .string()
  .trim()
  .optional()
  .nullable()
  .refine((v) => !v || isValidVietnamesePhone(v), {
    message: 'Số điện thoại không hợp lệ (ví dụ hợp lệ: 0912345678)',
  });

