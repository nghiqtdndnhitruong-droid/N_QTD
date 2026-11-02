import { prisma } from '../../config/database';
import { Prisma, RelatedPerson } from '@prisma/client';
import { CreateRelatedPersonDto, UpdateRelatedPersonDto } from './related-person.types';
import { ResolvedLocationSnapshot } from '../area/area.types';

export class RelatedPersonRepository {
  async findById(id: string): Promise<RelatedPerson | null> {
    const person = await prisma.relatedPerson.findUnique({
      where: { id },
    });
    if (!person || person.isDeleted) return null;
    return person;
  }

  async findByLoanId(loanId: string, includeDeleted = false): Promise<RelatedPerson[]> {
    return prisma.relatedPerson.findMany({
      where: {
        loanId,
        ...(includeDeleted ? {} : { isDeleted: { not: true } }),
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(
    loanId: string,
    data: CreateRelatedPersonDto,
    location?: ResolvedLocationSnapshot
  ): Promise<RelatedPerson> {
    return prisma.relatedPerson.create({
      data: {
        loanId,
        fullName: data.fullName.trim(),
        yearOfBirth: data.yearOfBirth!,
        gender: data.gender!,
        idType: data.idType,
        idNumber: data.idNumber.trim(),
        idIssueDate: new Date(data.idIssueDate),
        idIssuePlace: data.idIssuePlace!,
        idExpiry: data.idExpiry ? new Date(data.idExpiry) : null,
        phoneNumber: data.phoneNumber ?? null,
        relationship: data.relationship?.trim() || null,
        provinceId: location?.provinceId ?? data.provinceId ?? null,
        provinceName: location?.provinceName ?? null,
        communeId: location?.communeId ?? data.communeId ?? null,
        communeName: location?.communeName ?? null,
        hamletId: location?.hamletId ?? data.hamletId ?? null,
        hamletName: location?.hamletName ?? null,
        addressDetail: location?.addressDetail ?? data.addressDetail ?? null,
        address: location?.address || data.address || '',
        isDeleted: false,
      },
    });
  }

  async update(
    id: string,
    data: UpdateRelatedPersonDto,
    location?: ResolvedLocationSnapshot
  ): Promise<RelatedPerson> {
    const updateData: Prisma.RelatedPersonUpdateInput = {};

    if (data.fullName !== undefined) updateData.fullName = data.fullName.trim();
    if (data.yearOfBirth !== undefined) updateData.yearOfBirth = data.yearOfBirth;
    if (data.gender !== undefined) updateData.gender = data.gender;
    if (data.idType !== undefined) updateData.idType = data.idType;
    if (data.idNumber !== undefined) updateData.idNumber = data.idNumber.trim();
    if (data.idIssueDate !== undefined) updateData.idIssueDate = new Date(data.idIssueDate);
    if (data.idIssuePlace !== undefined) updateData.idIssuePlace = data.idIssuePlace;
    if (data.idExpiry !== undefined) {
      updateData.idExpiry = data.idExpiry ? new Date(data.idExpiry) : null;
    }
    if (data.phoneNumber !== undefined) updateData.phoneNumber = data.phoneNumber;
    if (data.relationship !== undefined) {
      updateData.relationship = data.relationship ? data.relationship.trim() : null;
    }

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

    return prisma.relatedPerson.update({
      where: { id },
      data: updateData,
    });
  }

  async softDelete(id: string, reason?: string): Promise<RelatedPerson> {
    return prisma.relatedPerson.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedReason: reason || 'Xóa người liên quan khỏi hồ sơ vay',
      },
    });
  }
}

export const relatedPersonRepository = new RelatedPersonRepository();
