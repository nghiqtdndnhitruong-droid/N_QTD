import { InterestRateRepository, interestRateRepository } from './interest-rate.repository';
import { CreateInterestRateConfigDto, InterestRateFilterQuery } from './interest-rate.types';
import { LoanTermType } from '@prisma/client';
import { AppError } from '../../shared/errors/app-error';
import { ErrorCode } from '../../shared/errors/error-codes';
import { createPaginationMeta, parsePagination } from '../../shared/utils/pagination.util';

export class InterestRateService {
  constructor(private readonly repo: InterestRateRepository = interestRateRepository) {}

  async create(dto: CreateInterestRateConfigDto) {
    return this.repo.create(dto);
  }

  async getById(id: string) {
    const config = await this.repo.findById(id);
    if (!config) {
      throw AppError.notFound(`Không tìm thấy cấu hình lãi suất với ID: ${id}`, ErrorCode.INTEREST_RATE_CONFIG_NOT_FOUND);
    }
    return config;
  }

  async findMany(query: InterestRateFilterQuery) {
    const { configs, total } = await this.repo.findMany(query);
    const { page, limit } = parsePagination(query);
    const pagination = createPaginationMeta(total, page, limit);

    return {
      configs,
      pagination,
    };
  }

  /**
   * Tra cứu mức lãi suất năm (%) áp dụng cho khoản vay
   */
  async determineInterestRate(
    termType: LoanTermType,
    loanAmount: number,
    asOfDate: Date = new Date()
  ): Promise<number> {
    const config = await this.repo.findEffectiveRateConfig(termType, asOfDate);

    if (!config) {
      throw AppError.badRequest(
        `Chưa có bảng lãi suất áp dụng cho kỳ hạn ${termType} tại ngày ${asOfDate.toISOString().slice(0, 10)}`,
        ErrorCode.LOAN_INTEREST_RATE_NOT_FOUND
      );
    }

    // Tìm bậc lãi suất tương ứng
    const tier = config.tiers.find(
      (t) => loanAmount >= t.minAmount && loanAmount <= t.maxAmount
    );

    if (!tier) {
      throw AppError.badRequest(
        `Không tìm thấy mức lãi suất phù hợp cho số tiền vay ${loanAmount.toLocaleString('vi-VN')} VNĐ trong bảng lãi suất hiện hành`,
        ErrorCode.LOAN_INTEREST_RATE_NOT_FOUND
      );
    }

    return tier.annualRate;
  }

  async getCurrentEffectiveConfig(termType: LoanTermType) {
    const config = await this.repo.findEffectiveRateConfig(termType, new Date());
    if (!config) {
      throw AppError.notFound(
        `Hiện tại chưa có bảng lãi suất nào đang có hiệu lực cho kỳ hạn ${termType}`,
        ErrorCode.INTEREST_RATE_CONFIG_NOT_FOUND
      );
    }
    return config;
  }
}

export const interestRateService = new InterestRateService();

