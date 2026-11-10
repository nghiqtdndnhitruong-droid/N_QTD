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
import { loanValuationService } from '../loan-valuation/loan-valuation.service';
import { normalizeHouseholdMembers } from '../collateral/collateral.service';

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
    dto.contractNumber = dto.contractNumber?.trim() ? dto.contractNumber.trim() : null;
    if (dto.contractNumber) {
      await this.ensureUniqueContractNumber(dto.contractNumber);
    }

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

    if (dto.householdMembers !== undefined) {
      if (dto.householdMembers && dto.householdMembers.length > 0) {
        dto.householdMembers = normalizeHouseholdMembers(dto.householdMembers);
      }
    }

    // 1d2. Tự động chuẩn hóa Thành viên hộ gia đình (nếu có)
    if (dto.householdMembers && dto.householdMembers.length > 0) {
      dto.householdMembers = normalizeHouseholdMembers(dto.householdMembers);
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
      dto.loanType,
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
        const target = (err.meta as any)?.target;
        const isContractNumberTarget = Array.isArray(target)
          ? target.includes('contractNumber')
          : typeof target === 'string' && target.includes('contractNumber');
        if (isContractNumberTarget && dto.contractNumber) {
          throw AppError.conflict(
            `Số khế ước "${dto.contractNumber}" vừa được sử dụng bởi một hồ sơ khác. Vui lòng nhập số khế ước khác.`,
            ErrorCode.LOAN_CONTRACT_NUMBER_EXISTS,
            [{ field: 'contractNumber', message: 'Số khế ước đã tồn tại trong hệ thống' }]
          );
        }
        throw AppError.conflict(
          `Dữ liệu đã tồn tại trong hệ thống (${Array.isArray(target) ? target.join(', ') : target || 'khóa trùng lặp'}).`,
          ErrorCode.CONFLICT
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

    if (loan.status === LoanStatus.DANG_TAO) {
      try {
        const effectiveDate = loan.contractDate ? new Date(loan.contractDate) : (loan.loanStartDate || new Date());
        const currentRate = await interestRateService.determineInterestRate(
          loan.loanType,
          loan.termType,
          loan.loanAmount,
          effectiveDate
        );
        if (currentRate !== loan.interestRate) {
          const updateData: Prisma.LoanUpdateInput = { interestRate: currentRate };
          if (loan.loanPlan && (loan.loanPlan as any).expenses) {
            const plan = loan.loanPlan as any;
            const termFactor = loan.termType === LoanTermType.TRUNG_HAN ? 2 : 1;
            const interestExpense = Math.round(loan.loanAmount * (currentRate / 100) * termFactor);
            let hasInterestItem = false;
            const updatedExpenses = (plan.expenses || []).map((ex: any) => {
              if (/Chi phí trả lãi|Trả lãi tiền vay/i.test(ex.name)) {
                hasInterestItem = true;
                return {
                  name: `Chi phí trả lãi tiền vay (${loan.loanAmount.toLocaleString('vi-VN')} đ × ${currentRate}% × ${termFactor} năm)`,
                  amount: interestExpense,
                };
              }
              return ex;
            });
            if (hasInterestItem) {
              const totalExpenses = updatedExpenses.reduce((sum: number, item: any) => sum + item.amount, 0);
              const totalRevenues = (plan.revenues || []).reduce((sum: number, item: any) => sum + item.amount, 0);
              updateData.loanPlan = {
                ...plan,
                expenses: updatedExpenses,
                totalExpenses,
                profit: totalRevenues - totalExpenses,
              };
              loan.loanPlan = updateData.loanPlan as any;
            }
          }
          await prisma.loan.update({
            where: { id: loan.id },
            data: updateData,
          });
          loan.interestRate = currentRate;
        }
      } catch {
        // Bỏ qua lỗi nếu chưa có cấu hình tương ứng
      }
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

    for (const loan of loans) {
      if (loan.status === LoanStatus.DANG_TAO) {
        try {
          const effectiveDate = loan.contractDate ? new Date(loan.contractDate) : (loan.loanStartDate || loan.createdAt || new Date());
          const currentRate = await interestRateService.determineInterestRate(
            loan.loanType,
            loan.termType,
            loan.loanAmount,
            effectiveDate
          );
          if (currentRate !== loan.interestRate) {
            await prisma.loan.update({
              where: { id: loan.id },
              data: { interestRate: currentRate },
            });
            loan.interestRate = currentRate;
          }
        } catch {
          // Bỏ qua nếu có lỗi
        }
      }
    }

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
      dto.contractNumber = dto.contractNumber?.trim() ? dto.contractNumber.trim() : null;
      if (dto.contractNumber) {
        await this.ensureUniqueContractNumber(dto.contractNumber, id);
      }
    }

    if (dto.heir) {
      const cccdInfo = requireValidCitizenIdInfo(dto.heir.idNumber, 'Người thừa kế');
      dto.heir.gender = cccdInfo.gender;
      dto.heir.yearOfBirth = cccdInfo.yearOfBirth;
      dto.heir.idIssuePlace = getCanonicalIdIssuePlace(dto.heir.idType);
      dto.heir.phoneNumber = normalizeOptionalPhoneNumber(dto.heir.phoneNumber);
    }

    if (dto.householdMembers !== undefined) {
      if (dto.householdMembers && dto.householdMembers.length > 0) {
        dto.householdMembers = normalizeHouseholdMembers(dto.householdMembers);
      }
    }

    const effectiveLoanAmount = dto.loanAmount ?? existing.loanAmount;
    const loanType = dto.loanType ?? existing.loanType;
    const termType = dto.termType !== undefined ? dto.termType : existing.termType;
    const termMonths =
      termType === LoanTermType.NGAN_HAN
        ? LOAN_CONSTANTS.SHORT_TERM_MONTHS
        : LOAN_CONSTANTS.MEDIUM_TERM_MONTHS;
    const startDate = dto.loanStartDate
      ? new Date(dto.loanStartDate)
      : existing.loanStartDate || existing.createdAt;

    // Đối với hồ sơ đang tạo (DANG_TAO), tự động cập nhật lại mức lãi suất tương ứng từ bảng lãi suất hiệu lực
    if (existing.status === LoanStatus.DANG_TAO && dto.interestRate === undefined) {
      try {
        const effectiveDate = dto.contractDate
          ? new Date(dto.contractDate)
          : (existing.contractDate ? new Date(existing.contractDate) : startDate);
        dto.interestRate = await interestRateService.determineInterestRate(
          loanType,
          termType,
          effectiveLoanAmount,
          effectiveDate
        );
      } catch {
        // Bỏ qua nếu có lỗi
      }
    }

    // 2. Nếu có cập nhật Phương án vay hoặc Số tiền vay -> kiểm tra và đồng bộ Vốn tự có
    if (dto.loanPlan) {
      this.validateAndNormalizeLoanPlan(dto.loanPlan, effectiveLoanAmount);
    } else if (dto.loanAmount !== undefined && existing.loanPlan) {
      // Nếu đổi Số tiền vay ở bước 2 mà đã có Phương án vay -> tự động đồng bộ lại borrowedCapital & ownCapital và chi phí lãi
      const currentTotalDemand = Math.max(existing.loanPlan.loanAmount, dto.loanAmount);
      const termFactor = termType === LoanTermType.TRUNG_HAN ? 2 : 1;
      const rateToUse = dto.interestRate ?? existing.interestRate;
      const interestExpense = Math.round(dto.loanAmount * (rateToUse / 100) * termFactor);
      let updatedExpenses = existing.loanPlan.expenses;
      if (updatedExpenses && updatedExpenses.length > 0) {
        updatedExpenses = updatedExpenses.map((ex) => {
          if (/Chi phí trả lãi|Trả lãi tiền vay/i.test(ex.name)) {
            return {
              name: `Chi phí trả lãi tiền vay (${dto.loanAmount!.toLocaleString('vi-VN')} đ × ${rateToUse}% × ${termFactor} năm)`,
              amount: interestExpense,
            };
          }
          return ex;
        });
      }

      dto.loanPlan = {
        purpose: existing.loanPlan.purpose,
        loanAmount: currentTotalDemand,
        ownCapital: Math.max(0, currentTotalDemand - dto.loanAmount),
        borrowedCapital: dto.loanAmount,
        expenses: updatedExpenses,
        revenues: existing.loanPlan.revenues,
      };
    }
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
        const target = (err.meta as any)?.target;
        const isContractNumberTarget = Array.isArray(target)
          ? target.includes('contractNumber')
          : typeof target === 'string' && target.includes('contractNumber');
        if (isContractNumberTarget && dto.contractNumber) {
          throw AppError.conflict(
            `Số khế ước "${dto.contractNumber}" đã tồn tại ở một khoản vay khác.`,
            ErrorCode.LOAN_CONTRACT_NUMBER_EXISTS,
            [{ field: 'contractNumber', message: 'Số khế ước đã tồn tại trong hệ thống' }]
          );
        }
        throw AppError.conflict(
          `Dữ liệu đã tồn tại trong hệ thống (${Array.isArray(target) ? target.join(', ') : target || 'khóa trùng lặp'}).`,
          ErrorCode.CONFLICT
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

        // Tự động đồng bộ các dòng định giá với tài sản trước khi thẩm định hồ sơ
        await loanValuationService.syncCollateralsValuation(id);

        const totalCollateralFromCollaterals = await collateralRepository.calculateTotalValuationByLoanId(id);
        const valuations = await prisma.loanValuation.findMany({ where: { loanId: id } });
        const totalValuations = valuations.reduce((sum, v) => sum + (Number(v.totalPrice) || 0), 0);
        const totalCollateralValue = Math.max(totalCollateralFromCollaterals, totalValuations);

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

        // Hồ sơ thế chấp nếu >= 140.000.000đ mà chưa nhập người liên quan thì không cho hoàn thành hồ sơ (chỉ cho lưu nháp)
        if (loan.loanAmount >= 140_000_000) {
          const activeRelatedPersons = (loan.relatedPersons || []).filter((rp) => !rp.isDeleted);
          if (activeRelatedPersons.length === 0) {
            throw AppError.badRequest(
              'Hồ sơ thế chấp từ 140.000.000 đồng trở lên bắt buộc phải khai báo Người liên quan trước khi hoàn thành hồ sơ (chỉ được lưu nháp).',
              ErrorCode.BAD_REQUEST
            );
          }
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

  async clone(sourceLoanId: string, options?: { targetMemberId?: string }) {
    const sourceLoan = await this.repo.findById(sourceLoanId);
    if (!sourceLoan) {
      throw AppError.notFound(
        `Không tìm thấy khoản vay gốc với ID: ${sourceLoanId}`,
        ErrorCode.LOAN_NOT_FOUND
      );
    }

    const targetMemberId = options?.targetMemberId || sourceLoan.memberId;
    const member = await this.memberRepo.findById(targetMemberId);
    if (!member) {
      throw AppError.notFound(
        `Không tìm thấy thành viên đích với ID: ${targetMemberId}`,
        ErrorCode.MEMBER_NOT_FOUND
      );
    }

    // 1. Xác định lãi suất hiệu lực
    let annualRate = sourceLoan.interestRate;
    try {
      annualRate = await interestRateService.determineInterestRate(
        sourceLoan.loanType,
        sourceLoan.termType,
        sourceLoan.loanAmount,
        new Date()
      );
    } catch {
      // Giữ nguyên lãi suất gốc nếu chưa có cấu hình cho ngày hôm nay
    }

    // 2. Tạo bản ghi khoản vay mới ở trạng thái DANG_TAO (Bản nháp)
    const clonedLoan = await prisma.loan.create({
      data: {
        memberId: targetMemberId,
        loanType: sourceLoan.loanType,
        termType: sourceLoan.termType,
        termMonths: sourceLoan.termMonths,
        loanAmount: sourceLoan.loanAmount,
        interestRate: annualRate,
        loanStartDate: new Date(),
        contractNumber: null, // Chưa cấp số khế ước cho hồ sơ mới
        contractDate: null,
        status: LoanStatus.DANG_TAO,
        expectedMaturityDate: null,
        maturityDate: null,
        halfTermPaymentDate: null,
        heir: sourceLoan.heir
          ? {
              fullName: sourceLoan.heir.fullName,
              yearOfBirth: sourceLoan.heir.yearOfBirth,
              gender: sourceLoan.heir.gender,
              idType: sourceLoan.heir.idType,
              idNumber: sourceLoan.heir.idNumber,
              idIssueDate: sourceLoan.heir.idIssueDate,
              idIssuePlace: sourceLoan.heir.idIssuePlace,
              idExpiry: sourceLoan.heir.idExpiry,
              relationship: sourceLoan.heir.relationship,
              phoneNumber: sourceLoan.heir.phoneNumber,
              address: sourceLoan.heir.address,
            }
          : undefined,
        loanPlan: sourceLoan.loanPlan
          ? {
              purpose: sourceLoan.loanPlan.purpose,
              loanAmount: sourceLoan.loanPlan.loanAmount,
              ownCapital: sourceLoan.loanPlan.ownCapital,
              borrowedCapital: sourceLoan.loanPlan.borrowedCapital,
              expenses: sourceLoan.loanPlan.expenses ? [...sourceLoan.loanPlan.expenses] : [],
              revenues: sourceLoan.loanPlan.revenues ? [...sourceLoan.loanPlan.revenues] : [],
              totalExpenses: (sourceLoan.loanPlan.expenses || []).reduce(
                (sum, e) => sum + (e.amount || 0),
                0
              ),
              totalRevenues: (sourceLoan.loanPlan.revenues || []).reduce(
                (sum, r) => sum + (r.amount || 0),
                0
              ),
              profit:
                (sourceLoan.loanPlan.revenues || []).reduce((sum, r) => sum + (r.amount || 0), 0) -
                (sourceLoan.loanPlan.expenses || []).reduce((sum, e) => sum + (e.amount || 0), 0),
            }
          : undefined,
        mortgageContract: sourceLoan.mortgageContract
          ? {
              contractNumber: '', // Xóa số HĐTC để cán bộ nhập số mới
              contractDuration: sourceLoan.mortgageContract.contractDuration,
              contractExpiryDate: sourceLoan.mortgageContract.contractExpiryDate,
              committeeAuthDate: sourceLoan.mortgageContract.committeeAuthDate,
            }
          : undefined,
        householdMembers:
          sourceLoan.householdMembers && sourceLoan.householdMembers.length > 0
            ? sourceLoan.householdMembers.map((m) => ({ ...m }))
            : undefined,
      },
    });

    // 3. Sao chép Người liên quan
    if (sourceLoan.relatedPersons && sourceLoan.relatedPersons.length > 0) {
      for (const rp of sourceLoan.relatedPersons) {
        await prisma.relatedPerson.create({
          data: {
            loanId: clonedLoan.id,
            fullName: rp.fullName,
            yearOfBirth: rp.yearOfBirth,
            gender: rp.gender,
            idType: rp.idType,
            idNumber: rp.idNumber,
            idIssueDate: rp.idIssueDate,
            idIssuePlace: rp.idIssuePlace,
            idExpiry: rp.idExpiry,
            phoneNumber: rp.phoneNumber,
            relationship: rp.relationship,
            relatedPersonRelationship: rp.relatedPersonRelationship,
            creditFundLoan: rp.creditFundLoan,
            address: rp.address || '',
            provinceId: rp.provinceId,
            provinceName: rp.provinceName,
            communeId: rp.communeId,
            communeName: rp.communeName,
            hamletId: rp.hamletId,
            hamletName: rp.hamletName,
            addressDetail: rp.addressDetail,
          },
        });
      }
    }

    // 4. Sao chép Tài sản thế chấp (Collaterals)
    const collateralIdMap = new Map<string, string>();

    if (sourceLoan.collaterals && sourceLoan.collaterals.length > 0) {
      for (const c of sourceLoan.collaterals) {
        // Kiểm tra nếu mã tài sản đã tồn tại thì tự động sinh hậu tố duy nhất
        let targetAssetCode = c.assetCode.trim();
        const existingCollateral = await prisma.collateral.findFirst({
          where: { assetCode: { equals: targetAssetCode, mode: 'insensitive' } },
        });

        if (existingCollateral) {
          let suffix = 1;
          while (true) {
            const candidate = `${targetAssetCode}-${suffix}`;
            const match = await prisma.collateral.findFirst({
              where: { assetCode: { equals: candidate, mode: 'insensitive' } },
            });
            if (!match) {
              targetAssetCode = candidate;
              break;
            }
            suffix++;
          }
        }

        const newCol = await prisma.collateral.create({
          data: {
            loanId: clonedLoan.id,
            assetType: c.assetType,
            certificateType: c.certificateType,
            assetCode: targetAssetCode,
            certificateNumber: c.certificateNumber,
            issueBookNumber: c.issueBookNumber,
            sheetNumber: c.sheetNumber,
            plotNumber: c.plotNumber,
            area: c.area,
            actualArea: c.actualArea,
            pricePerSqMeter: c.pricePerSqMeter,
            origin: c.origin,
            usagePurpose: c.usagePurpose,
            usageDuration: c.usageDuration,
            usageForm: c.usageForm,
            useRestrictions: c.useRestrictions,
            issuePlace: c.issuePlace,
            issueDate: c.issueDate,
            provinceId: c.provinceId,
            provinceName: c.provinceName,
            communeId: c.communeId,
            communeName: c.communeName,
            hamletId: c.hamletId,
            hamletName: c.hamletName,
            addressDetail: c.addressDetail,
            address: c.address,
            valuationAmount: c.valuationAmount,
            valuationMethod: c.valuationMethod,
            ownerType: c.ownerType,
            thirdPartyInfo: c.thirdPartyInfo ? { ...c.thirdPartyInfo } : undefined,
            householdMembers:
              c.householdMembers && c.householdMembers.length > 0
                ? c.householdMembers.map((hm) => ({ ...hm }))
                : undefined,
          },
        });

        collateralIdMap.set(c.id, newCol.id);
      }
    }

    // 5. Sao chép Định giá (LoanValuations)
    if (sourceLoan.valuations && sourceLoan.valuations.length > 0) {
      for (const v of sourceLoan.valuations) {
        const newCollateralId = v.collateralId ? collateralIdMap.get(v.collateralId) ?? null : null;
        const newCollateralIds = (v.collateralIds || [])
          .map((oldId) => collateralIdMap.get(oldId))
          .filter((id): id is string => Boolean(id));

        await prisma.loanValuation.create({
          data: {
            loanId: clonedLoan.id,
            collateralId: newCollateralId,
            collateralIds: newCollateralIds,
            valuationType: v.valuationType,
            valuationDate: v.valuationDate,
            sheetNumber: v.sheetNumber,
            plotNumber: v.plotNumber,
            area: v.area,
            actualArea: v.actualArea,
            pricePerSqMeter: v.pricePerSqMeter,
            totalPriceBeforeRound: v.totalPriceBeforeRound,
            totalPrice: v.totalPrice,
            notes: v.notes,
          },
        });
      }
    }

    return (await this.repo.findById(clonedLoan.id))!;
  }
}

export const loanService = new LoanService();
