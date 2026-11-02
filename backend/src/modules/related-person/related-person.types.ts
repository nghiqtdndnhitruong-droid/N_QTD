import { Gender, IdDocumentType, RelatedPerson } from '@prisma/client';
import { PaginationQuery } from '../../shared/types';

export interface CreateRelatedPersonDto {
  fullName: string;
  yearOfBirth?: number;
  gender?: Gender;
  idType: IdDocumentType;
  idNumber: string;
  idIssueDate: string | Date;
  idIssuePlace?: string;
  idExpiry?: string | Date | null;
  phoneNumber?: string | null;
  relationship?: string | null;
  borrowerRelationship?: string | null;
  relatedPersonRelationship?: string | null;
  provinceId?: string | null;
  communeId?: string | null;
  hamletId?: string | null;
  addressDetail?: string | null;
  address?: string | null;
}

export interface UpdateRelatedPersonDto extends Partial<CreateRelatedPersonDto> {}

export interface RelatedPersonFilterQuery extends PaginationQuery {
  loanId?: string;
  search?: string;
}

export type RelatedPersonEntity = RelatedPerson;
