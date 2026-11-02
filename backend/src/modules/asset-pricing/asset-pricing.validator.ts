import { z } from 'zod';

export const createAssetPricingRuleSchema = z.object({
  landCategory: z
    .string({ required_error: 'Loại đất là bắt buộc' })
    .trim()
    .min(1, 'Loại đất không được để trống'),
  pricePerSqMeter: z
    .number({ required_error: 'Đơn giá trên m² là bắt buộc' })
    .positive('Đơn giá phải lớn hơn 0'),
  effectiveDate: z
    .string({ required_error: 'Ngày áp dụng là bắt buộc' })
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng ngày YYYY-MM-DD')),
  isActive: z.boolean().optional().default(true),
  note: z.string().trim().optional(),
});

export const updateAssetPricingRuleSchema = createAssetPricingRuleSchema.partial();

export const assetPricingFilterQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  landCategory: z.string().trim().optional(),
  isActive: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
});

