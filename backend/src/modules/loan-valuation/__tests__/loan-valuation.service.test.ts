import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoanValuationService } from '../loan-valuation.service';
import { ValuationType } from '@prisma/client';
import { prisma } from '../../../config/database';

describe('LoanValuationService', () => {
  let service: LoanValuationService;
  let mockRepo: any;
  const validLoanId = '507f1f77bcf86cd799439011';
  const validCollateralId = '507f191e810c19729de860ea';

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

  it('1. ensureLoanExists ném lỗi khi không tìm thấy khoản vay', async () => {
    vi.spyOn(prisma.loan, 'findUnique').mockResolvedValueOnce(null);

    await expect(service.ensureLoanExists('507f1f77bcf86cd799439099')).rejects.toThrow(
      'Không tìm thấy khoản vay với ID: 507f1f77bcf86cd799439099'
    );
  });

  it('2. create gọi repo.create khi dữ liệu hợp lệ', async () => {
    vi.spyOn(prisma.loan, 'findUnique').mockResolvedValueOnce({
      id: validLoanId,
      isDeleted: false,
    } as any);

    vi.spyOn(prisma.collateral, 'findFirst').mockResolvedValueOnce(null);

    const dto = {
      valuationType: ValuationType.THEO_NGHI_DINH_QUY,
      valuationDate: '2026-06-01',
      sheetNumber: '01',
      plotNumber: '005',
      area: 200,
      pricePerSqMeter: 1000000,
    };

    mockRepo.create.mockResolvedValueOnce({ id: '507f1f77bcf86cd799439022', ...dto, totalPrice: 200000000 });

    const result = await service.create(validLoanId, dto);
    expect(mockRepo.create).toHaveBeenCalledWith(validLoanId, dto);
    expect(result.id).toBe('507f1f77bcf86cd799439022');
  });

  it('3. create ném lỗi khi collateralId không thuộc khoản vay', async () => {
    vi.spyOn(prisma.loan, 'findUnique').mockResolvedValueOnce({
      id: validLoanId,
      isDeleted: false,
    } as any);

    vi.spyOn(prisma.collateral, 'findUnique').mockResolvedValueOnce({
      id: validCollateralId,
      loanId: '507f1f77bcf86cd799439099',
    } as any);

    const dto = {
      collateralId: validCollateralId,
      valuationType: ValuationType.THEO_GIA_THI_TRUONG,
      sheetNumber: '02',
      plotNumber: '010',
      area: 300,
      pricePerSqMeter: 2000000,
    };

    await expect(service.create(validLoanId, dto)).rejects.toThrow(
      'Tài sản liên kết không thuộc khoản vay hiện tại'
    );
  });
});
