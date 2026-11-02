import { IdDocumentType, Gender, Member } from '@prisma/client';
import { PaginationQuery } from '../../shared/types';

export interface CreateMemberDto {
  memberCode: string;
  fullName: string;
  yearOfBirth?: number;
  idType: IdDocumentType;
  idNumber: string;
  idIssueDate: string | Date;
  idIssuePlace?: string;
  idExpiry?: string | Date | null;
  gender?: Gender;
  phoneNumber?: string | null;
  provinceId?: string | null;
  communeId?: string | null;
  hamletId?: string | null;
  addressDetail?: string | null;
  address?: string;
}

export interface UpdateMemberDto extends Partial<CreateMemberDto> {}

export interface MemberFilterQuery extends PaginationQuery {
  gender?: Gender;
  idType?: IdDocumentType;
  provinceId?: string;
  communeId?: string;
  hamletId?: string;
}

export interface DeleteMemberResult {
  id: string;
  memberCode: string;
  fullName: string;
  deleteMode: 'SOFT_DELETE' | 'HARD_DELETE';
}

export type MemberEntity = Member;
