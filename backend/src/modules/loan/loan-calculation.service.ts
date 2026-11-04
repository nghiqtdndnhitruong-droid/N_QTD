import { Loan, Disbursement, Repayment, LoanStatus, LoanTermType } from '@prisma/client';
import {
  CalculateLoanPlanTemplateQuery,
  HalfTermPaymentStatus,
  LoanInterestStats,
  LoanPlanTemplateKey,
  LoanSummary,
} from './loan.types';
import {
  DAYS_IN_YEAR,
  isLoanOverdue,
  diffInDays,
  OVERDUE_GRACE_DAYS,
  addMonthsToDate,
} from '../../shared/utils/date.util';
import dayjs from 'dayjs';

/**
 * Sinh chuỗi tên khoản mục chi phí trả lãi tiền vay kèm công thức và số tiền thực tế:
 * Ví dụ: "Chi phí trả lãi tiền vay (100.000.000 × 10% × 1 năm) = 10.000.000 đồng."
 */
export function buildInterestExpenseItemName(
  loanAmount: number,
  interestRate: number,
  termFactor: number,
  _interestExpense?: number
): string {
  const safeAmount = Math.max(0, Math.round(loanAmount || 0));
  const safeRate = Math.max(0, Number(interestRate) || 0);
  const safeTerm = Math.max(1, Math.round(termFactor || 1));

  const fmtAmount = safeAmount.toLocaleString('vi-VN');

  return `Chi phí trả lãi tiền vay (${fmtAmount} × ${safeRate}% × ${safeTerm} năm)`;
}

export class LoanCalculationService {
  /**
   * Tính phương án vay theo mẫu chuẩn của Quỹ (Mẫu sửa nhà / Mẫu chăn nuôi).
   * - Làm tròn đến đơn vị đồng (số nguyên VNĐ), đảm bảo tổng các dòng tỷ lệ đúng bằng 100% Tổng nhu cầu vốn.
   * - Lãi suất năm đang lưu dạng phần trăm (VD: 10.2 nghĩa là 10.2%/năm).
   * - Hệ số thời hạn: Ngắn hạn = 1, Trung hạn = 2.
   */
  calculatePlanFromTemplate(params: CalculateLoanPlanTemplateQuery & { templateCode?: LoanPlanTemplateKey }) {
    const templateKey = params.template || params.templateCode || 'SUA_NHA';
    const totalCapitalDemand = Math.max(0, Math.round(Number(params.totalCapitalDemand) || 0));
    const loanAmount = Math.max(0, Math.round(Number(params.loanAmount) || 0));
    const interestRate = Math.max(0, Number(params.interestRate) || 0);
    const ownCapital = Math.max(0, totalCapitalDemand - loanAmount);
    const termFactor = params.termType === LoanTermType.TRUNG_HAN ? 2 : 1;
    const interestExpense = Math.round(loanAmount * (interestRate / 100) * termFactor);
    const defaultExpectedProfit = 50_000_000;

    const interestItemName = buildInterestExpenseItemName(loanAmount, interestRate, termFactor, interestExpense);

    if (templateKey === 'SUA_NHA') {
      const materialCost = Math.round(totalCapitalDemand * 0.8);
      const laborCost = Math.max(0, totalCapitalDemand - materialCost); // 20% còn lại
      const familyExpense = 70_000_000;

      const expenses = [
        { name: 'Tiền mua vật liệu xây dựng', amount: materialCost },
        { name: 'Tiền công thợ', amount: laborCost },
        { name: interestItemName, amount: interestExpense },
        { name: 'Chi tiêu gia đình', amount: familyExpense },
      ];
      const totalExpenses = expenses.reduce((s, item) => s + item.amount, 0);
      const targetTotalRevenues = totalExpenses + defaultExpectedProfit;
      const riceRevenue = Math.round(targetTotalRevenues * 0.6);
      const otherRevenue = Math.max(0, targetTotalRevenues - riceRevenue);

      const revenues = [
        { name: 'Trả bằng nguồn thu sản xuất lúa', amount: riceRevenue },
        { name: 'Trả bằng nguồn thu khác', amount: otherRevenue },
      ];

      return {
        template: 'SUA_NHA' as LoanPlanTemplateKey,
        purpose: 'Sửa chữa, cải tạo nhà ở của hộ thành viên',
        totalCapitalDemand,
        loanAmount,
        ownCapital,
        borrowedCapital: loanAmount,
        termFactor,
        interestExpense,
        expenses,
        revenues,
        totalExpenses,
        totalRevenues: targetTotalRevenues,
        profit: targetTotalRevenues - totalExpenses,
      };
    }

    // MẪU CHĂN NUÔI
    const breedCost = Math.round(totalCapitalDemand * 0.8);
    const barnCost = Math.round(totalCapitalDemand * 0.15);
    const feedCost = Math.max(0, totalCapitalDemand - breedCost - barnCost); // 5% còn lại
    const familyExpense = 140_000_000;

    const expenses = [
      { name: 'Tiền mua con giống', amount: breedCost },
      { name: 'Tiền xây dựng chuồng trại', amount: barnCost },
      { name: 'Tiền thức ăn', amount: feedCost },
      { name: interestItemName, amount: interestExpense },
      { name: 'Chi tiêu gia đình', amount: familyExpense },
    ];
    const totalExpenses = expenses.reduce((s, item) => s + item.amount, 0);
    const targetTotalRevenues = totalExpenses + defaultExpectedProfit;
    const riceRevenue = Math.round(targetTotalRevenues * 0.3);
    const livestockRevenue = Math.round(targetTotalRevenues * 0.5);
    const otherRevenue = Math.max(0, targetTotalRevenues - riceRevenue - livestockRevenue);

    const revenues = [
      { name: 'Trả bằng nguồn thu sản xuất lúa', amount: riceRevenue },
      { name: 'Trả bằng nguồn chăn nuôi', amount: livestockRevenue },
      { name: 'Trả bằng nguồn thu khác', amount: otherRevenue },
    ];

    return {
      template: 'CHAN_NUOI' as LoanPlanTemplateKey,
      purpose: 'Đầu tư phát triển chăn nuôi gia súc, gia cầm của hộ thành viên',
      totalCapitalDemand,
      loanAmount,
      ownCapital,
      borrowedCapital: loanAmount,
      termFactor,
      interestExpense,
      expenses,
      revenues,
      totalExpenses,
      totalRevenues: targetTotalRevenues,
      profit: targetTotalRevenues - totalExpenses,
    };
  }

  /**
   * Tính tiền lãi theo công thức Quỹ tín dụng:
   * Lãi = Dư nợ gốc × Lãi suất năm (%) × Số ngày / 365
   */
  calculateInterest(principalBalance: number, annualRatePercent: number, days: number): number {
    if (principalBalance <= 0 || annualRatePercent <= 0 || days <= 0) {
      return 0;
    }
    const rateDecimal = annualRatePercent / 100;
    const interest = (principalBalance * rateDecimal * days) / DAYS_IN_YEAR;
    return Math.round(interest);
  }

  /**
   * Tính số ngày giữa 2 mốc thời gian
   */
  calculateDaysBetween(startDate: Date | string, endDate: Date | string): number {
    return Math.max(0, diffInDays(startDate, endDate));
  }

  /**
   * Tính thống kê lãi đã đóng và lãi chưa đóng của một khoản vay
   * Chỉ tính các giao dịch đang hiệu lực (isDeleted !== true)
   */
  computeInterestStats(
    loan: Loan & {
      disbursements: Disbursement[];
      repayments: Repayment[];
    }
  ): LoanInterestStats {
    const activeDisbursements = (loan.disbursements ?? []).filter((d) => !d.isDeleted);
    const activeRepayments = (loan.repayments ?? []).filter((r) => !r.isDeleted);

    const totalDisbursed = activeDisbursements.reduce((sum, d) => sum + d.amount, 0);
    const totalPrincipalPaid = activeRepayments.reduce((sum, r) => sum + r.principalAmount, 0);
    const totalInterestPaid = activeRepayments.reduce((sum, r) => sum + r.interestAmount, 0);
    const currentPrincipalBalance = Math.max(0, totalDisbursed - totalPrincipalPaid);

    // Xác định mốc tính lãi gần nhất:
    // Ưu tiên ngày trả lãi gần nhất (có interestAmount > 0), nếu chưa có thì lấy ngày giải ngân đầu tiên
    const interestRepayments = activeRepayments.filter((r) => r.interestAmount > 0);
    let lastInterestReferenceDate: Date | null = null;

    if (interestRepayments.length > 0) {
      lastInterestReferenceDate = interestRepayments.reduce((latest, r) =>
        new Date(r.repaymentDate) > new Date(latest.repaymentDate) ? r : latest
      ).repaymentDate;
    } else if (activeDisbursements.length > 0) {
      lastInterestReferenceDate = activeDisbursements.reduce((earliest, d) =>
        new Date(d.disbursementDate) < new Date(earliest.disbursementDate) ? d : earliest
      ).disbursementDate;
    }

    let unpaidInterestDays = 0;
    let unpaidInterestAmount = 0;

    if (
      currentPrincipalBalance > 0 &&
      lastInterestReferenceDate &&
      loan.status !== LoanStatus.DA_TAT_TOAN
    ) {
      unpaidInterestDays = Math.max(0, diffInDays(lastInterestReferenceDate, new Date()));
      unpaidInterestAmount = this.calculateInterest(
        currentPrincipalBalance,
        loan.interestRate,
        unpaidInterestDays
      );
    }

    return {
      totalDisbursed,
      totalPrincipalPaid,
      currentPrincipalBalance,
      totalInterestPaid,
      lastInterestReferenceDate,
      unpaidInterestDays,
      unpaidInterestAmount,
      isInterestOverdue: unpaidInterestDays >= 90,
    };
  }

  /**
   * Tổng hợp chi tiết tài chính của một khoản vay
   */
  computeLoanSummary(
    loan: Loan & {
      disbursements: Disbursement[];
      repayments: Repayment[];
    }
  ): LoanSummary {
    const activeDisbursements = (loan.disbursements ?? []).filter((d) => !d.isDeleted);
    const stats = this.computeInterestStats(loan);
    const remainingDisbursableAmount = Math.max(0, loan.loanAmount - stats.totalDisbursed);

    let isOverdue = false;
    let overdueDays = 0;

    if (
      loan.maturityDate &&
      stats.currentPrincipalBalance > 0 &&
      loan.status !== LoanStatus.DA_TAT_TOAN
    ) {
      const now = new Date();
      if (isLoanOverdue(loan.maturityDate, now)) {
        isOverdue = true;
        const graceThreshold = dayjs(loan.maturityDate).add(OVERDUE_GRACE_DAYS, 'day');
        overdueDays = dayjs(now).diff(graceThreshold, 'day');
      }
    }

    // Xác định ngày đáo hạn dự kiến (theo 12 hoặc 24 tháng)
    const effectiveStartDate = loan.loanStartDate ?? loan.createdAt;
    const expectedMaturityDate =
      loan.expectedMaturityDate ??
      (effectiveStartDate ? addMonthsToDate(effectiveStartDate, loan.termMonths) : loan.maturityDate);

    // Kiểm tra xem ngày đáo hạn thực tế có bị rút ngắn do thời hạn HĐ thế chấp không
    const isMortgageShortened = Boolean(
      expectedMaturityDate &&
        loan.maturityDate &&
        dayjs(loan.maturityDate).isBefore(dayjs(expectedMaturityDate), 'day')
    );

    // Xác định mốc ngày phải trả phân nửa và trạng thái nghĩa vụ (cho khoản vay trung hạn 24 tháng)
    let halfTermPaymentDate: Date | null = null;
    let halfTermPaymentStatus: HalfTermPaymentStatus | null = null;
    let halfTermRequiredAmount: number | null = null;
    let halfTermPrincipalPaid: number | null = null;

    if (loan.termType === LoanTermType.TRUNG_HAN) {
      halfTermRequiredAmount = Math.round(loan.loanAmount * 0.5);
      halfTermPrincipalPaid = stats.totalPrincipalPaid;

      if (loan.halfTermPaymentDate) {
        halfTermPaymentDate = loan.halfTermPaymentDate;
      } else if (effectiveStartDate) {
        const nominalHalfTerm = addMonthsToDate(effectiveStartDate, 12);
        // Không để ngày trả phân nửa nằm sau ngày đáo hạn thực tế
        if (loan.maturityDate && dayjs(loan.maturityDate).isBefore(dayjs(nominalHalfTerm), 'day')) {
          halfTermPaymentDate = loan.maturityDate;
        } else {
          halfTermPaymentDate = nominalHalfTerm;
        }
      }

      // Xác định trạng thái nghĩa vụ trả phân nửa dựa trên dữ liệu thanh toán thực tế
      if (stats.totalPrincipalPaid >= halfTermRequiredAmount) {
        halfTermPaymentStatus = 'DA_HOAN_THANH';
      } else if (halfTermPaymentDate) {
        const now = dayjs();
        const halfTermDay = dayjs(halfTermPaymentDate);
        if (now.isAfter(halfTermDay, 'day')) {
          halfTermPaymentStatus = 'QUA_HAN';
        } else if (now.isAfter(halfTermDay.subtract(30, 'day'), 'day')) {
          halfTermPaymentStatus = 'DEN_HAN';
        } else {
          halfTermPaymentStatus = 'CHUA_DEN_HAN';
        }
      } else {
        halfTermPaymentStatus = 'CHUA_DEN_HAN';
      }
    }

    return {
      loanId: loan.id,
      contractNumber: loan.contractNumber,
      loanType: loan.loanType,
      termType: loan.termType,
      termMonths: loan.termMonths,
      approvedLoanAmount: loan.loanAmount,
      interestRateAnnual: loan.interestRate,
      status: loan.status,
      disbursementCount: activeDisbursements.length,
      totalDisbursed: stats.totalDisbursed,
      remainingDisbursableAmount,
      totalPrincipalPaid: stats.totalPrincipalPaid,
      totalInterestPaid: stats.totalInterestPaid,
      currentPrincipalBalance: stats.currentPrincipalBalance,
      lastInterestReferenceDate: stats.lastInterestReferenceDate,
      unpaidInterestDays: stats.unpaidInterestDays,
      unpaidInterestAmount: stats.unpaidInterestAmount,
      isInterestOverdue: stats.isInterestOverdue,
      expectedMaturityDate,
      maturityDate: loan.maturityDate,
      isMortgageShortened,
      halfTermPaymentDate,
      halfTermPaymentStatus,
      halfTermRequiredAmount,
      halfTermPrincipalPaid,
      isOverdue,
      overdueDays: Math.max(0, overdueDays),
    };
  }
}

export const loanCalculationService = new LoanCalculationService();
