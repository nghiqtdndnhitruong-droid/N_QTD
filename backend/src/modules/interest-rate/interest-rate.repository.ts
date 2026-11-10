import { prisma } from '../../config/database';
import { InterestRateConfig, LoanTermType, LoanType, Prisma } from '@prisma/client';
import {
  CreateInterestRateConfigDto,
  InterestRateFilterQuery,
  UpdateInterestRateConfigDto,
} from './interest-rate.types';
import { parsePagination } from '../../shared/utils/pagination.util';

export class InterestRateRepository {
  async findById(id: string): Promise<InterestRateConfig | null> {
    return prisma.interestRateConfig.findUnique({
      where: { id },
    });
  }

  /**
   * Tìm bảng lãi suất hiệu lực mới nhất theo thể loại vay và kỳ hạn tại ngày chỉ định
   */
  async findEffectiveRateConfig(
    loanType: LoanType = LoanType.THE_CHAP,
    termType?: LoanTermType | null,
    asOfDate: Date = new Date()
  ): Promise<InterestRateConfig | null> {
    if (loanType === LoanType.TIN_CHAP) {
      return prisma.interestRateConfig.findFirst({
        where: {
          loanType: LoanType.TIN_CHAP,
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

    return prisma.interestRateConfig.findFirst({
      where: {
        OR: [{ loanType: LoanType.THE_CHAP }, { loanType: null }],
        ...(termType ? { termType } : {}),
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

    if (query.loanType === LoanType.THE_CHAP) {
      where.OR = [{ loanType: LoanType.THE_CHAP }, { loanType: null }];
    } else if (query.loanType) {
      where.loanType = query.loanType;
    }

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
    const loanType = data.loanType ?? LoanType.THE_CHAP;
    return prisma.interestRateConfig.create({
      data: {
        loanType,
        termType: loanType === LoanType.TIN_CHAP ? null : data.termType,
        effectiveDate: new Date(data.effectiveDate),
        tiers: data.tiers,
        isActive: data.isActive ?? true,
        note: data.note,
      },
    });
  }

  async update(id: string, data: UpdateInterestRateConfigDto): Promise<InterestRateConfig> {
    const updateData: Prisma.InterestRateConfigUpdateInput = {};

    if (data.loanType !== undefined) {
      updateData.loanType = data.loanType;
    }
    if (data.termType !== undefined) {
      updateData.termType = data.termType;
    }
    if (data.effectiveDate !== undefined) {
      updateData.effectiveDate = new Date(data.effectiveDate);
    }
    if (data.tiers !== undefined) {
      updateData.tiers = data.tiers;
    }
    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
    }
    if (data.note !== undefined) {
      updateData.note = data.note;
    }

    return prisma.interestRateConfig.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(id: string): Promise<InterestRateConfig> {
    return prisma.interestRateConfig.delete({
      where: { id },
    });
  }

  async deactivateOlderConfigs(
    termType: LoanTermType | null,
    beforeDate: Date,
    loanType: LoanType = LoanType.THE_CHAP
  ): Promise<void> {
    await prisma.interestRateConfig.updateMany({
      where: {
        ...(loanType === LoanType.THE_CHAP
          ? { OR: [{ loanType: LoanType.THE_CHAP }, { loanType: null }] }
          : { loanType: LoanType.TIN_CHAP }),
        ...(termType ? { termType } : {}),
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

