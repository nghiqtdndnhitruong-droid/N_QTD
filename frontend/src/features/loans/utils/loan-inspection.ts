import dayjs from 'dayjs';
import { LoanStatus } from '../../../shared/types';
import type { Loan } from '../types/loan.types';

/**
 * 4 mốc tháng kiểm tra định kỳ sau giải ngân theo quy định:
 * Tháng 3, Tháng 6, Tháng 9, Tháng 11
 */
export const INSPECTION_MONTHS = [3, 6, 9, 11] as const;

export interface LoanInspectionMilestone {
  index: number;
  roundNumber: number;
  month: number;
  year: number;
  periodLabel: string;
  quarterEndDate: string; // DD/MM/YYYY
  completed: boolean;
  isDueOrPast: boolean;
}

/**
 * Lấy ngày giải ngân hiệu lực đầu tiên của khoản vay
 */
export function getEarliestDisbursementDate(loan?: Partial<Loan> | null): string | null {
  if (!loan) return null;
  const activeDisbursements = (loan.disbursements ?? [])
    .filter((d) => !d.isDeleted && d.disbursementDate)
    .sort((a, b) => new Date(a.disbursementDate).getTime() - new Date(b.disbursementDate).getTime());

  const firstDisbursement = activeDisbursements[0];
  if (firstDisbursement) {
    return firstDisbursement.disbursementDate;
  }

  const isDisbursedStatus =
    loan.status === LoanStatus.DA_GIAI_NGAN ||
    loan.status === LoanStatus.QUA_HAN ||
    loan.status === LoanStatus.DA_TAT_TOAN;

  if (isDisbursedStatus) {
    return loan.loanStartDate || loan.contractDate || loan.createdAt || null;
  }

  return null;
}

/**
 * Kiểm tra xem khoản vay đã giải ngân để áp dụng theo dõi biên bản kiểm tra hay chưa
 */
export function isLoanDisbursedForInspection(loan?: Partial<Loan> | null): boolean {
  return Boolean(getEarliestDisbursementDate(loan));
}

/**
 * Chuẩn hóa mảng trạng thái 4 đợt kiểm tra
 */
export function normalizeInspectionChecks(checks?: boolean[] | null): [boolean, boolean, boolean, boolean] {
  return [
    Boolean(checks?.[0]),
    Boolean(checks?.[1]),
    Boolean(checks?.[2]),
    Boolean(checks?.[3]),
  ];
}

/**
 * Tính 4 đợt kiểm tra định kỳ bắt đầu từ cuối quý của ngày giải ngân.
 * Quý kiểm tra gồm: Tháng 3, Tháng 6, Tháng 9, Tháng 11.
 * Ví dụ: Giải ngân tháng 02/2026 -> Đợt 1: Tháng 03/2026, Đợt 2: Tháng 06/2026, Đợt 3: Tháng 09/2026, Đợt 4: Tháng 11/2026.
 */
export function computeLoanInspectionSchedule(
  disbursementDateRaw: string | Date,
  checks?: boolean[] | null,
  referenceDate: string | Date = new Date(),
): LoanInspectionMilestone[] {
  const disb = dayjs(disbursementDateRaw);
  const baseDate = disb.isValid() ? disb : dayjs();
  const disbMonth = baseDate.month() + 1; // 1..12
  const disbYear = baseDate.year();

  // Tìm quý bắt đầu trong [3, 6, 9, 11]
  let startIdx = INSPECTION_MONTHS.findIndex((m) => m >= disbMonth);
  let startYear = disbYear;

  // Nếu giải ngân vào tháng 12 (> 11), đợt 1 bắt đầu từ tháng 3 năm tiếp theo
  if (startIdx === -1) {
    startIdx = 0;
    startYear = disbYear + 1;
  }

  const normalizedChecks = normalizeInspectionChecks(checks);
  const now = dayjs(referenceDate).startOf('day');

  return [0, 1, 2, 3].map((i) => {
    const monthIdx = (startIdx + i) % INSPECTION_MONTHS.length;
    const yearOffset = Math.floor((startIdx + i) / INSPECTION_MONTHS.length);
    const targetMonth = INSPECTION_MONTHS[monthIdx] ?? 3;
    const targetYear = startYear + yearOffset;

    const monthPadded = String(targetMonth).padStart(2, '0');
    const dueDate = dayjs(`${targetYear}-${monthPadded}-26`).startOf('day');

    const isDueOrPast = !now.isBefore(dueDate, 'day');

    return {
      index: i,
      roundNumber: i + 1,
      month: targetMonth,
      year: targetYear,
      periodLabel: `Tháng ${monthPadded}/${targetYear}`,
      quarterEndDate: dueDate.format('DD/MM/YYYY'),
      completed: Boolean(normalizedChecks[i]),
      isDueOrPast,
    };
  });
}
