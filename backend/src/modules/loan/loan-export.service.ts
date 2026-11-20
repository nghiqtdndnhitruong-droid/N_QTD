import ExcelJS from 'exceljs';
import dayjs from 'dayjs';
import { LoanStatus, LoanTermType, LoanType, UserRole } from '@prisma/client';
import { loanRepository } from './loan.repository';
import { loanCalculationService } from './loan-calculation.service';
import { LoanFilterQuery } from './loan.types';
import { AuthUserResponse } from '../auth/auth.types';

const LOAN_TYPE_TEXT: Record<LoanType, string> = {
  THE_CHAP: 'Thế chấp',
  TIN_CHAP: 'Tín chấp',
};

const LOAN_TERM_TEXT: Record<LoanTermType, string> = {
  NGAN_HAN: 'Ngắn hạn (12 tháng)',
  TRUNG_HAN: 'Trung hạn (24 tháng)',
};

const LOAN_STATUS_TEXT: Record<LoanStatus, string> = {
  DANG_TAO: 'Đang tạo',
  DA_HOAN_THANH_HO_SO: 'Đã hoàn thành hồ sơ',
  DA_GIAI_NGAN: 'Đã giải ngân',
  QUA_HAN: 'Quá hạn',
  DA_TAT_TOAN: 'Đã tất toán',
};

export async function exportDisbursedLoansExcel(
  query: LoanFilterQuery,
  currentUser?: AuthUserResponse,
): Promise<{ buffer: Buffer; fileName: string }> {
  const effectiveQuery: LoanFilterQuery = {
    ...query,
    page: 1,
    limit: 5000,
  };

  if (currentUser && currentUser.role === UserRole.CREDIT_OFFICER) {
    effectiveQuery.createdById = currentUser.id;
  }

  const allLoans = [];
  let page = 1;
  while (true) {
    const { loans, total } = await loanRepository.findMany({
      ...effectiveQuery,
      page,
      limit: 100,
    });
    allLoans.push(...loans);
    if (allLoans.length >= total || loans.length === 0) break;
    page++;
  }

  // Chỉ xuất các khoản vay ĐÃ GIẢI NGÂN (có ít nhất 1 đợt giải ngân hiệu lực)
  const disbursedLoans = allLoans.filter((loan) => {
    const activeDisbs = (loan.disbursements ?? []).filter((d) => !d.isDeleted);
    return activeDisbs.length > 0;
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Quỹ Tín Dụng Nhân Dân';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Danh sách khoản vay', {
    views: [{ state: 'frozen', ySplit: 4 }],
  });

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
  };

  // Tiêu đề báo cáo
  sheet.mergeCells('A1:Q1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = 'DANH SÁCH HỒ SƠ KHOẢN VAY ĐÃ GIẢI NGÂN';
  titleCell.font = { name: 'Times New Roman', size: 15, bold: true, color: { argb: 'FF0B1F3A' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(1).height = 28;

  sheet.mergeCells('A2:Q2');
  const subCell = sheet.getCell('A2');
  subCell.value = `Ngày xuất: ${dayjs().format('DD/MM/YYYY HH:mm')} · Tổng số khoản vay đã giải ngân: ${disbursedLoans.length}`;
  subCell.font = { name: 'Times New Roman', size: 11, italic: true, color: { argb: 'FF475569' } };
  subCell.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(2).height = 20;

  sheet.getRow(3).height = 8;

  // Header bảng (Row 4)
  const headers = [
    'STT',
    'Số khế ước',
    'Mã TV',
    'Họ và tên người vay',
    'Số CCCD',
    'Địa bàn (Ấp, Xã)',
    'Hình thức vay',
    'Kỳ hạn',
    'Số tiền vay (VNĐ)',
    'Đã giải ngân (VNĐ)',
    'Dư nợ gốc hiện tại (VNĐ)',
    'Lãi suất (%/năm)',
    'Ngày giải ngân',
    'Ngày tới hạn',
    'Trạng thái',
    'Lịch sử thu lãi',
    'Biên bản kiểm tra',
  ];

  const headerRow = sheet.getRow(4);
  headerRow.values = headers;
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1D4E89' },
    };
    cell.font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = thinBorder;
  });

  let sumLoanAmount = 0;
  let sumDisbursed = 0;
  let sumPrincipalBalance = 0;

  disbursedLoans.forEach((loan, idx) => {
    const activeDisbs = (loan.disbursements ?? [])
      .filter((d) => !d.isDeleted)
      .sort((a, b) => new Date(a.disbursementDate).getTime() - new Date(b.disbursementDate).getTime());

    const firstDisbDate = activeDisbs[0]?.disbursementDate ?? null;
    const stats = loanCalculationService.computeInterestStats(loan as any);

    const activeInterestRepayments = (loan.repayments ?? []).filter(
      (r) => !r.isDeleted && r.interestAmount > 0,
    );
    const interestSummary =
      activeInterestRepayments.length > 0
        ? `Đã thu ${activeInterestRepayments.length} kỳ (${Math.round(stats.totalInterestPaid).toLocaleString('vi-VN')} đ)`
        : 'Chưa thu lãi';

    const inspectionChecks = (loan as any).inspectionChecks as boolean[] | undefined;
    const completedInspections = (inspectionChecks ?? []).slice(0, 4).filter(Boolean).length;

    const member = loan.member;
    const areaText =
      member?.hamletName && member?.communeName
        ? `${member.hamletName}, ${member.communeName}`
        : member?.communeName || member?.hamletName || member?.address || '';

    sumLoanAmount += loan.loanAmount;
    sumDisbursed += stats.totalDisbursed;
    sumPrincipalBalance += stats.currentPrincipalBalance;

    const row = sheet.addRow([
      idx + 1,
      loan.contractNumber || 'Chưa cấp số',
      member?.memberCode || 'Chưa cấp mã',
      member?.fullName || '',
      member?.idNumber || '',
      areaText,
      LOAN_TYPE_TEXT[loan.loanType] ?? loan.loanType,
      LOAN_TERM_TEXT[loan.termType] ?? `${loan.termMonths} tháng`,
      loan.loanAmount,
      stats.totalDisbursed,
      stats.currentPrincipalBalance,
      loan.interestRate,
      firstDisbDate ? dayjs(firstDisbDate).format('DD/MM/YYYY') : '',
      loan.maturityDate ? dayjs(loan.maturityDate).format('DD/MM/YYYY') : '',
      LOAN_STATUS_TEXT[loan.status] ?? loan.status,
      interestSummary,
      `${completedInspections}/4 đợt`,
    ]);

    row.height = 22;
    row.eachCell((cell, colNumber) => {
      cell.font = { name: 'Times New Roman', size: 11 };
      cell.border = thinBorder;

      if ([1, 3, 5, 7, 12, 13, 14, 15, 17].includes(colNumber)) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else if ([9, 10, 11].includes(colNumber)) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        cell.numFmt = '#,##0';
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      }

      if (colNumber === 12) {
        cell.numFmt = '0.00';
      }
    });
  });

  // Dòng TỔNG CỘNG
  const totalRow = sheet.addRow([
    '',
    'TỔNG CỘNG',
    '',
    `${disbursedLoans.length} khoản vay`,
    '',
    '',
    '',
    '',
    sumLoanAmount,
    sumDisbursed,
    sumPrincipalBalance,
    '',
    '',
    '',
    '',
    '',
    '',
  ]);
  totalRow.height = 24;
  totalRow.eachCell((cell, colNumber) => {
    cell.font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FF0B1F3A' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFEEF3FA' },
    };
    cell.border = thinBorder;
    if ([9, 10, 11].includes(colNumber)) {
      cell.alignment = { vertical: 'middle', horizontal: 'right' };
      cell.numFmt = '#,##0';
    } else if (colNumber === 2) {
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    } else {
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
    }
  });

  // Độ rộng cột
  const colWidths = [6, 16, 13, 24, 16, 26, 13, 20, 18, 18, 20, 13, 15, 15, 16, 24, 14];
  colWidths.forEach((width, i) => {
    sheet.getColumn(i + 1).width = width;
  });

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const fileName = `Danh_sach_khoan_vay_${dayjs().format('YYYYMMDD')}.xlsx`;
  return { buffer, fileName };
}
