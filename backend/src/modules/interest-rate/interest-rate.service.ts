import { InterestRateRepository, interestRateRepository } from './interest-rate.repository';
import {
  CreateInterestRateConfigDto,
  InterestRateFilterQuery,
  UpdateInterestRateConfigDto,
} from './interest-rate.types';
import { LoanStatus, LoanTermType, LoanType, Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../shared/errors/app-error';
import { ErrorCode } from '../../shared/errors/error-codes';
import { createPaginationMeta, parsePagination } from '../../shared/utils/pagination.util';

export class InterestRateService {
  constructor(private readonly repo: InterestRateRepository = interestRateRepository) {}

  async create(dto: CreateInterestRateConfigDto) {
    const created = await this.repo.create(dto);
    await this.syncDraftLoansInterestRate();
    return created;
  }

  async update(id: string, dto: UpdateInterestRateConfigDto) {
    await this.getById(id);
    const updated = await this.repo.update(id, dto);
    await this.syncDraftLoansInterestRate();
    return updated;
  }

  async delete(id: string) {
    await this.getById(id);
    const deleted = await this.repo.delete(id);
    await this.syncDraftLoansInterestRate();
    return deleted;
  }

  /**
   * Tự động đồng bộ lãi suất mới nhất và cập nhật khoản mục trả lãi trong Phương án vay
   * cho toàn bộ các khoản vay đang ở trạng thái DANG_TAO (Lưu nháp).
   */
  async syncDraftLoansInterestRate(): Promise<void> {
    try {
      const draftLoans = await prisma.loan.findMany({
        where: {
          status: LoanStatus.DANG_TAO,
          isDeleted: { not: true },
        },
      });

      for (const loan of draftLoans) {
        try {
          const effectiveDate = loan.contractDate
            ? new Date(loan.contractDate)
            : loan.loanStartDate || new Date();
          const newRate = await this.determineInterestRate(
            loan.loanType,
            loan.termType,
            loan.loanAmount,
            effectiveDate
          );

          if (newRate !== loan.interestRate) {
            const updatePayload: Prisma.LoanUpdateInput = {
              interestRate: newRate,
            };

            // Đồng bộ lại khoản mục chi phí trả lãi trong phương án vay (nếu có)
            if (loan.loanPlan && loan.loanPlan.expenses) {
              const termFactor = loan.termType === LoanTermType.TRUNG_HAN ? 2 : 1;
              const interestExpense = Math.round(
                loan.loanAmount * (newRate / 100) * termFactor
              );
              let hasInterestItem = false;

              const updatedExpenses = loan.loanPlan.expenses.map((ex) => {
                if (/Chi phí trả lãi|Trả lãi tiền vay/i.test(ex.name)) {
                  hasInterestItem = true;
                  return {
                    name: `Chi phí trả lãi tiền vay (${loan.loanAmount.toLocaleString('vi-VN')} đ × ${newRate}% × ${termFactor} năm)`,
                    amount: interestExpense,
                  };
                }
                return ex;
              });

              if (hasInterestItem) {
                const totalExpenses = updatedExpenses.reduce((sum, item) => sum + item.amount, 0);
                const totalRevenues = loan.loanPlan.revenues.reduce((sum, item) => sum + item.amount, 0);
                updatePayload.loanPlan = {
                  ...loan.loanPlan,
                  expenses: updatedExpenses,
                  totalExpenses,
                  profit: totalRevenues - totalExpenses,
                };
              }
            }

            await prisma.loan.update({
              where: { id: loan.id },
              data: updatePayload,
            });
          }
        } catch {
          // Bỏ qua lỗi từng khoản vay nếu chưa có cấu hình tương ứng
        }
      }
    } catch {
      // Bỏ qua nếu lỗi kết nối nền
    }
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
   * Tra cứu mức lãi suất năm (%) áp dụng cho khoản vay.
   * Hỗ trợ cả 2 chữ ký hàm:
   * 1. determineInterestRate(loanType, termType, loanAmount, asOfDate)
   * 2. determineInterestRate(termType, loanAmount, asOfDate) (Tương thích ngược)
   */
  async determineInterestRate(
    loanTypeOrTermType: LoanType | LoanTermType,
    termTypeOrLoanAmount?: LoanTermType | number,
    loanAmountOrAsOfDate?: number | Date,
    asOfDateParam: Date = new Date()
  ): Promise<number> {
    let loanType: LoanType = LoanType.THE_CHAP;
    let termType: LoanTermType = LoanTermType.NGAN_HAN;
    let loanAmount = 0;
    let asOfDate = asOfDateParam;

    if (
      loanTypeOrTermType === LoanType.THE_CHAP ||
      loanTypeOrTermType === LoanType.TIN_CHAP
    ) {
      loanType = loanTypeOrTermType;
      termType = (termTypeOrLoanAmount as LoanTermType) || LoanTermType.NGAN_HAN;
      loanAmount = typeof loanAmountOrAsOfDate === 'number' ? loanAmountOrAsOfDate : 0;
      asOfDate = asOfDateParam instanceof Date ? asOfDateParam : new Date();
    } else {
      // Legacy call: termType, loanAmount, asOfDate
      loanType = LoanType.THE_CHAP;
      termType = loanTypeOrTermType as LoanTermType;
      loanAmount = typeof termTypeOrLoanAmount === 'number' ? termTypeOrLoanAmount : 0;
      asOfDate = loanAmountOrAsOfDate instanceof Date ? loanAmountOrAsOfDate : new Date();
    }

    const config = await this.repo.findEffectiveRateConfig(
      loanType,
      loanType === LoanType.TIN_CHAP ? null : termType,
      asOfDate
    );

    if (!config) {
      if (loanType === LoanType.TIN_CHAP) {
        throw AppError.badRequest(
          `Chưa có bảng lãi suất áp dụng cho khoản vay tín chấp tại ngày ${asOfDate.toISOString().slice(0, 10)}`,
          ErrorCode.LOAN_INTEREST_RATE_NOT_FOUND
        );
      }
      throw AppError.badRequest(
        `Chưa có bảng lãi suất áp dụng cho kỳ hạn ${termType} (Thế chấp) tại ngày ${asOfDate.toISOString().slice(0, 10)}`,
        ErrorCode.LOAN_INTEREST_RATE_NOT_FOUND
      );
    }

    // Khoản vay Tín chấp: chỉ có 1 mốc lãi suất duy nhất cho toàn bộ các khoản vay tín chấp
    if (loanType === LoanType.TIN_CHAP) {
      if (!config.tiers || config.tiers.length === 0) {
        throw AppError.badRequest(
          'Bảng lãi suất tín chấp hiện hành chưa được cấu hình mức lãi suất',
          ErrorCode.LOAN_INTEREST_RATE_NOT_FOUND
        );
      }
      return config.tiers[0].annualRate;
    }

    // Khoản vay Thế chấp: Tìm bậc lãi suất tương ứng theo số tiền vay
    const tier = config.tiers.find(
      (t) => loanAmount >= t.minAmount && loanAmount <= t.maxAmount
    );

    if (!tier) {
      throw AppError.badRequest(
        `Không tìm thấy mức lãi suất phù hợp cho số tiền vay ${loanAmount.toLocaleString('vi-VN')} VNĐ trong bảng lãi suất thế chấp hiện hành`,
        ErrorCode.LOAN_INTEREST_RATE_NOT_FOUND
      );
    }

    return tier.annualRate;
  }

  async getCurrentEffectiveConfig(
    options: { loanType?: LoanType; termType?: LoanTermType | null } | LoanTermType
  ) {
    let loanType: LoanType = LoanType.THE_CHAP;
    let termType: LoanTermType | null = null;

    if (typeof options === 'string') {
      loanType = LoanType.THE_CHAP;
      termType = options;
    } else if (options) {
      loanType = options.loanType ?? LoanType.THE_CHAP;
      termType = loanType === LoanType.TIN_CHAP ? null : options.termType ?? null;
    }

    const config = await this.repo.findEffectiveRateConfig(loanType, termType, new Date());
    if (!config) {
      if (loanType === LoanType.TIN_CHAP) {
        throw AppError.notFound(
          'Hiện tại chưa có bảng lãi suất nào đang có hiệu lực cho loại vay Tín chấp',
          ErrorCode.INTEREST_RATE_CONFIG_NOT_FOUND
        );
      }
      throw AppError.notFound(
        `Hiện tại chưa có bảng lãi suất nào đang có hiệu lực cho kỳ hạn ${termType ?? ''} (Thế chấp)`,
        ErrorCode.INTEREST_RATE_CONFIG_NOT_FOUND
      );
    }
    return config;
  }
}

export const interestRateService = new InterestRateService();

