import { Disbursement } from '@prisma/client';

export interface CreateDisbursementDto {
  loanId: string;
  disbursementDate: string | Date;
  amount: number;
  note?: string;
}

export interface UpdateDisbursementDto {
  disbursementDate?: string | Date;
  amount?: number;
  note?: string;
  reason?: string;
}

export interface DeleteDisbursementDto {
  reason?: string;
}

export type DisbursementEntity = Disbursement;


