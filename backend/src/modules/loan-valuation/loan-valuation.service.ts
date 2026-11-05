import { LoanValuationRepository, loanValuationRepository } from './loan-valuation.repository';
import {
  CreateLoanValuationDto,
  GroupValuationPreviewResult,
  PreviewGroupValuationDto,
  UpdateLoanValuationDto,
} from './loan-valuation.types';
import { prisma } from '../../config/database';
import { AppError } from '../../shared/errors/app-error';
import { ErrorCode } from '../../shared/errors/error-codes';
import { Collateral } from '@prisma/client';

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

  /**
   * Tổng hợp dữ liệu từ danh sách tài sản theo đúng quy tắc nghiệp vụ:
   * A. Số tờ: Gộp từ tất cả tài sản, loại bỏ trùng lặp, giữ nguyên thứ tự ban đầu, nối bằng dấu phẩy
   * B. Số thửa: Gộp từ tất cả tài sản, giữ đúng thứ tự, không tự ý bỏ trùng nếu thuộc tài sản khác nhau
   * C. Diện tích: Tổng diện tích pháp lý của các tài sản (chỉ tính mỗi tài sản 1 lần)
   * D. Diện tích thực tế: Tổng diện tích thực tế của các tài sản có dữ liệu hợp lệ (> 0)
   * E. Giá tiền trước làm tròn: Tổng (diện tích hiệu dụng * đơn giá)
   * F. Giá tiền sau làm tròn: FLOOR(Giá tiền trước làm tròn / 1.000.000) * 1.000.000 (làm tròn xuống hàng triệu)
   */
  public aggregateCollateralsData(
    collaterals: Collateral[],
    pricePerSqMeter: number
  ): GroupValuationPreviewResult {
    if (collaterals.length === 0) {
      return {
        sheetNumber: '',
        plotNumber: '',
        area: 0,
        actualArea: null,
        effectiveArea: 0,
        pricePerSqMeter: Number(pricePerSqMeter) || 0,
        totalPriceBeforeRound: 0,
        totalPrice: 0,
        collateralCount: 0,
      };
    }

    // A. Số tờ: Trích xuất theo thứ tự, loại bỏ trùng, giữ số 0 ở đầu
    const rawSheets: string[] = collaterals
      .map((c) => String(c.sheetNumber ?? '').trim())
      .filter(Boolean);
    const uniqueSheets = Array.from(new Set(rawSheets));
    const sheetNumber = uniqueSheets.join(', ');

    // B. Số thửa: Trích xuất theo thứ tự, giữ nguyên kể cả khi trùng thuộc các tài sản khác nhau
    const plotNumbers: string[] = collaterals
      .map((c) => String(c.plotNumber ?? '').trim())
      .filter(Boolean);
    const plotNumber = plotNumbers.join(', ');

    // C. Tổng diện tích pháp lý (chỉ tính mỗi tài sản 1 lần)
    const area = collaterals.reduce((sum, c) => sum + (Number(c.area) || 0), 0);

    // D. Tổng diện tích thực tế (chỉ cộng các tài sản có dữ liệu hợp lệ > 0)
    const validActualAreas = collaterals.filter((c) => c.actualArea !== null && c.actualArea !== undefined && c.actualArea > 0);
    const actualArea = validActualAreas.length > 0
      ? validActualAreas.reduce((sum, c) => sum + Number(c.actualArea), 0)
      : null;

    // Diện tích tính tiền hiệu dụng của nhóm:
    // Từng tài sản: nếu có diện tích thực tế > 0 thì dùng thực tế, ngược lại dùng diện tích pháp lý
    const effectiveArea = collaterals.reduce((sum, c) => {
      const eff = c.actualArea && c.actualArea > 0 ? Number(c.actualArea) : Number(c.area || 0);
      return sum + eff;
    }, 0);

    const price = Number(pricePerSqMeter) || 0;
    const totalPriceBeforeRound = Math.round(effectiveArea * price);

    // Quy tắc làm tròn xuống đến hàng triệu: FLOOR(totalPriceBeforeRound / 1.000.000) * 1.000.000
    const totalPrice = Math.floor(totalPriceBeforeRound / 1_000_000) * 1_000_000;

    return {
      sheetNumber,
      plotNumber,
      area,
      actualArea,
      effectiveArea,
      pricePerSqMeter: price,
      totalPriceBeforeRound,
      totalPrice,
      collateralCount: collaterals.length,
    };
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

  /**
   * Xem trước (Preview) thông số tổng hợp nhóm định giá khi chọn tài sản trên giao diện
   */
  async previewGroupValuation(loanId: string, dto: PreviewGroupValuationDto) {
    await this.ensureLoanExists(loanId);

    const uniqueIds = Array.from(new Set(dto.collateralIds.filter(isValidObjectId)));
    if (uniqueIds.length === 0) {
      throw AppError.badRequest('Vui lòng chọn ít nhất 1 tài sản hợp lệ', ErrorCode.VALIDATION_ERROR);
    }

    const collaterals = await prisma.collateral.findMany({
      where: {
        loanId,
        id: { in: uniqueIds },
      },
    });

    if (collaterals.length !== uniqueIds.length) {
      throw AppError.badRequest(
        'Một số tài sản được chọn không tồn tại hoặc không thuộc hồ sơ vay này',
        ErrorCode.COLLATERAL_NOT_FOUND
      );
    }

    // Sắp xếp collaterals theo đúng thứ tự mảng uniqueIds gửi lên
    const sortedCollaterals = uniqueIds
      .map((id) => collaterals.find((c) => c.id === id))
      .filter((c): c is Collateral => Boolean(c));

    return this.aggregateCollateralsData(sortedCollaterals, dto.pricePerSqMeter);
  }

  /**
   * Đồng bộ giá trị định giá của các tài sản bảo đảm
   */
  async syncCollateralsValuation(loanId: string) {
    if (!isValidObjectId(loanId)) return;
    const collaterals = await prisma.collateral.findMany({ where: { loanId } });
    if (collaterals.length === 0) return;

    const valuations = await prisma.loanValuation.findMany({ where: { loanId } });

    for (const c of collaterals) {
      // Tìm các nhóm định giá có chứa tài sản này
      const linkedValuations = valuations.filter((v) => {
        const ids = Array.isArray(v.collateralIds) ? v.collateralIds : [];
        return ids.includes(c.id) || v.collateralId === c.id;
      });

      // Lấy đơn giá và thông tin định giá mới nhất
      const latest = linkedValuations[linkedValuations.length - 1];
      const effArea = c.actualArea && c.actualArea > 0 ? c.actualArea : c.area;
      const calculatedValuation = latest
        ? Math.floor(Math.round(effArea * latest.pricePerSqMeter) / 1_000_000) * 1_000_000
        : (c.valuationAmount || 0);

      await prisma.collateral.update({
        where: { id: c.id },
        data: {
          valuationAmount: calculatedValuation,
          ...(latest && {
            pricePerSqMeter: latest.pricePerSqMeter,
          }),
        },
      });
    }
  }

  async create(loanId: string, dto: CreateLoanValuationDto) {
    await this.ensureLoanExists(loanId);

    // 1. Chuẩn hóa danh sách ID tài sản
    const rawIds = Array.isArray(dto.collateralIds) ? dto.collateralIds : [];
    if (rawIds.length === 0 && dto.collateralId) {
      rawIds.push(dto.collateralId);
    }

    const uniqueIds = Array.from(new Set(rawIds.filter(isValidObjectId)));
    if (uniqueIds.length === 0) {
      throw AppError.badRequest('Vui lòng chọn ít nhất một tài sản để đưa vào nhóm định giá', ErrorCode.VALIDATION_ERROR);
    }

    // 2. Kiểm tra tất cả tài sản có thuộc khoản vay này không
    const collaterals = await prisma.collateral.findMany({
      where: {
        loanId,
        id: { in: uniqueIds },
      },
    });

    if (collaterals.length !== uniqueIds.length) {
      throw AppError.badRequest(
        'Tài sản liên kết không tồn tại hoặc không thuộc khoản vay hiện tại',
        ErrorCode.COLLATERAL_NOT_FOUND
      );
    }

    // Giữ đúng thứ tự xuất hiện ban đầu
    const sortedCollaterals = uniqueIds
      .map((id) => collaterals.find((c) => c.id === id))
      .filter((c): c is Collateral => Boolean(c));

    // 3. Tự động tổng hợp thông số nếu chưa truyền thủ công
    const aggregated = this.aggregateCollateralsData(sortedCollaterals, dto.pricePerSqMeter);

    const sheetNumber = dto.sheetNumber !== undefined && dto.sheetNumber.trim() !== ''
      ? dto.sheetNumber.trim()
      : aggregated.sheetNumber;

    const plotNumber = dto.plotNumber !== undefined && dto.plotNumber.trim() !== ''
      ? dto.plotNumber.trim()
      : aggregated.plotNumber;

    const area = dto.area !== undefined && dto.area > 0
      ? dto.area
      : aggregated.area;

    const actualArea = dto.actualArea !== undefined
      ? dto.actualArea
      : aggregated.actualArea;

    const totalPriceBeforeRound = dto.totalPriceBeforeRound !== undefined && dto.totalPriceBeforeRound > 0
      ? dto.totalPriceBeforeRound
      : aggregated.totalPriceBeforeRound;

    // Luôn áp dụng công thức làm tròn xuống hàng triệu cho giá tiền sau cùng
    const totalPrice = dto.totalPrice !== undefined && dto.totalPrice > 0
      ? Math.floor(dto.totalPrice / 1_000_000) * 1_000_000
      : aggregated.totalPrice;

    const created = await this.repo.create(loanId, {
      ...dto,
      collateralIds: uniqueIds,
      collateralId: uniqueIds[0] || null,
      sheetNumber,
      plotNumber,
      area,
      actualArea,
      totalPriceBeforeRound,
      totalPrice,
    });

    await this.syncCollateralsValuation(loanId);
    return created;
  }

  async update(loanId: string, id: string, dto: UpdateLoanValuationDto) {
    const existing = await this.getById(loanId, id);

    let collateralIds = existing.collateralIds;
    if (dto.collateralIds !== undefined) {
      collateralIds = Array.from(new Set(dto.collateralIds.filter(isValidObjectId)));
      if (collateralIds.length === 0) {
        throw AppError.badRequest('Vui lòng chọn ít nhất một tài sản cho nhóm định giá', ErrorCode.VALIDATION_ERROR);
      }

      // Kiểm tra tất cả tài sản có thuộc khoản vay này không
      const collaterals = await prisma.collateral.findMany({
        where: {
          loanId,
          id: { in: collateralIds },
        },
      });

      if (collaterals.length !== collateralIds.length) {
        throw AppError.badRequest(
          'Tài sản liên kết không tồn tại hoặc không thuộc khoản vay hiện tại',
          ErrorCode.COLLATERAL_NOT_FOUND
        );
      }
    }

    // Lấy danh sách tài sản hiện tại của nhóm
    const activeCollaterals = await prisma.collateral.findMany({
      where: {
        loanId,
        id: { in: collateralIds },
      },
    });

    const pricePerSqMeter = dto.pricePerSqMeter !== undefined
      ? Number(dto.pricePerSqMeter)
      : existing.pricePerSqMeter;

    const aggregated = this.aggregateCollateralsData(activeCollaterals, pricePerSqMeter);

    const sheetNumber = dto.sheetNumber !== undefined && dto.sheetNumber.trim() !== ''
      ? dto.sheetNumber.trim()
      : (dto.collateralIds ? aggregated.sheetNumber : existing.sheetNumber);

    const plotNumber = dto.plotNumber !== undefined && dto.plotNumber.trim() !== ''
      ? dto.plotNumber.trim()
      : (dto.collateralIds ? aggregated.plotNumber : existing.plotNumber);

    const area = dto.area !== undefined && dto.area > 0
      ? dto.area
      : (dto.collateralIds ? aggregated.area : existing.area);

    const actualArea = dto.actualArea !== undefined
      ? dto.actualArea
      : (dto.collateralIds ? aggregated.actualArea : existing.actualArea);

    let totalPriceBeforeRound = existing.totalPriceBeforeRound ?? existing.totalPrice;
    if (dto.totalPriceBeforeRound !== undefined) {
      totalPriceBeforeRound = dto.totalPriceBeforeRound;
    } else if (dto.collateralIds || dto.pricePerSqMeter !== undefined || dto.area !== undefined) {
      totalPriceBeforeRound = aggregated.totalPriceBeforeRound;
    }

    let totalPrice = existing.totalPrice;
    if (dto.totalPrice !== undefined) {
      totalPrice = Math.floor(dto.totalPrice / 1_000_000) * 1_000_000;
    } else if (dto.collateralIds || dto.pricePerSqMeter !== undefined || dto.area !== undefined) {
      totalPrice = aggregated.totalPrice;
    }

    const updated = await this.repo.update(id, {
      ...dto,
      collateralIds,
      collateralId: collateralIds[0] || null,
      sheetNumber,
      plotNumber,
      area,
      actualArea,
      pricePerSqMeter,
      totalPriceBeforeRound,
      totalPrice,
    });

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
