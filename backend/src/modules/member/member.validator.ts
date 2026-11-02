import { z } from 'zod';
import { IdDocumentType, Gender } from '@prisma/client';
import { objectIdSchema } from '../../shared/utils/zod.util';
import {
  isValidVietnamesePhone,
  parseCitizenIdInfo,
} from '../../shared/utils/identity-document.util';

const optionalObjectIdField = z
  .union([objectIdSchema, z.literal('')])
  .nullable()
  .optional()
  .transform((val) => (val === '' ? null : val));

const optionalPhoneField = z
  .string()
  .trim()
  .nullable()
  .optional()
  .transform((val) => (val && val.trim().length > 0 ? val.trim() : null))
  .refine((val) => !val || isValidVietnamesePhone(val), {
    message: 'Số điện thoại không hợp lệ (ví dụ hợp lệ: 0912345678)',
  });

const cccdIdNumberSchema = z
  .string({ required_error: 'Số giấy tờ là bắt buộc' })
  .trim()
  .regex(/^\d{12}$/, 'Số CCCD / Thẻ căn cước phải gồm đúng 12 chữ số')
  .refine((val) => parseCitizenIdInfo(val) !== null, {
    message:
      'Số CCCD không đúng quy tắc mã hóa giới tính & năm sinh (ký tự thứ 4 phải là 0, 1, 2 hoặc 3)',
  });

const baseMemberFields = {
  memberCode: z
    .string({ required_error: 'Mã thành viên là bắt buộc' })
    .trim()
    .min(1, 'Mã thành viên không được để trống'),
  fullName: z
    .string({ required_error: 'Họ tên là bắt buộc' })
    .trim()
    .min(2, 'Họ tên tối thiểu 2 ký tự'),
  yearOfBirth: z
    .number()
    .int('Năm sinh phải là số nguyên')
    .min(1900, 'Năm sinh không hợp lệ')
    .max(new Date().getFullYear(), 'Năm sinh không được lớn hơn năm hiện tại')
    .optional(),
  idType: z.nativeEnum(IdDocumentType, {
    errorMap: () => ({ message: 'Loại giấy tờ phải là CAN_CUOC hoặc CAN_CUOC_CONG_DAN' }),
  }),
  idNumber: cccdIdNumberSchema,
  idIssueDate: z
    .string({ required_error: 'Ngày cấp là bắt buộc' })
    .datetime({ offset: true, message: 'Ngày cấp phải theo định dạng ISO-8601' })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng ngày cấp YYYY-MM-DD')),
  idIssuePlace: z.string().trim().optional(),
  idExpiry: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .or(z.literal(''))
    .nullable()
    .optional()
    .transform((v) => (v === '' ? null : v)),
  gender: z
    .nativeEnum(Gender, {
      errorMap: () => ({ message: 'Giới tính phải là NAM hoặc NU' }),
    })
    .optional(),
  phoneNumber: optionalPhoneField,
  provinceId: optionalObjectIdField,
  communeId: optionalObjectIdField,
  hamletId: optionalObjectIdField,
  addressDetail: z.string().trim().max(250).nullable().optional(),
  address: z.string().trim().optional(),
};

export const createMemberSchema = z
  .object(baseMemberFields)
  .refine(
    (data) =>
      Boolean(
        data.communeId ||
          data.hamletId ||
          (data.address && data.address.trim().length >= 3)
      ),
    {
      message: 'Vui lòng chọn Tỉnh và Xã quản lý (Ấp có thể bỏ trống) hoặc nhập địa chỉ hợp lệ',
      path: ['communeId'],
    }
  );

export const updateMemberSchema = z.object(baseMemberFields).partial();

export const deleteMemberBodySchema = z
  .object({
    reason: z.string().trim().max(500).optional(),
  })
  .optional();

export const memberFilterQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  search: z.string().trim().optional(),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  gender: z.nativeEnum(Gender).optional(),
  idType: z.nativeEnum(IdDocumentType).optional(),
  provinceId: objectIdSchema.optional(),
  communeId: objectIdSchema.optional(),
  hamletId: objectIdSchema.optional(),
});
