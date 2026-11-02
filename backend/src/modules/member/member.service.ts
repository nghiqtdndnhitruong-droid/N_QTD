import { MemberRepository, memberRepository } from './member.repository';
import {
  CreateMemberDto,
  DeleteMemberResult,
  MemberFilterQuery,
  UpdateMemberDto,
} from './member.types';
import { AppError } from '../../shared/errors/app-error';
import { ErrorCode } from '../../shared/errors/error-codes';
import { createPaginationMeta, parsePagination } from '../../shared/utils/pagination.util';
import {
  getCanonicalIdIssuePlace,
  normalizeOptionalPhoneNumber,
  parseCitizenIdInfo,
  requireValidCitizenIdInfo,
} from '../../shared/utils/identity-document.util';
import { areaService } from '../area/area.service';
import { prisma } from '../../config/database';

export class MemberService {
  constructor(private readonly repo: MemberRepository = memberRepository) {}

  async create(dto: CreateMemberDto) {
    const [existingCode, existingIdNumber] = await Promise.all([
      this.repo.findByMemberCode(dto.memberCode),
      this.repo.findByIdNumber(dto.idNumber),
    ]);

    if (existingCode) {
      throw AppError.conflict(
        `Mã thành viên "${dto.memberCode}" đã tồn tại trên hệ thống`,
        ErrorCode.MEMBER_CODE_EXISTS,
        [{ field: 'memberCode', message: `Mã thành viên "${dto.memberCode}" đã tồn tại` }]
      );
    }

    if (existingIdNumber) {
      throw AppError.conflict(
        `Số giấy tờ "${dto.idNumber}" đã được đăng ký bởi thành viên khác`,
        ErrorCode.MEMBER_ID_NUMBER_EXISTS,
        [{ field: 'idNumber', message: `Số giấy tờ "${dto.idNumber}" đã được đăng ký` }]
      );
    }

    // Tự động tính giới tính và năm sinh từ số CCCD 12 chữ số (Mục 3.1)
    const cccdInfo = requireValidCitizenIdInfo(dto.idNumber, 'Thành viên');
    // Tự động điền nơi cấp theo loại giấy tờ (Mục 3.5)
    const canonicalIssuePlace = getCanonicalIdIssuePlace(dto.idType);
    // Chuẩn hóa số điện thoại tùy chọn (Mục 3.2)
    const normalizedPhone = normalizeOptionalPhoneNumber(dto.phoneNumber);

    const location = await areaService.resolveLocationSnapshot({
      provinceId: dto.provinceId,
      communeId: dto.communeId,
      hamletId: dto.hamletId || null,
      addressDetail: dto.addressDetail,
      fallbackAddress: dto.address,
    });

    if (!location.address || location.address.length < 3) {
      throw AppError.badRequest(
        'Vui lòng chọn đầy đủ địa bàn (Tỉnh -> Xã, Ấp có thể bỏ trống) hoặc nhập địa chỉ hợp lệ',
        ErrorCode.VALIDATION_ERROR,
        [{ field: 'communeId', message: 'Vui lòng chọn địa bàn Xã/Tỉnh' }]
      );
    }

    return this.repo.create(
      {
        ...dto,
        gender: cccdInfo.gender,
        yearOfBirth: cccdInfo.yearOfBirth,
        idIssuePlace: canonicalIssuePlace,
        phoneNumber: normalizedPhone,
      },
      location
    );
  }

  async getById(id: string) {
    const member = await this.repo.findById(id);
    if (!member) {
      throw AppError.notFound(
        `Không tìm thấy thành viên với ID: ${id}`,
        ErrorCode.MEMBER_NOT_FOUND
      );
    }
    return member;
  }

  async getByMemberCode(code: string) {
    const member = await this.repo.findByMemberCode(code);
    if (!member) {
      throw AppError.notFound(
        `Không tìm thấy thành viên với mã: ${code}`,
        ErrorCode.MEMBER_NOT_FOUND
      );
    }
    return member;
  }

  async findMany(query: MemberFilterQuery) {
    const { members, total } = await this.repo.findMany(query);
    const { page, limit } = parsePagination(query);
    const pagination = createPaginationMeta(total, page, limit);

    return {
      members,
      pagination,
    };
  }

  async update(id: string, dto: UpdateMemberDto) {
    const member = await this.getById(id);

    if (dto.memberCode && dto.memberCode !== member.memberCode) {
      const existing = await this.repo.findByMemberCode(dto.memberCode);
      if (existing && existing.id !== id) {
        throw AppError.conflict(
          `Mã thành viên "${dto.memberCode}" đã tồn tại`,
          ErrorCode.MEMBER_CODE_EXISTS,
          [{ field: 'memberCode', message: `Mã thành viên "${dto.memberCode}" đã tồn tại` }]
        );
      }
    }

    if (dto.idNumber && dto.idNumber !== member.idNumber) {
      const existing = await this.repo.findByIdNumber(dto.idNumber);
      if (existing && existing.id !== id) {
        throw AppError.conflict(
          `Số giấy tờ "${dto.idNumber}" đã được đăng ký`,
          ErrorCode.MEMBER_ID_NUMBER_EXISTS,
          [{ field: 'idNumber', message: `Số giấy tờ "${dto.idNumber}" đã được đăng ký` }]
        );
      }
    }

    const effectiveIdNumber = dto.idNumber ?? member.idNumber;
    const cccdInfo = dto.idNumber
      ? requireValidCitizenIdInfo(dto.idNumber, 'Thành viên')
      : parseCitizenIdInfo(effectiveIdNumber);

    const effectiveIdType = dto.idType ?? member.idType;
    const canonicalIssuePlace = getCanonicalIdIssuePlace(effectiveIdType);

    const normalizedDto: UpdateMemberDto = {
      ...dto,
      idIssuePlace: canonicalIssuePlace,
      ...(cccdInfo
        ? {
            gender: cccdInfo.gender,
            yearOfBirth: cccdInfo.yearOfBirth,
          }
        : {}),
      ...(dto.phoneNumber !== undefined
        ? { phoneNumber: normalizeOptionalPhoneNumber(dto.phoneNumber) }
        : {}),
    };

    const hasAreaChange =
      dto.provinceId !== undefined ||
      dto.communeId !== undefined ||
      dto.hamletId !== undefined ||
      dto.addressDetail !== undefined;

    let location = undefined;
    if (hasAreaChange) {
      location = await areaService.resolveLocationSnapshot({
        provinceId: dto.provinceId !== undefined ? dto.provinceId : member.provinceId,
        communeId: dto.communeId !== undefined ? dto.communeId : member.communeId,
        hamletId: dto.hamletId !== undefined ? dto.hamletId : null,
        addressDetail:
          dto.addressDetail !== undefined ? dto.addressDetail : member.addressDetail,
        fallbackAddress: dto.address ?? member.address,
      });
    }

    return this.repo.update(id, normalizedDto, location);
  }

  async delete(id: string, reason?: string): Promise<DeleteMemberResult> {
    const member = await this.getById(id);
    const obligations = await this.repo.countMemberLoanObligations(id);

    if (obligations.activeLoanCount > 0) {
      throw AppError.conflict(
        `Không thể xóa thành viên "${member.fullName}" (${member.memberCode}) vì đang có ${obligations.activeLoanCount} khoản vay chưa tất toán (${obligations.activeContractNumbers.join(', ')}). Vui lòng tất toán hoặc hủy hồ sơ vay nháp trước khi xóa thành viên.`,
        ErrorCode.MEMBER_HAS_ACTIVE_LOANS
      );
    }

    if (obligations.totalLoanCount > 0) {
      await this.repo.softDelete(member, reason);
      await prisma.auditLog.create({
        data: {
          entityType: 'MEMBER',
          entityId: member.id,
          action: 'SOFT_DELETE',
          reason:
            reason ||
            'Xóa mềm thành viên đã có lịch sử hồ sơ vay đã tất toán để bảo toàn dấu vết kiểm toán',
          metadata: {
            memberCode: member.memberCode,
            fullName: member.fullName,
            idNumber: member.idNumber,
            historicalLoans: obligations.totalLoanCount,
          },
        },
      });

      return {
        id: member.id,
        memberCode: member.memberCode,
        fullName: member.fullName,
        deleteMode: 'SOFT_DELETE',
      };
    }

    await this.repo.hardDelete(member.id);
    await prisma.auditLog.create({
      data: {
        entityType: 'MEMBER',
        entityId: member.id,
        action: 'HARD_DELETE',
        reason: reason || 'Xóa vĩnh viễn thành viên chưa phát sinh hồ sơ vay',
        metadata: {
          memberCode: member.memberCode,
          fullName: member.fullName,
          idNumber: member.idNumber,
        },
      },
    });

    return {
      id: member.id,
      memberCode: member.memberCode,
      fullName: member.fullName,
      deleteMode: 'HARD_DELETE',
    };
  }
}

export const memberService = new MemberService();
