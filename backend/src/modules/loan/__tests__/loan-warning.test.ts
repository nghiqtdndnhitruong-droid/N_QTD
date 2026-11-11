import { describe, it, expect } from 'vitest';
import { loanService } from '../loan.service';
import { LoanType, LoanTermType } from '@prisma/client';
import dayjs from 'dayjs';

describe('Loan Warnings (Document Expiry & Mortgage Contract Expiry)', () => {
  const today = dayjs().startOf('day');

  it('1. Cảnh báo khi giấy tờ của thành viên đã hết hạn', () => {
    const expiredDate = today.subtract(10, 'day').toDate();
    const loanMock = {
      id: 'loan_1',
      loanType: LoanType.TIN_CHAP,
      termType: LoanTermType.NGAN_HAN,
      termMonths: 12,
      member: {
        fullName: 'Nguyễn Văn A',
        idType: 'CAN_CUOC_CONG_DAN',
        idNumber: '084200001234',
        idExpiry: expiredDate,
      },
    };

    const warnings = loanService.checkLoanWarnings(loanMock);
    const memberWarn = warnings.find((w) => w.target === 'MEMBER');

    expect(memberWarn).toBeDefined();
    expect(memberWarn?.code).toBe('ID_EXPIRED');
    expect(memberWarn?.message).toContain('đã hết hạn');
  });

  it('2. Cảnh báo khi giấy tờ của thành viên sắp hết hạn (< 6 tháng)', () => {
    const expiringSoonDate = today.add(90, 'day').toDate(); // Còn 3 tháng (< 180 ngày)
    const loanMock = {
      id: 'loan_2',
      loanType: LoanType.TIN_CHAP,
      termType: LoanTermType.NGAN_HAN,
      termMonths: 12,
      member: {
        fullName: 'Trần Thị B',
        idType: 'CAN_CUOC_CONG_DAN',
        idNumber: '084200005678',
        idExpiry: expiringSoonDate,
      },
    };

    const warnings = loanService.checkLoanWarnings(loanMock);
    const memberWarn = warnings.find((w) => w.target === 'MEMBER');

    expect(memberWarn).toBeDefined();
    expect(memberWarn?.code).toBe('ID_EXPIRING_SOON');
    expect(memberWarn?.message).toContain('dưới 6 tháng');
  });

  it('3. Không cảnh báo khi giấy tờ của thành viên còn hạn trên 6 tháng', () => {
    const validDate = today.add(365, 'day').toDate(); // Còn 1 năm
    const loanMock = {
      id: 'loan_3',
      loanType: LoanType.TIN_CHAP,
      termType: LoanTermType.NGAN_HAN,
      termMonths: 12,
      member: {
        fullName: 'Lê Văn C',
        idType: 'CAN_CUOC_CONG_DAN',
        idNumber: '084200009999',
        idExpiry: validDate,
      },
    };

    const warnings = loanService.checkLoanWarnings(loanMock);
    const memberWarn = warnings.find((w) => w.target === 'MEMBER');

    expect(memberWarn).toBeUndefined();
  });

  it('4. Cảnh báo khi Hợp đồng thế chấp đã hết hạn', () => {
    const expiredMortgage = today.subtract(5, 'day').toDate();
    const loanMock = {
      id: 'loan_4',
      loanType: LoanType.THE_CHAP,
      termType: LoanTermType.NGAN_HAN,
      termMonths: 12,
      mortgageContract: {
        contractNumber: '26.11.001',
        contractExpiryDate: expiredMortgage,
      },
    };

    const warnings = loanService.checkLoanWarnings(loanMock);
    const mortWarn = warnings.find((w) => w.target === 'MORTGAGE_CONTRACT' && w.code === 'MORTGAGE_EXPIRED');

    expect(mortWarn).toBeDefined();
    expect(mortWarn?.message).toContain('đã hết hạn');
  });

  it('5. Cảnh báo khi Hợp đồng thế chấp còn hiệu lực từ 1 năm trở lại (<= 365 ngày)', () => {
    const soonMortgage = today.add(200, 'day').toDate(); // Còn ~6.5 tháng (<= 365 ngày)
    const loanMock = {
      id: 'loan_5',
      loanType: LoanType.THE_CHAP,
      termType: LoanTermType.NGAN_HAN,
      termMonths: 12,
      mortgageContract: {
        contractNumber: '26.11.002',
        contractExpiryDate: soonMortgage,
      },
    };

    const warnings = loanService.checkLoanWarnings(loanMock);
    const mortWarn = warnings.find((w) => w.target === 'MORTGAGE_CONTRACT' && w.code === 'MORTGAGE_EXPIRING_SOON');

    expect(mortWarn).toBeDefined();
    expect(mortWarn?.message).toContain('1 năm trở lại');
  });

  it('6. calculateMaturityTimeline sinh cảnh báo HĐ thế chấp còn 1 năm trở lại', () => {
    const soonMortgage = today.add(200, 'day').toDate();
    const timeline = loanService.calculateMaturityTimeline(
      today.toDate(),
      12,
      LoanTermType.NGAN_HAN,
      LoanType.THE_CHAP,
      soonMortgage
    );

    expect(timeline.warningMessage).toBeDefined();
    expect(timeline.warningMessage).toContain('1 năm trở lại');
  });
});

