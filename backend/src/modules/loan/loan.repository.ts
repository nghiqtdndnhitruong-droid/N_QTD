import { prisma } from '../../config/database';
import { Loan, LoanStatus, LoanType, Prisma } from '@prisma/client';
import { CreateLoanDto, LoanFilterQuery, UpdateLoanDto } from './loan.types';
import { ResolvedLocationSnapshot } from '../area/area.types';
import { parsePagination } from '../../shared/utils/pagination.util';

export class LoanRepository {
  async findById(id: string) {
    const loan = await prisma.loan.findUnique({
      where: { id },
      include: {
        member: true,
        collaterals: true,
        relatedPersons: {
          where: { isDeleted: { not: true } },
          orderBy: { createdAt: 'asc' },
        },
        disbursements: {
          orderBy: { disbursementDate: 'asc' },
        },
        repayments: {
          orderBy: { repaymentDate: 'asc' },
        },
      },
    });
    if (!loan || loan.isDeleted) return null;
    return loan;
  }

  async findMany(query: LoanFilterQuery) {
    const { limit, skip, sortBy, sortOrder, search } = parsePagination(query);

    const where: Prisma.LoanWhereInput = {
      isDeleted: { not: true },
    };

    if (query.memberId) {
      where.memberId = query.memberId;
    }

    if (query.loanType) {
      where.loanType = query.loanType;
    }

    if (query.termType) {
      where.termType = query.termType;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.provinceId || query.communeId || query.hamletId) {
      where.member = {
        ...(query.provinceId && { provinceId: query.provinceId }),
        ...(query.communeId && { communeId: query.communeId }),
        ...(query.hamletId && { hamletId: query.hamletId }),
      };
    }

    if (search) {
      where.OR = [
        { contractNumber: { contains: search, mode: 'insensitive' } },
        { member: { fullName: { contains: search, mode: 'insensitive' } } },
        { member: { memberCode: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (query.fromDate || query.toDate) {
      where.createdAt = {};
      if (query.fromDate) where.createdAt.gte = new Date(query.fromDate);
      if (query.toDate) where.createdAt.lte = new Date(query.toDate);
    }

    const [loans, total] = await Promise.all([
      prisma.loan.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          member: true,
          disbursements: {
            orderBy: { disbursementDate: 'asc' },
          },
          repayments: {
            orderBy: { repaymentDate: 'asc' },
          },
          _count: {
            select: {
              collaterals: true,
              disbursements: true,
              repayments: true,
            },
          },
        },
      }),
      prisma.loan.count({ where }),
    ]);

    return { loans, total };
  }

  /**
   * Kiểm tra tính duy nhất của Số khế ước (contractNumber) trên toàn hệ thống.
   * Khi chỉnh sửa khoản vay, truyền excludeLoanId để không tự báo trùng với chính nó.
   */
  async findByContractNumber(
    contractNumber: string,
    excludeLoanId?: string
  ): Promise<Loan | null> {
    return prisma.loan.findFirst({
      where: {
        contractNumber: {
          equals: contractNumber.trim(),
          mode: 'insensitive',
        },
        ...(excludeLoanId && { id: { not: excludeLoanId } }),
      },
    });
  }

  /**
   * Lấy danh sách các khoản vay tín chấp đang mở (chưa tất toán) của thành viên
   */
  async findActiveUnsecuredLoansByMember(memberId: string): Promise<Loan[]> {
    return prisma.loan.findMany({
      where: {
        memberId,
        isDeleted: { not: true },
        loanType: LoanType.TIN_CHAP,
        status: {
          not: LoanStatus.DA_TAT_TOAN,
        },
      },
    });
  }

  async create(
    data: CreateLoanDto,
    termMonths: number,
    interestRate: number,
    collateralLocations: ResolvedLocationSnapshot[] = [],
    timeline?: {
      expectedMaturityDate: Date;
      maturityDate: Date;
      halfTermPaymentDate: Date | null;
    }
  ): Promise<Loan> {
    let loanPlanData = undefined;
    if (data.loanPlan) {
      const totalCapitalDemand = Math.round(data.loanPlan.loanAmount);
      const borrowedCapital = Math.round(data.loanAmount);
      const ownCapital = Math.max(0, totalCapitalDemand - borrowedCapital);
      const totalExpenses = data.loanPlan.expenses.reduce(
        (sum, item) => sum + Math.round(item.amount),
        0
      );
      const totalRevenues = data.loanPlan.revenues.reduce(
        (sum, item) => sum + Math.round(item.amount),
        0
      );
      loanPlanData = {
        purpose: data.loanPlan.purpose,
        loanAmount: totalCapitalDemand,
        ownCapital,
        borrowedCapital,
        expenses: data.loanPlan.expenses.map((e) => ({
          name: e.name,
          amount: Math.round(e.amount),
        })),
        revenues: data.loanPlan.revenues.map((r) => ({
          name: r.name,
          amount: Math.round(r.amount),
        })),
        totalExpenses,
        totalRevenues,
        profit: totalRevenues - totalExpenses,
      };
    }

    let heirData = undefined;
    if (data.heir) {
      heirData = {
        fullName: data.heir.fullName,
        yearOfBirth: data.heir.yearOfBirth!,
        idType: data.heir.idType,
        idNumber: data.heir.idNumber,
        idIssueDate: new Date(data.heir.idIssueDate),
        idIssuePlace: data.heir.idIssuePlace!,
        idExpiry: data.heir.idExpiry ? new Date(data.heir.idExpiry) : null,
        gender: data.heir.gender!,
        phoneNumber: data.heir.phoneNumber ?? null,
        address: data.heir.address,
        relationship: data.heir.relationship,
      };
    }

    let mortgageContractData = undefined;
    if (data.mortgageContract) {
      const expiryRaw =
        data.mortgageContract.contractExpiryDate || data.mortgageContract.contractDuration;
      const parsedExpiry =
        expiryRaw && !Number.isNaN(Date.parse(String(expiryRaw))) ? new Date(expiryRaw) : null;

      mortgageContractData = {
        contractNumber: data.mortgageContract.contractNumber,
        contractDuration: data.mortgageContract.contractDuration ?? null,
        contractExpiryDate: parsedExpiry,
        committeeAuthDate: data.mortgageContract.committeeAuthDate
          ? new Date(data.mortgageContract.committeeAuthDate)
          : null,
      };
    }

    const normalizedContractNumber =
      data.contractNumber?.trim() ||
      `KU-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

    const createdLoan = await prisma.loan.create({
      data: {
        memberId: data.memberId,
        loanType: data.loanType,
        termType: data.termType,
        termMonths,
        loanAmount: data.loanAmount,
        interestRate,
        loanStartDate: data.loanStartDate ? new Date(data.loanStartDate) : new Date(),
        contractNumber: normalizedContractNumber,
        contractDate: data.contractDate ? new Date(data.contractDate) : new Date(),
        status: LoanStatus.DANG_TAO,
        expectedMaturityDate: timeline?.expectedMaturityDate ?? null,
        maturityDate: timeline?.maturityDate ?? null,
        halfTermPaymentDate: timeline?.halfTermPaymentDate ?? null,
        isDeleted: false,
        heir: heirData,
        loanPlan: loanPlanData,
        mortgageContract: mortgageContractData,
      },
    });

    if (data.collaterals && data.collaterals.length > 0) {
      for (let i = 0; i < data.collaterals.length; i++) {
        const c = data.collaterals[i];
        const loc = collateralLocations[i];
        await prisma.collateral.create({
          data: {
            loanId: createdLoan.id,
            assetType: c.assetType,
            assetCode: c.assetCode.trim(),
            certificateNumber: c.certificateNumber.trim(),
            sheetNumber: c.sheetNumber.trim(),
            plotNumber: c.plotNumber.trim(),
            area: c.area,
            origin: c.origin,
            usagePurpose: c.usagePurpose,
            usageDuration: c.usageDuration,
            useRestrictions: c.useRestrictions,
            issuePlace: c.issuePlace,
            issueDate: c.issueDate ? new Date(c.issueDate) : null,
            provinceId: loc?.provinceId ?? null,
            provinceName: loc?.provinceName ?? null,
            communeId: loc?.communeId ?? null,
            communeName: loc?.communeName ?? null,
            hamletId: loc?.hamletId ?? null,
            hamletName: loc?.hamletName ?? null,
            addressDetail: loc?.addressDetail ?? null,
            address: loc?.address || c.address || null,
            valuationAmount: c.valuationAmount ?? 0,
            valuationMethod: c.valuationMethod ?? null,
            ownerType: c.ownerType,
            thirdPartyInfo: c.thirdPartyInfo
              ? {
                  fullName: c.thirdPartyInfo.fullName,
                  yearOfBirth: c.thirdPartyInfo.yearOfBirth!,
                  gender: c.thirdPartyInfo.gender!,
                  idType: c.thirdPartyInfo.idType,
                  idNumber: c.thirdPartyInfo.idNumber,
                  idIssuePlace: c.thirdPartyInfo.idIssuePlace!,
                  address: c.thirdPartyInfo.address,
                }
              : null,
          },
        });
      }
    }

    return createdLoan;
  }

  async update(
    id: string,
    data: UpdateLoanDto,
    effectiveLoanAmount?: number,
    timeline?: {
      expectedMaturityDate: Date;
      maturityDate: Date;
      halfTermPaymentDate: Date | null;
    }
  ): Promise<Loan> {
    const updateData: Prisma.LoanUpdateInput = {};

    if (timeline) {
      updateData.expectedMaturityDate = timeline.expectedMaturityDate;
      updateData.maturityDate = timeline.maturityDate;
      updateData.halfTermPaymentDate = timeline.halfTermPaymentDate;
    }

    if (data.loanAmount !== undefined) updateData.loanAmount = data.loanAmount;
    if (data.loanStartDate !== undefined) {
      updateData.loanStartDate = data.loanStartDate ? new Date(data.loanStartDate) : new Date();
    }
    if (data.contractNumber !== undefined) {
      updateData.contractNumber = data.contractNumber.trim();
    }
    if (data.contractDate !== undefined) {
      updateData.contractDate = data.contractDate ? new Date(data.contractDate) : null;
    }

    if (data.heir !== undefined) {
      updateData.heir = data.heir
        ? {
            fullName: data.heir.fullName,
            yearOfBirth: data.heir.yearOfBirth!,
            idType: data.heir.idType,
            idNumber: data.heir.idNumber,
            idIssueDate: new Date(data.heir.idIssueDate),
            idIssuePlace: data.heir.idIssuePlace!,
            idExpiry: data.heir.idExpiry ? new Date(data.heir.idExpiry) : null,
            gender: data.heir.gender!,
            phoneNumber: data.heir.phoneNumber ?? null,
            address: data.heir.address,
            relationship: data.heir.relationship,
          }
        : null;
    }

    if (data.loanPlan !== undefined) {
      if (data.loanPlan) {
        const borrowedCapital = Math.round(
          effectiveLoanAmount ?? data.loanAmount ?? data.loanPlan.borrowedCapital
        );
        const totalCapitalDemand = Math.round(data.loanPlan.loanAmount);
        const ownCapital = Math.max(0, totalCapitalDemand - borrowedCapital);
        const totalExpenses = data.loanPlan.expenses.reduce(
          (sum, item) => sum + Math.round(item.amount),
          0
        );
        const totalRevenues = data.loanPlan.revenues.reduce(
          (sum, item) => sum + Math.round(item.amount),
          0
        );
        updateData.loanPlan = {
          purpose: data.loanPlan.purpose,
          loanAmount: totalCapitalDemand,
          ownCapital,
          borrowedCapital,
          expenses: data.loanPlan.expenses.map((e) => ({
            name: e.name,
            amount: Math.round(e.amount),
          })),
          revenues: data.loanPlan.revenues.map((r) => ({
            name: r.name,
            amount: Math.round(r.amount),
          })),
          totalExpenses,
          totalRevenues,
          profit: totalRevenues - totalExpenses,
        };
      } else {
        updateData.loanPlan = null;
      }
    }

    if (data.mortgageContract !== undefined) {
      if (data.mortgageContract) {
        const expiryRaw =
          data.mortgageContract.contractExpiryDate || data.mortgageContract.contractDuration;
        const parsedExpiry =
          expiryRaw && !Number.isNaN(Date.parse(String(expiryRaw))) ? new Date(expiryRaw) : null;

        updateData.mortgageContract = {
          contractNumber: data.mortgageContract.contractNumber,
          contractDuration: data.mortgageContract.contractDuration ?? null,
          contractExpiryDate: parsedExpiry,
          committeeAuthDate: data.mortgageContract.committeeAuthDate
            ? new Date(data.mortgageContract.committeeAuthDate)
            : null,
        };
      } else {
        updateData.mortgageContract = null;
      }
    }

    return prisma.loan.update({
      where: { id },
      data: updateData,
    });
  }

  async updateStatus(
    id: string,
    status: LoanStatus,
    settlementDate?: Date | null
  ): Promise<Loan> {
    const data: Prisma.LoanUpdateInput = { status };
    if (settlementDate !== undefined) {
      data.settlementDate = settlementDate;
    }
    return prisma.loan.update({
      where: { id },
      data,
    });
  }

  async setMaturityDate(id: string, maturityDate: Date): Promise<Loan> {
    return prisma.loan.update({
      where: { id },
      data: {
        maturityDate,
        status: LoanStatus.DA_GIAI_NGAN,
      },
    });
  }

  async setMaturityTimeline(
    id: string,
    timeline: {
      expectedMaturityDate: Date;
      maturityDate: Date;
      halfTermPaymentDate: Date | null;
    }
  ): Promise<Loan> {
    return prisma.loan.update({
      where: { id },
      data: {
        expectedMaturityDate: timeline.expectedMaturityDate,
        maturityDate: timeline.maturityDate,
        halfTermPaymentDate: timeline.halfTermPaymentDate,
        status: LoanStatus.DA_GIAI_NGAN,
      },
    });
  }

  async softDelete(id: string, reason?: string): Promise<number> {
    const deletedCollaterals = await prisma.collateral.deleteMany({
      where: { loanId: id },
    });

    await prisma.loan.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedReason: reason || 'Hủy/Xóa hồ sơ vay chưa phát sinh giao dịch giải ngân',
      },
    });

    return deletedCollaterals.count;
  }
}

export const loanRepository = new LoanRepository();
