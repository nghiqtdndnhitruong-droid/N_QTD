import { AssetPricingRepository, assetPricingRepository } from './asset-pricing.repository';
import {
  AssetPricingFilterQuery,
  CreateAssetPricingRuleDto,
  UpdateAssetPricingRuleDto,
} from './asset-pricing.types';
import { AppError } from '../../shared/errors/app-error';
import { ErrorCode } from '../../shared/errors/error-codes';
import { createPaginationMeta, parsePagination } from '../../shared/utils/pagination.util';
import {
  calculateFlooredValuationAmount,
  resolveEffectiveCollateralArea,
} from '../../shared/utils/identity-document.util';

export class AssetPricingService {
  constructor(private readonly repo: AssetPricingRepository = assetPricingRepository) {}

  async create(dto: CreateAssetPricingRuleDto) {
    return this.repo.create(dto);
  }

  async getById(id: string) {
    const rule = await this.repo.findById(id);
    if (!rule) {
      throw AppError.notFound(
        `Không tìm thấy quy định giá tài sản với ID: ${id}`,
        ErrorCode.ASSET_PRICING_RULE_NOT_FOUND
      );
    }
    return rule;
  }

  async findMany(query: AssetPricingFilterQuery) {
    const { rules, total } = await this.repo.findMany(query);
    const { page, limit } = parsePagination(query);
    const pagination = createPaginationMeta(total, page, limit);
    return {
      rules,
      pagination,
    };
  }

  async update(id: string, dto: UpdateAssetPricingRuleDto) {
    await this.getById(id);
    return this.repo.update(id, dto);
  }

  async delete(id: string) {
    await this.getById(id);
    return this.repo.delete(id);
  }

  async reorder(ruleIds: string[]) {
    if (!Array.isArray(ruleIds) || ruleIds.length === 0) {
      throw AppError.badRequest('Danh sách ID quy định giá đất không hợp lệ');
    }
    await this.repo.reorder(ruleIds);
    return {
      success: true,
      message: 'Cập nhật thứ tự sắp xếp bảng giá tài sản thành công',
    };
  }

  /**
   * Tự động tính giá trị định giá theo Bảng giá Quỹ dựa trên loại đất và diện tích (ưu tiên diện tích thực nếu có).
   * Làm tròn xuống số nguyên đồng (Math.floor).
   */
  async calculateValuationByFundPricing(
    landCategory: string,
    area: number,
    actualArea?: number | null
  ) {
    const rule = await this.repo.findEffectiveRuleByCategory(landCategory);
    if (!rule) {
      throw AppError.notFound(
        `Chưa có cấu hình bảng giá đất đang hoạt động cho loại: "${landCategory}"`,
        ErrorCode.ASSET_PRICING_RULE_NOT_FOUND
      );
    }

    const { effectiveArea, areaSource } = resolveEffectiveCollateralArea(area, actualArea);
    const valuationAmount = calculateFlooredValuationAmount(
      effectiveArea,
      rule.pricePerSqMeter
    );

    return {
      landCategory: rule.landCategory,
      pricePerSqMeter: rule.pricePerSqMeter,
      area,
      actualArea: actualArea !== undefined && actualArea !== null && actualArea > 0 ? actualArea : null,
      effectiveArea,
      areaSource,
      valuationAmount,
      effectiveDate: rule.effectiveDate,
    };
  }
}

export const assetPricingService = new AssetPricingService();
