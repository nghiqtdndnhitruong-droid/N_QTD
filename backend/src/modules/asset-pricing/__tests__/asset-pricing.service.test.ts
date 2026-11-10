import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AssetPricingService } from '../asset-pricing.service';
import { AssetPricingRepository } from '../asset-pricing.repository';
import { prisma } from '../../../config/database';

describe('AssetPricingService & Repository', () => {
  let service: AssetPricingService;
  let repo: AssetPricingRepository;

  beforeEach(() => {
    vi.restoreAllMocks();
    repo = new AssetPricingRepository();
    service = new AssetPricingService(repo);
  });

  it('1. reorder cập nhật thứ tự các bảng giá theo danh sách ID truyền vào', async () => {
    const transactionSpy = vi.spyOn(prisma, '$transaction').mockResolvedValue([] as any);
    const updateSpy = vi.spyOn(prisma.assetPricingRule, 'update').mockImplementation((args: any) => args as any);

    const ruleIds = ['rule-1', 'rule-2', 'rule-3'];
    const result = await service.reorder(ruleIds);

    expect(result.success).toBe(true);
    expect(transactionSpy).toHaveBeenCalled();
    expect(updateSpy).toHaveBeenCalledTimes(3);
    expect(updateSpy).toHaveBeenNthCalledWith(1, {
      where: { id: 'rule-1' },
      data: { sortOrder: 1 },
    });
    expect(updateSpy).toHaveBeenNthCalledWith(2, {
      where: { id: 'rule-2' },
      data: { sortOrder: 2 },
    });
    expect(updateSpy).toHaveBeenNthCalledWith(3, {
      where: { id: 'rule-3' },
      data: { sortOrder: 3 },
    });
  });

  it('2. findMany sắp xếp theo sortOrder: asc và createdAt: asc mặc định', async () => {
    const findManySpy = vi.spyOn(prisma.assetPricingRule, 'findMany').mockResolvedValue([
      { id: 'rule-1', landCategory: 'Cập kênh', sortOrder: 1 } as any,
      { id: 'rule-2', landCategory: 'Cập đường lộ', sortOrder: 2 } as any,
    ]);
    vi.spyOn(prisma.assetPricingRule, 'count').mockResolvedValue(2);

    const result = await service.findMany({ page: 1, limit: 10 });

    expect(findManySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      })
    );
    expect(result.rules).toHaveLength(2);
    expect(result.rules[0].landCategory).toBe('Cập kênh');
  });

  it('3. delete xóa quy định đơn giá đất thành công', async () => {
    vi.spyOn(prisma.assetPricingRule, 'findUnique').mockResolvedValue({
      id: 'rule-1',
      landCategory: 'Cập kênh',
      pricePerSqMeter: 80000,
    } as any);

    const deleteSpy = vi.spyOn(prisma.assetPricingRule, 'delete').mockResolvedValue({
      id: 'rule-1',
      landCategory: 'Cập kênh',
      pricePerSqMeter: 80000,
    } as any);

    const result = await service.delete('rule-1');

    expect(deleteSpy).toHaveBeenCalledWith({
      where: { id: 'rule-1' },
    });
    expect(result.id).toBe('rule-1');
  });
});

