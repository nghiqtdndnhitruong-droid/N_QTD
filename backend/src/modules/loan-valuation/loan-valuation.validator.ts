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

const loanValuationBaseSchema = z.object({
  collateralIds: z.array(objectIdSchema).optional(),
  collateralId: optionalObjectIdField,
  valuationType: z.nativeEnum(ValuationType, {
    errorMap: () => ({
      message: 'Loại định giá không hợp lệ (chọn 1 trong 4 loại định giá quy chuẩn)',
    }),
  }),
  valuationDate: dateSchema,
  sheetNumber: z.string().trim().optional(),
  plotNumber: z.string().trim().optional(),
  area: z
    .number({ invalid_type_error: 'Diện tích phải là số' })
    .positive('Diện tích phải lớn hơn 0')
    .optional(),
  actualArea: z
    .number({ invalid_type_error: 'Diện tích thực tế phải là số' })
    .positive('Diện tích thực tế phải lớn hơn 0')
    .nullable()
    .optional(),
  pricePerSqMeter: z
    .number({ invalid_type_error: 'Đơn giá phải là số' })
    .nonnegative('Đơn giá không được âm'),
  totalPriceBeforeRound: z
    .number({ invalid_type_error: 'Giá tiền trước làm tròn phải là số' })
    .nonnegative('Giá tiền trước làm tròn không được âm')
    .optional(),
  totalPrice: z
    .number({ invalid_type_error: 'Giá tiền phải là số' })
    .nonnegative('Giá tiền không được âm')
    .optional(),
  notes: z.string().trim().max(1000, 'Ghi chú không vượt quá 1000 ký tự').nullable().optional(),
});

export const createLoanValuationSchema = loanValuationBaseSchema.refine(
  (data) => {
    const hasCollateralIds = Array.isArray(data.collateralIds) && data.collateralIds.length > 0;
    const hasCollateralId = Boolean(data.collateralId);
    return hasCollateralIds || hasCollateralId;
  },
  {
    message: 'Vui lòng chọn ít nhất một tài sản để đưa vào nhóm định giá',
    path: ['collateralIds'],
  }
);

export const updateLoanValuationSchema = loanValuationBaseSchema.partial();

export const previewGroupValuationSchema = z.object({
  collateralIds: z
    .array(objectIdSchema)
    .min(1, 'Vui lòng chọn ít nhất 1 tài sản để xem trước dữ liệu nhóm'),
  pricePerSqMeter: z
    .number({ invalid_type_error: 'Đơn giá phải là số' })
    .nonnegative('Đơn giá không được âm'),
});

export const updateCommonValuationSchema = z.object({
  valuationType: z
    .nativeEnum(ValuationType, {
      errorMap: () => ({
        message: 'Loại định giá không hợp lệ',
      }),
    })
    .optional(),
  valuationDate: dateSchema,
});
