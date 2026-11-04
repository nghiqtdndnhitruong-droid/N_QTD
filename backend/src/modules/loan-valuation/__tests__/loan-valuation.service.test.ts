import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoanValuationService } from '../loan-valuation.service';
import { ValuationType } from '@prisma/client';
import { prisma } from '../../../config/database';

describe('LoanValuationService', () => {
  let service: LoanValuationService;
  let mockRepo: any;

  beforeEach(() => {
    mockRepo = {
      findByLoanId: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    service = new LoanValuationService(mockRepo);
  });

  it('1. ensureLoanExists ném lỗi khi không tìm thấy khoản vay', async () => {
    vi.spyOn(prisma.loan, 'findUnique').mockResolvedValueOnce(null);

    await expect(service.ensureLoanExists('invalid-loan-id')).rejects.toThrow(
      'Không tìm thấy khoản vay với ID: invalid-loan-id'
    );
  });

  it('2. create gọi repo.create khi dữ liệu hợp lệ', async () => {
    vi.spyOn(prisma.loan, 'findUnique').mockResolvedValueOnce({
      id: 'loan-1',
      isDeleted: false,
    } as any);

    const dto = {
      valuationType: ValuationType.THEO_NGHI_DINH_QUY,
      valuationDate: '2026-06-01',
      sheetNumber: '01',
      plotNumber: '005',
      area: 200,
      pricePerSqMeter: 1000000,
    };

    mockRepo.create.mockResolvedValueOnce({ id: 'val-1', ...dto, totalPrice: 200000000 });

    const result = await service.create('loan-1', dto);
    expect(mockRepo.create).toHaveBeenCalledWith('loan-1', dto);
    expect(result.id).toBe('val-1');
  });

  it('3. create ném lỗi khi collateralId không thuộc khoản vay', async () => {
    vi.spyOn(prisma.loan, 'findUnique').mockResolvedValueOnce({
      id: 'loan-1',
      isDeleted: false,
    } as any);

    vi.spyOn(prisma.collateral, 'findUnique').mockResolvedValueOnce({
      id: 'col-other',
      loanId: 'other-loan',
    } as any);

    const dto = {
      collateralId: 'col-other',
      valuationType: ValuationType.THEO_GIA_THI_TRUONG,
      sheetNumber: '02',
      plotNumber: '010',
      area: 300,
      pricePerSqMeter: 2000000,
    };

    await expect(service.create('loan-1', dto)).rejects.toThrow(
      'Tài sản liên kết không thuộc khoản vay hiện tại'
    );
  });
});

