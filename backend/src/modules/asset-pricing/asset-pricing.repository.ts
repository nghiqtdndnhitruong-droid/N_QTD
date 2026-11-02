import { prisma } from '../../config/database';
import { AssetPricingRule, Prisma } from '@prisma/client';
import { CreateAssetPricingRuleDto, AssetPricingFilterQuery, UpdateAssetPricingRuleDto } from './asset-pricing.types';
import { parsePagination } from '../../shared/utils/pagination.util';

export class AssetPricingRepository {
  async findById(id: string): Promise<AssetPricingRule | null> {
    return prisma.assetPricingRule.findUnique({
      where: { id },
    });
  }

  async findEffectiveRuleByCategory(
    landCategory: string,
    asOfDate: Date = new Date()
  ): Promise<AssetPricingRule | null> {
    return prisma.assetPricingRule.findFirst({
      where: {
        landCategory,
        isActive: true,
        effectiveDate: {
          lte: asOfDate,
        },
      },
      orderBy: {
        effectiveDate: 'desc',
      },
    });
  }

  async findMany(query: AssetPricingFilterQuery): Promise<{ rules: AssetPricingRule[]; total: number }> {
    const { page, limit, skip, sortBy, sortOrder } = parsePagination(query);

    const where: Prisma.AssetPricingRuleWhereInput = {};

    if (query.landCategory) {
      where.landCategory = { contains: query.landCategory, mode: 'insensitive' };
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    const [rules, total] = await Promise.all([
      prisma.assetPricingRule.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.assetPricingRule.count({ where }),
    ]);

    return { rules, total };
  }

  async create(data: CreateAssetPricingRuleDto): Promise<AssetPricingRule> {
    return prisma.assetPricingRule.create({
      data: {
        landCategory: data.landCategory,
        pricePerSqMeter: data.pricePerSqMeter,
        effectiveDate: new Date(data.effectiveDate),
        isActive: data.isActive ?? true,
        note: data.note,
      },
    });
  }

  async update(id: string, data: UpdateAssetPricingRuleDto): Promise<AssetPricingRule> {
    const updateData: Prisma.AssetPricingRuleUpdateInput = {};

    if (data.landCategory !== undefined) updateData.landCategory = data.landCategory;
    if (data.pricePerSqMeter !== undefined) updateData.pricePerSqMeter = data.pricePerSqMeter;
    if (data.effectiveDate !== undefined) updateData.effectiveDate = new Date(data.effectiveDate);
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.note !== undefined) updateData.note = data.note;

    return prisma.assetPricingRule.update({
      where: { id },
      data: updateData,
    });
  }
}

export const assetPricingRepository = new AssetPricingRepository();

