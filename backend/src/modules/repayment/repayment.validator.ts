import { z } from 'zod';

export const createRepaymentSchema = z.object({
  repaymentDate: z
    .string({ required_error: 'Ngày trả nợ là bắt buộc' })
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng ngày YYYY-MM-DD')),
  principalAmount: z.number().nonnegative('Tiền gốc trả phải >= 0').optional().default(0),
  interestAmount: z.number().nonnegative('Tiền lãi trả phải >= 0').optional().default(0),
  interestDays: z.number().int().nonnegative('Số ngày tính lãi phải >= 0').optional().default(0),
  interestStartDate: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng ngày YYYY-MM-DD'))
    .optional()
    .nullable(),
  interestEndDate: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng ngày YYYY-MM-DD'))
    .optional()
    .nullable(),
  autoSettleIfPaidInFull: z.boolean().optional().default(true),
  note: z.string().trim().optional(),
}).refine(
  (data) => data.principalAmount > 0 || data.interestAmount > 0,
  {
    message: 'Giao dịch trả nợ phải có ít nhất tiền gốc hoặc tiền lãi lớn hơn 0',
    path: ['principalAmount'],
  }
);

export const updateRepaymentSchema = z.object({
  repaymentDate: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng ngày YYYY-MM-DD'))
    .optional(),
  principalAmount: z.number().nonnegative('Tiền gốc trả phải >= 0').optional(),
  interestAmount: z.number().nonnegative('Tiền lãi trả phải >= 0').optional(),
  interestDays: z.number().int().nonnegative('Số ngày tính lãi phải >= 0').optional(),
  interestStartDate: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng ngày YYYY-MM-DD'))
    .optional()
    .nullable(),
  interestEndDate: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng ngày YYYY-MM-DD'))
    .optional()
    .nullable(),
  note: z.string().trim().optional(),
  reason: z.string().trim().min(1, 'Vui lòng nhập lý do chỉnh sửa giao dịch trả nợ').optional(),
}).refine(
  (data) => {
    if (data.principalAmount !== undefined && data.interestAmount !== undefined) {
      return data.principalAmount > 0 || data.interestAmount > 0;
    }
    return true;
  },
  {
    message: 'Giao dịch trả nợ phải có ít nhất tiền gốc hoặc tiền lãi lớn hơn 0',
    path: ['principalAmount'],
  }
);

export const deleteRepaymentSchema = z.object({
  reason: z.string().trim().optional(),
});

export const estimateInterestQuerySchema = z.object({
  days: z.coerce.number().int().positive('Số ngày tính lãi phải > 0').optional().default(90),
  asOfDate: z.string().optional(),
});


