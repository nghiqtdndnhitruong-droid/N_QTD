import { LoanValuationRepository, loanValuationRepository } from './loan-valuation.repository';
import { CreateLoanValuationDto, UpdateLoanValuationDto } from './loan-valuation.types';
import { prisma } from '../../config/database';
import { AppError } from '../../shared/errors/app-error';
import { ErrorCode } from '../../shared/errors/error-codes';

const isValidObjectId = (id: string): boolean => Boolean(id && /^[0-9a-fA-F]{24}$/.test(id));

export class LoanValuationService {
  constructor(private readonly repo: LoanValuationRepository = loanValuationRepository) {}

  async ensureLoanExists(loanId: string) {
    if (!isValidObjectId(loanId)) {
      throw AppError.notFound(`Không tìm thấy khoản vay với ID: ${loanId}`, ErrorCode.LOAN_NOT_FOUND);
    }
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
    if (!isValidObjectId(id)) {
      throw AppError.notFound(`Không tìm thấy bản ghi định giá với ID: ${id}`, ErrorCode.VALUATION_NOT_FOUND);
    }
    const valuation = await this.repo.findById(id);
    if (!valuation || valuation.loanId !== loanId) {
      throw AppError.notFound(`Không tìm thấy bản ghi định giá với ID: ${id}`, ErrorCode.VALUATION_NOT_FOUND);
    }
    return valuation;
  }

  async syncCollateralsValuation(loanId: string) {
    if (!isValidObjectId(loanId)) return;
    const collaterals = await prisma.collateral.findMany({ where: { loanId } });
    if (collaterals.length === 0) return;

    const valuations = await prisma.loanValuation.findMany({ where: { loanId } });

    // 1. Tự động liên kết các valuation chưa có collateralId
    for (const v of valuations) {
      if (!v.collateralId) {
        let matched = collaterals.find(
          (c) =>
            String(c.sheetNumber).trim() === String(v.sheetNumber).trim() &&
            String(c.plotNumber).trim() === String(v.plotNumber).trim()
        );
        if (!matched && collaterals.length === 1) {
          matched = collaterals[0];
        }
        if (matched) {
          await prisma.loanValuation.update({
            where: { id: v.id },
            data: { collateralId: matched.id },
          });
          v.collateralId = matched.id;
        }
      }
    }

    // 2. Cập nhật valuationAmount và pricePerSqMeter cho từng collateral
    for (const c of collaterals) {
      const linked = valuations.filter((v) => v.collateralId === c.id);
      const totalAmount = linked.reduce((sum, v) => sum + (Number(v.totalPrice) || 0), 0);
      const latest = linked[linked.length - 1];

      await prisma.collateral.update({
        where: { id: c.id },
        data: {
          valuationAmount: totalAmount,
          ...(latest && {
            pricePerSqMeter: latest.pricePerSqMeter,
            ...(latest.actualArea ? { actualArea: latest.actualArea } : {}),
          }),
        },
      });
    }
  }

  async create(loanId: string, dto: CreateLoanValuationDto) {
    await this.ensureLoanExists(loanId);

    // Tự động tìm collateral liên kết nếu chưa truyền collateralId
    if (!dto.collateralId && isValidObjectId(loanId)) {
      const matchedCollateral = await prisma.collateral.findFirst({
        where: {
          loanId,
          sheetNumber: String(dto.sheetNumber).trim(),
          plotNumber: String(dto.plotNumber).trim(),
        },
      });
      if (matchedCollateral) {
        dto.collateralId = matchedCollateral.id;
      } else {
        const loanCollaterals = await prisma.collateral.findMany({ where: { loanId } });
        if (loanCollaterals.length === 1) {
          dto.collateralId = loanCollaterals[0].id;
        }
      }
    }

    // Nếu có collateralId thì kiểm tra tài sản có thuộc khoản vay không
    if (dto.collateralId) {
      if (!isValidObjectId(dto.collateralId)) {
        throw AppError.badRequest(
          `Tài sản liên kết không thuộc khoản vay hiện tại`,
          ErrorCode.COLLATERAL_NOT_FOUND
        );
      }
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

    const created = await this.repo.create(loanId, dto);
    await this.syncCollateralsValuation(loanId);
    return created;
  }

  async update(loanId: string, id: string, dto: UpdateLoanValuationDto) {
    await this.getById(loanId, id);

    if (dto.collateralId) {
      if (!isValidObjectId(dto.collateralId)) {
        throw AppError.badRequest(
          `Tài sản liên kết không thuộc khoản vay hiện tại`,
          ErrorCode.COLLATERAL_NOT_FOUND
        );
      }
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

    const updated = await this.repo.update(id, dto);
    await this.syncCollateralsValuation(loanId);
    return updated;
  }

  async delete(loanId: string, id: string) {
    await this.getById(loanId, id);
    const deleted = await this.repo.delete(id);
    await this.syncCollateralsValuation(loanId);
    return deleted;
  }

  async updateCommonSettings(
    loanId: string,
    data: { valuationType?: any; valuationDate?: string | Date | null }
  ) {
    await this.ensureLoanExists(loanId);
    return this.repo.updateCommonSettings(loanId, data);
  }
}

export const loanValuationService = new LoanValuationService();

