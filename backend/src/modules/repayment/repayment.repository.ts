import { prisma } from '../../config/database';
import { Repayment } from '@prisma/client';
import { CreateRepaymentDto, UpdateRepaymentDto } from './repayment.types';

export class RepaymentRepository {
  async findById(id: string): Promise<Repayment | null> {
    return prisma.repayment.findUnique({
      where: { id },
      include: {
        loan: true,
      },
    });
  }

  async findByLoanId(loanId: string): Promise<Repayment[]> {
    return prisma.repayment.findMany({
      where: { loanId },
      orderBy: { repaymentDate: 'asc' },
    });
  }

  async create(data: CreateRepaymentDto): Promise<Repayment> {
    return prisma.repayment.create({
      data: {
        loanId: data.loanId,
        repaymentDate: new Date(data.repaymentDate),
        principalAmount: data.principalAmount ?? 0,
        interestAmount: data.interestAmount ?? 0,
        interestDays: data.interestDays ?? 0,
        interestStartDate: data.interestStartDate ? new Date(data.interestStartDate) : null,
        interestEndDate: data.interestEndDate ? new Date(data.interestEndDate) : null,
        note: data.note,
        isDeleted: false,
      },
    });
  }

  async update(id: string, data: UpdateRepaymentDto): Promise<Repayment> {
    return prisma.repayment.update({
      where: { id },
      data: {
        ...(data.repaymentDate !== undefined && {
          repaymentDate: new Date(data.repaymentDate),
        }),
        ...(data.principalAmount !== undefined && { principalAmount: data.principalAmount }),
        ...(data.interestAmount !== undefined && { interestAmount: data.interestAmount }),
        ...(data.interestDays !== undefined && { interestDays: data.interestDays }),
        ...(data.interestStartDate !== undefined && {
          interestStartDate: data.interestStartDate ? new Date(data.interestStartDate) : null,
        }),
        ...(data.interestEndDate !== undefined && {
          interestEndDate: data.interestEndDate ? new Date(data.interestEndDate) : null,
        }),
        ...(data.note !== undefined && { note: data.note }),
        ...(data.reason !== undefined && { updatedReason: data.reason }),
      },
    });
  }

  async softDelete(id: string, reason?: string): Promise<Repayment> {
    return prisma.repayment.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedReason: reason || 'Hủy giao dịch thu nợ/trả lãi theo yêu cầu nghiệp vụ',
      },
    });
  }
}

export const repaymentRepository = new RepaymentRepository();


