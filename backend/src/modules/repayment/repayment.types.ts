import { Repayment } from '@prisma/client';

export interface CreateRepaymentDto {
  loanId: string;
  repaymentDate: string | Date;
  principalAmount?: number; // Số tiền gốc trả (>= 0)
  interestAmount?: number;  // Số tiền lãi trả (>= 0)
  interestDays?: number;    // Số ngày tính lãi
  interestStartDate?: string | Date | null; // Ngày bắt đầu kỳ tính lãi
  interestEndDate?: string | Date | null;   // Ngày kết thúc kỳ tính lãi (Ngày thu lãi đến)
  autoSettleIfPaidInFull?: boolean; // Tự động tất toán nếu đã trả hết nợ gốc
  note?: string;
}

export interface UpdateRepaymentDto {
  repaymentDate?: string | Date;
  principalAmount?: number;
  interestAmount?: number;
  interestDays?: number;
  interestStartDate?: string | Date | null;
  interestEndDate?: string | Date | null;
  note?: string;
  reason?: string;
}

export interface NextInterestPeriodInfo {
  loanId: string;
  contractNumber: string | null;
  currentPrincipalBalance: number;
  annualInterestRate: number;
  lastInterestRepaymentDate: Date | null;
  lastInterestEndDate: Date | null;
  suggestedStartDate: Date;
}

export interface DeleteRepaymentDto {
  reason?: string;
}

export interface EstimateInterestQuery {
  days?: number; // Số ngày tính lãi (mặc định 90 ngày cho chu kỳ 3 tháng: 3 * 30 ngày)
  asOfDate?: string;
}

export type RepaymentEntity = Repayment;


