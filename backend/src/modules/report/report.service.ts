import dayjs from 'dayjs';
import ExcelJS from 'exceljs';
import { prisma } from '../../config/database';
import { LoanStatus, LoanType, UserRole } from '@prisma/client';
import { AppError } from '../../shared/errors/app-error';
import { AuthUserResponse } from '../auth/auth.types';
import {
  DisbursedLoanItemDto,
  DisbursedLoansFilterQuery,
  DisbursedLoansResponse,
  MaturityLoanItemDto,
  MaturityLoansFilterQuery,
  MaturityLoansResponse,
  UnpaidInterestFilterQuery,
  UnpaidInterestLoanItemDto,
  UnpaidInterestResponse,
} from './report.types';
import { loanCalculationService } from '../loan/loan-calculation.service';

export function extractHamlet(member?: { hamletName?: string | null; address?: string | null } | null): string {
  if (!member) return '';
  if (member.hamletName && member.hamletName.trim()) {
    return member.hamletName.trim();
  }
  const addr = (member.address || '').trim();
  if (!addr) return '';
  const match = addr.match(/(?:Ấp|ấp|Khóm|khóm|Tổ|tổ)\s+[^,]+/);
  if (match) return match[0].trim();
  const parts = addr.split(',');
  return (parts[0] || '').trim();
}

export function calculateDueDate(loan: {
  termType: string;
  termMonths?: number | null;
  loanStartDate?: Date | null;
  maturityDate?: Date | null;
  halfTermPaymentDate?: Date | null;
  createdAt?: Date;
}): Date {
  const startDate = loan.loanStartDate || loan.createdAt || new Date();
  if (loan.termType === 'TRUNG_HAN') {
    // Với cho vay trung hạn: mốc tới hạn hiển thị sau 1 năm (trả 1 nửa nợ gốc)
    if (loan.halfTermPaymentDate) {
      return loan.halfTermPaymentDate;
    }
    return dayjs(startDate).add(1, 'year').toDate();
  }

  // Cho vay ngắn hạn: 12 tháng
  if (loan.maturityDate) {
    return loan.maturityDate;
  }
  const months = loan.termMonths || 12;
  return dayjs(startDate).add(months, 'month').toDate();
}

export function formatAssetTypeLabel(type?: string | null): string {
  if (!type) return '';
  switch (type) {
    case 'QUYEN_SU_DUNG_DAT':
      return 'Quyền sử dụng đất';
    case 'QUYEN_SU_DUNG_DAT_QUYEN_SO_HUU_NHA_O_VA_TAI_SAN_KHAC_GAN_LIEN_VOI_DAT':
      return 'QSDĐ và nhà ở gắn liền';
    case 'QUYEN_SU_DUNG_DAT_QUYEN_SO_HUU_TAI_SAN_GAN_LIEN_VOI_DAT':
      return 'QSDĐ và tài sản gắn liền';
    case 'QUYEN_SU_DUNG_DAT_VA_TAI_SAN_GAN_LIEN':
      return 'QSDĐ và tài sản gắn liền';
    default:
      return type;
  }
}

export function formatAreaNumber(area?: number | null): string {
  if (area === undefined || area === null || isNaN(area)) return '';
  return area.toString().replace('.', ',');
}

export class ReportService {
  /**
   * Truy vấn danh sách khoản vay đã giải ngân theo khoảng thời gian
   */
  public async getDisbursedLoans(
    query: DisbursedLoansFilterQuery,
    currentUser?: AuthUserResponse
  ): Promise<DisbursedLoansResponse> {
    const fromDateStr = query.fromDate ? query.fromDate.trim() : '';
    const toDateStr = query.toDate ? query.toDate.trim() : '';

    const where: any = {
      status: LoanStatus.DA_GIAI_NGAN,
      isDeleted: { not: true },
      ...(currentUser?.role === UserRole.CREDIT_OFFICER ? { createdById: currentUser.id } : {}),
    };

    if (fromDateStr || toDateStr) {
      where.loanStartDate = {};
      if (fromDateStr) {
        where.loanStartDate.gte = dayjs(fromDateStr).startOf('day').toDate();
      }
      if (toDateStr) {
        where.loanStartDate.lte = dayjs(toDateStr).endOf('day').toDate();
      }
    }

    const loans = await prisma.loan.findMany({
      where,
      include: {
        member: {
          select: {
            fullName: true,
            idNumber: true,
            address: true,
            hamletName: true,
            communeName: true,
          },
        },
        collaterals: {
          select: {
            assetCode: true,
            assetType: true,
            area: true,
            actualArea: true,
            valuationAmount: true,
          },
        },
        valuations: {
          select: {
            totalPrice: true,
          },
        },
      },
      orderBy: [{ loanStartDate: 'asc' }, { contractNumber: 'asc' }],
    });

    const tinChapItems: DisbursedLoanItemDto[] = [];
    const theChapItems: DisbursedLoanItemDto[] = [];

    let tinChapStt = 0;
    let theChapStt = 0;

    let tinChapTotalAmount = 0;
    let theChapTotalAmount = 0;
    let theChapTotalCollateralValue = 0;

    for (const loan of loans) {
      const loanDateStr = loan.loanStartDate ? dayjs(loan.loanStartDate).format('DD/MM/YYYY') : '';
      const due = calculateDueDate(loan);
      const dueDateStr = due ? dayjs(due).format('DD/MM/YYYY') : '';

      const hamlet = extractHamlet(loan.member);
      const collateralCount = loan.collaterals?.length || 0;

      // Diện tích
      const collateralArea = loan.collaterals
        .map((c) => formatAreaNumber(c.area))
        .filter(Boolean)
        .join('; ');

      // Mã tài sản
      const collateralCodes = loan.collaterals
        .map((c) => c.assetCode)
        .filter(Boolean)
        .join('; ');

      // Loại tài sản
      const uniqueTypes = Array.from(
        new Set(loan.collaterals.map((c) => formatAssetTypeLabel(c.assetType)).filter(Boolean))
      );
      const collateralType = uniqueTypes.join('; ');

      // Giá trị tài sản (Thế chấp)
      let totalCollateralVal = 0;
      if (loan.valuations && loan.valuations.length > 0) {
        totalCollateralVal = loan.valuations.reduce((sum, v) => sum + (v.totalPrice || 0), 0);
      }
      if (totalCollateralVal === 0 && loan.collaterals && loan.collaterals.length > 0) {
        totalCollateralVal = loan.collaterals.reduce((sum, c) => sum + (c.valuationAmount || 0), 0);
      }

      if (loan.loanType === LoanType.TIN_CHAP) {
        tinChapStt++;
        tinChapTotalAmount += loan.loanAmount;

        tinChapItems.push({
          id: loan.id,
          stt: tinChapStt,
          contractNumber: loan.contractNumber || 'Chưa cấp số',
          borrowerName: loan.member?.fullName || '',
          hamlet,
          loanDate: loanDateStr,
          dueDate: dueDateStr,
          loanAmount: loan.loanAmount,
          collateralCount,
          collateralArea,
          collateralCodes,
          collateralType,
          loanType: 'Tín chấp',
          termType: loan.termType === 'TRUNG_HAN' ? 'Trung hạn' : 'Ngắn hạn',
        });
      } else {
        theChapStt++;
        theChapTotalAmount += loan.loanAmount;
        theChapTotalCollateralValue += totalCollateralVal;

        theChapItems.push({
          id: loan.id,
          stt: theChapStt,
          contractNumber: loan.contractNumber || 'Chưa cấp số',
          borrowerName: loan.member?.fullName || '',
          hamlet,
          loanDate: loanDateStr,
          dueDate: dueDateStr,
          loanAmount: loan.loanAmount,
          collateralCount,
          collateralArea,
          collateralCodes,
          totalCollateralValue: totalCollateralVal,
          collateralType,
          loanType: 'Thế chấp',
          termType: loan.termType === 'TRUNG_HAN' ? 'Trung hạn' : 'Ngắn hạn',
        });
      }
    }

    return {
      fromDate: fromDateStr,
      toDate: toDateStr,
      tinChap: {
        items: tinChapItems,
        totalAmount: tinChapTotalAmount,
        count: tinChapItems.length,
      },
      theChap: {
        items: theChapItems,
        totalAmount: theChapTotalAmount,
        totalCollateralValue: theChapTotalCollateralValue,
        count: theChapItems.length,
      },
    };
  }

  /**
   * Xuất file Excel danh sách giải ngân gồm 2 sheet: Tín chấp và Thế chấp
   */
  public async exportDisbursedLoansExcel(
    query: DisbursedLoansFilterQuery,
    currentUser?: AuthUserResponse
  ): Promise<{ buffer: Buffer; filename: string }> {
    const data = await this.getDisbursedLoans(query, currentUser);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Quỹ Tín Dụng Nhân Dân Nhị Trường';
    workbook.lastModifiedBy = 'Hệ thống Quản lý Tín dụng N_QTD';
    workbook.created = new Date();

    const fromDateDisplay = data.fromDate ? dayjs(data.fromDate).format('DD/MM/YYYY') : '...';
    const toDateDisplay = data.toDate ? dayjs(data.toDate).format('DD/MM/YYYY') : '...';
    const subTitle = `Từ ngày: ${fromDateDisplay}  -  Đến ngày: ${toDateDisplay}`;

    // Styling constants
    const headerFill: ExcelJS.Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F4E79' }, // Dark Navy
    };
    const headerFont: Partial<ExcelJS.Font> = {
      name: 'Times New Roman',
      size: 11,
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };
    const dataFont: Partial<ExcelJS.Font> = {
      name: 'Times New Roman',
      size: 11,
    };
    const thinBorder: Partial<ExcelJS.Borders> = {
      top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
      left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
      bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
      right: { style: 'thin', color: { argb: 'FFD3D3D3' } },
    };
    const totalBorder: Partial<ExcelJS.Borders> = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
      bottom: { style: 'double', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FFD3D3D3' } },
    };

    // -------------------------------------------------------------
    // SHEET 1: TÍN CHẤP
    // -------------------------------------------------------------
    const wsTinChap = workbook.addWorksheet('Tín chấp', {
      views: [{ showGridLines: true }],
    });

    // Tiêu đề đầu trang
    wsTinChap.mergeCells('A1:K1');
    wsTinChap.getCell('A1').value = 'QUỸ TÍN DỤNG NHÂN DÂN NHỊ TRƯỜNG';
    wsTinChap.getCell('A1').font = { name: 'Times New Roman', size: 11, bold: true };

    wsTinChap.mergeCells('A2:K2');
    wsTinChap.getCell('A2').value = 'DANH SÁCH KHOẢN VAY TÍN CHẤP ĐÃ GIẢI NGÂN';
    wsTinChap.getCell('A2').font = { name: 'Times New Roman', size: 14, bold: true, color: { argb: 'FF0F2D59' } };
    wsTinChap.getCell('A2').alignment = { horizontal: 'center' };

    wsTinChap.mergeCells('A3:K3');
    wsTinChap.getCell('A3').value = subTitle;
    wsTinChap.getCell('A3').font = { name: 'Times New Roman', size: 11, italic: true };
    wsTinChap.getCell('A3').alignment = { horizontal: 'center' };

    // Header Table Tín Chấp:
    // STT, Số HĐ (số khế ước), Tên người vay, địa bàn (lấy phần Ấp), ngày vay, ngày tới hạn, số tiền vay, số tờ, diện tích tài sản, mã tài sản, loại tài sản
    const tinChapHeaders = [
      'STT',
      'Số HĐ',
      'Tên người vay',
      'Địa bàn',
      'Ngày vay',
      'Ngày tới hạn',
      'Số tiền vay',
      'Số tờ',
      'Diện tích tài sản',
      'Mã tài sản',
      'Loại tài sản',
    ];

    const headerRowTinChap = wsTinChap.getRow(5);
    headerRowTinChap.values = tinChapHeaders;
    headerRowTinChap.height = 28;

    headerRowTinChap.eachCell((cell) => {
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = thinBorder;
    });

    let currentTinChapRow = 6;
    for (const item of data.tinChap.items) {
      const row = wsTinChap.getRow(currentTinChapRow);
      row.values = [
        item.stt,
        item.contractNumber,
        item.borrowerName,
        item.hamlet,
        item.loanDate,
        item.dueDate,
        item.loanAmount,
        item.collateralCount > 0 ? item.collateralCount : '',
        item.collateralArea,
        item.collateralCodes,
        item.collateralType,
      ];
      row.height = 22;

      row.eachCell((cell, colNumber) => {
        cell.font = dataFont;
        cell.border = thinBorder;
        cell.alignment = { vertical: 'middle' };

        // Căn lề từng cột
        if (colNumber === 1 || colNumber === 8) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if (colNumber === 2 || colNumber === 5 || colNumber === 6) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if (colNumber === 7) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.numFmt = '#,##0';
        } else if (colNumber === 9 || colNumber === 10) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
      });

      currentTinChapRow++;
    }

    // Dòng tổng cộng Tín chấp
    const totalRowTinChap = wsTinChap.getRow(currentTinChapRow);
    totalRowTinChap.values = [
      'Tổng cộng',
      '',
      '',
      '',
      '',
      '',
      data.tinChap.totalAmount,
      '',
      '',
      '',
      '',
    ];
    totalRowTinChap.height = 24;
    wsTinChap.mergeCells(`A${currentTinChapRow}:F${currentTinChapRow}`);

    totalRowTinChap.eachCell((cell, colNumber) => {
      cell.font = { name: 'Times New Roman', size: 11, bold: true };
      cell.border = totalBorder;
      cell.alignment = { vertical: 'middle' };
      if (colNumber === 1) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
      if (colNumber === 7) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = '#,##0';
      }
    });

    // Column widths Tín chấp
    wsTinChap.columns = [
      { width: 7 },   // STT
      { width: 15 },  // Số HĐ
      { width: 25 },  // Tên người vay
      { width: 18 },  // Địa bàn (Ấp)
      { width: 13 },  // Ngày vay
      { width: 14 },  // Ngày tới hạn
      { width: 18 },  // Số tiền vay
      { width: 9 },   // Số tờ
      { width: 18 },  // Diện tích
      { width: 18 },  // Mã tài sản
      { width: 26 },  // Loại tài sản
    ];

    // -------------------------------------------------------------
    // SHEET 2: THẾ CHẤP
    // -------------------------------------------------------------
    const wsTheChap = workbook.addWorksheet('Thế chấp', {
      views: [{ showGridLines: true }],
    });

    wsTheChap.mergeCells('A1:L1');
    wsTheChap.getCell('A1').value = 'QUỸ TÍN DỤNG NHÂN DÂN NHỊ TRƯỜNG';
    wsTheChap.getCell('A1').font = { name: 'Times New Roman', size: 11, bold: true };

    wsTheChap.mergeCells('A2:L2');
    wsTheChap.getCell('A2').value = 'DANH SÁCH KHOẢN VAY THẾ CHẤP ĐÃ GIẢI NGÂN';
    wsTheChap.getCell('A2').font = { name: 'Times New Roman', size: 14, bold: true, color: { argb: 'FF0F2D59' } };
    wsTheChap.getCell('A2').alignment = { horizontal: 'center' };

    wsTheChap.mergeCells('A3:L3');
    wsTheChap.getCell('A3').value = subTitle;
    wsTheChap.getCell('A3').font = { name: 'Times New Roman', size: 11, italic: true };
    wsTheChap.getCell('A3').alignment = { horizontal: 'center' };

    // Header Table Thế Chấp:
    // Có thêm cột "Tổng giá trị tài sản" nằm trước cột "Loại tài sản"
    const theChapHeaders = [
      'STT',
      'Số HĐ',
      'Tên người vay',
      'Địa bàn',
      'Ngày vay',
      'Ngày tới hạn',
      'Số tiền vay',
      'Số tờ',
      'Diện tích tài sản',
      'Mã tài sản',
      'Tổng giá trị tài sản',
      'Loại tài sản',
    ];

    const headerRowTheChap = wsTheChap.getRow(5);
    headerRowTheChap.values = theChapHeaders;
    headerRowTheChap.height = 28;

    headerRowTheChap.eachCell((cell) => {
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = thinBorder;
    });

    let currentTheChapRow = 6;
    for (const item of data.theChap.items) {
      const row = wsTheChap.getRow(currentTheChapRow);
      row.values = [
        item.stt,
        item.contractNumber,
        item.borrowerName,
        item.hamlet,
        item.loanDate,
        item.dueDate,
        item.loanAmount,
        item.collateralCount > 0 ? item.collateralCount : '',
        item.collateralArea,
        item.collateralCodes,
        item.totalCollateralValue || 0,
        item.collateralType,
      ];
      row.height = 22;

      row.eachCell((cell, colNumber) => {
        cell.font = dataFont;
        cell.border = thinBorder;
        cell.alignment = { vertical: 'middle' };

        if (colNumber === 1 || colNumber === 8) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if (colNumber === 2 || colNumber === 5 || colNumber === 6) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if (colNumber === 7 || colNumber === 11) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.numFmt = '#,##0';
        } else if (colNumber === 9 || colNumber === 10) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
      });

      currentTheChapRow++;
    }

    // Dòng tổng cộng Thế chấp
    const totalRowTheChap = wsTheChap.getRow(currentTheChapRow);
    totalRowTheChap.values = [
      'Tổng cộng',
      '',
      '',
      '',
      '',
      '',
      data.theChap.totalAmount,
      '',
      '',
      '',
      data.theChap.totalCollateralValue,
      '',
    ];
    totalRowTheChap.height = 24;
    wsTheChap.mergeCells(`A${currentTheChapRow}:F${currentTheChapRow}`);

    totalRowTheChap.eachCell((cell, colNumber) => {
      cell.font = { name: 'Times New Roman', size: 11, bold: true };
      cell.border = totalBorder;
      cell.alignment = { vertical: 'middle' };
      if (colNumber === 1) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
      if (colNumber === 7 || colNumber === 11) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = '#,##0';
      }
    });

    // Column widths Thế chấp
    wsTheChap.columns = [
      { width: 7 },   // STT
      { width: 15 },  // Số HĐ
      { width: 25 },  // Tên người vay
      { width: 18 },  // Địa bàn (Ấp)
      { width: 13 },  // Ngày vay
      { width: 14 },  // Ngày tới hạn
      { width: 18 },  // Số tiền vay
      { width: 9 },   // Số tờ
      { width: 18 },  // Diện tích
      { width: 18 },  // Mã tài sản
      { width: 22 },  // Tổng giá trị tài sản
      { width: 26 },  // Loại tài sản
    ];

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const dateSuffix = dayjs().format('YYYYMMDD_HHmm');
    const filename = `Danh_sach_giai_ngan_${dateSuffix}.xlsx`;

    return { buffer, filename };
  }

  /**
   * Lấy danh sách khoản vay tới hạn theo Tháng và Năm
   */
  public async getMaturityLoans(
    query: MaturityLoansFilterQuery,
    currentUser?: AuthUserResponse
  ): Promise<MaturityLoansResponse> {
    const month = parseInt(String(query.month || dayjs().month() + 1), 10);
    const year = parseInt(String(query.year || dayjs().year()), 10);

    if (isNaN(month) || month < 1 || month > 12) {
      throw AppError.badRequest('Tháng không hợp lệ (từ 1 đến 12)');
    }
    if (isNaN(year) || year < 1900 || year > 2100) {
      throw AppError.badRequest('Năm không hợp lệ');
    }

    // Các khoản vay đang hoạt động (Đã giải ngân hoặc Quá hạn chưa tất toán)
    const loans = await prisma.loan.findMany({
      where: {
        status: { in: [LoanStatus.DA_GIAI_NGAN, LoanStatus.QUA_HAN] },
        isDeleted: { not: true },
        ...(currentUser?.role === UserRole.CREDIT_OFFICER ? { createdById: currentUser.id } : {}),
      },
      include: {
        member: {
          select: {
            fullName: true,
            idNumber: true,
            address: true,
            hamletName: true,
          },
        },
      },
      orderBy: [{ loanStartDate: 'asc' }],
    });

    const matchingItems: MaturityLoanItemDto[] = [];
    let totalAmount = 0;
    let stt = 0;

    for (const loan of loans) {
      const startDate = loan.loanStartDate || loan.createdAt || new Date();
      let matchedDueDate: Date | null = null;

      if (loan.termType === 'TRUNG_HAN') {
        // Cho vay trung hạn có 2 mốc:
        // 1. Mốc 1 năm (trả 1 nửa gốc)
        const halfDate = loan.halfTermPaymentDate || dayjs(startDate).add(1, 'year').toDate();
        if (dayjs(halfDate).month() + 1 === month && dayjs(halfDate).year() === year) {
          matchedDueDate = halfDate;
        }

        // 2. Mốc cuối cùng (đáo hạn tất toán)
        const finalMatDate = loan.maturityDate || dayjs(startDate).add(loan.termMonths || 24, 'month').toDate();
        if (!matchedDueDate && dayjs(finalMatDate).month() + 1 === month && dayjs(finalMatDate).year() === year) {
          matchedDueDate = finalMatDate;
        }
      } else {
        // Cho vay ngắn hạn: mốc đáo hạn
        const matDate = loan.maturityDate || dayjs(startDate).add(loan.termMonths || 12, 'month').toDate();
        if (dayjs(matDate).month() + 1 === month && dayjs(matDate).year() === year) {
          matchedDueDate = matDate;
        }
      }

      if (matchedDueDate) {
        stt++;
        totalAmount += loan.loanAmount;
        matchingItems.push({
          id: loan.id,
          stt,
          borrowerName: loan.member?.fullName || '',
          idNumber: loan.member?.idNumber || '',
          hamlet: extractHamlet(loan.member),
          loanAmount: loan.loanAmount,
          dueDate: dayjs(matchedDueDate).format('DD/MM/YYYY'),
          contractNumber: loan.contractNumber || 'Chưa cấp số',
          loanType: loan.loanType === 'TIN_CHAP' ? 'Tín chấp' : 'Thế chấp',
          termType: loan.termType === 'TRUNG_HAN' ? 'Trung hạn' : 'Ngắn hạn',
        });
      }
    }

    // Sắp xếp theo ngày tới hạn tăng dần
    matchingItems.sort((a, b) => {
      const dateA = dayjs(a.dueDate, 'DD/MM/YYYY').valueOf();
      const dateB = dayjs(b.dueDate, 'DD/MM/YYYY').valueOf();
      return dateA - dateB;
    });

    // Đánh lại số thứ tự sau khi sort
    matchingItems.forEach((item, idx) => {
      item.stt = idx + 1;
    });

    return {
      month,
      year,
      items: matchingItems,
      totalAmount,
      count: matchingItems.length,
    };
  }

  /**
   * Xuất file Excel danh sách tới hạn cho 1 tháng cụ thể
   */
  public async exportMaturityLoansExcel(
    query: MaturityLoansFilterQuery,
    currentUser?: AuthUserResponse
  ): Promise<{ buffer: Buffer; filename: string }> {
    const data = await this.getMaturityLoans(query, currentUser);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Quỹ Tín Dụng Nhân Dân Nhị Trường';
    workbook.created = new Date();

    const monthStr = data.month < 10 ? `0${data.month}` : `${data.month}`;
    const ws = workbook.addWorksheet(`Tới hạn ${monthStr}-${data.year}`, {
      views: [{ showGridLines: true }],
    });

    // Tiêu đề
    ws.mergeCells('A1:F1');
    ws.getCell('A1').value = 'QUỸ TÍN DỤNG NHÂN DÂN NHỊ TRƯỜNG';
    ws.getCell('A1').font = { name: 'Times New Roman', size: 11, bold: true };

    ws.mergeCells('A2:F2');
    ws.getCell('A2').value = `DANH SÁCH KHOẢN VAY TỚI HẠN THÁNG ${monthStr}/${data.year}`;
    ws.getCell('A2').font = { name: 'Times New Roman', size: 14, bold: true, color: { argb: 'FF0F2D59' } };
    ws.getCell('A2').alignment = { horizontal: 'center' };

    // Header Table Tới hạn:
    // STT, Họ tên, Số giấy tờ, Địa bàn (lấy cấp Ấp), Số tiền vay, ngày tới hạn
    const headers = [
      'STT',
      'Họ tên',
      'Số giấy tờ',
      'Địa bàn',
      'Số tiền vay',
      'Ngày tới hạn',
    ];

    const headerFill: ExcelJS.Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F4E79' },
    };
    const headerFont: Partial<ExcelJS.Font> = {
      name: 'Times New Roman',
      size: 11,
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };
    const dataFont: Partial<ExcelJS.Font> = {
      name: 'Times New Roman',
      size: 11,
    };
    const thinBorder: Partial<ExcelJS.Borders> = {
      top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
      left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
      bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
      right: { style: 'thin', color: { argb: 'FFD3D3D3' } },
    };

    const headerRow = ws.getRow(4);
    headerRow.values = headers;
    headerRow.height = 28;

    headerRow.eachCell((cell) => {
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = thinBorder;
    });

    let currentRow = 5;
    for (const item of data.items) {
      const row = ws.getRow(currentRow);
      row.values = [
        item.stt,
        item.borrowerName,
        item.idNumber,
        item.hamlet,
        item.loanAmount,
        item.dueDate,
      ];
      row.height = 22;

      row.eachCell((cell, colNumber) => {
        cell.font = dataFont;
        cell.border = thinBorder;
        cell.alignment = { vertical: 'middle' };

        if (colNumber === 1) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if (colNumber === 3 || colNumber === 6) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if (colNumber === 5) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.numFmt = '#,##0';
        }
      });

      currentRow++;
    }

    // Dòng tổng cộng
    const totalRow = ws.getRow(currentRow);
    totalRow.values = ['Tổng cộng', '', '', '', data.totalAmount, ''];
    totalRow.height = 24;
    ws.mergeCells(`A${currentRow}:D${currentRow}`);

    totalRow.eachCell((cell, colNumber) => {
      cell.font = { name: 'Times New Roman', size: 11, bold: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
        bottom: { style: 'double', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FFD3D3D3' } },
      };
      cell.alignment = { vertical: 'middle' };
      if (colNumber === 1) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
      if (colNumber === 5) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = '#,##0';
      }
    });

    ws.columns = [
      { width: 7 },   // STT
      { width: 28 },  // Họ tên
      { width: 18 },  // Số giấy tờ
      { width: 20 },  // Địa bàn (Ấp)
      { width: 20 },  // Số tiền vay
      { width: 16 },  // Ngày tới hạn
    ];

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const filename = `Danh_sach_toi_han_thang_${monthStr}_${data.year}.xlsx`;

    return { buffer, filename };
  }

  /**
   * Lấy danh sách khoản vay chưa đóng lãi (3 tháng, 4 tháng... theo bộ lọc)
   */
  public async getUnpaidInterestLoans(
    query: UnpaidInterestFilterQuery,
    currentUser?: AuthUserResponse
  ): Promise<UnpaidInterestResponse> {
    const filterMonths = query.months !== undefined ? String(query.months).trim() : 'gte_3';
    const search = query.search ? query.search.trim().toLowerCase() : '';

    const loans = await prisma.loan.findMany({
      where: {
        status: { in: [LoanStatus.DA_GIAI_NGAN, LoanStatus.QUA_HAN] },
        isDeleted: { not: true },
        ...(currentUser?.role === UserRole.CREDIT_OFFICER ? { createdById: currentUser.id } : {}),
      },
      include: {
        member: {
          select: {
            fullName: true,
            idNumber: true,
            phoneNumber: true,
            address: true,
            hamletName: true,
            communeName: true,
          },
        },
        disbursements: {
          where: { isDeleted: { not: true } },
          orderBy: { disbursementDate: 'asc' },
        },
        repayments: {
          where: { isDeleted: { not: true } },
          orderBy: { repaymentDate: 'asc' },
        },
      },
      orderBy: [{ loanStartDate: 'asc' }],
    });

    const items: UnpaidInterestLoanItemDto[] = [];
    let totalPrincipalBalance = 0;
    let totalUnpaidInterest = 0;

    const today = dayjs().startOf('day');

    for (const loan of loans) {
      const summary = loanCalculationService.computeLoanSummary(loan as any);
      if (summary.currentPrincipalBalance <= 0) {
        continue;
      }

      // Xác định ngày đóng lãi gần nhất
      const interestRepayments = (loan.repayments || []).filter((r) => r.interestAmount > 0);
      let lastInterestDateObj: Date;
      if (interestRepayments.length > 0) {
        const latest = interestRepayments[interestRepayments.length - 1];
        lastInterestDateObj = latest.interestEndDate ?? latest.repaymentDate;
      } else {
        const firstDisb = loan.disbursements[0];
        lastInterestDateObj = firstDisb?.disbursementDate ?? loan.loanStartDate ?? loan.createdAt;
      }

      const lastDate = dayjs(lastInterestDateObj).startOf('day');
      const unpaidDays = Math.max(0, today.diff(lastDate, 'day'));
      // Tính số tháng chậm lãi: chuẩn 30 ngày / tháng (90 ngày = 3 tháng, 120 ngày = 4 tháng)
      const unpaidMonths = Math.floor(unpaidDays / 30);

      // Kiểm tra bộ lọc số tháng
      let matched = false;
      if (filterMonths === 'all') {
        matched = unpaidMonths >= 1;
      } else if (filterMonths === '3') {
        matched = unpaidMonths === 3;
      } else if (filterMonths === '4') {
        matched = unpaidMonths === 4;
      } else if (filterMonths === 'gte_3') {
        matched = unpaidMonths >= 3;
      } else if (filterMonths === 'gte_4') {
        matched = unpaidMonths >= 4;
      } else if (!isNaN(Number(filterMonths))) {
        matched = unpaidMonths === Number(filterMonths);
      } else {
        matched = unpaidMonths >= 3;
      }

      if (!matched) {
        continue;
      }

      const borrowerName = loan.member?.fullName || '';
      const borrowerPhone = loan.member?.phoneNumber || '';
      const contractNumber = loan.contractNumber || '';
      const idNumber = loan.member?.idNumber || '';

      if (search) {
        const matchedSearch =
          borrowerName.toLowerCase().includes(search) ||
          borrowerPhone.includes(search) ||
          contractNumber.toLowerCase().includes(search) ||
          idNumber.includes(search);
        if (!matchedSearch) {
          continue;
        }
      }

      const unpaidInterest = loanCalculationService.calculateInterest(
        summary.currentPrincipalBalance,
        loan.interestRate,
        unpaidDays
      );

      totalPrincipalBalance += summary.currentPrincipalBalance;
      totalUnpaidInterest += unpaidInterest;

      items.push({
        id: loan.id,
        stt: 0,
        contractNumber: loan.contractNumber || 'Chưa cấp số',
        borrowerName,
        borrowerPhone: borrowerPhone || '—',
        idNumber,
        hamlet: extractHamlet(loan.member),
        loanAmount: loan.loanAmount,
        principalBalance: summary.currentPrincipalBalance,
        interestRate: loan.interestRate,
        lastInterestDate: dayjs(lastInterestDateObj).format('DD/MM/YYYY'),
        unpaidDays,
        unpaidMonths,
        unpaidInterest,
        loanType: loan.loanType === LoanType.TIN_CHAP ? 'Tín chấp' : 'Thế chấp',
        termType: loan.termType === 'TRUNG_HAN' ? 'Trung hạn' : 'Ngắn hạn',
      });
    }

    // Sắp xếp ưu tiên các khoản vay chậm lâu nhất lên đầu
    items.sort((a, b) => b.unpaidDays - a.unpaidDays);
    items.forEach((item, idx) => {
      item.stt = idx + 1;
    });

    return {
      filterMonths,
      count: items.length,
      totalPrincipalBalance,
      totalUnpaidInterest,
      items,
    };
  }

  /**
   * Xuất file Excel danh sách các khoản vay chậm đóng lãi
   */
  public async exportUnpaidInterestExcel(
    query: UnpaidInterestFilterQuery,
    currentUser?: AuthUserResponse
  ): Promise<{ buffer: Buffer; filename: string }> {
    const data = await this.getUnpaidInterestLoans(query, currentUser);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Quỹ Tín Dụng Nhân Dân Nhị Trường';
    workbook.created = new Date();

    const ws = workbook.addWorksheet('Chậm đóng lãi', {
      views: [{ showGridLines: true }],
    });

    // Tiêu đề
    ws.mergeCells('A1:L1');
    ws.getCell('A1').value = 'QUỸ TÍN DỤNG NHÂN DÂN NHỊ TRƯỜNG';
    ws.getCell('A1').font = { name: 'Times New Roman', size: 11, bold: true };

    let filterLabel = 'Từ 3 tháng trở lên';
    if (data.filterMonths === '3') filterLabel = '3 tháng';
    else if (data.filterMonths === '4') filterLabel = '4 tháng';
    else if (data.filterMonths === 'gte_4') filterLabel = 'Từ 4 tháng trở lên';
    else if (data.filterMonths === 'all') filterLabel = 'Tất cả (Từ 1 tháng)';

    ws.mergeCells('A2:L2');
    ws.getCell('A2').value = `DANH SÁCH KHOẢN VAY CHẬM ĐÓNG LÃI (${filterLabel.toUpperCase()})`;
    ws.getCell('A2').font = { name: 'Times New Roman', size: 14, bold: true, color: { argb: 'FFC00000' } };
    ws.getCell('A2').alignment = { horizontal: 'center' };

    ws.mergeCells('A3:L3');
    ws.getCell('A3').value = `Ngày kết xuất: ${dayjs().format('DD/MM/YYYY HH:mm')} · Tổng số hồ sơ: ${data.count} · Tổng lãi tồn đọng: ${data.totalUnpaidInterest.toLocaleString('vi-VN')} đ`;
    ws.getCell('A3').font = { name: 'Times New Roman', size: 11, italic: true };
    ws.getCell('A3').alignment = { horizontal: 'center' };

    const headers = [
      'STT',
      'Số HĐ',
      'Tên người vay',
      'Số điện thoại',
      'Địa bàn (Ấp)',
      'Dư nợ gốc',
      'Lãi suất (%/năm)',
      'Đóng lãi gần nhất',
      'Số tháng chưa đóng',
      'Số ngày chưa đóng',
      'Tiền lãi chưa đóng',
      'Hình thức vay',
    ];

    const headerFill: ExcelJS.Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFC00000' }, // Đỏ đô cảnh báo
    };
    const headerFont: Partial<ExcelJS.Font> = {
      name: 'Times New Roman',
      size: 11,
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };
    const dataFont: Partial<ExcelJS.Font> = {
      name: 'Times New Roman',
      size: 11,
    };
    const thinBorder: Partial<ExcelJS.Borders> = {
      top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
      left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
      bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
      right: { style: 'thin', color: { argb: 'FFD3D3D3' } },
    };

    const headerRow = ws.getRow(5);
    headerRow.values = headers;
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = thinBorder;
    });

    let currentRow = 6;
    for (const item of data.items) {
      const row = ws.getRow(currentRow);
      row.values = [
        item.stt,
        item.contractNumber,
        item.borrowerName,
        item.borrowerPhone,
        item.hamlet,
        item.principalBalance,
        `${item.interestRate}%`,
        item.lastInterestDate,
        `${item.unpaidMonths} tháng`,
        item.unpaidDays,
        item.unpaidInterest,
        `${item.loanType} - ${item.termType}`,
      ];
      row.height = 22;

      row.eachCell((cell, colNumber) => {
        cell.font = dataFont;
        cell.border = thinBorder;
        cell.alignment = { vertical: 'middle' };

        if (colNumber === 1 || colNumber === 8 || colNumber === 9 || colNumber === 10) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if (colNumber === 2 || colNumber === 4 || colNumber === 7) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if (colNumber === 6 || colNumber === 11) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.numFmt = '#,##0';
          if (colNumber === 11) {
            cell.font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FFC00000' } };
          }
        }
      });

      currentRow++;
    }

    // Dòng tổng cộng
    const totalRow = ws.getRow(currentRow);
    totalRow.values = ['Tổng cộng', '', '', '', '', data.totalPrincipalBalance, '', '', '', '', data.totalUnpaidInterest, ''];
    totalRow.height = 24;
    ws.mergeCells(`A${currentRow}:E${currentRow}`);

    totalRow.eachCell((cell, colNumber) => {
      cell.font = { name: 'Times New Roman', size: 11, bold: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
        bottom: { style: 'double', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FFD3D3D3' } },
      };
      cell.alignment = { vertical: 'middle' };
      if (colNumber === 1) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
      if (colNumber === 6 || colNumber === 11) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = '#,##0';
      }
    });

    ws.columns = [
      { width: 7 },   // STT
      { width: 15 },  // Số HĐ
      { width: 26 },  // Tên người vay
      { width: 16 },  // Số điện thoại
      { width: 18 },  // Địa bàn (Ấp)
      { width: 18 },  // Dư nợ gốc
      { width: 15 },  // Lãi suất
      { width: 18 },  // Đóng lãi gần nhất
      { width: 18 },  // Số tháng chưa đóng
      { width: 18 },  // Số ngày chưa đóng
      { width: 20 },  // Tiền lãi chưa đóng
      { width: 22 },  // Hình thức vay
    ];

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const dateSuffix = dayjs().format('YYYYMMDD_HHmm');
    const filename = `Danh_sach_cham_dong_lai_${dateSuffix}.xlsx`;

    return { buffer, filename };
  }
}

export const reportService = new ReportService();
