import { z } from 'zod';
import { objectIdSchema } from '../../shared/utils/zod.util';

export const createProvinceSchema = z.object({
  code: z.string().trim().min(2).max(50).optional(),
  name: z.string().trim().min(2, 'Tên tỉnh/thành phố phải có ít nhất 2 ký tự').max(120),
  isActive: z.boolean().optional(),
});

export const createCommuneSchema = z.object({
  provinceId: objectIdSchema,
  code: z.string().trim().min(2).max(50).optional(),
  name: z.string().trim().min(2, 'Tên xã/phường phải có ít nhất 2 ký tự').max(120),
  isActive: z.boolean().optional(),
});

export const createHamletSchema = z.object({
  communeId: objectIdSchema,
  code: z.string().trim().min(1).max(50).optional(),
  name: z
    .string({ required_error: 'Tên ấp là bắt buộc' })
    .trim()
    .min(2, 'Tên ấp phải có ít nhất 2 ký tự')
    .max(120, 'Tên ấp không vượt quá 120 ký tự'),
  isActive: z.boolean().optional(),
});

export const updateHamletSchema = z.object({
  name: z.string().trim().min(2, 'Tên ấp phải có ít nhất 2 ký tự').max(120).optional(),
  code: z.string().trim().min(1).max(50).optional(),
  isActive: z.boolean().optional(),
});

export const areaSearchQuerySchema = z.object({
  search: z.string().trim().optional(),
  provinceId: objectIdSchema.optional(),
  communeId: objectIdSchema.optional(),
  includeInactive: z.coerce.boolean().optional(),
});

export const createAreaGroupSchema = z.object({
  code: z.string().trim().min(1).max(50).optional(),
  name: z
    .string({ required_error: 'Tên nhóm địa bàn là bắt buộc' })
    .trim()
    .min(2, 'Tên nhóm phải có ít nhất 2 ký tự')
    .max(120, 'Tên nhóm không vượt quá 120 ký tự'),
  description: z.string().trim().max(500).optional(),
  communeIds: z.array(objectIdSchema).optional().default([]),
  isActive: z.boolean().optional(),
});

export const updateAreaGroupSchema = z.object({
  code: z.string().trim().min(1).max(50).optional(),
  name: z.string().trim().min(2, 'Tên nhóm phải có ít nhất 2 ký tự').max(120).optional(),
  description: z.string().trim().max(500).optional(),
  communeIds: z.array(objectIdSchema).optional(),
  isActive: z.boolean().optional(),
});


