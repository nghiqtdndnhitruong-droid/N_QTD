import { prisma } from '../../config/database';
import { LoanValuation, Prisma } from '@prisma/client';
import { CreateLoanValuationDto, UpdateLoanValuationDto } from './loan-valuation.types';

export class LoanValuationRepository {
  async findByLoanId(loanId: string): Promise<LoanValuation[]> {
    return prisma.loanValuation.findMany({
      where: { loanId },
      include: {
        collateral: {
          select: {
            id: true,
            assetCode: true,
            certificateNumber: true,
            sheetNumber: true,
            plotNumber: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findById(id: string): Promise<LoanValuation | null> {
    return prisma.loanValuation.findUnique({
      where: { id },
      include: {
        collateral: true,
      },
    });
  }

  async create(loanId: string, data: CreateLoanValuationDto): Promise<LoanValuation> {
    // Tự động tính totalPrice nếu không truyền
    const effectiveArea = data.actualArea && data.actualArea > 0 ? data.actualArea : data.area;
    const totalPrice =
      typeof data.totalPrice === 'number'
        ? data.totalPrice
        : Math.round(effectiveArea * data.pricePerSqMeter);

    const createInput: Prisma.LoanValuationCreateInput = {
      loan: { connect: { id: loanId } },
      valuationType: data.valuationType,
      valuationDate: data.valuationDate ? new Date(data.valuationDate) : null,
      sheetNumber: String(data.sheetNumber).trim(),
      plotNumber: String(data.plotNumber).trim(),
      area: Number(data.area),
      actualArea: data.actualArea !== undefined && data.actualArea !== null ? Number(data.actualArea) : null,
      pricePerSqMeter: Number(data.pricePerSqMeter),
      totalPrice: Number(totalPrice),
      notes: data.notes ? data.notes.trim() : null,
    };

    if (data.collateralId) {
      createInput.collateral = { connect: { id: data.collateralId } };
    }

    return prisma.loanValuation.create({
      data: createInput,
      include: {
        collateral: true,
      },
    });
  }

  async update(id: string, data: UpdateLoanValuationDto): Promise<LoanValuation> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error('Không tìm thấy bản ghi định giá');
    }

    const area = data.area !== undefined ? Number(data.area) : existing.area;
    const actualArea =
      data.actualArea !== undefined
        ? data.actualArea !== null
          ? Number(data.actualArea)
          : null
        : existing.actualArea;
    const pricePerSqMeter =
      data.pricePerSqMeter !== undefined
        ? Number(data.pricePerSqMeter)
        : existing.pricePerSqMeter;

    let totalPrice = existing.totalPrice;
    if (data.totalPrice !== undefined) {
      totalPrice = Number(data.totalPrice);
    } else if (data.area !== undefined || data.actualArea !== undefined || data.pricePerSqMeter !== undefined) {
      const effectiveArea = actualArea && actualArea > 0 ? actualArea : area;
      totalPrice = Math.round(effectiveArea * pricePerSqMeter);
    }

    const updateInput: Prisma.LoanValuationUpdateInput = {
      ...(data.valuationType && { valuationType: data.valuationType }),
      ...(data.valuationDate !== undefined && {
        valuationDate: data.valuationDate ? new Date(data.valuationDate) : null,
      }),
      ...(data.sheetNumber !== undefined && { sheetNumber: String(data.sheetNumber).trim() }),
      ...(data.plotNumber !== undefined && { plotNumber: String(data.plotNumber).trim() }),
      ...(data.area !== undefined && { area: Number(data.area) }),
      ...(data.actualArea !== undefined && {
        actualArea: data.actualArea !== null ? Number(data.actualArea) : null,
      }),
      ...(data.pricePerSqMeter !== undefined && { pricePerSqMeter: Number(data.pricePerSqMeter) }),
      totalPrice,
      ...(data.notes !== undefined && { notes: data.notes ? data.notes.trim() : null }),
    };

    if (data.collateralId !== undefined) {
      if (data.collateralId) {
        updateInput.collateral = { connect: { id: data.collateralId } };
      } else {
        updateInput.collateral = { disconnect: true };
      }
    }

    return prisma.loanValuation.update({
      where: { id },
      data: updateInput,
      include: {
        collateral: true,
      },
    });
  }

  async delete(id: string): Promise<LoanValuation> {
    return prisma.loanValuation.delete({
      where: { id },
    });
  }

  async deleteManyByLoanId(loanId: string): Promise<number> {
    const result = await prisma.loanValuation.deleteMany({
      where: { loanId },
    });
    return result.count;
  }
}

export const loanValuationRepository = new LoanValuationRepository();

