import { z } from 'zod';
import {
  CollateralAssetType,
  CollateralCertificateType,
  CollateralOwnerType,
  ValuationMethod,
  Gender,
  IdDocumentType,
} from '@prisma/client';
import { objectIdSchema } from '../../shared/utils/zod.util';
import { parseCitizenIdInfo } from '../../shared/utils/identity-document.util';

const optionalObjectIdField = z
  .union([objectIdSchema, z.literal('')])
  .nullable()
  .optional()
  .transform((val) => (val === '' ? null : val));

export const thirdPartyInfoSchema = z.object({
  fullName: z.string().trim().min(2, 'Họ tên người bảo lãnh tối thiểu 2 ký tự'),
  yearOfBirth: z.number().int().min(1900).max(new Date().getFullYear()).optional(),
  idType: z.nativeEnum(IdDocumentType),
  idNumber: z
    .string()
    .trim()
    .regex(/^\d{12}$/, 'Số CCCD / Thẻ căn cước của người bảo lãnh phải gồm 12 chữ số')
    .refine((val) => parseCitizenIdInfo(val) !== null, {
      message: 'Số CCCD của người bảo lãnh không đúng quy tắc mã hóa giới tính & năm sinh',
    }),
  idIssuePlace: z.string().trim().optional(),
  gender: z.nativeEnum(Gender).optional(),
  address: z.string().trim().min(3),
});

export const baseCollateralSchema = z.object({
  assetType: z.nativeEnum(CollateralAssetType, {
    errorMap: () => ({ message: 'Loại tài sản không hợp lệ' }),
  }),
  certificateType: z
    .nativeEnum(CollateralCertificateType, {
      errorMap: () => ({ message: 'Loại giấy chứng nhận không hợp lệ' }),
    })
    .nullable()
    .optional(),
  assetCode: z
    .string({ required_error: 'Mã số tài sản là bắt buộc' })
    .trim()
    .min(1, 'Mã số tài sản là bắt buộc')
    .max(60, 'Mã số tài sản tối đa 60 ký tự'),
  certificateNumber: z.string({ required_error: 'Số cấp GCN là bắt buộc' }).trim().min(1),
  issueBookNumber: z.string().trim().nullable().optional(),
  sheetNumber: z.string({ required_error: 'Số tờ là bắt buộc' }).trim().min(1),
  plotNumber: z.string({ required_error: 'Số thửa là bắt buộc' }).trim().min(1),
  area: z
    .number({ required_error: 'Diện tích ghi trên giấy chứng nhận là bắt buộc' })
    .positive('Diện tích ghi trên giấy chứng nhận phải > 0'),
  actualArea: z
    .number()
    .positive('Diện tích thực phải lớn hơn 0')
    .nullable()
    .optional(),
  pricePerSqMeter: z
    .number()
    .nonnegative('Đơn giá 1 m² không được âm')
    .nullable()
    .optional(),
  origin: z.string().trim().optional(),
  usagePurpose: z.string().trim().optional(),
  usageDuration: z.string().trim().optional(),
  usageForm: z.string().trim().optional(),
  useRestrictions: z.string().trim().optional(),
  issuePlace: z.string().trim().optional(),
  issueDate: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .optional(),
  // Địa bàn tài sản độc lập (Tỉnh -> Xã -> Ấp tùy chọn)
  provinceId: optionalObjectIdField,
  communeId: optionalObjectIdField,
  hamletId: optionalObjectIdField,
  addressDetail: z.string().trim().max(250).nullable().optional(),
  address: z.string().trim().max(400).nullable().optional(),
  // Định giá tài sản: bắt buộc khi vay thế chấp (được kiểm tra theo loanType tại Service), tùy chọn khi vay tín chấp
  valuationAmount: z
    .number()
    .nonnegative('Giá trị định giá không được âm')
    .nullable()
    .optional(),
  valuationMethod: z
    .nativeEnum(ValuationMethod, {
      errorMap: () => ({ message: 'Phương pháp định giá phải là BANG_GIA_QUY hoặc THI_TRUONG' }),
    })
    .nullable()
    .optional(),
  ownerType: z.nativeEnum(CollateralOwnerType, {
    errorMap: () => ({ message: 'Tư cách chủ sở hữu không hợp lệ' }),
  }),
  thirdPartyInfo: z.preprocess((val) => {
    if (!val || typeof val !== 'object') return null;
    const obj = val as Record<string, any>;
    const hasAny = Object.values(obj).some(
      (v) => v !== null && v !== undefined && String(v).trim() !== ''
    );
    return hasAny ? val : null;
  }, thirdPartyInfoSchema.nullable().optional()),
});

export const createCollateralSchema = baseCollateralSchema
  .refine(
    (data) => {
      if (data.ownerType === CollateralOwnerType.BAO_LANH) {
        return !!data.thirdPartyInfo;
      }
      return true;
    },
    {
      message: 'Tài sản bên thứ ba bảo lãnh bắt buộc phải cung cấp thông tin người bảo lãnh',
      path: ['thirdPartyInfo'],
    }
  )
  .transform((data) => {
    if (data.ownerType !== CollateralOwnerType.BAO_LANH) {
      return { ...data, thirdPartyInfo: null };
    }
    return data;
  });

export const updateCollateralSchema = baseCollateralSchema
  .partial()
  .transform((data) => {
    if (data.ownerType !== undefined && data.ownerType !== CollateralOwnerType.BAO_LANH) {
      return { ...data, thirdPartyInfo: null };
    }
    return data;
  });

export const collateralFilterQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().trim().optional(),
  loanId: objectIdSchema.optional(),
  assetCode: z.string().trim().optional(),
  certificateNumber: z.string().trim().optional(),
  provinceId: objectIdSchema.optional(),
  communeId: objectIdSchema.optional(),
  hamletId: objectIdSchema.optional(),
});
