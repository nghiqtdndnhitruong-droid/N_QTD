import { z } from 'zod';
import { IdDocumentType, Gender, AccountStatus } from '@prisma/client';

const currentYear = new Date().getFullYear();

export const createUserSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Tên đăng nhập phải có tối thiểu 3 ký tự')
    .max(50, 'Tên đăng nhập tối đa 50 ký tự')
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Tên đăng nhập chỉ chứa chữ cái, số và dấu gạch dưới'),
  password: z.string().min(6, 'Mật khẩu khởi tạo phải có tối thiểu 6 ký tự'),
  fullName: z
    .string()
    .trim()
    .min(2, 'Họ và tên tối thiểu 2 ký tự')
    .max(100, 'Họ và tên tối đa 100 ký tự')
    .transform((val) => val.replace(/\s+/g, ' ')),
  idType: z.nativeEnum(IdDocumentType).optional().default(IdDocumentType.CAN_CUOC_CONG_DAN),
  idNumber: z
    .string()
    .trim()
    .nullable()
    .optional()
    .refine((val) => !val || /^\d{12}$/.test(val), {
      message: 'Số Căn cước / CCCD phải đúng 12 chữ số',
    }),
  idIssueDate: z.string().nullable().optional(),
  idIssuePlace: z.string().trim().max(255).nullable().optional(),
  yearOfBirth: z
    .number()
    .int()
    .min(1900, 'Năm sinh không hợp lệ')
    .max(currentYear, `Năm sinh không vượt quá năm ${currentYear}`)
    .nullable()
    .optional(),
  gender: z.nativeEnum(Gender).nullable().optional().default(Gender.NAM),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Họ và tên tối thiểu 2 ký tự')
    .max(100, 'Họ và tên tối đa 100 ký tự')
    .transform((val) => val.replace(/\s+/g, ' '))
    .optional(),
  idType: z.nativeEnum(IdDocumentType).optional(),
  idNumber: z
    .string()
    .trim()
    .nullable()
    .optional()
    .refine((val) => !val || /^\d{12}$/.test(val), {
      message: 'Số Căn cước / CCCD phải đúng 12 chữ số',
    }),
  idIssueDate: z.string().nullable().optional(),
  idIssuePlace: z.string().trim().max(255).nullable().optional(),
  yearOfBirth: z
    .number()
    .int()
    .min(1900, 'Năm sinh không hợp lệ')
    .max(currentYear, `Năm sinh không vượt quá năm ${currentYear}`)
    .nullable()
    .optional(),
  gender: z.nativeEnum(Gender).nullable().optional(),
  status: z.nativeEnum(AccountStatus).optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, 'Mật khẩu mới phải có tối thiểu 6 ký tự'),
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

