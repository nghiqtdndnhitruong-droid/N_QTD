import { z } from 'zod';
import { ValuationType } from '@prisma/client';
import { objectIdSchema } from '../../shared/utils/zod.util';

const optionalObjectIdField = z
  .union([objectIdSchema, z.literal('')])
  .nullable()
  .optional()
  .transform((val) => (val === '' ? null : val));

const dateSchema = z
  .union([
    z.string().datetime({ offset: true }),
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng ngày YYYY-MM-DD'),
    z.string().regex(/^\d{4}-\d{2}-\d{2}T/, 'Định dạng ngày ISO'),
    z.date(),
  ])
  .nullable()
  .optional();

export const createLoanValuationSchema = z.object({
  collateralId: optionalObjectIdField,
  valuationType: z.nativeEnum(ValuationType, {
    errorMap: () => ({
      message: 'Loại định giá không hợp lệ (chọn 1 trong 4 loại định giá quy chuẩn)',
    }),
  }),
  valuationDate: dateSchema,
  sheetNumber: z
    .string()
    .trim()
    .min(1, 'Số tờ không được để trống'),
  plotNumber: z
    .string()
    .trim()
    .min(1, 'Số thửa không được để trống'),
  area: z
    .number({ invalid_type_error: 'Diện tích phải là số' })
    .positive('Diện tích phải lớn hơn 0'),
  actualArea: z
    .number({ invalid_type_error: 'Diện tích thực tế phải là số' })
    .positive('Diện tích thực tế phải lớn hơn 0')
    .nullable()
    .optional(),
  pricePerSqMeter: z
    .number({ invalid_type_error: 'Đơn giá phải là số' })
    .nonnegative('Đơn giá không được âm'),
  totalPrice: z
    .number({ invalid_type_error: 'Giá tiền phải là số' })
    .nonnegative('Giá tiền không được âm')
    .optional(),
  notes: z
    .string()
    .trim()
    .nullable()
    .optional(),
});

export const updateLoanValuationSchema = createLoanValuationSchema.partial();

