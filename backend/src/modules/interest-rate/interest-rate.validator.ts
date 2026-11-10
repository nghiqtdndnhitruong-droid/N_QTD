import { z } from 'zod';
import { LoanTermType, LoanType } from '@prisma/client';

export const interestRateTierSchema = z
  .object({
    minAmount: z
      .number({ required_error: 'Số tiền tối thiểu là bắt buộc' })
      .nonnegative('Số tiền tối thiểu phải >= 0'),
    maxAmount: z
      .number({ required_error: 'Số tiền tối đa là bắt buộc' })
      .positive('Số tiền tối đa phải > 0'),
    annualRate: z
      .number({ required_error: 'Lãi suất năm là bắt buộc' })
      .positive('Lãi suất phải > 0')
      .max(100, 'Lãi suất không được vượt quá 100%'),
  })
  .refine((data) => data.maxAmount > data.minAmount, {
    message: 'Số tiền tối đa phải lớn hơn số tiền tối thiểu',
    path: ['maxAmount'],
  });

export const createInterestRateConfigSchema = z
  .object({
    effectiveDate: z
      .string({ required_error: 'Ngày áp dụng là bắt buộc' })
      .datetime({ offset: true })
      .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng ngày YYYY-MM-DD')),
    loanType: z.nativeEnum(LoanType).optional().default(LoanType.THE_CHAP),
    termType: z.nativeEnum(LoanTermType).nullable().optional(),
    tiers: z.array(interestRateTierSchema).min(1, 'Phải có ít nhất một bậc lãi suất'),
    isActive: z.boolean().optional().default(true),
    note: z.string().trim().optional(),
  })
  .refine(
    (data) => {
      if (data.loanType === LoanType.THE_CHAP) {
        return Boolean(data.termType);
      }
      return true;
    },
    {
      message: 'Kỳ hạn áp dụng (NGAN_HAN hoặc TRUNG_HAN) là bắt buộc đối với cho vay thế chấp',
      path: ['termType'],
    }
  );

export const updateInterestRateConfigSchema = z
  .object({
    effectiveDate: z
      .string()
      .datetime({ offset: true })
      .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng ngày YYYY-MM-DD'))
      .optional(),
    loanType: z.nativeEnum(LoanType).optional(),
    termType: z.nativeEnum(LoanTermType).nullable().optional(),
    tiers: z.array(interestRateTierSchema).min(1, 'Phải có ít nhất một bậc lãi suất').optional(),
    isActive: z.boolean().optional(),
    note: z.string().trim().optional(),
  })
  .refine(
    (data) => {
      if (data.loanType === LoanType.THE_CHAP && data.termType === null) {
        return false;
      }
      return true;
    },
    {
      message: 'Kỳ hạn áp dụng (NGAN_HAN hoặc TRUNG_HAN) là bắt buộc đối với cho vay thế chấp',
      path: ['termType'],
    }
  );

export const interestRateFilterQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  loanType: z.nativeEnum(LoanType).optional(),
  termType: z.nativeEnum(LoanTermType).optional(),
  isActive: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
});

export const currentInterestRateQuerySchema = z
  .object({
    loanType: z.nativeEnum(LoanType).optional().default(LoanType.THE_CHAP),
    termType: z.nativeEnum(LoanTermType).optional(),
  })
  .refine(
    (data) => {
      if (data.loanType === LoanType.THE_CHAP) {
        return Boolean(data.termType);
      }
      return true;
    },
    {
      message: 'Vui lòng cung cấp termType (NGAN_HAN hoặc TRUNG_HAN) khi tra cứu lãi suất thế chấp',
      path: ['termType'],
    }
  );

