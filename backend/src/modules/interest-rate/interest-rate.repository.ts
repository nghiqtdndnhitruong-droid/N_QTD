import { prisma } from '../../config/database';
import { InterestRateConfig, LoanTermType, Prisma } from '@prisma/client';
import { CreateInterestRateConfigDto, InterestRateFilterQuery } from './interest-rate.types';
import { parsePagination } from '../../shared/utils/pagination.util';

export class InterestRateRepository {
  async findById(id: string): Promise<InterestRateConfig | null> {
    return prisma.interestRateConfig.findUnique({
      where: { id },
    });
  }

  /**
   * Tìm bảng lãi suất hiệu lực mới nhất theo kỳ hạn tại ngày chỉ định
   */
  async findEffectiveRateConfig(
    termType: LoanTermType,
    asOfDate: Date = new Date()
  ): Promise<InterestRateConfig | null> {
    return prisma.interestRateConfig.findFirst({
      where: {
        termType,
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

  async findMany(query: InterestRateFilterQuery): Promise<{ configs: InterestRateConfig[]; total: number }> {
    const { page, limit, skip, sortBy, sortOrder } = parsePagination(query);

    const where: Prisma.InterestRateConfigWhereInput = {};

    if (query.termType) {
      where.termType = query.termType;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    const [configs, total] = await Promise.all([
      prisma.interestRateConfig.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.interestRateConfig.count({ where }),
    ]);

    return { configs, total };
  }

  async create(data: CreateInterestRateConfigDto): Promise<InterestRateConfig> {
    return prisma.interestRateConfig.create({
      data: {
        effectiveDate: new Date(data.effectiveDate),
        termType: data.termType,
        tiers: data.tiers,
        isActive: data.isActive ?? true,
        note: data.note,
      },
    });
  }

  async deactivateOlderConfigs(termType: LoanTermType, beforeDate: Date): Promise<void> {
    await prisma.interestRateConfig.updateMany({
      where: {
        termType,
        effectiveDate: {
          lt: beforeDate,
        },
      },
      data: {
        isActive: false,
      },
    });
  }
}

export const interestRateRepository = new InterestRateRepository();

