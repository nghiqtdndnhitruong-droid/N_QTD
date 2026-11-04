import { CollateralRepository, collateralRepository } from './collateral.repository';
import {
  CollateralFilterQuery,
  CreateCollateralDto,
  ThirdPartyInfoDto,
  UpdateCollateralDto,
} from './collateral.types';
import { AppError } from '../../shared/errors/app-error';
import { ErrorCode } from '../../shared/errors/error-codes';
import { prisma } from '../../config/database';
import { areaService } from '../area/area.service';
import { createPaginationMeta, parsePagination } from '../../shared/utils/pagination.util';
import {
  calculateFlooredValuationAmount,
  getCanonicalIdIssuePlace,
  requireValidCitizenIdInfo,
  resolveEffectiveCollateralArea,
} from '../../shared/utils/identity-document.util';
import { LoanType, CollateralOwnerType } from '@prisma/client';
import { loanValuationService } from '../loan-valuation/loan-valuation.service';

function normalizeThirdPartyInfo(info?: ThirdPartyInfoDto | null) {
  if (!info) return null;
  const cccd = requireValidCitizenIdInfo(info.idNumber, 'Người bảo lãnh bên thứ ba');
  return {
    fullName: info.fullName.trim(),
    yearOfBirth: cccd.yearOfBirth,
    gender: cccd.gender,
    idType: info.idType,
    idNumber: info.idNumber.trim(),
    idIssuePlace: getCanonicalIdIssuePlace(info.idType),
    address: info.address.trim(),
  };
}

export class CollateralService {
  constructor(private readonly repo: CollateralRepository = collateralRepository) {}

  /**
   * Chuẩn hóa diện tích thực và giá trị định giá tài sản (luôn làm tròn xuống Math.floor).
   */
  public normalizeValuationData(params: {
    area: number;
    actualArea?: number | null;
    pricePerSqMeter?: number | null;
    valuationAmount?: number | null;
  }) {
    const normalizedActualArea =
      params.actualArea !== undefined &&
      params.actualArea !== null &&
      Number(params.actualArea) > 0
        ? Number(params.actualArea)
        : null;

    const { effectiveArea } = resolveEffectiveCollateralArea(
      params.area,
      normalizedActualArea
    );

    const normalizedPricePerSqMeter =
      params.pricePerSqMeter !== undefined &&
      params.pricePerSqMeter !== null &&
      Number(params.pricePerSqMeter) > 0
        ? Number(params.pricePerSqMeter)
        : null;

    let finalValuationAmount: number | null = null;
    if (normalizedPricePerSqMeter !== null) {
      finalValuationAmount = calculateFlooredValuationAmount(
        effectiveArea,
        normalizedPricePerSqMeter
      );
    } else if (
      params.valuationAmount !== undefined &&
      params.valuationAmount !== null
    ) {
      finalValuationAmount = Math.floor(
        Number(Number(params.valuationAmount).toFixed(6))
      );
    }

    return {
      actualArea: normalizedActualArea,
      pricePerSqMeter: normalizedPricePerSqMeter,
      valuationAmount: finalValuationAmount,
      effectiveArea,
    };
  }

  async create(loanId: string, dto: Omit<CreateCollateralDto, 'loanId'>) {
    // 1. Kiểm tra khoản vay có tồn tại không
    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
    });

    if (!loan || loan.isDeleted) {
      throw AppError.notFound(
        `Không tìm thấy khoản vay với ID: ${loanId}`,
        ErrorCode.LOAN_NOT_FOUND
      );
    }

    const valuation = this.normalizeValuationData({
      area: dto.area,
      actualArea: dto.actualArea,
      pricePerSqMeter: dto.pricePerSqMeter,
      valuationAmount: dto.valuationAmount,
    });

    // 1b. Phân biệt Vay thế chấp (THE_CHAP) và Vay tín chấp (TIN_CHAP):
    // - Vay thế chấp bắt buộc phải có định giá tài sản (> 0) và phương pháp định giá.
    // - Vay tín chấp bắt buộc khai báo tài sản nhưng KHÔNG yêu cầu định giá.
    // 1b. Định giá tài sản:
    // Chức năng định giá đã được tách sang tab Định giá độc lập (LoanValuation).
    // Nếu tài sản có truyền định giá thì kiểm tra hợp lệ, không bắt buộc khi tạo tài sản.
    if (valuation.valuationAmount && valuation.valuationAmount > 0 && !dto.valuationMethod) {
      throw AppError.badRequest(
        'Vui lòng chọn Phương pháp định giá tài sản khi có nhập giá trị định giá.',
        ErrorCode.VALIDATION_ERROR,
        [{ field: 'valuationMethod', message: 'Vui lòng chọn phương pháp định giá' }]
      );
    }

    // 2. Quy tắc Mã tài sản (assetCode): Bắt buộc duy nhất trên toàn hệ thống
    // Lưu ý: Số GCN (certificateNumber) được phép trùng lặp giữa nhiều tài sản.
    const normalizedAssetCode = dto.assetCode.trim();
    const existingByCode = await this.repo.findByAssetCode(normalizedAssetCode);
    if (existingByCode) {
      throw AppError.conflict(
        `Mã tài sản "${normalizedAssetCode}" đã tồn tại trong hệ thống (thuộc hồ sơ vay ${existingByCode.loan?.contractNumber || existingByCode.loanId}). Mỗi tài sản thế chấp phải có mã riêng biệt.`,
        ErrorCode.COLLATERAL_ASSET_CODE_EXISTS,
        [
          {
            field: 'assetCode',
            message: `Mã tài sản "${normalizedAssetCode}" đã tồn tại trong hệ thống`,
          },
        ]
      );
    }

    // 3. Giải quyết địa bàn độc lập của tài sản (Tỉnh -> Xã -> Ấp có thể bỏ trống)
    const location = await areaService.resolveLocationSnapshot({
      provinceId: dto.provinceId,
      communeId: dto.communeId,
      hamletId: dto.hamletId || null,
      addressDetail: dto.addressDetail,
      fallbackAddress: dto.address,
    });

    const normalizedThirdParty =
      dto.ownerType === CollateralOwnerType.BAO_LANH
        ? normalizeThirdPartyInfo(dto.thirdPartyInfo)
        : null;

    const created = await this.repo.create(
      {
        ...dto,
        assetCode: normalizedAssetCode,
        actualArea: valuation.actualArea,
        pricePerSqMeter: valuation.pricePerSqMeter,
        valuationAmount: valuation.valuationAmount ?? 0,
        thirdPartyInfo: normalizedThirdParty,
        loanId,
      },
      location
    );

    await loanValuationService.syncCollateralsValuation(loanId);
    return (await this.repo.findById(created.id)) || created;
  }

  async getById(id: string) {
    const collateral = await this.repo.findById(id);
    if (!collateral) {
      throw AppError.notFound(
        `Không tìm thấy tài sản với ID: ${id}`,
        ErrorCode.COLLATERAL_NOT_FOUND
      );
    }
    return collateral;
  }

  async getByLoanId(loanId: string) {
    return this.repo.findByLoanId(loanId);
  }

  async findMany(query: CollateralFilterQuery) {
    const { collaterals, total } = await this.repo.findMany(query);
    const { page, limit } = parsePagination(query);
    const pagination = createPaginationMeta(total, page, limit);
    return {
      collaterals,
      pagination,
    };
  }

  async update(id: string, dto: UpdateCollateralDto) {
    const collateral = await this.getById(id);

    if (dto.assetCode !== undefined) {
      const normalizedAssetCode = dto.assetCode.trim();
      if (normalizedAssetCode.toLowerCase() !== collateral.assetCode.toLowerCase()) {
        const existingByCode = await this.repo.findByAssetCode(normalizedAssetCode, id);
        if (existingByCode) {
          throw AppError.conflict(
            `Mã tài sản "${normalizedAssetCode}" đã thuộc về một tài sản thế chấp khác (Số GCN: ${existingByCode.certificateNumber}). Vui lòng nhập mã tài sản khác.`,
            ErrorCode.COLLATERAL_ASSET_CODE_EXISTS,
            [
              {
                field: 'assetCode',
                message: `Mã tài sản "${normalizedAssetCode}" đã thuộc về một tài sản khác`,
              },
            ]
          );
        }
      }
    }

    const effectiveCertArea = dto.area !== undefined ? dto.area : collateral.area;
    const effectiveActualArea =
      dto.actualArea !== undefined ? dto.actualArea : collateral.actualArea;
    const effectivePricePerSqm =
      dto.pricePerSqMeter !== undefined
        ? dto.pricePerSqMeter
        : collateral.pricePerSqMeter;

    const hasValuationChange =
      dto.area !== undefined ||
      dto.actualArea !== undefined ||
      dto.pricePerSqMeter !== undefined ||
      dto.valuationAmount !== undefined;

    let normalizedValuation: ReturnType<CollateralService['normalizeValuationData']> | undefined;
    if (hasValuationChange) {
      normalizedValuation = this.normalizeValuationData({
        area: effectiveCertArea,
        actualArea: effectiveActualArea,
        pricePerSqMeter: effectivePricePerSqm,
        valuationAmount:
          dto.valuationAmount !== undefined
            ? dto.valuationAmount
            : collateral.valuationAmount,
      });
    }

    const hasAreaChange =
      dto.provinceId !== undefined ||
      dto.communeId !== undefined ||
      dto.hamletId !== undefined ||
      dto.addressDetail !== undefined;

    let location = undefined;
    if (hasAreaChange) {
      location = await areaService.resolveLocationSnapshot({
        provinceId: dto.provinceId !== undefined ? dto.provinceId : collateral.provinceId,
        communeId: dto.communeId !== undefined ? dto.communeId : collateral.communeId,
        hamletId: dto.hamletId !== undefined ? dto.hamletId : null,
        addressDetail:
          dto.addressDetail !== undefined ? dto.addressDetail : collateral.addressDetail,
        fallbackAddress: dto.address !== undefined ? dto.address : collateral.address,
      });
    }

    const normalizedThirdParty =
      dto.ownerType !== undefined
        ? (dto.ownerType === CollateralOwnerType.BAO_LANH ? normalizeThirdPartyInfo(dto.thirdPartyInfo) : null)
        : (dto.thirdPartyInfo !== undefined ? normalizeThirdPartyInfo(dto.thirdPartyInfo) : undefined);

    const { thirdPartyInfo: _rawThirdParty, ...restDto } = dto;

    return this.repo.update(
      id,
      {
        ...restDto,
        ...(normalizedValuation
          ? {
              actualArea: normalizedValuation.actualArea,
              pricePerSqMeter: normalizedValuation.pricePerSqMeter,
              valuationAmount:
                normalizedValuation.valuationAmount ??
                collateral.valuationAmount ??
                0,
            }
          : {}),
        ...(normalizedThirdParty !== undefined
          ? { thirdPartyInfo: normalizedThirdParty }
          : {}),
      },
      location
    );
  }

  async delete(id: string) {
    await this.getById(id);
    return this.repo.delete(id);
  }
}

export const collateralService = new CollateralService();
