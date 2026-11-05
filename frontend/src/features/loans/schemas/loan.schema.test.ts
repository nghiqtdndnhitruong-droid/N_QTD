import { describe, expect, it } from 'vitest';
import {
  CollateralAssetType,
  CollateralOwnerType,
  LoanTermType,
  LoanType,
  ValuationMethod,
} from '@/shared/types';
import {
  collateralFormSchema,
  householdMemberFormSchema,
  loanTermsStepSchema,
  repaymentFormSchema,
} from './loan.schema';

describe('loan.schema validation', () => {
  it('từ chối khoản vay Tín chấp vượt quá 100.000.000 ₫', () => {
    const invalid = loanTermsStepSchema.safeParse({
      loanType: LoanType.TIN_CHAP,
      termType: LoanTermType.NGAN_HAN,
      loanAmount: 120_000_000,
    });
    expect(invalid.success).toBe(false);

    const validMortgage = loanTermsStepSchema.safeParse({
      loanType: LoanType.THE_CHAP,
      termType: LoanTermType.NGAN_HAN,
      loanAmount: 500_000_000,
    });
    expect(validMortgage.success).toBe(true);
  });

  it('bắt buộc thông tin người bảo lãnh khi tài sản thế chấp thuộc bên thứ ba', () => {
    const missingThirdParty = collateralFormSchema.safeParse({
      assetType: CollateralAssetType.QUYEN_SU_DUNG_DAT,
      assetCode: 'TS-01',
      certificateNumber: 'CS 123',
      sheetNumber: '10',
      plotNumber: '20',
      area: 500,
      provinceId: '79',
      communeId: '001',
      valuationMethod: ValuationMethod.BANG_GIA_QUY,
      valuationAmount: 200_000_000,
      ownerType: CollateralOwnerType.BAO_LANH,
    });
    expect(missingThirdParty.success).toBe(false);
  });

  it('cho phép tạo tài sản khi chọn lại người vay đứng tên dù form người bảo lãnh từng được nhập dở hoặc bỏ trống', () => {
    const validOwner = collateralFormSchema.safeParse({
      assetType: CollateralAssetType.QUYEN_SU_DUNG_DAT,
      assetCode: 'TS-01',
      certificateNumber: 'CS 123',
      sheetNumber: '10',
      plotNumber: '20',
      area: 500,
      provinceId: '79',
      communeId: '001',
      valuationMethod: ValuationMethod.BANG_GIA_QUY,
      valuationAmount: 200_000_000,
      ownerType: CollateralOwnerType.NGUOI_VAY_CA_NHAN,
      thirdPartyInfo: {
        fullName: '',
        idNumber: '',
        address: '',
      },
    });
    expect(validOwner.success).toBe(true);
  });

  it('yêu cầu tổng tiền gốc + lãi thu nợ phải > 0', () => {
    const zeroRepay = repaymentFormSchema.safeParse({
      repaymentDate: '2026-06-01',
      principalAmount: 0,
      interestAmount: 0,
      interestDays: 90,
      autoSettleIfPaidInFull: true,
    });
    expect(zeroRepay.success).toBe(false);
  });

  it('kiểm thực thành viên hộ gia đình hợp lệ và chấp nhận danh sách householdMembers trong tài sản', () => {
    const validMember = householdMemberFormSchema.safeParse({
      fullName: 'Nguyễn Văn An',
      idNumber: '084085001234',
      idIssueDate: '2021-05-15',
    });
    expect(validMember.success).toBe(true);

    const invalidMember = householdMemberFormSchema.safeParse({
      fullName: 'A',
      idNumber: '12345',
    });
    expect(invalidMember.success).toBe(false);

    const validHouseholdCollateral = collateralFormSchema.safeParse({
      assetType: CollateralAssetType.QUYEN_SU_DUNG_DAT,
      assetCode: 'TS-HO-01',
      certificateNumber: 'CS 999',
      sheetNumber: '05',
      plotNumber: '12',
      area: 800,
      provinceId: '79',
      communeId: '001',
      valuationMethod: ValuationMethod.BANG_GIA_QUY,
      valuationAmount: 400_000_000,
      ownerType: CollateralOwnerType.NGUOI_VAY_HO,
      householdMembers: [
        {
          fullName: 'Nguyễn Văn An',
          idNumber: '084085001234',
          idIssueDate: '2021-05-15',
        },
      ],
    });
    expect(validHouseholdCollateral.success).toBe(true);
  });
});
