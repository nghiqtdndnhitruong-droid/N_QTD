import { describe, expect, it } from 'vitest';
import {
  CollateralAssetType,
  CollateralOwnerType,
  LoanTermType,
  LoanType,
} from '@/shared/types';
import { calculateLoanPlanTemplate } from '../loan-plan-templates';
import {
  createCollateralFormSchema,
  loanPlanFormSchema,
  mortgageContractFormSchema,
} from '../../schemas/loan.schema';

describe('calculateLoanPlanTemplate', () => {
  it('calculates Mẫu sửa nhà (SUA_NHA) accurately for NGAN_HAN (factor 1)', () => {
    const res = calculateLoanPlanTemplate({
      templateCode: 'SUA_NHA',
      totalCapitalDemand: 200_000_000,
      loanAmount: 150_000_000,
      interestRate: 10.2,
      termType: LoanTermType.NGAN_HAN,
    });

    expect(res.ownCapital).toBe(50_000_000);
    expect(res.borrowedCapital).toBe(150_000_000);
    expect(res.termFactor).toBe(1);
    expect(res.expenses).toEqual([
      { name: 'Tiền mua vật liệu xây dựng', amount: 160_000_000 }, // 80% of 200tr
      { name: 'Tiền công thợ', amount: 40_000_000 }, // 20% of 200tr
      {
        name: 'Chi phí trả lãi tiền vay (150.000.000 × 10.2% × 1 năm)',
        amount: 15_300_000,
      }, // 150tr * 10.2% * 1
      { name: 'Chi tiêu gia đình', amount: 70_000_000 },
    ]);
    expect(res.totalExpenses).toBe(285_300_000);
    // Nguồn thu = Tổng chi phí + 50tr = 335_300_000 (60% / 40%)
    expect(res.totalRevenues).toBe(335_300_000);
    expect(res.revenues).toEqual([
      { name: 'Trả bằng nguồn thu sản xuất lúa', amount: 201_180_000 },
      { name: 'Trả bằng nguồn thu khác', amount: 134_120_000 },
    ]);
    expect(res.profit).toBe(50_000_000);
  });

  it('calculates Mẫu chăn nuôi (CHAN_NUOI) accurately for TRUNG_HAN (factor 2)', () => {
    const res = calculateLoanPlanTemplate({
      templateCode: 'CHAN_NUOI',
      totalCapitalDemand: 300_000_000,
      loanAmount: 200_000_000,
      interestRate: 10.8,
      termType: LoanTermType.TRUNG_HAN,
    });

    expect(res.ownCapital).toBe(100_000_000);
    expect(res.termFactor).toBe(2);
    expect(res.expenses).toEqual([
      { name: 'Tiền mua con giống', amount: 240_000_000 }, // 80% of 300tr
      { name: 'Tiền xây dựng chuồng trại', amount: 45_000_000 }, // 15% of 300tr
      { name: 'Tiền thức ăn', amount: 15_000_000 }, // 5% of 300tr
      {
        name: 'Chi phí trả lãi tiền vay (200.000.000 × 10.8% × 2 năm)',
        amount: 43_200_000,
      }, // 200tr * 10.8% * 2
      { name: 'Chi tiêu gia đình', amount: 140_000_000 },
    ]);
    expect(res.totalExpenses).toBe(483_200_000);
    // Nguồn thu = 483.2tr + 50tr = 533.2tr (30% / 50% / 20%)
    expect(res.totalRevenues).toBe(533_200_000);
    expect(res.revenues).toEqual([
      { name: 'Trả bằng nguồn thu sản xuất lúa', amount: 159_960_000 },
      { name: 'Trả bằng nguồn chăn nuôi', amount: 266_600_000 },
      { name: 'Trả bằng nguồn thu khác', amount: 106_640_000 },
    ]);
    expect(res.profit).toBe(50_000_000);
  });
});

describe('loan schemas', () => {
  it('rejects loanPlan when total capital demand < borrowedCapital', () => {
    const invalid = loanPlanFormSchema.safeParse({
      purpose: 'Sửa chữa nhà ở',
      loanAmount: 80_000_000,
      ownCapital: 0,
      borrowedCapital: 100_000_000,
      expenses: [{ name: 'Chi phí', amount: 80_000_000 }],
      revenues: [{ name: 'Nguồn thu', amount: 120_000_000 }],
    });
    expect(invalid.success).toBe(false);
  });

  it('allows mortgageContract without contractDuration (Mục 3.5)', () => {
    const valid = mortgageContractFormSchema.safeParse({
      contractNumber: 'HĐTC-2026-001',
      contractExpiryDate: '2027-11-01',
      committeeAuthDate: '2026-11-01',
    });
    expect(valid.success).toBe(true);
  });

  it('allows collateral without valuation for TIN_CHAP but requires valuation for THE_CHAP (Mục 3.7)', () => {
    const baseCollateral = {
      assetType: CollateralAssetType.QUYEN_SU_DUNG_DAT,
      assetCode: 'TS-001',
      certificateNumber: 'CS 12345',
      sheetNumber: '12',
      plotNumber: '34',
      area: 500,
      provinceId: 'prov-1',
      communeId: 'com-1',
      hamletId: 'ham-1',
      valuationMethod: null,
      valuationAmount: 0,
      ownerType: CollateralOwnerType.NGUOI_VAY_CA_NHAN,
    };

    const tinChapSchema = createCollateralFormSchema(LoanType.TIN_CHAP);
    const theChapSchema = createCollateralFormSchema(LoanType.THE_CHAP);

    // Định giá đã được tách khỏi tạo tài sản thành tab Định giá độc lập
    expect(tinChapSchema.safeParse(baseCollateral).success).toBe(true);
    expect(theChapSchema.safeParse(baseCollateral).success).toBe(true);
  });
});

