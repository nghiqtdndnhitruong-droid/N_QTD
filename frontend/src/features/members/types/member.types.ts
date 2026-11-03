import type { Gender, IdDocumentType, ListQueryParams } from '@/shared/types';

export interface Member {
  id: string;
  memberCode?: string | null;
  isNewMember?: boolean;
  fullName: string;
  yearOfBirth: number;
  idType: IdDocumentType;
  idNumber: string;
  idIssueDate: string;
  idIssuePlace: string;
  idExpiry: string | null;
  gender: Gender;
  phoneNumber?: string | null;
  provinceId?: string | null;
  provinceName?: string | null;
  communeId?: string | null;
  communeName?: string | null;
  hamletId?: string | null;
  hamletName?: string | null;
  addressDetail?: string | null;
  address: string;
  isDeleted?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMemberPayload {
  memberCode?: string | null;
  isNewMember?: boolean;
  fullName: string;
  yearOfBirth?: number;
  idType: IdDocumentType;
  idNumber: string;
  idIssueDate: string;
  idIssuePlace?: string;
  idExpiry?: string | null;
  gender?: Gender;
  phoneNumber?: string | null;
  provinceId?: string | null;
  communeId?: string | null;
  hamletId?: string | null;
  addressDetail?: string | null;
  address?: string;
}

export type UpdateMemberPayload = Partial<CreateMemberPayload>;

export interface DeleteMemberResult {
  id: string;
  memberCode?: string | null;
  fullName: string;
  deleteMode: 'SOFT_DELETE' | 'HARD_DELETE';
}

export interface MemberListQuery extends ListQueryParams {
  gender?: Gender;
  idType?: IdDocumentType;
  provinceId?: string;
  communeId?: string;
  hamletId?: string;
}
