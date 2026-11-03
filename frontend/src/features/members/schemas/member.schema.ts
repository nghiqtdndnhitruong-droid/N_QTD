import { z } from 'zod';
import { Gender, IdDocumentType } from '@/shared/types';
import {
  apiDateStringSchema,
  idNumberSchema,
  optionalApiDateStringSchema,
  optionalPhoneVNSchema,
} from '@/shared/validation';

export const memberFormSchema = z
  .object({
    isNewMember: z.boolean().optional(),
    memberCode: z
      .string()
      .trim()
      .max(30, 'Mã thành viên tối đa 30 ký tự')
      .optional()
      .or(z.literal('')),
    fullName: z
      .string({ required_error: 'Họ và tên là bắt buộc' })
      .trim()
      .min(2, 'Họ và tên tối thiểu 2 ký tự'),
    yearOfBirth: z
      .number()
      .int()
      .min(1900, 'Năm sinh không hợp lệ')
      .max(new Date().getFullYear(), 'Năm sinh không được lớn hơn năm hiện tại')
      .optional(),
    gender: z
      .nativeEnum(Gender, {
        errorMap: () => ({ message: 'Vui lòng chọn giới tính' }),
      })
      .optional(),
    phoneNumber: optionalPhoneVNSchema,
    idType: z.nativeEnum(IdDocumentType, {
      errorMap: () => ({ message: 'Vui lòng chọn loại giấy tờ' }),
    }),
    idNumber: idNumberSchema,
    idIssueDate: apiDateStringSchema('Ngày cấp'),
    idIssuePlace: z.string().trim().optional(),
    idExpiry: optionalApiDateStringSchema('Ngày hết hạn'),
    provinceId: z.string().trim().min(1, 'Vui lòng chọn Tỉnh/Thành phố'),
    communeId: z.string().trim().min(1, 'Vui lòng chọn Xã quản lý'),
    hamletId: z.string().trim().optional(),
    addressDetail: z.string().trim().max(250).optional(),
    address: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    // Mã thành viên cho phép bỏ trống (tự hiểu là thành viên mới).
    // Nếu có nhập mã, độ dài tối thiểu 2 ký tự.
    if (data.memberCode && data.memberCode.trim().length > 0 && data.memberCode.trim().length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Mã thành viên tối thiểu 2 ký tự',
        path: ['memberCode'],
      });
    }
  });

export type MemberFormValues = z.infer<typeof memberFormSchema>;
