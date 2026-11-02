import { RepaymentRepository, repaymentRepository } from './repayment.repository';
import {
  CreateRepaymentDto,
  EstimateInterestQuery,
  NextInterestPeriodInfo,
  UpdateRepaymentDto,
} from './repayment.types';
import { prisma } from '../../config/database';
import { AppError } from '../../shared/errors/app-error';
import { ErrorCode } from '../../shared/errors/error-codes';
import { loanCalculationService } from '../loan/loan-calculation.service';
import { LoanStatus } from '@prisma/client';
import { calculateInterestEndDate, formatDate } from '../../shared/utils/date.util';
import dayjs from 'dayjs';

export class RepaymentService {
  constructor(private readonly repo: RepaymentRepository = repaymentRepository) {}

  async getNextInterestPeriod(loanId: string): Promise<NextInterestPeriodInfo> {
    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
      include: {
        disbursements: { where: { isDeleted: { not: true } }, orderBy: { disbursementDate: 'asc' } },
        repayments: { where: { isDeleted: { not: true } }, orderBy: { repaymentDate: 'asc' } },
      },
    });

    if (!loan) {
      throw AppError.notFound(`Không tìm thấy khoản vay với ID: ${loanId}`, ErrorCode.LOAN_NOT_FOUND);
    }

    const summary = loanCalculationService.computeLoanSummary(loan as any);
    const interestRepayments = (loan.repayments || []).filter((r) => r.interestAmount > 0);

    let lastInterestRepaymentDate: Date | null = null;
    let lastInterestEndDate: Date | null = null;
    let suggestedStartDate: Date;

    if (interestRepayments.length > 0) {
      const latest = interestRepayments[interestRepayments.length - 1];
      lastInterestRepaymentDate = latest.repaymentDate;
      lastInterestEndDate = latest.interestEndDate ?? latest.repaymentDate;
      // Ngày bắt đầu kỳ tiếp theo là ngày tiếp theo sau ngày thu lãi đến gần nhất
      suggestedStartDate = dayjs(lastInterestEndDate).add(1, 'day').toDate();
    } else {
      // Nếu chưa có lần thu lãi nào, lấy ngày giải ngân đầu tiên hoặc ngày khởi tạo khoản vay
      const firstDisbursement = loan.disbursements[0];
      suggestedStartDate = firstDisbursement?.disbursementDate ?? loan.loanStartDate ?? loan.createdAt;
    }

    return {
      loanId,
      contractNumber: loan.contractNumber,
      currentPrincipalBalance: summary.currentPrincipalBalance,
      annualInterestRate: loan.interestRate,
      lastInterestRepaymentDate,
      lastInterestEndDate,
      suggestedStartDate,
    };
  }

  async estimateInterest(loanId: string, query: EstimateInterestQuery) {
    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
      include: {
        disbursements: true,
        repayments: true,
      },
    });

    if (!loan) {
      throw AppError.notFound(`Không tìm thấy khoản vay với ID: ${loanId}`, ErrorCode.LOAN_NOT_FOUND);
    }

    const summary = loanCalculationService.computeLoanSummary(loan as any);
    const days = query.days || 90; // Mặc định 90 ngày (3 tháng × 30 ngày)
    const estimatedInterest = loanCalculationService.calculateInterest(
      summary.currentPrincipalBalance,
      loan.interestRate,
      days
    );

    return {
      loanId,
      contractNumber: loan.contractNumber,
      currentPrincipalBalance: summary.currentPrincipalBalance,
      annualInterestRate: loan.interestRate,
      interestCalculationDays: days,
      estimatedInterestAmount: estimatedInterest,
      formula: `${summary.currentPrincipalBalance.toLocaleString('vi-VN')} × ${loan.interestRate}% × ${days} / 365`,
    };
  }

  async create(loanId: string, dto: Omit<CreateRepaymentDto, 'loanId'>) {
    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
      include: {
        disbursements: true,
        repayments: true,
      },
    });

    if (!loan) {
      throw AppError.notFound(`Không tìm thấy khoản vay với ID: ${loanId}`, ErrorCode.LOAN_NOT_FOUND);
    }

    if (loan.status === LoanStatus.DANG_TAO || loan.status === LoanStatus.DA_HOAN_THANH_HO_SO) {
      throw AppError.badRequest(
        'Khoản vay chưa được giải ngân, không thể ghi nhận trả nợ.',
        ErrorCode.BAD_REQUEST
      );
    }

    const summary = loanCalculationService.computeLoanSummary(loan as any);
    const principalAmount = dto.principalAmount ?? 0;
    const interestAmount = dto.interestAmount ?? 0;

    // Không thể trả gốc nhiều hơn dư nợ gốc thực tế còn lại
    if (principalAmount > summary.currentPrincipalBalance) {
      throw AppError.badRequest(
        `Số tiền gốc trả (${principalAmount.toLocaleString('vi-VN')} VNĐ) vượt quá dư nợ gốc còn lại của khoản vay (${summary.currentPrincipalBalance.toLocaleString('vi-VN')} VNĐ).`,
        ErrorCode.BAD_REQUEST
      );
    }

    const repaymentDate = new Date(dto.repaymentDate);

    let interestStartDate: Date | null = null;
    let interestEndDate: Date | null = null;

    if (interestAmount > 0) {
      if (dto.interestStartDate) {
        interestStartDate = new Date(dto.interestStartDate);
      } else {
        const nextPeriod = await this.getNextInterestPeriod(loanId);
        interestStartDate = nextPeriod.suggestedStartDate;
      }

      if (dto.interestEndDate) {
        interestEndDate = new Date(dto.interestEndDate);
      } else if (dto.interestDays && dto.interestDays > 0) {
        interestEndDate = calculateInterestEndDate(interestStartDate, dto.interestDays);
      } else {
        interestEndDate = repaymentDate;
      }

      // Xác thực không trùng kỳ tính lãi với các giao dịch thu lãi trước đó
      const activeInterestRepayments = (loan.repayments || []).filter(
        (r) => !r.isDeleted && r.interestAmount > 0
      );
      for (const r of activeInterestRepayments) {
        const rStart = r.interestStartDate ?? r.repaymentDate;
        const rEnd = r.interestEndDate ?? r.repaymentDate;
        // Kiểm tra giao thoa giữa [interestStartDate, interestEndDate] và [rStart, rEnd]
        if (
          (dayjs(interestStartDate).isSame(dayjs(rStart), 'day') || dayjs(interestStartDate).isAfter(dayjs(rStart), 'day')) &&
          (dayjs(interestStartDate).isSame(dayjs(rEnd), 'day') || dayjs(interestStartDate).isBefore(dayjs(rEnd), 'day'))
        ) {
          throw AppError.badRequest(
            `Kỳ tính lãi mới (${formatDate(interestStartDate)} - ${formatDate(interestEndDate)}) bị trùng lặp với kỳ thu lãi đã ghi nhận trước đó (${formatDate(rStart)} - ${formatDate(rEnd)}).`,
            ErrorCode.BAD_REQUEST
          );
        }
      }
    }

    // Lưu giao dịch trả nợ
    const repayment = await this.repo.create({
      loanId,
      repaymentDate,
      principalAmount,
      interestAmount,
      interestDays: dto.interestDays ?? 0,
      interestStartDate,
      interestEndDate,
      note: dto.note,
    });

    // Kiểm tra xem đã hết nợ gốc chưa
    const remainingPrincipal = summary.currentPrincipalBalance - principalAmount;

    if (remainingPrincipal === 0 && dto.autoSettleIfPaidInFull) {
      await prisma.loan.update({
        where: { id: loanId },
        data: {
          status: LoanStatus.DA_TAT_TOAN,
          settlementDate: repaymentDate,
        },
      });
    }

    return {
      repayment,
      remainingPrincipalBalance: remainingPrincipal,
      isFullySettled: remainingPrincipal === 0,
    };
  }

  async update(id: string, dto: UpdateRepaymentDto) {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw AppError.notFound(
        `Không tìm thấy bản ghi trả nợ với ID: ${id}`,
        ErrorCode.REPAYMENT_NOT_FOUND
      );
    }

    if (existing.isDeleted) {
      throw AppError.badRequest(
        'Không thể chỉnh sửa bản ghi trả nợ đã bị hủy / vô hiệu hóa.',
        ErrorCode.REPAYMENT_INVALID_MODIFICATION
      );
    }

    const loan = await prisma.loan.findUnique({
      where: { id: existing.loanId },
      include: {
        disbursements: true,
        repayments: true,
      },
    });

    if (!loan) {
      throw AppError.notFound(
        `Không tìm thấy khoản vay liên kết với ID: ${existing.loanId}`,
        ErrorCode.LOAN_NOT_FOUND
      );
    }

    const activeDisbursements = loan.disbursements.filter((d) => !d.isDeleted);
    const activeRepayments = loan.repayments.filter((r) => !r.isDeleted);

    const totalDisbursed = activeDisbursements.reduce((sum, d) => sum + d.amount, 0);
    const otherPrincipalPaid = activeRepayments
      .filter((r) => r.id !== id)
      .reduce((sum, r) => sum + r.principalAmount, 0);

    const nextPrincipalAmount = dto.principalAmount ?? existing.principalAmount;
    const nextInterestAmount = dto.interestAmount ?? existing.interestAmount;

    if (nextPrincipalAmount <= 0 && nextInterestAmount <= 0) {
      throw AppError.badRequest(
        'Giao dịch trả nợ phải có ít nhất tiền gốc hoặc tiền lãi lớn hơn 0.',
        ErrorCode.REPAYMENT_INVALID_MODIFICATION
      );
    }

    const newTotalPrincipalPaid = otherPrincipalPaid + nextPrincipalAmount;
    if (newTotalPrincipalPaid > totalDisbursed) {
      const maxAllowedPrincipal = Math.max(0, totalDisbursed - otherPrincipalPaid);
      throw AppError.badRequest(
        `Số tiền gốc trả sau khi sửa (${nextPrincipalAmount.toLocaleString('vi-VN')} VNĐ) làm tổng nợ gốc đã trả (${newTotalPrincipalPaid.toLocaleString('vi-VN')} VNĐ) vượt quá tổng tiền đã giải ngân (${totalDisbursed.toLocaleString('vi-VN')} VNĐ). Tối đa cho phép: ${maxAllowedPrincipal.toLocaleString('vi-VN')} VNĐ.`,
        ErrorCode.REPAYMENT_INVALID_MODIFICATION
      );
    }

    const beforeSnapshot = {
      repaymentDate: existing.repaymentDate,
      principalAmount: existing.principalAmount,
      interestAmount: existing.interestAmount,
      interestDays: existing.interestDays,
      note: existing.note,
    };

    const updated = await this.repo.update(id, dto);

    const remainingPrincipal = Math.max(0, totalDisbursed - newTotalPrincipalPaid);
    if (remainingPrincipal === 0 && totalDisbursed > 0) {
      await prisma.loan.update({
        where: { id: loan.id },
        data: {
          status: LoanStatus.DA_TAT_TOAN,
          settlementDate: updated.repaymentDate,
        },
      });
    } else if (loan.status === LoanStatus.DA_TAT_TOAN && remainingPrincipal > 0) {
      await prisma.loan.update({
        where: { id: loan.id },
        data: {
          status: LoanStatus.DA_GIAI_NGAN,
          settlementDate: null,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        entityType: 'REPAYMENT',
        entityId: id,
        action: 'UPDATE',
        reason: dto.reason || 'Cập nhật thông tin giao dịch thu nợ/trả lãi',
        metadata: {
          loanId: loan.id,
          contractNumber: loan.contractNumber,
          before: beforeSnapshot,
          after: {
            repaymentDate: updated.repaymentDate,
            principalAmount: updated.principalAmount,
            interestAmount: updated.interestAmount,
            interestDays: updated.interestDays,
            note: updated.note,
          },
        },
      },
    });

    return {
      repayment: updated,
      remainingPrincipalBalance: remainingPrincipal,
      isFullySettled: remainingPrincipal === 0,
    };
  }

  async delete(id: string, reason?: string) {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw AppError.notFound(
        `Không tìm thấy bản ghi trả nợ với ID: ${id}`,
        ErrorCode.REPAYMENT_NOT_FOUND
      );
    }

    if (existing.isDeleted) {
      throw AppError.badRequest(
        'Bản ghi trả nợ này đã bị hủy trước đó.',
        ErrorCode.REPAYMENT_INVALID_MODIFICATION
      );
    }

    const loan = await prisma.loan.findUnique({
      where: { id: existing.loanId },
      include: {
        disbursements: true,
        repayments: true,
      },
    });

    if (!loan) {
      throw AppError.notFound(
        `Không tìm thấy khoản vay liên kết với ID: ${existing.loanId}`,
        ErrorCode.LOAN_NOT_FOUND
      );
    }

    const deleted = await this.repo.softDelete(id, reason);

    const activeDisbursements = loan.disbursements.filter((d) => !d.isDeleted);
    const remainingActiveRepayments = loan.repayments.filter(
      (r) => !r.isDeleted && r.id !== id
    );

    const totalDisbursed = activeDisbursements.reduce((sum, d) => sum + d.amount, 0);
    const totalPrincipalPaid = remainingActiveRepayments.reduce(
      (sum, r) => sum + r.principalAmount,
      0
    );
    const remainingPrincipal = Math.max(0, totalDisbursed - totalPrincipalPaid);

    if (loan.status === LoanStatus.DA_TAT_TOAN && remainingPrincipal > 0) {
      await prisma.loan.update({
        where: { id: loan.id },
        data: {
          status: LoanStatus.DA_GIAI_NGAN,
          settlementDate: null,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        entityType: 'REPAYMENT',
        entityId: id,
        action: 'SOFT_DELETE',
        reason: reason || 'Hủy / vô hiệu hóa giao dịch thu nợ/trả lãi',
        metadata: {
          loanId: loan.id,
          contractNumber: loan.contractNumber,
          before: {
            repaymentDate: existing.repaymentDate,
            principalAmount: existing.principalAmount,
            interestAmount: existing.interestAmount,
            interestDays: existing.interestDays,
            note: existing.note,
          },
        },
      },
    });

    return {
      repayment: deleted,
      remainingPrincipalBalance: remainingPrincipal,
      isFullySettled: remainingPrincipal === 0 && totalDisbursed > 0,
    };
  }

  async getByLoanId(loanId: string) {
    return this.repo.findByLoanId(loanId);
  }

  async getById(id: string) {
    const item = await this.repo.findById(id);
    if (!item) {
      throw AppError.notFound(
        `Không tìm thấy bản ghi trả nợ với ID: ${id}`,
        ErrorCode.REPAYMENT_NOT_FOUND
      );
    }
    return item;
  }
}

export const repaymentService = new RepaymentService();


