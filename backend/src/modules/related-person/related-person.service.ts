import { RelatedPersonRepository, relatedPersonRepository } from './related-person.repository';
import { CreateRelatedPersonDto, UpdateRelatedPersonDto } from './related-person.types';
import { AppError } from '../../shared/errors/app-error';
import { ErrorCode } from '../../shared/errors/error-codes';
import { prisma } from '../../config/database';
import { areaService } from '../area/area.service';
import {
  getCanonicalIdIssuePlace,
  isLoanEligibleForRelatedPerson,
  normalizeOptionalPhoneNumber,
  parseCitizenIdInfo,
  requireValidCitizenIdInfo,
} from '../../shared/utils/identity-document.util';
import { LoanStatus } from '@prisma/client';

export class RelatedPersonService {
  constructor(private readonly repo: RelatedPersonRepository = relatedPersonRepository) {}

  /**
   * Kiểm tra điều kiện bắt buộc:
   * Chỉ khoản vay thế chấp (THE_CHAP) có số tiền vay >= 140.000.000 VNĐ mới được phép khai báo / thao tác Người liên quan.
   */
  async ensureLoanEligibility(loanId: string) {
    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
    });

    if (!loan || loan.isDeleted) {
      throw AppError.notFound(`Không tìm thấy khoản vay với ID: ${loanId}`, ErrorCode.LOAN_NOT_FOUND);
    }

    if (!isLoanEligibleForRelatedPerson(loan.loanType, loan.loanAmount)) {
      throw AppError.badRequest(
        'Chỉ khoản vay thế chấp từ 140.000.000 đồng trở lên mới được phép khai báo thông tin người liên quan',
        ErrorCode.LOAN_RELATED_PERSON_NOT_ELIGIBLE
      );
    }

    return loan;
  }

  async create(loanId: string, dto: CreateRelatedPersonDto) {
    const loan = await this.ensureLoanEligibility(loanId);

    // Tự động giải mã giới tính và năm sinh từ số CCCD 12 số
    const cccdInfo = requireValidCitizenIdInfo(dto.idNumber, 'Người liên quan');
    // Tự động điền nơi cấp theo loại giấy tờ
    const canonicalIssuePlace = getCanonicalIdIssuePlace(dto.idType);
    // Chuẩn hóa số điện thoại tùy chọn
    const normalizedPhone = normalizeOptionalPhoneNumber(dto.phoneNumber);

    const location = await areaService.resolveLocationSnapshot({
      provinceId: dto.provinceId,
      communeId: dto.communeId,
      hamletId: dto.hamletId || null,
      addressDetail: dto.addressDetail,
      fallbackAddress: dto.address,
    });

    const created = await this.repo.create(
      loanId,
      {
        ...dto,
        gender: cccdInfo.gender,
        yearOfBirth: cccdInfo.yearOfBirth,
        idIssuePlace: canonicalIssuePlace,
        phoneNumber: normalizedPhone,
      },
      location
    );

    await prisma.auditLog.create({
      data: {
        entityType: 'LOAN',
        entityId: loanId,
        action: 'CREATE',
        reason: 'Thêm người liên quan vào hồ sơ vay',
        metadata: {
          relatedPersonId: created.id,
          fullName: created.fullName,
          idNumber: created.idNumber,
          loanContractNumber: loan.contractNumber,
        },
      },
    });

    return created;
  }

  async getById(loanId: string, personId: string) {
    await this.ensureLoanEligibility(loanId);
    const person = await this.repo.findById(personId);
    if (!person || person.loanId !== loanId) {
      throw AppError.notFound(
        `Không tìm thấy thông tin người liên quan với ID: ${personId}`,
        ErrorCode.RELATED_PERSON_NOT_FOUND
      );
    }
    return person;
  }

  async findByLoanId(loanId: string) {
    await this.ensureLoanEligibility(loanId);
    return this.repo.findByLoanId(loanId);
  }

  async update(loanId: string, personId: string, dto: UpdateRelatedPersonDto) {
    const loan = await this.ensureLoanEligibility(loanId);
    const person = await this.getById(loanId, personId);

    const effectiveIdNumber = dto.idNumber ?? person.idNumber;
    const cccdInfo = dto.idNumber
      ? requireValidCitizenIdInfo(dto.idNumber, 'Người liên quan')
      : parseCitizenIdInfo(effectiveIdNumber);

    const effectiveIdType = dto.idType ?? person.idType;
    const canonicalIssuePlace = getCanonicalIdIssuePlace(effectiveIdType);

    const normalizedDto: UpdateRelatedPersonDto = {
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
        provinceId: dto.provinceId !== undefined ? dto.provinceId : person.provinceId,
        communeId: dto.communeId !== undefined ? dto.communeId : person.communeId,
        hamletId: dto.hamletId !== undefined ? dto.hamletId : null,
        addressDetail:
          dto.addressDetail !== undefined ? dto.addressDetail : person.addressDetail,
        fallbackAddress: dto.address ?? person.address,
      });
    }

    const updated = await this.repo.update(personId, normalizedDto, location);

    await prisma.auditLog.create({
      data: {
        entityType: 'LOAN',
        entityId: loanId,
        action: 'UPDATE',
        reason: 'Cập nhật thông tin người liên quan',
        metadata: {
          relatedPersonId: personId,
          fullName: updated.fullName,
          idNumber: updated.idNumber,
          loanContractNumber: loan.contractNumber,
        },
      },
    });

    return updated;
  }

  async delete(loanId: string, personId: string, reason?: string) {
    const loan = await this.ensureLoanEligibility(loanId);
    const person = await this.getById(loanId, personId);

    // Nếu khoản vay đã hoàn thành hồ sơ hoặc giải ngân, kiểm tra số lượng người liên quan còn lại
    if (
      loan.status === LoanStatus.DA_HOAN_THANH_HO_SO ||
      loan.status === LoanStatus.DA_GIAI_NGAN
    ) {
      const activePersons = await this.repo.findByLoanId(loanId);
      if (activePersons.length <= 1) {
        throw AppError.badRequest(
          'Không thể xóa người liên quan duy nhất của hồ sơ khoản vay đã hoàn thành. Khoản vay thế chấp từ 140.000.000 VNĐ trở lên bắt buộc phải có ít nhất 1 người liên quan.',
          ErrorCode.BAD_REQUEST
        );
      }
    }

    const deleted = await this.repo.softDelete(personId, reason);

    await prisma.auditLog.create({
      data: {
        entityType: 'LOAN',
        entityId: loanId,
        action: 'SOFT_DELETE',
        reason: reason || 'Xóa mềm người liên quan khỏi hồ sơ vay',
        metadata: {
          relatedPersonId: personId,
          fullName: person.fullName,
          idNumber: person.idNumber,
          loanContractNumber: loan.contractNumber,
        },
      },
    });

    return deleted;
  }
}

export const relatedPersonService = new RelatedPersonService();

