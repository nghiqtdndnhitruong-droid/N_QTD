import { z } from 'zod';
import { LoanType, LoanTermType, LoanStatus, IdDocumentType, Gender } from '@prisma/client';
import { createCollateralSchema } from '../collateral/collateral.validator';
import {
  isValidVietnamesePhone,
  parseCitizenIdInfo,
} from '../../shared/utils/identity-document.util';
import { createRelatedPersonSchema } from '../related-person/related-person.validator';

const dateStringSchema = z
  .string()
  .datetime({ offset: true })
  .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng ngày YYYY-MM-DD'));

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

export const heirSchema = z.object({
  fullName: z.string().trim().min(2, 'Họ tên người thừa kế tối thiểu 2 ký tự'),
  yearOfBirth: z
    .number()
    .int('Năm sinh phải là số nguyên')
    .min(1900)
    .max(new Date().getFullYear())
    .optional(),
  idType: z.nativeEnum(IdDocumentType),
  idNumber: cccdIdNumberSchema,
  idIssueDate: dateStringSchema,
  idIssuePlace: z.string().trim().optional(),
  idExpiry: dateStringSchema
    .or(z.literal(''))
    .nullable()
    .optional()
    .transform((v) => (v === '' ? null : v)),
  gender: z.nativeEnum(Gender).optional(),
  phoneNumber: optionalPhoneField,
  address: z.string().trim().min(3, 'Địa chỉ người thừa kế tối thiểu 3 ký tự'),
  relationship: z.string().trim().min(1, 'Mối quan hệ là bắt buộc'),
});

export const financialItemSchema = z.object({
  name: z.string().trim().min(1, 'Tên mục thu/chi không được để trống'),
  amount: z.number().nonnegative('Số tiền phải >= 0'),
});

export const loanPlanSchema = z
  .object({
    purpose: z.string().trim().min(1, 'Mục đích vay là bắt buộc'),
    loanAmount: z.number().positive('Tổng nhu cầu vốn phải > 0'),
    ownCapital: z.number().nonnegative('Vốn tự có không được âm').optional().default(0),
    borrowedCapital: z.number().positive('Vốn vay phải > 0'),
    expenses: z.array(financialItemSchema).default([]),
    revenues: z.array(financialItemSchema).default([]),
  })
  .refine((data) => data.loanAmount >= data.borrowedCapital, {
    message: 'Tổng nhu cầu vốn không được nhỏ hơn Số tiền vay (Vốn tự có không được âm)',
    path: ['loanAmount'],
  });

export const mortgageContractSchema = z.object({
  contractNumber: z.string().trim().min(1, 'Số hợp đồng thế chấp là bắt buộc'),
  contractDuration: z.string().trim().nullable().optional(),
  contractExpiryDate: dateStringSchema.nullable().optional(),
  committeeAuthDate: dateStringSchema.nullable().optional(),
});

export const createLoanSchema = z.object({
  memberId: z.string({ required_error: 'ID thành viên là bắt buộc' }).min(1),
  loanType: z.nativeEnum(LoanType, {
    errorMap: () => ({ message: 'Loại vay phải là TIN_CHAP hoặc THE_CHAP' }),
  }),
  termType: z.nativeEnum(LoanTermType, {
    errorMap: () => ({ message: 'Kỳ hạn phải là NGAN_HAN hoặc TRUNG_HAN' }),
  }),
  loanAmount: z
    .number({ required_error: 'Số tiền vay là bắt buộc' })
    .positive('Số tiền vay phải lớn hơn 0'),
  loanStartDate: dateStringSchema.optional(),
  contractNumber: z.string().trim().optional(),
  contractDate: dateStringSchema.optional(),
  heir: heirSchema.optional(),
  relatedPersons: z.array(createRelatedPersonSchema).optional(),
  loanPlan: loanPlanSchema.optional(),
  mortgageContract: mortgageContractSchema.optional(),
  collaterals: z.array(createCollateralSchema).optional(),
});

export const updateLoanSchema = createLoanSchema.partial().omit({ memberId: true });

export const updateLoanStatusSchema = z.object({
  status: z.nativeEnum(LoanStatus, {
    errorMap: () => ({ message: 'Trạng thái khoản vay không hợp lệ' }),
  }),
});

export const deleteLoanBodySchema = z
  .object({
    reason: z.string().trim().max(500).optional(),
  })
  .optional();

export const loanFilterQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  search: z.string().trim().optional(),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  memberId: z.string().optional(),
  loanType: z.nativeEnum(LoanType).optional(),
  termType: z.nativeEnum(LoanTermType).optional(),
  status: z.nativeEnum(LoanStatus).optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  provinceId: z.string().optional(),
  communeId: z.string().optional(),
  hamletId: z.string().optional(),
});
