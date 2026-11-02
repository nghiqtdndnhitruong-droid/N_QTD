import { z } from 'zod';

export const createDisbursementSchema = z.object({
  disbursementDate: z
    .string({ required_error: 'Ngày giải ngân là bắt buộc' })
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng ngày YYYY-MM-DD')),
  amount: z
    .number({ required_error: 'Số tiền giải ngân là bắt buộc' })
    .positive('Số tiền giải ngân phải lớn hơn 0'),
  note: z.string().trim().optional(),
});

export const updateDisbursementSchema = z.object({
  disbursementDate: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng ngày YYYY-MM-DD'))
    .optional(),
  amount: z
    .number()
    .positive('Số tiền giải ngân phải lớn hơn 0')
    .optional(),
  note: z.string().trim().optional(),
  reason: z.string().trim().min(1, 'Vui lòng nhập lý do chỉnh sửa giao dịch giải ngân').optional(),
});

export const deleteDisbursementSchema = z.object({
  reason: z.string().trim().optional(),
});


