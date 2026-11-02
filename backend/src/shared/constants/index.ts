export const LOAN_CONSTANTS = {
  // Hạn mức tối đa cho vay tín chấp (1 thành viên tối đa 100tr cho tất cả các khoản tín chấp)
  MAX_UNSECURED_LOAN_AMOUNT: 100_000_000,

  // Tỷ lệ cho vay tối đa trên tổng giá trị tài sản thế chấp (70%)
  MAX_MORTGAGE_LOAN_RATIO: 0.70,

  // Số tháng theo loại kỳ hạn
  SHORT_TERM_MONTHS: 12,
  MEDIUM_TERM_MONTHS: 24,

  // Số ngày ân hạn trước khi tính là quá hạn
  OVERDUE_GRACE_DAYS: 9,

  // Chu kỳ tính lãi mặc định (tháng)
  DEFAULT_INTEREST_PAYMENT_INTERVAL_MONTHS: 3,

  // Quy ước số ngày trong năm để tính lãi
  DAYS_IN_YEAR: 365,
} as const;

