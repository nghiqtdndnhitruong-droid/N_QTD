import { z } from 'zod';
import { Gender, IdDocumentType } from '@prisma/client';
import { objectIdSchema } from '../../shared/utils/zod.util';
import {
  isValidVietnamesePhone,
  parseCitizenIdInfo,
} from '../../shared/utils/identity-document.util';

export const VALID_BORROWER_RELATIONSHIPS = ['Chồng', 'Vợ', 'Con', 'Mẹ', 'Cha'] as const;
export const VALID_RELATED_PERSON_RELATIONSHIPS = [
  'Cha',
  'Mẹ',
  'Con',
  'Anh',
  'Chị',
  'Em',
  'Cô',
  'Cậu',
  'Dì',
] as const;

const dateStringSchema = z
  .string()
  .datetime({ offset: true })
  .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng ngày YYYY-MM-DD'));

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

// Schema cho Quan hệ người vay (5 lựa chọn, hoặc chuỗi cũ nếu là dữ liệu lịch sử)
const borrowerRelationshipSchema = z
  .string()
  .trim()
  .max(100)
  .nullable()
  .optional()
  .transform((val) => (val && val.length > 0 ? val : null));

// Schema cho Quan hệ người liên quan (9 lựa chọn, hoặc chuỗi cũ nếu là dữ liệu lịch sử)
const relatedPersonRelationshipSchema = z
  .string()
  .trim()
  .max(100)
  .nullable()
  .optional()
  .transform((val) => (val && val.length > 0 ? val : null));

export const baseRelatedPersonFields = {
  fullName: z
    .string({ required_error: 'Họ tên người liên quan là bắt buộc' })
    .trim()
    .min(2, 'Họ tên người liên quan tối thiểu 2 ký tự'),
  yearOfBirth: z
    .number()
    .int('Năm sinh phải là số nguyên')
    .min(1900, 'Năm sinh không hợp lệ')
    .max(new Date().getFullYear(), 'Năm sinh không được lớn hơn năm hiện tại')
    .optional(),
  gender: z
    .nativeEnum(Gender, {
      errorMap: () => ({ message: 'Giới tính phải là NAM hoặc NU' }),
    })
    .optional(),
  idType: z.nativeEnum(IdDocumentType, {
    errorMap: () => ({ message: 'Loại giấy tờ phải là CAN_CUOC hoặc CAN_CUOC_CONG_DAN' }),
  }),
  idNumber: cccdIdNumberSchema,
  idIssueDate: dateStringSchema,
  idIssuePlace: z.string().trim().optional(),
  idExpiry: dateStringSchema
    .or(z.literal(''))
    .nullable()
    .optional()
    .transform((v) => (v === '' ? null : v)),
  phoneNumber: optionalPhoneField,
  relationship: borrowerRelationshipSchema,
  borrowerRelationship: borrowerRelationshipSchema,
  relatedPersonRelationship: relatedPersonRelationshipSchema,
  provinceId: optionalObjectIdField,
  communeId: optionalObjectIdField,
  hamletId: optionalObjectIdField,
  addressDetail: z.string().trim().max(250).nullable().optional(),
  address: z.string().trim().optional(),
};

export const createRelatedPersonSchema = z.object(baseRelatedPersonFields);

export const updateRelatedPersonSchema = z.object(baseRelatedPersonFields).partial();

export const deleteRelatedPersonBodySchema = z
  .object({
    reason: z.string().trim().max(500).optional(),
  })
  .optional();
