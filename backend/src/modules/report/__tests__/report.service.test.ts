import { describe, it, expect, vi, beforeEach } from 'vitest';
import ExcelJS from 'exceljs';
import { reportService } from '../report.service';
import { prisma } from '../../../config/database';
import { LoanStatus, LoanType, LoanTermType } from '@prisma/client';

describe('ReportService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockDisbursedLoans = [
    {
      id: 'loan_tin_chap_1',
      contractNumber: 'HD-001',
      loanType: LoanType.TIN_CHAP,
      termType: LoanTermType.NGAN_HAN,
      termMonths: 12,
      loanAmount: 50000000,
      loanStartDate: new Date('2026-05-10T00:00:00Z'),
      maturityDate: new Date('2027-05-10T00:00:00Z'),
      halfTermPaymentDate: null,
      status: LoanStatus.DA_GIAI_NGAN,
      member: {
        fullName: 'Nguyễn Văn A',
        idNumber: '083200001111',
        address: 'Ấp 1, Xã Tân Lập, Huyện Tân Thạnh, Long An',
        hamletName: 'Ấp 1',
      },
      collaterals: [],
      valuations: [],
    },
    {
      id: 'loan_the_chap_1',
      contractNumber: 'HD-002',
      loanType: LoanType.THE_CHAP,
      termType: LoanTermType.TRUNG_HAN,
      termMonths: 24,
      loanAmount: 200000000,
      loanStartDate: new Date('2026-06-15T00:00:00Z'),
      maturityDate: new Date('2028-06-15T00:00:00Z'),
      halfTermPaymentDate: new Date('2027-06-15T00:00:00Z'),
      status: LoanStatus.DA_GIAI_NGAN,
      member: {
        fullName: 'Trần Thị B',
        idNumber: '083200002222',
        address: 'Ấp Bắc, Xã Tân Bình',
        hamletName: null,
      },
      collaterals: [
        {
          assetCode: 'BĐS-01',
          assetType: 'DAT_O',
          area: 120.5,
          actualArea: 120.5,
          valuationAmount: 350000000,
        },
      ],
      valuations: [
        {
          totalPrice: 350000000,
        },
      ],
    },
  ];

  it('1. getDisbursedLoans phân loại chính xác hồ sơ tín chấp và thế chấp với quy tắc ngày tới hạn 1 năm cho trung hạn', async () => {
    vi.spyOn(prisma.loan, 'findMany').mockResolvedValue(mockDisbursedLoans as any);

    const result = await reportService.getDisbursedLoans({
      fromDate: '2026-05-01',
      toDate: '2026-06-30',
    });

    // Sheet Tín chấp
    expect(result.tinChap.count).toBe(1);
    expect(result.tinChap.totalAmount).toBe(50000000);
    const tcItem = result.tinChap.items[0];
    expect(tcItem.contractNumber).toBe('HD-001');
    expect(tcItem.borrowerName).toBe('Nguyễn Văn A');
    expect(tcItem.hamlet).toBe('Ấp 1');
    expect(tcItem.loanDate).toBe('10/05/2026');
    expect(tcItem.dueDate).toBe('10/05/2027');
    expect(tcItem.collateralCount).toBe(0);

    // Sheet Thế chấp
    expect(result.theChap.count).toBe(1);
    expect(result.theChap.totalAmount).toBe(200000000);
    expect(result.theChap.totalCollateralValue).toBe(350000000);
    const theChapItem = result.theChap.items[0];
    expect(theChapItem.contractNumber).toBe('HD-002');
    expect(theChapItem.borrowerName).toBe('Trần Thị B');
    expect(theChapItem.hamlet).toBe('Ấp Bắc'); // Tự bóc tách từ địa chỉ
    expect(theChapItem.loanDate).toBe('15/06/2026');
    // Quy tắc: trung hạn hiển thị mốc 1 năm (tức tới hạn trả 1 nửa)
    expect(theChapItem.dueDate).toBe('15/06/2027');
    expect(theChapItem.collateralCount).toBe(1);
    expect(theChapItem.collateralCodes).toBe('BĐS-01');
    expect(theChapItem.collateralArea).toBe('120,5');
    expect(theChapItem.totalCollateralValue).toBe(350000000);
  });

  it('2. exportDisbursedLoansExcel tạo file Excel với đúng 2 sheet và cấu trúc cột yêu cầu', async () => {
    vi.spyOn(prisma.loan, 'findMany').mockResolvedValue(mockDisbursedLoans as any);

    const { buffer, filename } = await reportService.exportDisbursedLoansExcel({
      fromDate: '2026-05-01',
      toDate: '2026-06-30',
    });

    expect(buffer).toBeDefined();
    expect(filename).toContain('Danh_sach_giai_ngan_');
    expect(filename).toContain('.xlsx');

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const wsTinChap = workbook.getWorksheet('Tín chấp');
    expect(wsTinChap).toBeDefined();

    const wsTheChap = workbook.getWorksheet('Thế chấp');
    expect(wsTheChap).toBeDefined();

    // Sheet Tín chấp: 11 cột
    const tinChapHeaderRow = wsTinChap!.getRow(5);
    const tinChapHeaders = (tinChapHeaderRow.values as string[]).slice(1);
    expect(tinChapHeaders).toEqual([
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
    ]);

    // Sheet Thế chấp: 12 cột với "Tổng giá trị tài sản" nằm ngay trước "Loại tài sản"
    const theChapHeaderRow = wsTheChap!.getRow(5);
    const theChapHeaders = (theChapHeaderRow.values as string[]).slice(1);
    expect(theChapHeaders).toEqual([
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
    ]);

    // Kiểm tra dữ liệu hàng 1 của Thế chấp
    const theChapDataRow = wsTheChap!.getRow(6);
    expect(theChapDataRow.getCell(2).value).toBe('HD-002');
    expect(theChapDataRow.getCell(3).value).toBe('Trần Thị B');
    expect(theChapDataRow.getCell(4).value).toBe('Ấp Bắc');
    expect(theChapDataRow.getCell(7).value).toBe(200000000);
    expect(theChapDataRow.getCell(11).value).toBe(350000000); // Tổng giá trị tài sản
  });

  it('3. getMaturityLoans lọc chính xác các khoản vay tới hạn trong Tháng và Năm', async () => {
    // Tháng 5 năm 2027 có khoản vay ngắn hạn HD-001 tới hạn
    vi.spyOn(prisma.loan, 'findMany').mockResolvedValue(mockDisbursedLoans as any);

    const resultMay = await reportService.getMaturityLoans({ month: '5', year: '2027' });
    expect(resultMay.month).toBe(5);
    expect(resultMay.year).toBe(2027);
    expect(resultMay.count).toBe(1);
    expect(resultMay.items[0].contractNumber).toBe('HD-001');
    expect(resultMay.items[0].dueDate).toBe('10/05/2027');

    // Tháng 6 năm 2027 có khoản vay trung hạn HD-002 tới hạn mốc 1 năm (trả 1/2)
    const resultJune = await reportService.getMaturityLoans({ month: '6', year: '2027' });
    expect(resultJune.count).toBe(1);
    expect(resultJune.items[0].contractNumber).toBe('HD-002');
    expect(resultJune.items[0].dueDate).toBe('15/06/2027');
  });

  it('4. exportMaturityLoansExcel tạo file Excel danh sách tới hạn với 6 cột yêu cầu', async () => {
    vi.spyOn(prisma.loan, 'findMany').mockResolvedValue(mockDisbursedLoans as any);

    const { buffer, filename } = await reportService.exportMaturityLoansExcel({
      month: 6,
      year: 2027,
    });

    expect(buffer).toBeDefined();
    expect(filename).toContain('Danh_sach_toi_han_thang_06_2027');

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.getWorksheet('Tới hạn 06-2027') || workbook.worksheets[0];
    expect(worksheet).toBeDefined();

    const headerRow = worksheet!.getRow(4);
    const headers = (headerRow.values as string[]).slice(1);
    expect(headers).toEqual([
      'STT',
      'Họ tên',
      'Số giấy tờ',
      'Địa bàn',
      'Số tiền vay',
      'Ngày tới hạn',
    ]);

    const dataRow = worksheet!.getRow(5);
    expect(dataRow.getCell(2).value).toBe('Trần Thị B');
    expect(dataRow.getCell(3).value).toBe('083200002222');
    expect(dataRow.getCell(4).value).toBe('Ấp Bắc');
    expect(dataRow.getCell(5).value).toBe(200000000);
    expect(dataRow.getCell(6).value).toBe('15/06/2027');
  });

  it('5. getUnpaidInterestLoans tính toán chính xác số tháng chậm lãi, tiền lãi và số điện thoại người vay', async () => {
    // Giả lập 2 khoản vay:
    // 1. Khoản vay chậm 95 ngày (~3 tháng)
    // 2. Khoản vay chậm 130 ngày (~4 tháng)
    const now = new Date();
    const date95DaysAgo = new Date(now.getTime() - 95 * 24 * 60 * 60 * 1000);
    const date130DaysAgo = new Date(now.getTime() - 130 * 24 * 60 * 60 * 1000);

    const mockUnpaidLoans = [
      {
        id: 'loan_unpaid_3m',
        contractNumber: 'HD-3M',
        loanType: LoanType.TIN_CHAP,
        termType: LoanTermType.NGAN_HAN,
        loanAmount: 100000000,
        interestRate: 10,
        loanStartDate: date95DaysAgo,
        status: LoanStatus.DA_GIAI_NGAN,
        member: {
          fullName: 'Lê Văn C',
          idNumber: '083200003333',
          phoneNumber: '0912345678',
          address: 'Ấp 2, Xã Nhị Trường',
          hamletName: 'Ấp 2',
        },
        disbursements: [
          {
            id: 'disb_1',
            amount: 100000000,
            disbursementDate: date95DaysAgo,
            isDeleted: false,
          },
        ],
        repayments: [], // Chưa từng đóng lãi
      },
      {
        id: 'loan_unpaid_4m',
        contractNumber: 'HD-4M',
        loanType: LoanType.THE_CHAP,
        termType: LoanTermType.TRUNG_HAN,
        loanAmount: 200000000,
        interestRate: 12,
        loanStartDate: date130DaysAgo,
        status: LoanStatus.DA_GIAI_NGAN,
        member: {
          fullName: 'Phạm Thị D',
          idNumber: '083200004444',
          phoneNumber: '0987654321',
          address: 'Ấp Ba, Xã Long Hòa',
          hamletName: 'Ấp Ba',
        },
        disbursements: [
          {
            id: 'disb_2',
            amount: 200000000,
            disbursementDate: date130DaysAgo,
            isDeleted: false,
          },
        ],
        repayments: [],
      },
    ];

    vi.spyOn(prisma.loan, 'findMany').mockResolvedValue(mockUnpaidLoans as any);

    // Lọc "gte_3" (Từ 3 tháng trở lên): phải ra cả 2 khoản vay
    const resGte3 = await reportService.getUnpaidInterestLoans({ months: 'gte_3' });
    expect(resGte3.count).toBe(2);
    expect(resGte3.items[0].borrowerPhone).toBe('0987654321'); // 130 ngày xếp trước
    expect(resGte3.items[0].unpaidMonths).toBe(4);
    expect(resGte3.items[1].unpaidMonths).toBe(3);
    expect(resGte3.items[1].borrowerPhone).toBe('0912345678');
    expect(resGte3.totalUnpaidInterest).toBeGreaterThan(0);

    // Lọc đúng "3" tháng
    const res3 = await reportService.getUnpaidInterestLoans({ months: '3' });
    expect(res3.count).toBe(1);
    expect(res3.items[0].contractNumber).toBe('HD-3M');
    expect(res3.items[0].borrowerName).toBe('Lê Văn C');

    // Lọc đúng "4" tháng
    const res4 = await reportService.getUnpaidInterestLoans({ months: '4' });
    expect(res4.count).toBe(1);
    expect(res4.items[0].contractNumber).toBe('HD-4M');
    expect(res4.items[0].borrowerName).toBe('Phạm Thị D');
  });

  it('6. exportUnpaidInterestExcel xuất file Excel chậm đóng lãi có đầy đủ cột SĐT và số tiền lãi', async () => {
    const now = new Date();
    const date95DaysAgo = new Date(now.getTime() - 95 * 24 * 60 * 60 * 1000);

    vi.spyOn(prisma.loan, 'findMany').mockResolvedValue([
      {
        id: 'loan_unpaid_test',
        contractNumber: 'HD-CHAM-LAI',
        loanType: LoanType.TIN_CHAP,
        termType: LoanTermType.NGAN_HAN,
        loanAmount: 50000000,
        interestRate: 10,
        loanStartDate: date95DaysAgo,
        status: LoanStatus.DA_GIAI_NGAN,
        member: {
          fullName: 'Võ Văn E',
          idNumber: '083200005555',
          phoneNumber: '0909123456',
          address: 'Ấp 1, Xã Tân An',
          hamletName: 'Ấp 1',
        },
        disbursements: [
          {
            id: 'disb_test',
            amount: 50000000,
            disbursementDate: date95DaysAgo,
            isDeleted: false,
          },
        ],
        repayments: [],
      },
    ] as any);

    const { buffer, filename } = await reportService.exportUnpaidInterestExcel({ months: '3' });
    expect(buffer).toBeDefined();
    expect(filename).toContain('Danh_sach_cham_dong_lai_');

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.getWorksheet('Chậm đóng lãi');
    expect(worksheet).toBeDefined();

    const headerRow = worksheet!.getRow(5);
    const headers = (headerRow.values as string[]).slice(1);
    expect(headers).toContain('Số điện thoại');
    expect(headers).toContain('Tiền lãi chưa đóng');
    expect(headers).toContain('Số tháng chưa đóng');

    const dataRow = worksheet!.getRow(6);
    expect(dataRow.getCell(2).value).toBe('HD-CHAM-LAI');
    expect(dataRow.getCell(3).value).toBe('Võ Văn E');
    expect(dataRow.getCell(4).value).toBe('0909123456');
  });
});
