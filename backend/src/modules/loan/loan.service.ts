import { LoanRepository, loanRepository } from './loan.repository';
import {
  CalculateLoanPlanTemplateQuery,
  CreateLoanDto,
  DeleteLoanResult,
  LoanFilterQuery,
  UpdateLoanDto,
} from './loan.types';
import { interestRateService } from '../interest-rate/interest-rate.service';
import { collateralRepository } from '../collateral/collateral.repository';
import { loanCalculationService } from './loan-calculation.service';
import { MemberRepository, memberRepository } from '../member/member.repository';
import { AppError } from '../../shared/errors/app-error';
import { ErrorCode } from '../../shared/errors/error-codes';
import { LOAN_CONSTANTS } from '../../shared/constants';
import { LoanStatus, LoanTermType, LoanType, Prisma } from '@prisma/client';
import { createPaginationMeta, parsePagination } from '../../shared/utils/pagination.util';
import { addMonthsToDate, formatDate } from '../../shared/utils/date.util';
import { areaService } from '../area/area.service';
import { ResolvedLocationSnapshot } from '../area/area.types';
import { prisma } from '../../config/database';
import dayjs from 'dayjs';
import {
  getCanonicalIdIssuePlace,
  isLoanEligibleForRelatedPerson,
  normalizeOptionalPhoneNumber,
  requireValidCitizenIdInfo,
} from '../../shared/utils/identity-document.util';
import { relatedPersonService } from '../related-person/related-person.service';

export class LoanService {
  constructor(
    private readonly repo: LoanRepository = loanRepository,
    private readonly memberRepo: MemberRepository = memberRepository
  ) {}

  /**
   * Tính toán các mốc ngày đáo hạn dự kiến, ngày đáo hạn thực tế và ngày trả phân nửa.
   * Quy tắc nghiệp vụ (Mục 3.4 & 3.5):
   * - expectedMaturityDate: tính theo thời hạn vay (12 hoặc 24 tháng).
   * - Nếu hợp đồng thế chấp hết hạn sớm hơn: ngày đáo hạn thực tế maturityDate lấy theo contractExpiryDate.
   *   Hiển thị cảnh báo cho người dùng, KHÔNG CHẶN tạo/sửa khoản vay.
   * - Nếu là vay trung hạn: halfTermPaymentDate lấy mốc 12 tháng, nhưng không được vượt quá maturityDate thực tế.
   */
  calculateMaturityTimeline(
    startDate: Date,
    termMonths: number,
    termType: LoanTermType,
    loanType: LoanType,
    mortgageExpiryDateRaw?: string | Date | null
  ): {
    expectedMaturityDate: Date;
    maturityDate: Date;
    halfTermPaymentDate: Date | null;
    isMortgageShortened: boolean;
    warningMessage?: string;
  } {
    const expectedMaturityDate = addMonthsToDate(startDate, termMonths);
    let maturityDate = expectedMaturityDate;
    let isMortgageShortened = false;
    let warningMessage: string | undefined;

    if (loanType === LoanType.THE_CHAP && mortgageExpiryDateRaw) {
      const expiryDate = new Date(mortgageExpiryDateRaw);
      if (!Number.isNaN(expiryDate.getTime())) {
        if (dayjs(expiryDate).isBefore(dayjs(expectedMaturityDate), 'day')) {
          maturityDate = expiryDate;
          isMortgageShortened = true;
          warningMessage = `Hợp đồng thế chấp hết hạn ngày ${formatDate(expiryDate)}, ngắn hơn thời hạn vay dự kiến (${termMonths} tháng - đến ngày ${formatDate(expectedMaturityDate)}). Ngày đáo hạn thực tế sẽ được điều chỉnh theo HĐ thế chấp.`;
        }
      }
    }

    let halfTermPaymentDate: Date | null = null;
    if (termType === LoanTermType.TRUNG_HAN) {
      const nominalHalfTerm = addMonthsToDate(startDate, 12);
      if (dayjs(maturityDate).isBefore(dayjs(nominalHalfTerm), 'day')) {
        halfTermPaymentDate = maturityDate;
      } else {
        halfTermPaymentDate = nominalHalfTerm;
      }
    }

    return {
      expectedMaturityDate,
      maturityDate,
      halfTermPaymentDate,
      isMortgageShortened,
      warningMessage,
    };
  }

  private async ensureUniqueContractNumber(contractNumber?: string | null, excludeLoanId?: string) {
    if (!contractNumber || !contractNumber.trim()) return;
    const trimmed = contractNumber.trim();
    const existing = await this.repo.findByContractNumber(trimmed, excludeLoanId);
    if (existing) {
      throw AppError.conflict(
        `Số khế ước "${trimmed}" đã tồn tại trong hệ thống. Mỗi khoản vay phải có số khế ước riêng biệt.`,
        ErrorCode.LOAN_CONTRACT_NUMBER_EXISTS,
        [
          {
            field: 'contractNumber',
            message: `Số khế ước "${trimmed}" đã tồn tại trong hệ thống`,
          },
        ]
      );
    }
  }

  private validateAndNormalizeLoanPlan(
    loanPlan: CreateLoanDto['loanPlan'],
    effectiveLoanAmount: number
  ) {
    if (!loanPlan) return;
    const totalCapitalDemand = Math.round(loanPlan.loanAmount);
    const borrowed = Math.round(effectiveLoanAmount);
    if (totalCapitalDemand < borrowed) {
      throw AppError.badRequest(
        `Tổng nhu cầu vốn (${totalCapitalDemand.toLocaleString('vi-VN')} VNĐ) không được nhỏ hơn Số tiền vay (${borrowed.toLocaleString('vi-VN')} VNĐ). Vốn tự có không được âm.`,
        ErrorCode.LOAN_PLAN_INVALID_CAPITAL,
        [
          {
            field: 'loanAmount',
            message: 'Tổng nhu cầu vốn phải lớn hơn hoặc bằng Số tiền vay (Vốn tự có >= 0)',
          },
        ]
      );
    }
  }

  calculatePlanTemplate(query: CalculateLoanPlanTemplateQuery) {
    return loanCalculationService.calculatePlanFromTemplate(query);
  }

  async create(dto: CreateLoanDto) {
    // 1. Kiểm tra thành viên tồn tại
    const member = await this.memberRepo.findById(dto.memberId);
    if (!member) {
      throw AppError.notFound(
        `Không tìm thấy thành viên với ID: ${dto.memberId}`,
        ErrorCode.MEMBER_NOT_FOUND
      );
    }

    // 1b. Kiểm tra tính duy nhất của Số khế ước (contractNumber)
    await this.ensureUniqueContractNumber(dto.contractNumber);

    // 1c. Kiểm tra Phương án vay (nếu có gửi kèm)
    this.validateAndNormalizeLoanPlan(dto.loanPlan, dto.loanAmount);

    // 1d. Tự động chuẩn hóa Người thừa kế (nếu có)
    if (dto.heir) {
      const cccdInfo = requireValidCitizenIdInfo(dto.heir.idNumber, 'Người thừa kế');
      dto.heir.gender = cccdInfo.gender;
      dto.heir.yearOfBirth = cccdInfo.yearOfBirth;
      dto.heir.idIssuePlace = getCanonicalIdIssuePlace(dto.heir.idType);
      dto.heir.phoneNumber = normalizeOptionalPhoneNumber(dto.heir.phoneNumber);
    }

    // 1e. Kiểm tra điều kiện Người liên quan (chỉ áp dụng THE_CHAP và loanAmount >= 140tr)
    const isRelatedEligible = isLoanEligibleForRelatedPerson(dto.loanType, dto.loanAmount);
    if (!isRelatedEligible && dto.relatedPersons && dto.relatedPersons.length > 0) {
      throw AppError.badRequest(
        'Chỉ khoản vay thế chấp từ 140.000.000 đồng trở lên mới được phép khai báo thông tin người liên quan',
        ErrorCode.LOAN_RELATED_PERSON_NOT_ELIGIBLE
      );
    }

    // 2. Xác định kỳ hạn vay & ngày khởi tạo
    const termMonths =
      dto.termType === LoanTermType.NGAN_HAN
        ? LOAN_CONSTANTS.SHORT_TERM_MONTHS
        : LOAN_CONSTANTS.MEDIUM_TERM_MONTHS;
    const loanStartDate = dto.loanStartDate ? new Date(dto.loanStartDate) : new Date();

    // 3. Tính toán các mốc đáo hạn dự kiến, thực tế và mốc trả phân nửa (Mục 3.4 & 3.5)
    const timeline = this.calculateMaturityTimeline(
      loanStartDate,
      termMonths,
      dto.termType,
      dto.loanType,
      dto.mortgageContract?.contractExpiryDate
    );

    // 4. Kiểm tra tài sản nhập kèm khi tạo khoản vay:
    //    - Cả Vay thế chấp và Vay tín chấp đều cho phép khai báo tài sản.
    //    - Mã tài sản (assetCode) phải duy nhất toàn hệ thống.
    //    - Chỉ Vay thế chấp mới bắt buộc định giá tài sản (> 0) và kiểm tra tỷ lệ LTV 70%.
    const collateralLocations: ResolvedLocationSnapshot[] = [];

    if (dto.collaterals && dto.collaterals.length > 0) {
      const seenAssetCodes = new Set<string>();

      for (const c of dto.collaterals) {
        const normalizedCode = c.assetCode.trim().toUpperCase();
        if (seenAssetCodes.has(normalizedCode)) {
          throw AppError.conflict(
            `Mã tài sản "${c.assetCode.trim()}" bị trùng lặp ngay trong danh sách tài sản của khoản vay này.`,
            ErrorCode.COLLATERAL_ASSET_CODE_EXISTS,
            [
              {
                field: 'assetCode',
                message: `Mã tài sản "${c.assetCode.trim()}" bị trùng lặp`,
              },
            ]
          );
        }
        seenAssetCodes.add(normalizedCode);

        const existingByCode = await collateralRepository.findByAssetCode(c.assetCode.trim());
        if (existingByCode) {
          throw AppError.conflict(
            `Mã tài sản "${c.assetCode.trim()}" đã tồn tại trong hệ thống (Số GCN: ${existingByCode.certificateNumber}, Số khế ước: ${existingByCode.loan?.contractNumber || 'chưa có'}). Mỗi tài sản phải có mã riêng biệt.`,
            ErrorCode.COLLATERAL_ASSET_CODE_EXISTS,
            [
              {
                field: 'assetCode',
                message: `Mã tài sản "${c.assetCode.trim()}" đã tồn tại trong hệ thống`,
              },
            ]
          );
        }

        if (dto.loanType === LoanType.THE_CHAP) {
          if (!c.valuationAmount || c.valuationAmount <= 0) {
            throw AppError.badRequest(
              `Khoản vay thế chấp bắt buộc phải định giá tài sản "${c.assetCode.trim()}" lớn hơn 0 VNĐ.`,
              ErrorCode.VALIDATION_ERROR,
              [{ field: 'valuationAmount', message: 'Giá trị định giá phải lớn hơn 0' }]
            );
          }
        }

        const loc = await areaService.resolveLocationSnapshot({
          provinceId: c.provinceId,
          communeId: c.communeId,
          hamletId: c.hamletId,
          addressDetail: c.addressDetail,
          fallbackAddress: c.address,
        });
        collateralLocations.push(loc);
      }

      if (dto.loanType === LoanType.THE_CHAP) {
        const totalCollateralValuation = dto.collaterals.reduce(
          (sum, c) => sum + (c.valuationAmount ?? 0),
          0
        );
        const rawMaxAllowed = totalCollateralValuation * LOAN_CONSTANTS.MAX_MORTGAGE_LOAN_RATIO;
        const maxAllowedLoan = Math.floor(rawMaxAllowed / 1_000_000) * 1_000_000;

        if (dto.loanAmount > maxAllowedLoan) {
          throw AppError.badRequest(
            `Số tiền vay (${dto.loanAmount.toLocaleString('vi-VN')} VNĐ) vượt quá 70% tổng giá trị tài sản thế chấp (${totalCollateralValuation.toLocaleString('vi-VN')} VNĐ × 70% = ${maxAllowedLoan.toLocaleString('vi-VN')} VNĐ).`,
            ErrorCode.LOAN_MORTGAGE_LIMIT_EXCEEDED
          );
        }
      }
    }

    // 5. Nghiệp vụ: Tín chấp tối đa 100 triệu trên tất cả các khoản vay của thành viên
    if (dto.loanType === LoanType.TIN_CHAP) {
      const activeUnsecuredLoans = await this.repo.findActiveUnsecuredLoansByMember(dto.memberId);
      const currentUnsecuredTotal = activeUnsecuredLoans.reduce(
        (sum, item) => sum + item.loanAmount,
        0
      );

      if (currentUnsecuredTotal + dto.loanAmount > LOAN_CONSTANTS.MAX_UNSECURED_LOAN_AMOUNT) {
        throw AppError.badRequest(
          `Hạn mức vay tín chấp vượt quá quy định! Thành viên này đã có ${currentUnsecuredTotal.toLocaleString('vi-VN')} VNĐ dư nợ tín chấp chưa tất toán. Tổng hạn mức tối đa cho phép là ${LOAN_CONSTANTS.MAX_UNSECURED_LOAN_AMOUNT.toLocaleString('vi-VN')} VNĐ.`,
          ErrorCode.LOAN_UNSECURED_LIMIT_EXCEEDED
        );
      }
    }

    // 6. Lấy mức lãi suất năm từ bảng lãi suất công bố của Quỹ tại thời điểm cấp
    const effectiveDate = dto.contractDate ? new Date(dto.contractDate) : loanStartDate;
    const annualRate = await interestRateService.determineInterestRate(
      dto.termType,
      dto.loanAmount,
      effectiveDate
    );

    try {
      const createdLoan = await this.repo.create(
        dto,
        termMonths,
        annualRate,
        collateralLocations,
        timeline
      );

      if (isRelatedEligible && dto.relatedPersons && dto.relatedPersons.length > 0) {
        for (const rp of dto.relatedPersons) {
          await relatedPersonService.create(createdLoan.id, rp);
        }
      }

      return createdLoan;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw AppError.conflict(
          `Số khế ước "${dto.contractNumber}" vừa được sử dụng bởi một hồ sơ khác. Vui lòng nhập số khế ước khác.`,
          ErrorCode.LOAN_CONTRACT_NUMBER_EXISTS,
          [{ field: 'contractNumber', message: 'Số khế ước đã tồn tại trong hệ thống' }]
        );
      }
      throw err;
    }
  }

  async getById(id: string) {
    const loan = await this.repo.findById(id);
    if (!loan) {
      throw AppError.notFound(`Không tìm thấy khoản vay với ID: ${id}`, ErrorCode.LOAN_NOT_FOUND);
    }

    if (!loan.loanStartDate) {
      loan.loanStartDate = loan.contractDate ?? loan.createdAt;
    }

    if (loan.status === LoanStatus.DA_GIAI_NGAN) {
      const summary = loanCalculationService.computeLoanSummary(loan as any);
      if (summary.isOverdue) {
        await this.repo.updateStatus(id, LoanStatus.QUA_HAN);
        loan.status = LoanStatus.QUA_HAN;
      }
    }

    const isRelatedPersonEligible = isLoanEligibleForRelatedPerson(loan.loanType, loan.loanAmount);
    (loan as any).isRelatedPersonEligible = isRelatedPersonEligible;
    if (!isRelatedPersonEligible) {
      (loan as any).relatedPersons = [];
      (loan as any).isMissingRelatedPerson = false;
    } else {
      (loan as any).isMissingRelatedPerson = ((loan as any).relatedPersons?.length ?? 0) === 0;
    }

    return loan;
  }

  async findMany(query: LoanFilterQuery) {
    const { loans, total } = await this.repo.findMany(query);
    const { page, limit } = parsePagination(query);
    const pagination = createPaginationMeta(total, page, limit);

    const enrichedLoans = loans.map((loan) => ({
      ...loan,
      loanStartDate: loan.loanStartDate ?? loan.contractDate ?? loan.createdAt,
      interestStats: loanCalculationService.computeInterestStats(loan as any),
    }));

    return {
      loans: enrichedLoans,
      pagination,
    };
  }

  async update(id: string, dto: UpdateLoanDto) {
    const existing = await this.getById(id);

    // 1. Kiểm tra trùng Số khế ước (nếu thay đổi, loại trừ chính id hiện tại)
    if (dto.contractNumber !== undefined) {
      await this.ensureUniqueContractNumber(dto.contractNumber, id);
    }

    if (dto.heir) {
      const cccdInfo = requireValidCitizenIdInfo(dto.heir.idNumber, 'Người thừa kế');
      dto.heir.gender = cccdInfo.gender;
      dto.heir.yearOfBirth = cccdInfo.yearOfBirth;
      dto.heir.idIssuePlace = getCanonicalIdIssuePlace(dto.heir.idType);
      dto.heir.phoneNumber = normalizeOptionalPhoneNumber(dto.heir.phoneNumber);
    }

    const effectiveLoanAmount = dto.loanAmount ?? existing.loanAmount;

    // 2. Nếu có cập nhật Phương án vay hoặc Số tiền vay -> kiểm tra và đồng bộ Vốn tự có
    if (dto.loanPlan) {
      this.validateAndNormalizeLoanPlan(dto.loanPlan, effectiveLoanAmount);
    } else if (dto.loanAmount !== undefined && existing.loanPlan) {
      // Nếu đổi Số tiền vay ở bước 2 mà đã có Phương án vay -> tự động đồng bộ lại borrowedCapital & ownCapital
      const currentTotalDemand = Math.max(existing.loanPlan.loanAmount, dto.loanAmount);
      dto.loanPlan = {
        purpose: existing.loanPlan.purpose,
        loanAmount: currentTotalDemand,
        ownCapital: Math.max(0, currentTotalDemand - dto.loanAmount),
        borrowedCapital: dto.loanAmount,
        expenses: existing.loanPlan.expenses,
        revenues: existing.loanPlan.revenues,
      };
    }

    const startDate = dto.loanStartDate
      ? new Date(dto.loanStartDate)
      : existing.loanStartDate || existing.createdAt;
    const termType = dto.termType !== undefined ? dto.termType : existing.termType;
    const termMonths =
      termType === LoanTermType.NGAN_HAN
        ? LOAN_CONSTANTS.SHORT_TERM_MONTHS
        : LOAN_CONSTANTS.MEDIUM_TERM_MONTHS;
    const loanType = dto.loanType ?? existing.loanType;
    const contractExpiryDate =
      dto.mortgageContract !== undefined
        ? dto.mortgageContract?.contractExpiryDate
        : existing.mortgageContract?.contractExpiryDate;

    const timeline = this.calculateMaturityTimeline(
      startDate,
      termMonths,
      termType,
      loanType,
      contractExpiryDate
    );

    try {
      return await this.repo.update(id, dto, effectiveLoanAmount, timeline);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw AppError.conflict(
          `Số khế ước "${dto.contractNumber}" đã tồn tại ở một khoản vay khác.`,
          ErrorCode.LOAN_CONTRACT_NUMBER_EXISTS,
          [{ field: 'contractNumber', message: 'Số khế ước đã tồn tại trong hệ thống' }]
        );
      }
      throw err;
    }
  }

  async updateStatus(id: string, newStatus: LoanStatus) {
    const loan = await this.getById(id);

    if (newStatus === LoanStatus.DA_HOAN_THANH_HO_SO) {
      // Quy tắc mới (Mục 3.7): Cả Vay thế chấp VÀ Vay tín chấp đều bắt buộc khai báo ít nhất 1 tài sản
      const collaterals = await collateralRepository.findByLoanId(id);
      if (collaterals.length === 0) {
        throw AppError.badRequest(
          'Hồ sơ khoản vay (cả Vay thế chấp và Vay tín chấp) bắt buộc phải khai báo thông tin tài sản trước khi hoàn thành hồ sơ.',
          ErrorCode.BAD_REQUEST
        );
      }

      // Chỉ Vay thế chấp (THE_CHAP) mới yêu cầu Hợp đồng thế chấp và Định giá tài sản >= Tiền vay / 70%
      if (loan.loanType === LoanType.THE_CHAP) {
        if (!loan.mortgageContract) {
          throw AppError.badRequest(
            'Khoản vay thế chấp cần có thông tin hợp đồng thế chấp để hoàn thành hồ sơ.',
            ErrorCode.BAD_REQUEST
          );
        }

        const totalCollateralValue = await collateralRepository.calculateTotalValuationByLoanId(id);
        if (totalCollateralValue <= 0) {
          throw AppError.badRequest(
            'Khoản vay thế chấp bắt buộc phải định giá tài sản thế chấp (> 0 VNĐ) trước khi hoàn thành hồ sơ.',
            ErrorCode.BAD_REQUEST
          );
        }

        const maxAllowedLoanAmount = Math.round(
          totalCollateralValue * LOAN_CONSTANTS.MAX_MORTGAGE_LOAN_RATIO
        );
        if (loan.loanAmount > maxAllowedLoanAmount) {
          throw AppError.badRequest(
            `Số tiền vay (${loan.loanAmount.toLocaleString('vi-VN')} VNĐ) vượt quá 70% tổng giá trị định giá tài sản thế chấp (${totalCollateralValue.toLocaleString('vi-VN')} VNĐ × 70% = ${maxAllowedLoanAmount.toLocaleString('vi-VN')} VNĐ).`,
            ErrorCode.LOAN_MORTGAGE_LIMIT_EXCEEDED
          );
        }
      }
    }

    if (newStatus === LoanStatus.DA_TAT_TOAN) {
      const summary = loanCalculationService.computeLoanSummary(loan as any);
      if (summary.currentPrincipalBalance > 0) {
        throw AppError.badRequest(
          `Không thể tất toán vì khoản vay vẫn còn dư nợ gốc ${summary.currentPrincipalBalance.toLocaleString('vi-VN')} VNĐ chưa thanh toán.`,
          ErrorCode.LOAN_CANNOT_SETTLE
        );
      }
      return this.repo.updateStatus(id, newStatus, new Date());
    }

    return this.repo.updateStatus(id, newStatus);
  }

  async delete(id: string, reason?: string): Promise<DeleteLoanResult> {
    const loan = await this.getById(id);

    const activeDisbursements = (loan.disbursements || []).filter((d) => !d.isDeleted);
    const activeRepayments = (loan.repayments || []).filter((r) => !r.isDeleted);
    const hasDisbursements = activeDisbursements.length > 0;
    const hasRepayments = activeRepayments.length > 0;
    const isFinanciallyActiveOrSettled =
      loan.status === LoanStatus.DA_GIAI_NGAN ||
      loan.status === LoanStatus.QUA_HAN ||
      loan.status === LoanStatus.DA_TAT_TOAN;

    if (hasDisbursements || hasRepayments || isFinanciallyActiveOrSettled) {
      throw AppError.conflict(
        `Không thể xóa khoản vay ${loan.contractNumber || `#${loan.id.slice(-6)}`} vì đang có giao dịch tài chính hiệu lực (${activeDisbursements.length} đợt giải ngân, ${activeRepayments.length} đợt trả nợ, trạng thái: ${loan.status}). Đối với khoản vay đang có nghiệp vụ kế toán hiệu lực, vui lòng thực hiện nghiệp vụ Tất toán hoặc Hủy giao dịch sai sót trước khi xóa hồ sơ.`,
        ErrorCode.LOAN_HAS_FINANCIAL_TRANSACTIONS
      );
    }

    const releasedCount = await this.repo.softDelete(id, reason);

    await prisma.auditLog.create({
      data: {
        entityType: 'LOAN',
        entityId: loan.id,
        action: 'SOFT_DELETE',
        reason:
          reason ||
          'Xóa mềm hồ sơ vay chưa phát sinh giao dịch giải ngân/thu nợ và giải phóng tài sản thế chấp',
        metadata: {
          contractNumber: loan.contractNumber,
          memberId: loan.memberId,
          memberName: loan.member?.fullName,
          loanAmount: loan.loanAmount,
          statusBeforeDelete: loan.status,
          releasedCollateralsCount: releasedCount,
        },
      },
    });

    return {
      id: loan.id,
      contractNumber: loan.contractNumber,
      status: loan.status,
      deleteMode: 'SOFT_DELETE',
      releasedCollateralsCount: releasedCount,
    };
  }

  async getSummary(id: string) {
    const loan = await this.getById(id);
    const summary = loanCalculationService.computeLoanSummary(loan as any);

    if (summary.isOverdue && loan.status === LoanStatus.DA_GIAI_NGAN) {
      await this.repo.updateStatus(id, LoanStatus.QUA_HAN);
      summary.status = LoanStatus.QUA_HAN;
    }

    return summary;
  }
}

export const loanService = new LoanService();
