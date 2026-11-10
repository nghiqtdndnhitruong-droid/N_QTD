import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InterestRateService } from '../interest-rate.service';
import { LoanTermType, LoanType } from '@prisma/client';

describe('InterestRateService - Tín chấp & Thế chấp', () => {
  let service: InterestRateService;
  let mockRepo: any;

  beforeEach(() => {
    mockRepo = {
      findById: vi.fn(),
      findEffectiveRateConfig: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    service = new InterestRateService(mockRepo);
  });

  it('1. Cho vay Tín chấp: luôn trả về 1 mốc lãi suất duy nhất cho mọi kỳ hạn (ngắn hạn / trung hạn) và mọi số tiền', async () => {
    mockRepo.findEffectiveRateConfig.mockResolvedValue({
      id: 'cfg_tin_chap_1',
      loanType: LoanType.TIN_CHAP,
      termType: null,
      effectiveDate: new Date('2026-01-01'),
      tiers: [
        { minAmount: 0, maxAmount: 999999999999, annualRate: 13.5 },
      ],
      isActive: true,
    });

    // Khoản vay ngắn hạn 50 triệu
    const rate1 = await service.determineInterestRate(
      LoanType.TIN_CHAP,
      LoanTermType.NGAN_HAN,
      50_000_000
    );
    expect(rate1).toBe(13.5);

    // Khoản vay trung hạn 200 triệu
    const rate2 = await service.determineInterestRate(
      LoanType.TIN_CHAP,
      LoanTermType.TRUNG_HAN,
      200_000_000
    );
    expect(rate2).toBe(13.5);

    expect(mockRepo.findEffectiveRateConfig).toHaveBeenCalledWith(
      LoanType.TIN_CHAP,
      null,
      expect.any(Date)
    );
  });

  it('2. Cho vay Thế chấp: phân loại theo kỳ hạn và số tiền vay theo các bậc', async () => {
    mockRepo.findEffectiveRateConfig.mockResolvedValue({
      id: 'cfg_the_chap_short',
      loanType: LoanType.THE_CHAP,
      termType: LoanTermType.NGAN_HAN,
      effectiveDate: new Date('2026-01-01'),
      tiers: [
        { minAmount: 0, maxAmount: 100_000_000, annualRate: 9.6 },
        { minAmount: 100_000_001, maxAmount: 500_000_000, annualRate: 10.2 },
      ],
      isActive: true,
    });

    const rate = await service.determineInterestRate(
      LoanType.THE_CHAP,
      LoanTermType.NGAN_HAN,
      250_000_000
    );
    expect(rate).toBe(10.2);
  });

  it('3. Cho phép chỉnh sửa (update) mốc lãi suất', async () => {
    mockRepo.findById.mockResolvedValue({ id: 'cfg_1', note: 'Cũ' });
    mockRepo.update.mockResolvedValue({ id: 'cfg_1', note: 'Mới' });

    const result = await service.update('cfg_1', { note: 'Mới' });
    expect(mockRepo.findById).toHaveBeenCalledWith('cfg_1');
    expect(mockRepo.update).toHaveBeenCalledWith('cfg_1', { note: 'Mới' });
    expect(result.note).toBe('Mới');
  });

  it('4. Cho phép xóa (delete) mốc lãi suất', async () => {
    mockRepo.findById.mockResolvedValue({ id: 'cfg_1' });
    mockRepo.delete.mockResolvedValue({ id: 'cfg_1' });

    const result = await service.delete('cfg_1');
    expect(mockRepo.findById).toHaveBeenCalledWith('cfg_1');
    expect(mockRepo.delete).toHaveBeenCalledWith('cfg_1');
    expect(result.id).toBe('cfg_1');
  });
});

