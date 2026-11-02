import { DisbursementRepository, disbursementRepository } from './disbursement.repository';
import { CreateDisbursementDto, UpdateDisbursementDto } from './disbursement.types';
import { prisma } from '../../config/database';
import { AppError } from '../../shared/errors/app-error';
import { ErrorCode } from '../../shared/errors/error-codes';
import { LoanStatus, LoanTermType, LoanType } from '@prisma/client';
import { addMonthsToDate } from '../../shared/utils/date.util';
import dayjs from 'dayjs';

export class DisbursementService {
  constructor(private readonly repo: DisbursementRepository = disbursementRepository) {}

  async create(loanId: string, dto: Omit<CreateDisbursementDto, 'loanId'>) {
    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
      include: { disbursements: true },
    });

    if (!loan) {
      throw AppError.notFound(`Không tìm thấy khoản vay với ID: ${loanId}`, ErrorCode.LOAN_NOT_FOUND);
    }

    // 1. Kiểm tra trạng thái khoản vay
    const allowedStatuses: LoanStatus[] = [
      LoanStatus.DA_HOAN_THANH_HO_SO,
      LoanStatus.DA_GIAI_NGAN,
    ];

    if (!allowedStatuses.includes(loan.status)) {
      throw AppError.badRequest(
        `Không thể giải ngân cho khoản vay đang ở trạng thái "${loan.status}". Hồ sơ phải ở trạng thái "Đã hoàn thành hồ sơ" hoặc "Đã giải ngân".`,
        ErrorCode.LOAN_CANNOT_DISBURSE
      );
    }

    // 2. Kiểm tra hạn mức giải ngân (chỉ tính các giao dịch đang hiệu lực)
    const activeDisbursements = loan.disbursements.filter((d) => !d.isDeleted);
    const currentTotalDisbursed = activeDisbursements.reduce((sum, d) => sum + d.amount, 0);
    const newTotalDisbursed = currentTotalDisbursed + dto.amount;

    if (newTotalDisbursed > loan.loanAmount) {
      const remaining = Math.max(0, loan.loanAmount - currentTotalDisbursed);
      throw AppError.badRequest(
        `Số tiền giải ngân (${dto.amount.toLocaleString('vi-VN')} VNĐ) vượt quá hạn mức còn lại được phép giải ngân (${remaining.toLocaleString('vi-VN')} VNĐ). Tổng hạn mức duyệt: ${loan.loanAmount.toLocaleString('vi-VN')} VNĐ.`,
        ErrorCode.LOAN_DISBURSEMENT_EXCEEDED
      );
    }

    const disbursementDate = new Date(dto.disbursementDate);

    // 3. Thực hiện tạo giao dịch giải ngân
    const disbursement = await this.repo.create({
      loanId,
      disbursementDate,
      amount: dto.amount,
      note: dto.note,
    });

    // 4. Nếu đây là lần giải ngân hiệu lực đầu tiên, thiết lập ngày đáo hạn và đổi trạng thái
    if (activeDisbursements.length === 0 || !loan.maturityDate) {
      const expectedMaturityDate = addMonthsToDate(disbursementDate, loan.termMonths);
      let actualMaturityDate = expectedMaturityDate;

      // Xử lý rút ngắn theo Hợp đồng thế chấp nếu có (Mục 3.4)
      if (loan.loanType === LoanType.THE_CHAP && loan.mortgageContract?.contractExpiryDate) {
        const expiryDate = new Date(loan.mortgageContract.contractExpiryDate);
        if (!Number.isNaN(expiryDate.getTime()) && dayjs(expiryDate).isBefore(dayjs(expectedMaturityDate), 'day')) {
          actualMaturityDate = expiryDate;
        }
      }

      // Xử lý mốc trả phân nửa cho khoản vay trung hạn (Mục 3.5)
      let halfTermPaymentDate: Date | null = null;
      if (loan.termType === LoanTermType.TRUNG_HAN) {
        const nominalHalfTerm = addMonthsToDate(disbursementDate, 12);
        halfTermPaymentDate = dayjs(actualMaturityDate).isBefore(dayjs(nominalHalfTerm), 'day')
          ? actualMaturityDate
          : nominalHalfTerm;
      }

      await prisma.loan.update({
        where: { id: loanId },
        data: {
          expectedMaturityDate,
          maturityDate: actualMaturityDate,
          halfTermPaymentDate,
          status: LoanStatus.DA_GIAI_NGAN,
        },
      });
    }

    return disbursement;
  }

  async update(id: string, dto: UpdateDisbursementDto) {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw AppError.notFound(
        `Không tìm thấy giao dịch giải ngân với ID: ${id}`,
        ErrorCode.DISBURSEMENT_NOT_FOUND
      );
    }

    if (existing.isDeleted) {
      throw AppError.badRequest(
        'Không thể chỉnh sửa giao dịch giải ngân đã bị hủy / vô hiệu hóa.',
        ErrorCode.DISBURSEMENT_INVALID_MODIFICATION
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

    const otherDisbursedTotal = activeDisbursements
      .filter((d) => d.id !== id)
      .reduce((sum, d) => sum + d.amount, 0);
    const newAmount = dto.amount ?? existing.amount;
    const newTotalDisbursed = otherDisbursedTotal + newAmount;

    if (newTotalDisbursed > loan.loanAmount) {
      throw AppError.badRequest(
        `Tổng tiền giải ngân sau khi sửa (${newTotalDisbursed.toLocaleString('vi-VN')} VNĐ) vượt quá hạn mức khoản vay (${loan.loanAmount.toLocaleString('vi-VN')} VNĐ).`,
        ErrorCode.LOAN_DISBURSEMENT_EXCEEDED
      );
    }

    const totalPrincipalPaid = activeRepayments.reduce((sum, r) => sum + r.principalAmount, 0);
    if (newTotalDisbursed < totalPrincipalPaid) {
      throw AppError.badRequest(
        `Không thể giảm tổng tiền giải ngân xuống (${newTotalDisbursed.toLocaleString('vi-VN')} VNĐ) thấp hơn tổng nợ gốc đã thu (${totalPrincipalPaid.toLocaleString('vi-VN')} VNĐ).`,
        ErrorCode.DISBURSEMENT_INVALID_MODIFICATION
      );
    }

    const beforeSnapshot = {
      disbursementDate: existing.disbursementDate,
      amount: existing.amount,
      note: existing.note,
    };

    const updated = await this.repo.update(id, dto);

    // Cập nhật lại ngày đáo hạn từ đợt giải ngân hiệu lực sớm nhất và trạng thái khoản vay
    const updatedActiveDisbursements = activeDisbursements
      .map((d) => (d.id === id ? updated : d))
      .sort((a, b) => new Date(a.disbursementDate).getTime() - new Date(b.disbursementDate).getTime());

    if (updatedActiveDisbursements.length > 0) {
      const earliestDate = new Date(updatedActiveDisbursements[0].disbursementDate);
      const newMaturityDate = addMonthsToDate(earliestDate, loan.termMonths);
      const remainingPrincipal = newTotalDisbursed - totalPrincipalPaid;

      let nextStatus = loan.status;
      let nextSettlementDate = loan.settlementDate;
      if (remainingPrincipal === 0 && totalPrincipalPaid > 0) {
        nextStatus = LoanStatus.DA_TAT_TOAN;
        nextSettlementDate = loan.settlementDate || new Date();
      } else if (loan.status === LoanStatus.DA_TAT_TOAN && remainingPrincipal > 0) {
        nextStatus = LoanStatus.DA_GIAI_NGAN;
        nextSettlementDate = null;
      }

      await prisma.loan.update({
        where: { id: loan.id },
        data: {
          maturityDate: newMaturityDate,
          status: nextStatus,
          settlementDate: nextSettlementDate,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        entityType: 'DISBURSEMENT',
        entityId: id,
        action: 'UPDATE',
        reason: dto.reason || 'Cập nhật thông tin giao dịch giải ngân',
        metadata: {
          loanId: loan.id,
          contractNumber: loan.contractNumber,
          before: beforeSnapshot,
          after: {
            disbursementDate: updated.disbursementDate,
            amount: updated.amount,
            note: updated.note,
          },
        },
      },
    });

    return updated;
  }

  async delete(id: string, reason?: string) {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw AppError.notFound(
        `Không tìm thấy giao dịch giải ngân với ID: ${id}`,
        ErrorCode.DISBURSEMENT_NOT_FOUND
      );
    }

    if (existing.isDeleted) {
      throw AppError.badRequest(
        'Giao dịch giải ngân này đã bị hủy trước đó.',
        ErrorCode.DISBURSEMENT_INVALID_MODIFICATION
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

    const remainingActiveDisbursements = loan.disbursements.filter(
      (d) => !d.isDeleted && d.id !== id
    );
    const activeRepayments = loan.repayments.filter((r) => !r.isDeleted);

    const remainingTotalDisbursed = remainingActiveDisbursements.reduce(
      (sum, d) => sum + d.amount,
      0
    );
    const totalPrincipalPaid = activeRepayments.reduce((sum, r) => sum + r.principalAmount, 0);

    // Nếu đã có giao dịch thu nợ/trả lãi hiệu lực mà hủy hết toàn bộ các đợt giải ngân thì không hợp lệ
    if (remainingActiveDisbursements.length === 0 && activeRepayments.length > 0) {
      throw AppError.badRequest(
        'Không thể hủy đợt giải ngân duy nhất khi khoản vay vẫn còn giao dịch thu nợ/trả lãi đang hiệu lực. Vui lòng hủy các giao dịch trả nợ liên quan trước.',
        ErrorCode.DISBURSEMENT_INVALID_MODIFICATION
      );
    }

    if (remainingTotalDisbursed < totalPrincipalPaid) {
      throw AppError.badRequest(
        `Không thể hủy đợt giải ngân này vì tổng giải ngân còn lại (${remainingTotalDisbursed.toLocaleString('vi-VN')} VNĐ) sẽ nhỏ hơn tổng nợ gốc đã thu (${totalPrincipalPaid.toLocaleString('vi-VN')} VNĐ).`,
        ErrorCode.DISBURSEMENT_INVALID_MODIFICATION
      );
    }

    const deleted = await this.repo.softDelete(id, reason);

    // Tính lại trạng thái khoản vay và ngày đáo hạn
    if (remainingActiveDisbursements.length === 0) {
      await prisma.loan.update({
        where: { id: loan.id },
        data: {
          status: LoanStatus.DA_HOAN_THANH_HO_SO,
          maturityDate: null,
          settlementDate: null,
        },
      });
    } else {
      const sorted = [...remainingActiveDisbursements].sort(
        (a, b) => new Date(a.disbursementDate).getTime() - new Date(b.disbursementDate).getTime()
      );
      const earliestDate = new Date(sorted[0].disbursementDate);
      const newMaturityDate = addMonthsToDate(earliestDate, loan.termMonths);
      const remainingPrincipal = remainingTotalDisbursed - totalPrincipalPaid;

      let nextStatus = loan.status;
      let nextSettlementDate = loan.settlementDate;
      if (remainingPrincipal === 0 && totalPrincipalPaid > 0) {
        nextStatus = LoanStatus.DA_TAT_TOAN;
        nextSettlementDate = loan.settlementDate || new Date();
      } else if (loan.status === LoanStatus.DA_TAT_TOAN && remainingPrincipal > 0) {
        nextStatus = LoanStatus.DA_GIAI_NGAN;
        nextSettlementDate = null;
      }

      await prisma.loan.update({
        where: { id: loan.id },
        data: {
          maturityDate: newMaturityDate,
          status: nextStatus,
          settlementDate: nextSettlementDate,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        entityType: 'DISBURSEMENT',
        entityId: id,
        action: 'SOFT_DELETE',
        reason: reason || 'Hủy / vô hiệu hóa giao dịch giải ngân',
        metadata: {
          loanId: loan.id,
          contractNumber: loan.contractNumber,
          before: {
            disbursementDate: existing.disbursementDate,
            amount: existing.amount,
            note: existing.note,
          },
        },
      },
    });

    return deleted;
  }

  async getByLoanId(loanId: string) {
    return this.repo.findByLoanId(loanId);
  }

  async getById(id: string) {
    const item = await this.repo.findById(id);
    if (!item) {
      throw AppError.notFound(
        `Không tìm thấy giao dịch giải ngân với ID: ${id}`,
        ErrorCode.DISBURSEMENT_NOT_FOUND
      );
    }
    return item;
  }
}

export const disbursementService = new DisbursementService();


