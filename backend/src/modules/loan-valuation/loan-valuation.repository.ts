import { prisma } from '../../config/database';
import { Collateral, LoanValuation, Prisma } from '@prisma/client';
import {
  CreateLoanValuationDto,
  LoanValuationWithCollaterals,
  UpdateLoanValuationDto,
} from './loan-valuation.types';

export class LoanValuationRepository {
  /**
   * Đính kèm danh sách tài sản cấu thành vào từng bản ghi định giá
   */
  private async attachCollateralsToValuations(
    valuations: LoanValuation[],
    loanId: string
  ): Promise<LoanValuationWithCollaterals[]> {
    if (valuations.length === 0) return [];

    // Lấy tất cả tài sản của khoản vay để map nhanh trong bộ nhớ
    const allLoanCollaterals = await prisma.collateral.findMany({
      where: { loanId },
    });

    const collateralMap = new Map<string, Collateral>();
    for (const c of allLoanCollaterals) {
      collateralMap.set(c.id, c);
    }

    return valuations.map((v) => {
      const ids: string[] = [];
      if (Array.isArray(v.collateralIds) && v.collateralIds.length > 0) {
        ids.push(...v.collateralIds);
      } else if (v.collateralId) {
        ids.push(v.collateralId);
      }

      // Giữ đúng thứ tự và không trùng
      const uniqueIds = Array.from(new Set(ids));
      const matchedCollaterals = uniqueIds
        .map((id) => collateralMap.get(id))
        .filter((c): c is Collateral => Boolean(c));

      return {
        ...v,
        collaterals: matchedCollaterals,
      };
    });
  }

  async findByLoanId(loanId: string): Promise<LoanValuationWithCollaterals[]> {
    const list = await prisma.loanValuation.findMany({
      where: { loanId },
      include: {
        collateral: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return this.attachCollateralsToValuations(list, loanId);
  }

  async findById(id: string): Promise<LoanValuationWithCollaterals | null> {
    const valuation = await prisma.loanValuation.findUnique({
      where: { id },
      include: {
        collateral: true,
      },
    });

    if (!valuation) return null;

    const [attached] = await this.attachCollateralsToValuations([valuation], valuation.loanId);
    return attached || valuation;
  }

  async create(loanId: string, data: CreateLoanValuationDto): Promise<LoanValuationWithCollaterals> {
    const collateralIds = Array.isArray(data.collateralIds) ? data.collateralIds : [];
    if (collateralIds.length === 0 && data.collateralId) {
      collateralIds.push(data.collateralId);
    }
    const primaryCollateralId = collateralIds[0] || data.collateralId || null;

    const createInput: Prisma.LoanValuationCreateInput = {
      loan: { connect: { id: loanId } },
      collateralIds,
      valuationType: data.valuationType,
      valuationDate: data.valuationDate ? new Date(data.valuationDate) : null,
      sheetNumber: String(data.sheetNumber ?? '').trim(),
      plotNumber: String(data.plotNumber ?? '').trim(),
      area: Number(data.area || 0),
      actualArea: data.actualArea !== undefined && data.actualArea !== null ? Number(data.actualArea) : null,
      pricePerSqMeter: Number(data.pricePerSqMeter || 0),
      totalPriceBeforeRound:
        data.totalPriceBeforeRound !== undefined && data.totalPriceBeforeRound !== null
          ? Number(data.totalPriceBeforeRound)
          : null,
      totalPrice: Number(data.totalPrice || 0),
      notes: data.notes ? data.notes.trim() : null,
    };

    if (primaryCollateralId) {
      createInput.collateral = { connect: { id: primaryCollateralId } };
    }

    const created = await prisma.loanValuation.create({
      data: createInput,
      include: {
        collateral: true,
      },
    });

    const [attached] = await this.attachCollateralsToValuations([created], loanId);
    return attached || created;
  }

  async update(id: string, data: UpdateLoanValuationDto): Promise<LoanValuationWithCollaterals> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error('Không tìm thấy bản ghi định giá');
    }

    let collateralIds = existing.collateralIds;
    if (data.collateralIds !== undefined) {
      collateralIds = Array.isArray(data.collateralIds) ? data.collateralIds : [];
    }

    const primaryCollateralId = collateralIds[0] || data.collateralId || null;

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
      ...(data.totalPriceBeforeRound !== undefined && {
        totalPriceBeforeRound: data.totalPriceBeforeRound !== null ? Number(data.totalPriceBeforeRound) : null,
      }),
      ...(data.totalPrice !== undefined && { totalPrice: Number(data.totalPrice) }),
      ...(data.notes !== undefined && { notes: data.notes ? data.notes.trim() : null }),
      collateralIds,
    };

    if (primaryCollateralId) {
      updateInput.collateral = { connect: { id: primaryCollateralId } };
    } else if (data.collateralId === null) {
      updateInput.collateral = { disconnect: true };
    }

    const updated = await prisma.loanValuation.update({
      where: { id },
      data: updateInput,
      include: {
        collateral: true,
      },
    });

    const [attached] = await this.attachCollateralsToValuations([updated], existing.loanId);
    return attached || updated;
  }

  async delete(id: string): Promise<LoanValuation> {
    return prisma.loanValuation.delete({
      where: { id },
    });
  }

  async updateCommonSettings(
    loanId: string,
    data: { valuationType?: any; valuationDate?: string | Date | null }
  ): Promise<{ count: number }> {
    const updateData: Prisma.LoanValuationUpdateManyMutationInput = {};
    if (data.valuationType) {
      updateData.valuationType = data.valuationType;
    }
    if (data.valuationDate !== undefined) {
      updateData.valuationDate = data.valuationDate ? new Date(data.valuationDate) : null;
    }
    const result = await prisma.loanValuation.updateMany({
      where: { loanId },
      data: updateData,
    });
    return { count: result.count };
  }

  async deleteManyByLoanId(loanId: string): Promise<number> {
    const result = await prisma.loanValuation.deleteMany({
      where: { loanId },
    });
    return result.count;
  }
}

export const loanValuationRepository = new LoanValuationRepository();
