import { z } from 'zod';

export const createWordTemplateSchema = z.object({
  code: z
    .string({ required_error: 'Mã biểu mẫu là bắt buộc' })
    .trim()
    .min(2, 'Mã biểu mẫu tối thiểu 2 ký tự')
    .max(50, 'Mã biểu mẫu tối đa 50 ký tự')
    .regex(/^[A-Za-z0-9_-]+$/, 'Mã biểu mẫu chỉ gồm chữ cái, số, gạch dưới hoặc gạch nối'),
  title: z
    .string({ required_error: 'Tên biểu mẫu là bắt buộc' })
    .trim()
    .min(3, 'Tên biểu mẫu tối thiểu 3 ký tự')
    .max(200, 'Tên biểu mẫu tối đa 200 ký tự'),
  category: z
    .string({ required_error: 'Nhóm biểu mẫu là bắt buộc' })
    .trim()
    .min(2, 'Nhóm biểu mẫu tối thiểu 2 ký tự')
    .max(100, 'Nhóm biểu mẫu tối đa 100 ký tự'),
  loanTypeScope: z.enum(['ALL', 'THE_CHAP', 'TIN_CHAP']).default('ALL'),
  description: z.string().trim().max(1000).optional(),
});

export const updateWordTemplateSchema = z.object({
  title: z.string().trim().min(3).max(200).optional(),
  category: z.string().trim().min(2).max(100).optional(),
  loanTypeScope: z.enum(['ALL', 'THE_CHAP', 'TIN_CHAP']).optional(),
  description: z.string().trim().max(1000).optional(),
  isActive: z.boolean().optional(),
});

export const mappingItemSchema = z.object({
  id: z.string().optional(),
  keyword: z
    .string({ required_error: 'Tên từ khóa là bắt buộc' })
    .trim()
    .min(1, 'Tên từ khóa không được rỗng'),
  displayName: z
    .string({ required_error: 'Tên hiển thị là bắt buộc' })
    .trim()
    .min(1, 'Tên hiển thị không được rỗng'),
  isLoop: z.boolean().default(false),
  loopContext: z.string().trim().nullable().optional(),
  dataPath: z.string().trim().nullable().optional(),
  dataType: z
    .enum([
      'TEXT',
      'NUMBER',
      'DATE',
      'CURRENCY',
      'CURRENCY_WORDS',
      'GENDER_TITLE',
      'BOOLEAN',
      'LIST',
    ])
    .default('TEXT'),
  formatPattern: z.string().trim().nullable().optional(),
  defaultValue: z.string().trim().nullable().optional(),
  isRequired: z.boolean().default(false),
  description: z.string().trim().nullable().optional(),
  condition: z.any().optional(),
});

export const saveMappingsSchema = z.object({
  mappings: z.array(mappingItemSchema),
});

export const previewTemplateSchema = z.object({
  loanId: z.string({ required_error: 'loanId là bắt buộc' }).trim().min(1),
});

export const exportLoanDocumentsSchema = z.object({
  loanId: z.string({ required_error: 'loanId là bắt buộc' }).trim().min(1),
  templateIds: z
    .array(z.string().trim().min(1), {
      required_error: 'Cần chọn ít nhất 1 biểu mẫu để xuất',
    })
    .min(1, 'Cần chọn ít nhất 1 biểu mẫu để xuất'),
});

