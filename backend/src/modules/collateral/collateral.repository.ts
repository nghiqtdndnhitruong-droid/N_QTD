import { prisma } from '../../config/database';
import { Collateral, CollateralCertificateType, LoanStatus, Prisma } from '@prisma/client';
import {
  CollateralFilterQuery,
  CreateCollateralDto,
  ThirdPartyInfoDto,
  UpdateCollateralDto,
} from './collateral.types';
import { ResolvedLocationSnapshot } from '../area/area.types';
import { parsePagination } from '../../shared/utils/pagination.util';

export class CollateralRepository {
  async findById(id: string): Promise<Collateral | null> {
    return prisma.collateral.findUnique({
      where: { id },
      include: {
        loan: true,
      },
    });
  }

  async findByLoanId(loanId: string): Promise<Collateral[]> {
    return prisma.collateral.findMany({
      where: { loanId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Kiểm tra tính duy nhất của Mã tài sản (assetCode) trên toàn hệ thống.
   * Khi chỉnh sửa tài sản, truyền excludeCollateralId để không tự báo trùng với chính nó.
   */
  async findByAssetCode(
    assetCode: string,
    excludeCollateralId?: string
  ): Promise<(Collateral & { loan: any }) | null> {
    return prisma.collateral.findFirst({
      where: {
        assetCode: {
          equals: assetCode.trim(),
          mode: 'insensitive',
        },
        ...(excludeCollateralId && { id: { not: excludeCollateralId } }),
      },
      include: {
        loan: true,
      },
    });
  }

  /**
   * Kiểm tra xem Mã tài sản (assetCode) có đang được thế chấp ở khoản vay khác chưa tất toán không.
   * Lưu ý: Số GCN (certificateNumber) KHÔNG kiểm tra trùng lặp bắt buộc, cho phép nhiều tài sản có cùng Số GCN.
   */
  async findActiveCollateralUsageByAssetCode(
    assetCode: string,
    excludeLoanId?: string
  ): Promise<(Collateral & { loan: any }) | null> {
    return prisma.collateral.findFirst({
      where: {
        assetCode: {
          equals: assetCode.trim(),
          mode: 'insensitive',
        },
        ...(excludeLoanId && { loanId: { not: excludeLoanId } }),
        loan: {
          isDeleted: { not: true },
          status: {
            not: LoanStatus.DA_TAT_TOAN,
          },
        },
      },
      include: {
        loan: true,
      },
    });
  }

  async findMany(query: CollateralFilterQuery) {
    const { limit, skip, search } = parsePagination(query);
    const where: Prisma.CollateralWhereInput = {
      loan: {
        isDeleted: { not: true },
      },
    };

    if (query.loanId) where.loanId = query.loanId;
    if (query.provinceId) where.provinceId = query.provinceId;
    if (query.communeId) where.communeId = query.communeId;
    if (query.hamletId) where.hamletId = query.hamletId;
    if (query.assetCode) {
      where.assetCode = { contains: query.assetCode, mode: 'insensitive' };
    }
    if (query.certificateNumber) {
      where.certificateNumber = { contains: query.certificateNumber, mode: 'insensitive' };
    }

    if (search) {
      where.OR = [
        { assetCode: { contains: search, mode: 'insensitive' } },
        { certificateNumber: { contains: search, mode: 'insensitive' } },
        { sheetNumber: { contains: search, mode: 'insensitive' } },
        { plotNumber: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
        { hamletName: { contains: search, mode: 'insensitive' } },
        { communeName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [collaterals, total] = await Promise.all([
      prisma.collateral.findMany({
        where,
        skip,
        take: limit,
        include: {
          loan: {
            include: { member: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.collateral.count({ where }),
    ]);

    return { collaterals, total };
  }

  async create(
    data: CreateCollateralDto & {
      thirdPartyInfo?:
        | (ThirdPartyInfoDto & {
            yearOfBirth: number;
            gender: NonNullable<ThirdPartyInfoDto['gender']>;
            idIssuePlace: string;
          })
        | null;
    },
    location?: ResolvedLocationSnapshot
  ): Promise<Collateral> {
    return prisma.collateral.create({
      data: {
        loanId: data.loanId,
        assetType: data.assetType,
        certificateType: data.certificateType ?? CollateralCertificateType.GCN,
        assetCode: data.assetCode.trim(),
        certificateNumber: data.certificateNumber.trim(),
        issueBookNumber: data.issueBookNumber ? data.issueBookNumber.trim() : null,
        sheetNumber: data.sheetNumber.trim(),
        plotNumber: data.plotNumber.trim(),
        area: data.area,
        actualArea: data.actualArea ?? null,
        pricePerSqMeter: data.pricePerSqMeter ?? null,
        origin: data.origin,
        usagePurpose: data.usagePurpose,
        usageDuration: data.usageDuration,
        usageForm: data.usageForm,
        useRestrictions: data.useRestrictions,
        issuePlace: data.issuePlace,
        issueDate: data.issueDate ? new Date(data.issueDate) : null,
        provinceId: location?.provinceId ?? null,
        provinceName: location?.provinceName ?? null,
        communeId: location?.communeId ?? null,
        communeName: location?.communeName ?? null,
        hamletId: location?.hamletId ?? null,
        hamletName: location?.hamletName ?? null,
        addressDetail: location?.addressDetail ?? null,
        address: location?.address || data.address || null,
        valuationAmount: data.valuationAmount ?? 0,
        valuationMethod: data.valuationMethod ?? null,
        ownerType: data.ownerType,
        thirdPartyInfo: data.thirdPartyInfo ?? null,
        householdMembers: (data.householdMembers as any) ?? [],
      },
    });
  }

  async update(
    id: string,
    data: UpdateCollateralDto & {
      thirdPartyInfo?:
        | (ThirdPartyInfoDto & {
            yearOfBirth: number;
            gender: NonNullable<ThirdPartyInfoDto['gender']>;
            idIssuePlace: string;
          })
        | null;
    },
    location?: ResolvedLocationSnapshot
  ): Promise<Collateral> {
    const updateData: Prisma.CollateralUpdateInput = {};

    if (data.assetType !== undefined) updateData.assetType = data.assetType;
    if (data.certificateType !== undefined) {
      updateData.certificateType = data.certificateType ?? CollateralCertificateType.GCN;
    }
    if (data.assetCode !== undefined) updateData.assetCode = data.assetCode.trim();
    if (data.certificateNumber !== undefined) {
      updateData.certificateNumber = data.certificateNumber.trim();
    }
    if (data.issueBookNumber !== undefined) {
      updateData.issueBookNumber = data.issueBookNumber ? data.issueBookNumber.trim() : null;
    }
    if (data.sheetNumber !== undefined) updateData.sheetNumber = data.sheetNumber.trim();
    if (data.plotNumber !== undefined) updateData.plotNumber = data.plotNumber.trim();
    if (data.area !== undefined) updateData.area = data.area;
    if (data.actualArea !== undefined) updateData.actualArea = data.actualArea;
    if (data.pricePerSqMeter !== undefined) updateData.pricePerSqMeter = data.pricePerSqMeter;
    if (data.origin !== undefined) updateData.origin = data.origin;
    if (data.usagePurpose !== undefined) updateData.usagePurpose = data.usagePurpose;
    if (data.usageDuration !== undefined) updateData.usageDuration = data.usageDuration;
    if (data.usageForm !== undefined) updateData.usageForm = data.usageForm;
    if (data.useRestrictions !== undefined) updateData.useRestrictions = data.useRestrictions;
    if (data.issuePlace !== undefined) updateData.issuePlace = data.issuePlace;
    if (data.issueDate !== undefined) {
      updateData.issueDate = data.issueDate ? new Date(data.issueDate) : null;
    }
    if (data.valuationAmount !== undefined) updateData.valuationAmount = data.valuationAmount;
    if (data.valuationMethod !== undefined) updateData.valuationMethod = data.valuationMethod;
    if (data.ownerType !== undefined) updateData.ownerType = data.ownerType;
    if (data.thirdPartyInfo !== undefined) updateData.thirdPartyInfo = data.thirdPartyInfo;
    if (data.householdMembers !== undefined) {
      updateData.householdMembers = (data.householdMembers as any) ?? [];
    }

    if (location) {
      updateData.provinceId = location.provinceId;
      updateData.provinceName = location.provinceName;
      updateData.communeId = location.communeId;
      updateData.communeName = location.communeName;
      updateData.hamletId = location.hamletId;
      updateData.hamletName = location.hamletName;
      updateData.addressDetail = location.addressDetail;
      updateData.address = location.address || null;
    } else if (data.address !== undefined) {
      updateData.address = data.address;
    }

    return prisma.collateral.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(id: string): Promise<Collateral> {
    return prisma.collateral.delete({
      where: { id },
    });
  }

  async calculateTotalValuationByLoanId(loanId: string): Promise<number> {
    const collaterals = await prisma.collateral.findMany({
      where: { loanId },
      select: { valuationAmount: true },
    });
    return collaterals.reduce((sum, item) => sum + (item.valuationAmount ?? 0), 0);
  }
}

export const collateralRepository = new CollateralRepository();
