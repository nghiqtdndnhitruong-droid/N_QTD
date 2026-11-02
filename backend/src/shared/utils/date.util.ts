import dayjs from 'dayjs';

/**
 * Quy ước nghiệp vụ Quỹ tín dụng:
 * - 1 tháng = 30 ngày (quy ước tính chu kỳ)
 * - 1 năm = 365 ngày (mẫu số tính lãi)
 * - Quá hạn: vượt 9 ngày kể từ ngày đáo hạn
 */
export const DAYS_IN_YEAR = 365;
export const DAYS_IN_MONTH = 30;
export const OVERDUE_GRACE_DAYS = 9;

export const formatDate = (date: Date | string, format: string = 'DD/MM/YYYY'): string => {
  return dayjs(date).format(format);
};

export const addMonthsToDate = (date: Date | string, months: number): Date => {
  return dayjs(date).add(months, 'month').toDate();
};

export const addDaysToDate = (date: Date | string, days: number): Date => {
  return dayjs(date).add(days, 'day').toDate();
};

export const diffInDays = (startDate: Date | string, endDate: Date | string): number => {
  return dayjs(endDate).diff(dayjs(startDate), 'day');
};

/**
 * Kiểm tra xem khoản vay đã quá hạn hay chưa:
 * Vượt quá 9 ngày kể từ ngày đáo hạn (maturityDate) mà chưa trả hết.
 */
export const isLoanOverdue = (maturityDate: Date | string, currentDate: Date = new Date()): boolean => {
  const overdueThresholdDate = dayjs(maturityDate).add(OVERDUE_GRACE_DAYS, 'day');
  return dayjs(currentDate).isAfter(overdueThresholdDate, 'day');
};

/**
 * Tính số ngày và ngày kết thúc cho khoảng thời gian N tháng tính từ ngày bắt đầu.
 * Xử lý chính xác độ dài từng tháng theo lịch thực tế (28, 29, 30, 31 ngày) và qua năm.
 * Quy tắc:
 * Ngày kết thúc = startDate + N tháng - 1 ngày.
 * Ví dụ: Từ 01/10/2026, thu 3 tháng:
 * - Tháng 10 (31 ngày), Tháng 11 (30 ngày), Tháng 12 (31 ngày) -> Ngày kết thúc là 31/12/2026.
 * - Tổng số ngày = diffInDays(01/10/2026, 31/12/2026) + 1 = 92 ngày.
 */
export const calculateMonthsPeriod = (
  startDate: Date | string,
  months: number
): { days: number; endDate: Date } => {
  const start = dayjs(startDate);
  const end = start.add(months, 'month').subtract(1, 'day');
  const days = Math.max(1, end.diff(start, 'day') + 1);
  return {
    days,
    endDate: end.toDate(),
  };
};

/**
 * Tính ngày kết thúc thu lãi từ ngày bắt đầu và số ngày thu lãi.
 * Ví dụ: startDate = 01/10/2026, days = 30 -> endDate = 30/10/2026
 * (Từ 01 đến 30 là đủ 30 ngày: start.add(days - 1, 'day'))
 */
export const calculateInterestEndDate = (
  startDate: Date | string,
  days: number
): Date => {
  const safeDays = Math.max(1, Math.round(days));
  return dayjs(startDate).add(safeDays - 1, 'day').toDate();
};


