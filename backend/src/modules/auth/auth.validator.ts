import { z } from 'zod';
import { IdDocumentType, Gender } from '@prisma/client';

export const loginSchema = z.object({
  username: z.string().trim().min(1, 'Vui lòng nhập tên đăng nhập'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
    newPassword: z.string().min(8, 'Mật khẩu mới phải có tối thiểu 8 ký tự'),
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    path: ['newPassword'],
    message: 'Mật khẩu mới không được trùng với mật khẩu hiện tại',
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

const currentYear = new Date().getFullYear();

export const updateProfileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Họ và tên tối thiểu 2 ký tự')
    .max(100, 'Họ và tên tối đa 100 ký tự')
    .transform((val) => val.replace(/\s+/g, ' ')), // Chuẩn hóa khoảng trắng
  idType: z.nativeEnum(IdDocumentType, {
    errorMap: () => ({ message: 'Loại giấy tờ không hợp lệ' }),
  }),
  idNumber: z
    .string()
    .trim()
    .nullable()
    .optional()
    .refine((val) => !val || /^\d{12}$/.test(val), {
      message: 'Số Căn cước / CCCD phải đúng 12 chữ số',
    }),
  idIssueDate: z
    .string()
    .nullable()
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        const d = new Date(val);
        return !isNaN(d.getTime()) && d <= new Date();
      },
      { message: 'Ngày cấp không hợp lệ hoặc lớn hơn ngày hiện tại' }
    ),
  idIssuePlace: z.string().trim().max(255).nullable().optional(),
  yearOfBirth: z
    .number()
    .int()
    .min(1900, 'Năm sinh không hợp lệ')
    .max(currentYear, `Năm sinh không được vượt quá năm ${currentYear}`)
    .nullable()
    .optional(),
  gender: z.nativeEnum(Gender, {
    errorMap: () => ({ message: 'Giới tính không hợp lệ' }),
  }).nullable().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

