import { z } from 'zod';
import {
  CollateralAssetType,
  CollateralOwnerType,
  Gender,
  IdDocumentType,
  LoanTermType,
  LoanType,
  ValuationMethod,
} from '@/shared/types';
import { BUSINESS_LIMITS } from '@/shared/constants';
import {
  apiDateStringSchema,
  idNumberSchema,
  nonNegativeVndSchema,
  optionalApiDateStringSchema,
  optionalPhoneVNSchema,
  positiveVndSchema,
} from '@/shared/validation';

export const loanTermsStepSchema = z
  .object({
    loanType: z.nativeEnum(LoanType, {
      errorMap: () => ({ message: 'Vui lòng chọn hình thức vay' }),
    }),
    termType: z.nativeEnum(LoanTermType, {
      errorMap: () => ({ message: 'Vui lòng chọn kỳ hạn vay' }),
    }),
    loanAmount: positiveVndSchema('Số tiền vay đề nghị'),
    contractNumber: z.string().trim().optional(),
    contractDate: optionalApiDateStringSchema('Ngày lập khế ước'),
  })
  .refine(
    (data) => {
      if (data.loanType === LoanType.TIN_CHAP) {
        return data.loanAmount <= BUSINESS_LIMITS.MAX_UNSECURED_LOAN_VND;
      }
      return true;
    },
    {
      path: ['loanAmount'],
      message: 'Khoản vay tín chấp tối đa 100.000.000 ₫. Vui lòng giảm số tiền hoặc chọn Vay thế chấp.',
    },
  );

export type LoanTermsStepValues = z.infer<typeof loanTermsStepSchema>;

export const heirFormSchema = z.object({
  fullName: z.string().trim().min(2, 'Họ tên người thừa kế tối thiểu 2 ký tự'),
  yearOfBirth: z
    .number({ invalid_type_error: 'Nhập năm sinh' })
    .int()
    .min(1900, 'Năm sinh không hợp lệ')
    .max(new Date().getFullYear(), 'Năm sinh không hợp lệ')
    .optional(),
  gender: z.nativeEnum(Gender).optional(),
  phoneNumber: optionalPhoneVNSchema,
  idType: z.nativeEnum(IdDocumentType),
  idNumber: idNumberSchema,
  idIssueDate: apiDateStringSchema('Ngày cấp'),
  idIssuePlace: z.string().trim().optional(),
  idExpiry: optionalApiDateStringSchema('Ngày hết hạn'),
  address: z.string().trim().min(3, 'Địa chỉ tối thiểu 3 ký tự'),
  relationship: z.string().trim().min(1, 'Mối quan hệ với người vay là bắt buộc'),
});

export type HeirFormValues = z.infer<typeof heirFormSchema>;

export const relatedPersonFormSchema = z.object({
  fullName: z.string().trim().min(2, 'Họ tên người liên quan tối thiểu 2 ký tự'),
  yearOfBirth: z
    .number({ invalid_type_error: 'Nhập năm sinh' })
    .int()
    .min(1900, 'Năm sinh không hợp lệ')
    .max(new Date().getFullYear(), 'Năm sinh không hợp lệ')
    .optional(),
  gender: z.nativeEnum(Gender).optional(),
  phoneNumber: optionalPhoneVNSchema,
  idType: z.nativeEnum(IdDocumentType),
  idNumber: idNumberSchema,
  idIssueDate: apiDateStringSchema('Ngày cấp'),
  idIssuePlace: z.string().trim().optional(),
  idExpiry: optionalApiDateStringSchema('Ngày hết hạn'),
  relationship: z.string().trim().optional(),
  provinceId: z.string().trim().optional(),
  communeId: z.string().trim().optional(),
  hamletId: z.string().trim().optional(),
  addressDetail: z.string().trim().max(250).optional(),
  address: z.string().trim().min(3, 'Địa chỉ người liên quan tối thiểu 3 ký tự'),
});

export type RelatedPersonFormValues = z.infer<typeof relatedPersonFormSchema>;

export const financialItemFormSchema = z.object({
  name: z.string().trim().min(1, 'Tên khoản mục không được để trống'),
  amount: nonNegativeVndSchema('Số tiền'),
});

export const loanPlanFormSchema = z
  .object({
    purpose: z.string().trim().min(3, 'Mục đích vay vốn là bắt buộc'),
    loanAmount: positiveVndSchema('Tổng nhu cầu vốn'),
    ownCapital: nonNegativeVndSchema('Vốn tự có'),
    borrowedCapital: positiveVndSchema('Vốn vay đề nghị'),
    expenses: z.array(financialItemFormSchema).min(1, 'Cần nhập ít nhất 1 khoản mục chi phí'),
    revenues: z.array(financialItemFormSchema).min(1, 'Cần nhập ít nhất 1 khoản mục nguồn thu'),
  })
  .refine((data) => data.loanAmount >= data.borrowedCapital, {
    path: ['loanAmount'],
    message:
      'Tổng nhu cầu vốn phải lớn hơn hoặc bằng số tiền vay đề nghị (Vốn tự có không được âm)',
  });

export type LoanPlanFormValues = z.infer<typeof loanPlanFormSchema>;

export const mortgageContractFormSchema = z.object({
  contractNumber: z.string().trim().min(1, 'Số hợp đồng thế chấp là bắt buộc'),
  contractDuration: z.string().trim().optional(),
  contractExpiryDate: optionalApiDateStringSchema('Ngày hết hạn hợp đồng'),
  committeeAuthDate: optionalApiDateStringSchema('Ngày chứng thực UBND'),
});

export type MortgageContractFormValues = z.infer<typeof mortgageContractFormSchema>;

export const thirdPartyInfoFormSchema = z.object({
  fullName: z.string().trim().min(2, 'Họ tên người bảo lãnh tối thiểu 2 ký tự'),
  yearOfBirth: z.number().int().min(1900).max(new Date().getFullYear()).optional(),
  gender: z.nativeEnum(Gender).optional(),
  idType: z.nativeEnum(IdDocumentType),
  idNumber: idNumberSchema,
  idIssuePlace: z.string().trim().optional(),
  address: z.string().trim().min(3, 'Địa chỉ tối thiểu 3 ký tự'),
});

const baseCollateralObjectSchema = z.object({
  assetType: z.nativeEnum(CollateralAssetType),
  assetCode: z
    .string({ required_error: 'Mã số tài sản là bắt buộc' })
    .trim()
    .min(1, 'Mã số tài sản là bắt buộc (mỗi tài sản có mã riêng biệt)')
    .max(60, 'Mã số tài sản tối đa 60 ký tự'),
  certificateNumber: z
    .string({ required_error: 'Số cấp giấy chứng nhận là bắt buộc' })
    .trim()
    .min(1, 'Số cấp giấy chứng nhận là bắt buộc'),
  sheetNumber: z.string().trim().min(1, 'Số tờ bản đồ là bắt buộc'),
  plotNumber: z.string().trim().min(1, 'Số thửa đất là bắt buộc'),
  area: z
    .number({ required_error: 'Diện tích ghi trên GCN là bắt buộc', invalid_type_error: 'Nhập diện tích' })
    .positive('Diện tích phải lớn hơn 0'),
  actualArea: z
    .number({ invalid_type_error: 'Diện tích thực phải là số' })
    .positive('Diện tích thực tế phải lớn hơn 0')
    .nullable()
    .optional(),
  pricePerSqMeter: z
    .number({ invalid_type_error: 'Đơn giá phải là số' })
    .nonnegative('Đơn giá không được âm')
    .nullable()
    .optional(),
  origin: z.string().trim().optional(),
  usagePurpose: z.string().trim().optional(),
  usageDuration: z.string().trim().optional(),
  useRestrictions: z.string().trim().optional(),
  issuePlace: z.string().trim().optional(),
  issueDate: optionalApiDateStringSchema('Ngày cấp GCN'),
  // Địa bàn tài sản độc lập (Tỉnh -> Xã -> Ấp tùy chọn)
  provinceId: z.string().trim().min(1, 'Vui lòng chọn Tỉnh/Thành phố nơi có tài sản'),
  communeId: z.string().trim().min(1, 'Vui lòng chọn Xã nơi có tài sản'),
  hamletId: z.string().trim().optional(),
  addressDetail: z.string().trim().max(250).optional(),
  address: z.string().trim().optional(),
  valuationMethod: z.nativeEnum(ValuationMethod).nullable().optional(),
  valuationAmount: z.number().nonnegative('Giá trị định giá không được âm').nullable().optional(),
  ownerType: z.nativeEnum(CollateralOwnerType),
  thirdPartyInfo: thirdPartyInfoFormSchema.nullable().optional(),
});

export function createCollateralFormSchema(loanType: LoanType = LoanType.THE_CHAP) {
  return baseCollateralObjectSchema.superRefine((data, ctx) => {
    if (data.ownerType === CollateralOwnerType.BAO_LANH) {
      const hasValidGuarantor = Boolean(
        data.thirdPartyInfo &&
          data.thirdPartyInfo.fullName.trim().length >= 2 &&
          data.thirdPartyInfo.idNumber.trim().length >= 9,
      );
      if (!hasValidGuarantor) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['thirdPartyInfo', 'fullName'],
          message: 'Tài sản bên thứ ba bảo lãnh bắt buộc phải nhập đầy đủ thông tin người bảo lãnh',
        });
      }
    }

    if (loanType === LoanType.THE_CHAP) {
      if (!data.valuationMethod) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['valuationMethod'],
          message: 'Phương thức định giá là bắt buộc đối với khoản vay thế chấp',
        });
      }
      if (!data.valuationAmount || data.valuationAmount <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['valuationAmount'],
          message: 'Giá trị định giá phải lớn hơn 0 ₫ đối với khoản vay thế chấp',
        });
      }
    }
  });
}

export const collateralFormSchema = createCollateralFormSchema(LoanType.THE_CHAP);

export type CollateralFormValues = z.infer<typeof baseCollateralObjectSchema>;

export const disbursementFormSchema = z.object({
  disbursementDate: apiDateStringSchema('Ngày giải ngân'),
  amount: positiveVndSchema('Số tiền giải ngân'),
  note: z.string().trim().optional(),
});

export type DisbursementFormValues = z.infer<typeof disbursementFormSchema>;

export const repaymentFormSchema = z
  .object({
    repaymentDate: apiDateStringSchema('Ngày trả nợ'),
    principalAmount: nonNegativeVndSchema('Số tiền gốc trả'),
    interestAmount: nonNegativeVndSchema('Số tiền lãi trả'),
    interestDays: z.number().int().nonnegative('Số ngày tính lãi không được âm'),
    interestStartDate: optionalApiDateStringSchema('Ngày bắt đầu tính lãi'),
    interestEndDate: optionalApiDateStringSchema('Ngày thu lãi đến'),
    autoSettleIfPaidInFull: z.boolean(),
    note: z.string().trim().optional(),
  })
  .refine((v) => v.principalAmount > 0 || v.interestAmount > 0, {
    path: ['principalAmount'],
    message: 'Tổng tiền gốc và lãi trả phải lớn hơn 0 ₫',
  });

export type RepaymentFormValues = z.infer<typeof repaymentFormSchema>;
