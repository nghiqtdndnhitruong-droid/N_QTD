import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoanValuationService } from '../loan-valuation.service';
import { ValuationType } from '@prisma/client';
import { prisma } from '../../../config/database';

describe('LoanValuationService', () => {
  let service: LoanValuationService;
  let mockRepo: any;
  const validLoanId = '507f1f77bcf86cd799439011';
  const c1Id = '507f191e810c19729de860e1';
  const c2Id = '507f191e810c19729de860e2';
  const c3Id = '507f191e810c19729de860e3';

  beforeEach(() => {
    mockRepo = {
      findByLoanId: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    service = new LoanValuationService(mockRepo);
    vi.spyOn(prisma.collateral, 'findMany').mockResolvedValue([]);
    vi.spyOn(prisma.loanValuation, 'findMany').mockResolvedValue([]);
  });

  it('1. aggregateCollateralsData: gộp đúng số tờ (loại trùng), số thửa (giữ thứ tự), diện tích', () => {
    const mockCollaterals = [
      { id: c1Id, sheetNumber: '12', plotNumber: '100', area: 100, actualArea: null },
      { id: c2Id, sheetNumber: '12', plotNumber: '101', area: 150, actualArea: null },
      { id: c3Id, sheetNumber: '13', plotNumber: '200', area: 200, actualArea: 190 },
    ] as any;

    const result = service.aggregateCollateralsData(mockCollaterals, 1000000);

    // Số tờ deduplicate giữ thứ tự: "12, 13"
    expect(result.sheetNumber).toBe('12, 13');
    // Số thửa giữ đúng thứ tự: "100, 101, 200"
    expect(result.plotNumber).toBe('100, 101, 200');
    // Tổng diện tích pháp lý: 100 + 150 + 200 = 450
    expect(result.area).toBe(450);
    // Diện tích thực tế: chỉ c3 có 190
    expect(result.actualArea).toBe(190);
    // Diện tích tính tiền hiệu dụng: 100 + 150 + 190 = 440
    expect(result.effectiveArea).toBe(440);
    // Giá tiền trước làm tròn: 440 * 1.000.000 = 440.000.000
    expect(result.totalPriceBeforeRound).toBe(440000000);
    expect(result.totalPrice).toBe(440000000);
  });

  it('2. aggregateCollateralsData: quy tắc làm tròn xuống hàng triệu (FLOOR)', () => {
    const testCases = [
      { area: 125.5, price: 1000000, expectedBefore: 125500000, expectedFloored: 125000000 },
      { area: 125.999999, price: 1000000, expectedBefore: 125999999, expectedFloored: 125000000 },
      { area: 125.0, price: 1000000, expectedBefore: 125000000, expectedFloored: 125000000 },
      { area: 126.8, price: 1000000, expectedBefore: 126800000, expectedFloored: 126000000 },
      { area: 999.999, price: 1000000, expectedBefore: 999999000, expectedFloored: 999000000 },
    ];

    for (const tc of testCases) {
      const mockCollaterals = [{ id: c1Id, sheetNumber: '1', plotNumber: '1', area: tc.area, actualArea: null }] as any;
      const res = service.aggregateCollateralsData(mockCollaterals, tc.price);
      expect(res.totalPrice).toBe(tc.expectedFloored);
    }
  });

  it('3. ensureLoanExists ném lỗi khi không tìm thấy khoản vay', async () => {
    vi.spyOn(prisma.loan, 'findUnique').mockResolvedValueOnce(null);

    await expect(service.ensureLoanExists('507f1f77bcf86cd799439099')).rejects.toThrow(
      'Không tìm thấy khoản vay với ID: 507f1f77bcf86cd799439099'
    );
  });

  it('4. previewGroupValuation trả về thông số tổng hợp xem trước chính xác', async () => {
    vi.spyOn(prisma.loan, 'findUnique').mockResolvedValueOnce({
      id: validLoanId,
      isDeleted: false,
    } as any);

    const mockCollaterals = [
      { id: c1Id, loanId: validLoanId, sheetNumber: '01', plotNumber: '10', area: 100, actualArea: null },
      { id: c2Id, loanId: validLoanId, sheetNumber: '02', plotNumber: '20', area: 100.5, actualArea: null },
    ] as any;

    vi.spyOn(prisma.collateral, 'findMany').mockResolvedValueOnce(mockCollaterals);

    const preview = await service.previewGroupValuation(validLoanId, {
      collateralIds: [c1Id, c2Id],
      pricePerSqMeter: 1000000,
    });

    expect(preview.sheetNumber).toBe('01, 02');
    expect(preview.plotNumber).toBe('10, 20');
    expect(preview.area).toBe(200.5);
    expect(preview.totalPriceBeforeRound).toBe(200500000);
    expect(preview.totalPrice).toBe(200000000); // 200.500.000 làm tròn xuống 200.000.000
  });

  it('5. create ném lỗi khi tài sản không thuộc khoản vay', async () => {
    vi.spyOn(prisma.loan, 'findUnique').mockResolvedValueOnce({
      id: validLoanId,
      isDeleted: false,
    } as any);

    // Trả về 0 tài sản do ID không khớp
    vi.spyOn(prisma.collateral, 'findMany').mockResolvedValueOnce([]);

    const dto = {
      collateralIds: [c1Id],
      valuationType: ValuationType.THEO_GIA_THI_TRUONG,
      pricePerSqMeter: 2000000,
    };

    await expect(service.create(validLoanId, dto)).rejects.toThrow(
      'Tài sản liên kết không tồn tại hoặc không thuộc khoản vay hiện tại'
    );
  });
});
