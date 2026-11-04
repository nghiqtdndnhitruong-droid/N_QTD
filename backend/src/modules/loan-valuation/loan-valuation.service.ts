import { LoanValuationRepository, loanValuationRepository } from './loan-valuation.repository';
import { CreateLoanValuationDto, UpdateLoanValuationDto } from './loan-valuation.types';
import { prisma } from '../../config/database';
import { AppError } from '../../shared/errors/app-error';
import { ErrorCode } from '../../shared/errors/error-codes';

export class LoanValuationService {
  constructor(private readonly repo: LoanValuationRepository = loanValuationRepository) {}

  async ensureLoanExists(loanId: string) {
    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
    });

    if (!loan || loan.isDeleted) {
      throw AppError.notFound(`Không tìm thấy khoản vay với ID: ${loanId}`, ErrorCode.LOAN_NOT_FOUND);
    }

    return loan;
  }

  async findByLoanId(loanId: string) {
    await this.ensureLoanExists(loanId);
    return this.repo.findByLoanId(loanId);
  }

  async getById(loanId: string, id: string) {
    await this.ensureLoanExists(loanId);
    const valuation = await this.repo.findById(id);
    if (!valuation || valuation.loanId !== loanId) {
      throw AppError.notFound(`Không tìm thấy bản ghi định giá với ID: ${id}`, ErrorCode.VALUATION_NOT_FOUND);
    }
    return valuation;
  }

  async create(loanId: string, dto: CreateLoanValuationDto) {
    await this.ensureLoanExists(loanId);

    // Nếu có collateralId thì kiểm tra tài sản có thuộc khoản vay không
    if (dto.collateralId) {
      const collateral = await prisma.collateral.findUnique({
        where: { id: dto.collateralId },
      });
      if (!collateral || collateral.loanId !== loanId) {
        throw AppError.badRequest(
          `Tài sản liên kết không thuộc khoản vay hiện tại`,
          ErrorCode.COLLATERAL_NOT_FOUND
        );
      }
    }

    return this.repo.create(loanId, dto);
  }

  async update(loanId: string, id: string, dto: UpdateLoanValuationDto) {
    await this.getById(loanId, id);

    if (dto.collateralId) {
      const collateral = await prisma.collateral.findUnique({
        where: { id: dto.collateralId },
      });
      if (!collateral || collateral.loanId !== loanId) {
        throw AppError.badRequest(
          `Tài sản liên kết không thuộc khoản vay hiện tại`,
          ErrorCode.COLLATERAL_NOT_FOUND
        );
      }
    }

    return this.repo.update(id, dto);
  }

  async delete(loanId: string, id: string) {
    await this.getById(loanId, id);
    return this.repo.delete(id);
  }
}

export const loanValuationService = new LoanValuationService();

