import { prisma } from '../../config/database';
import { Disbursement } from '@prisma/client';
import { CreateDisbursementDto, UpdateDisbursementDto } from './disbursement.types';

export class DisbursementRepository {
  async findById(id: string): Promise<Disbursement | null> {
    return prisma.disbursement.findUnique({
      where: { id },
      include: {
        loan: true,
      },
    });
  }

  async findByLoanId(loanId: string): Promise<Disbursement[]> {
    return prisma.disbursement.findMany({
      where: { loanId },
      orderBy: { disbursementDate: 'asc' },
    });
  }

  async create(data: CreateDisbursementDto): Promise<Disbursement> {
    return prisma.disbursement.create({
      data: {
        loanId: data.loanId,
        disbursementDate: new Date(data.disbursementDate),
        amount: data.amount,
        note: data.note,
        isDeleted: false,
      },
    });
  }

  async update(id: string, data: UpdateDisbursementDto): Promise<Disbursement> {
    return prisma.disbursement.update({
      where: { id },
      data: {
        ...(data.disbursementDate !== undefined && {
          disbursementDate: new Date(data.disbursementDate),
        }),
        ...(data.amount !== undefined && { amount: data.amount }),
        ...(data.note !== undefined && { note: data.note }),
        ...(data.reason !== undefined && { updatedReason: data.reason }),
      },
    });
  }

  async softDelete(id: string, reason?: string): Promise<Disbursement> {
    return prisma.disbursement.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedReason: reason || 'Hủy giao dịch giải ngân theo yêu cầu nghiệp vụ',
      },
    });
  }

  async calculateTotalDisbursedByLoanId(loanId: string): Promise<number> {
    const list = await prisma.disbursement.findMany({
      where: { loanId, isDeleted: { not: true } },
      select: { amount: true },
    });
    return list.reduce((sum, item) => sum + item.amount, 0);
  }
}

export const disbursementRepository = new DisbursementRepository();


