import { LoanTermType } from '@/shared/types';
import type { FinancialItem } from '../types/loan.types';

export type LoanPlanTemplateCode = 'SUA_NHA' | 'CHAN_NUOI';

export interface LoanPlanTemplateInput {
  templateCode: LoanPlanTemplateCode;
  /** Tổng nhu cầu vốn */
  totalCapitalDemand: number;
  /** Số tiền vay đề nghị Quỹ cho vay */
  loanAmount: number;
  /** Lãi suất năm (%/năm, ví dụ 10.2) */
  interestRate: number;
  /** Loại kỳ hạn vay: NGAN_HAN (hệ số 1) hoặc TRUNG_HAN (hệ số 2) */
  termType: LoanTermType;
}

export interface CalculatedLoanPlanTemplate {
  templateCode: LoanPlanTemplateCode;
  templateLabel: string;
  defaultPurpose: string;
  totalCapitalDemand: number;
  borrowedCapital: number;
  ownCapital: number;
  termFactor: number;
  expenses: FinancialItem[];
  revenues: FinancialItem[];
  totalExpenses: number;
  totalRevenues: number;
  profit: number;
}

export const LOAN_PLAN_TEMPLATE_META: Record<
  LoanPlanTemplateCode,
  { label: string; description: string; defaultPurpose: string }
> = {
  SUA_NHA: {
    label: 'Mẫu sửa nhà',
    description:
      'Chi phí: Vật liệu XD, Công thợ (tự nhảy theo Tổng nhu cầu vốn), Chi phí trả lãi tiền vay, Chi tiêu gia đình (70tr) • Nguồn thu: Sản xuất lúa (60%), Thu khác (40%)',
    defaultPurpose: 'Sửa nhà',
  },
  CHAN_NUOI: {
    label: 'Mẫu chăn nuôi',
    description:
      'Chi phí: Con giống, Chuồng trại, Thức ăn (tự nhảy theo Tổng nhu cầu vốn), Chi phí trả lãi tiền vay, Chi tiêu gia đình (140tr) • Nguồn thu: Lúa (30%), Chăn nuôi (50%), Thu khác (20%)',
    defaultPurpose: 'Chăn nuôi bò sinh sản x con',
  },
};

/**
 * Sinh chuỗi tên khoản mục chi phí trả lãi tiền vay kèm công thức và số tiền thực tế:
 * Ví dụ: "Chi phí trả lãi tiền vay (100.000.000 × 10% × 1 năm) = 10.000.000 đồng."
 */
export function buildInterestExpenseItemName(
  loanAmount: number,
  interestRate: number,
  termFactor: number,
  _interestExpense?: number,
): string {
  const safeAmount = Math.max(0, Math.round(loanAmount || 0));
  const safeRate = Math.max(0, Number(interestRate) || 0);
  const safeTerm = Math.max(1, Math.round(termFactor || 1));

  const fmtAmount = new Intl.NumberFormat('vi-VN').format(safeAmount);

  return `Chi phí trả lãi tiền vay (${fmtAmount} × ${safeRate}% × ${safeTerm} năm)`;
}

export function calculateLoanPlanTemplate(
  input: LoanPlanTemplateInput,
): CalculatedLoanPlanTemplate {
  const { templateCode, totalCapitalDemand, loanAmount, interestRate, termType } = input;
  const safeTotalDemand = Math.max(0, Math.round(totalCapitalDemand || 0));
  const safeLoanAmount = Math.max(0, Math.round(loanAmount || 0));
  const safeRate = Math.max(0, Number(interestRate) || 0);
  const termFactor = termType === LoanTermType.TRUNG_HAN ? 2 : 1;
  const interestExpense = Math.round(safeLoanAmount * (safeRate / 100) * termFactor);
  const ownCapital = Math.max(0, safeTotalDemand - safeLoanAmount);

  const interestItemName = buildInterestExpenseItemName(
    safeLoanAmount,
    safeRate,
    termFactor,
    interestExpense,
  );

  if (templateCode === 'SUA_NHA') {
    const materialCost = Math.round(safeTotalDemand * 0.8);
    const laborCost = safeTotalDemand - materialCost;
    const familyExpense = 70_000_000;

    const expenses: FinancialItem[] = [
      { name: 'Tiền mua vật liệu xây dựng', amount: materialCost },
      { name: 'Tiền công thợ', amount: laborCost },
      {
        name: interestItemName,
        amount: interestExpense,
      },
      { name: 'Chi tiêu gia đình', amount: familyExpense },
    ];

    const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
    const targetTotalRevenues = totalExpenses + 50_000_000;
    const riceRevenue = Math.round(targetTotalRevenues * 0.6);
    const otherRevenue = targetTotalRevenues - riceRevenue;

    const revenues: FinancialItem[] = [
      { name: 'Trả bằng nguồn thu sản xuất lúa', amount: riceRevenue },
      { name: 'Trả bằng nguồn thu khác', amount: otherRevenue },
    ];

    const totalRevenues = revenues.reduce((sum, item) => sum + item.amount, 0);

    return {
      templateCode,
      templateLabel: LOAN_PLAN_TEMPLATE_META.SUA_NHA.label,
      defaultPurpose: LOAN_PLAN_TEMPLATE_META.SUA_NHA.defaultPurpose,
      totalCapitalDemand: safeTotalDemand,
      borrowedCapital: safeLoanAmount,
      ownCapital,
      termFactor,
      expenses,
      revenues,
      totalExpenses,
      totalRevenues,
      profit: totalRevenues - totalExpenses,
    };
  }

  // Mẫu chăn nuôi (CHAN_NUOI)
  const breedCost = Math.round(safeTotalDemand * 0.8);
  const barnCost = Math.round(safeTotalDemand * 0.15);
  const feedCost = safeTotalDemand - breedCost - barnCost;
  const familyExpense = 140_000_000;

  const expenses: FinancialItem[] = [
    { name: 'Tiền mua con giống', amount: breedCost },
    { name: 'Tiền xây dựng chuồng trại', amount: barnCost },
    { name: 'Tiền thức ăn', amount: feedCost },
    {
      name: interestItemName,
      amount: interestExpense,
    },
    { name: 'Chi tiêu gia đình', amount: familyExpense },
  ];

  const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
  const targetTotalRevenues = totalExpenses + 50_000_000;
  const riceRevenue = Math.round(targetTotalRevenues * 0.3);
  const livestockRevenue = Math.round(targetTotalRevenues * 0.5);
  const otherRevenue = targetTotalRevenues - riceRevenue - livestockRevenue;

  const revenues: FinancialItem[] = [
    { name: 'Trả bằng nguồn thu sản xuất lúa', amount: riceRevenue },
    { name: 'Trả bằng nguồn chăn nuôi', amount: livestockRevenue },
    { name: 'Trả bằng nguồn thu khác', amount: otherRevenue },
  ];

  const totalRevenues = revenues.reduce((sum, item) => sum + item.amount, 0);

  return {
    templateCode,
    templateLabel: LOAN_PLAN_TEMPLATE_META.CHAN_NUOI.label,
    defaultPurpose: LOAN_PLAN_TEMPLATE_META.CHAN_NUOI.defaultPurpose,
    totalCapitalDemand: safeTotalDemand,
    borrowedCapital: safeLoanAmount,
    ownCapital,
    termFactor,
    expenses,
    revenues,
    totalExpenses,
    totalRevenues,
    profit: totalRevenues - totalExpenses,
  };
}

