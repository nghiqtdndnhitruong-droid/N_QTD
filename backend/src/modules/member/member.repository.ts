import { prisma } from '../../config/database';
import { LoanStatus, Member, Prisma } from '@prisma/client';
import { CreateMemberDto, MemberFilterQuery, UpdateMemberDto } from './member.types';
import { ResolvedLocationSnapshot } from '../area/area.types';
import { parsePagination } from '../../shared/utils/pagination.util';

export class MemberRepository {
  async findById(id: string): Promise<Member | null> {
    const member = await prisma.member.findUnique({
      where: { id },
    });
    if (!member || member.isDeleted) return null;
    return member;
  }

  async findByMemberCode(memberCode: string | null | undefined): Promise<Member | null> {
    if (!memberCode || memberCode.trim().length === 0) return null;
    return prisma.member.findFirst({
      where: {
        memberCode: memberCode.trim(),
        isDeleted: { not: true },
      },
    });
  }

  async findByIdNumber(idNumber: string): Promise<Member | null> {
    return prisma.member.findFirst({
      where: {
        idNumber,
        isDeleted: { not: true },
      },
    });
  }

  async findMany(query: MemberFilterQuery): Promise<{ members: Member[]; total: number }> {
    const { limit, skip, sortBy, sortOrder, search } = parsePagination(query);

    const where: Prisma.MemberWhereInput = {
      isDeleted: { not: true },
    };

    if (query.createdById) {
      where.createdById = query.createdById;
    }

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { memberCode: { contains: search, mode: 'insensitive' } },
        { idNumber: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
        { hamletName: { contains: search, mode: 'insensitive' } },
        { communeName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (query.gender) {
      where.gender = query.gender;
    }

    if (query.idType) {
      where.idType = query.idType;
    }

    if (query.provinceId) {
      where.provinceId = query.provinceId;
    }

    if (query.communeId) {
      where.communeId = query.communeId;
    }

    if (query.hamletId) {
      where.hamletId = query.hamletId;
    }

    const [members, total] = await Promise.all([
      prisma.member.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.member.count({ where }),
    ]);

    return { members, total };
  }

  async create(
    data: CreateMemberDto & {
      yearOfBirth: number;
      gender: Member['gender'];
      idIssuePlace: string;
    },
    location: ResolvedLocationSnapshot
  ): Promise<Member> {
    const cleanCode = data.memberCode && data.memberCode.trim().length > 0 ? data.memberCode.trim() : null;
    const isNewMember = !cleanCode;

    return prisma.member.create({
      data: {
        memberCode: cleanCode,
        isNewMember,
        createdById: data.createdById ?? null,
        fullName: data.fullName.trim(),
        yearOfBirth: data.yearOfBirth,
        idType: data.idType,
        idNumber: data.idNumber.trim(),
        idIssueDate: new Date(data.idIssueDate),
        idIssuePlace: data.idIssuePlace,
        idExpiry: data.idExpiry ? new Date(data.idExpiry) : null,
        gender: data.gender,
        phoneNumber: data.phoneNumber ?? null,
        provinceId: location.provinceId,
        provinceName: location.provinceName,
        communeId: location.communeId,
        communeName: location.communeName,
        hamletId: location.hamletId,
        hamletName: location.hamletName,
        addressDetail: location.addressDetail,
        address: location.address,
        isDeleted: false,
      },
    });
  }

  async update(
    id: string,
    data: UpdateMemberDto,
    location?: ResolvedLocationSnapshot
  ): Promise<Member> {
    const updateData: Prisma.MemberUpdateInput = {};

    if (data.fullName !== undefined) updateData.fullName = data.fullName.trim();
    if (data.memberCode !== undefined) {
      const cleanCode = data.memberCode && data.memberCode.trim().length > 0 ? data.memberCode.trim() : null;
      updateData.memberCode = cleanCode;
      updateData.isNewMember = !cleanCode;
    } else if (data.isNewMember !== undefined) {
      updateData.isNewMember = data.isNewMember;
    }
    if (data.yearOfBirth !== undefined) updateData.yearOfBirth = data.yearOfBirth;
    if (data.idType !== undefined) updateData.idType = data.idType;
    if (data.idNumber !== undefined) updateData.idNumber = data.idNumber.trim();
    if (data.idIssueDate !== undefined) updateData.idIssueDate = new Date(data.idIssueDate);
    if (data.idIssuePlace !== undefined) updateData.idIssuePlace = data.idIssuePlace;
    if (data.idExpiry !== undefined) {
      updateData.idExpiry = data.idExpiry ? new Date(data.idExpiry) : null;
    }
    if (data.gender !== undefined) updateData.gender = data.gender;
    if (data.phoneNumber !== undefined) updateData.phoneNumber = data.phoneNumber;

    if (location) {
      updateData.provinceId = location.provinceId;
      updateData.provinceName = location.provinceName;
      updateData.communeId = location.communeId;
      updateData.communeName = location.communeName;
      updateData.hamletId = location.hamletId;
      updateData.hamletName = location.hamletName;
      updateData.addressDetail = location.addressDetail;
      updateData.address = location.address;
    } else if (data.address !== undefined && data.address !== null) {
      updateData.address = data.address;
    }

    return prisma.member.update({
      where: { id },
      data: updateData,
    });
  }

  async countMemberLoanObligations(memberId: string): Promise<{
    activeLoanCount: number;
    totalLoanCount: number;
    activeContractNumbers: string[];
  }> {
    const allLoans = await prisma.loan.findMany({
      where: { memberId },
      select: {
        id: true,
        contractNumber: true,
        status: true,
        isDeleted: true,
      },
    });

    const activeLoans = allLoans.filter(
      (loan) => !loan.isDeleted && loan.status !== LoanStatus.DA_TAT_TOAN
    );

    return {
      activeLoanCount: activeLoans.length,
      totalLoanCount: allLoans.length,
      activeContractNumbers: activeLoans.map((l) => l.contractNumber || l.id.slice(-6)),
    };
  }

  async softDelete(member: Member, reason?: string): Promise<Member> {
    const suffix = `_DELETED_${Date.now()}`;

    return prisma.member.update({
      where: { id: member.id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedReason: reason || 'Xóa mềm hồ sơ thành viên',
        // Giải phóng unique constraint cho memberCode / idNumber nếu cần đăng ký lại
        memberCode: member.memberCode ? `${member.memberCode}${suffix}` : null,
        idNumber: `${member.idNumber}${suffix}`,
      },
    });
  }

  async hardDelete(id: string): Promise<Member> {
    return prisma.member.delete({
      where: { id },
    });
  }
}

export const memberRepository = new MemberRepository();
