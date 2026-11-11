import { LoanType } from '@/shared/types';
import { formatDateVN } from '@/shared/format';
import type { LoanWarningItem } from '../types/loan.types';

export function checkIdExpiryStatus(idExpiry?: Date | string | null): {
  isExpired: boolean;
  isExpiringSoon: boolean;
  daysRemaining: number;
} | null {
  if (!idExpiry) return null;
  const exp = new Date(idExpiry);
  if (Number.isNaN(exp.getTime())) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  exp.setHours(0, 0, 0, 0);
  const days = Math.round((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return {
    isExpired: days < 0,
    isExpiringSoon: days >= 0 && days <= 180,
    daysRemaining: days,
  };
}

export function checkMortgageExpiryStatus(contractExpiryDate?: Date | string | null): {
  isExpired: boolean;
  isExpiringSoon: boolean;
  daysRemaining: number;
} | null {
  if (!contractExpiryDate) return null;
  const exp = new Date(contractExpiryDate);
  if (!Number.isNaN(exp.getTime())) {
    exp.setHours(0, 0, 0, 0);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const days = Math.round((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return {
      isExpired: days < 0,
      isExpiringSoon: days >= 0 && days <= 365,
      daysRemaining: days,
    };
  }
  return null;
}

export interface CheckLoanWarningsParams {
  loanType?: LoanType;
  termMonths?: number;
  expectedMaturityDate?: Date | string | null;
  maturityDate?: Date | string | null;
  member?: {
    fullName?: string;
    idType?: string;
    idNumber?: string;
    idExpiry?: Date | string | null;
  } | null;
  heir?: {
    fullName?: string;
    idType?: string;
    idNumber?: string;
    idExpiry?: Date | string | null;
  } | null;
  relatedPersons?: Array<{
    fullName?: string;
    idType?: string;
    idNumber?: string;
    idExpiry?: Date | string | null;
    isDeleted?: boolean;
  }> | null;
  mortgageContract?: {
    contractNumber?: string;
    contractExpiryDate?: Date | string | null;
  } | null;
}

export function computeLoanWarnings(params: CheckLoanWarningsParams): LoanWarningItem[] {
  const warnings: LoanWarningItem[] = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // 1. Kiểm tra thời hạn loại giấy tờ của thành viên vay vốn (Member)
  if (params.member?.idExpiry) {
    const exp = new Date(params.member.idExpiry);
    if (!Number.isNaN(exp.getTime())) {
      exp.setHours(0, 0, 0, 0);
      const days = Math.round((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const idLabel = params.member.idType || 'CCCD';
      const name = params.member.fullName || 'Thành viên';

      if (days < 0) {
        warnings.push({
          code: 'ID_EXPIRED',
          target: 'MEMBER',
          title: 'Giấy tờ tùy thân của thành viên đã hết hạn',
          message: `Loại giấy tờ (${idLabel}) của ${name} đã hết hạn vào ngày ${formatDateVN(params.member.idExpiry)}. Hệ thống vẫn cho phép tạo/quản lý khoản vay, vui lòng nhắc nhở thành viên làm thủ tục cấp đổi giấy tờ.`,
          expiryDate: String(params.member.idExpiry),
          daysRemaining: days,
        });
      } else if (days <= 180) {
        warnings.push({
          code: 'ID_EXPIRING_SOON',
          target: 'MEMBER',
          title: 'Giấy tờ tùy thân của thành viên sắp hết hạn (< 6 tháng)',
          message: `Loại giấy tờ (${idLabel}) của ${name} sẽ hết hạn vào ngày ${formatDateVN(params.member.idExpiry)} (còn ${days} ngày, dưới 6 tháng). Hệ thống vẫn cho phép tạo/quản lý khoản vay, vui lòng lưu ý thời hạn.`,
          expiryDate: String(params.member.idExpiry),
          daysRemaining: days,
        });
      }
    }
  }

  // 2. Kiểm tra thời hạn loại giấy tờ của Người thừa kế (Heir)
  if (params.heir?.idExpiry) {
    const exp = new Date(params.heir.idExpiry);
    if (!Number.isNaN(exp.getTime())) {
      exp.setHours(0, 0, 0, 0);
      const days = Math.round((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const name = params.heir.fullName || 'Người thừa kế';

      if (days < 0) {
        warnings.push({
          code: 'ID_EXPIRED',
          target: 'HEIR',
          title: 'Giấy tờ tùy thân của Người thừa kế đã hết hạn',
          message: `Giấy tờ tùy thân của Người thừa kế (${name}) đã hết hạn vào ngày ${formatDateVN(params.heir.idExpiry)}.`,
          expiryDate: String(params.heir.idExpiry),
          daysRemaining: days,
        });
      } else if (days <= 180) {
        warnings.push({
          code: 'ID_EXPIRING_SOON',
          target: 'HEIR',
          title: 'Giấy tờ tùy thân của Người thừa kế sắp hết hạn (< 6 tháng)',
          message: `Giấy tờ tùy thân của Người thừa kế (${name}) sẽ hết hạn vào ngày ${formatDateVN(params.heir.idExpiry)} (còn ${days} ngày, dưới 6 tháng).`,
          expiryDate: String(params.heir.idExpiry),
          daysRemaining: days,
        });
      }
    }
  }

  // 3. Kiểm tra thời hạn loại giấy tờ của Người liên quan (RelatedPersons)
  if (params.relatedPersons && Array.isArray(params.relatedPersons)) {
    for (const rp of params.relatedPersons) {
      if (!rp.isDeleted && rp.idExpiry) {
        const exp = new Date(rp.idExpiry);
        if (!Number.isNaN(exp.getTime())) {
          exp.setHours(0, 0, 0, 0);
          const days = Math.round((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          const name = rp.fullName || 'Người liên quan';

          if (days < 0) {
            warnings.push({
              code: 'ID_EXPIRED',
              target: 'RELATED_PERSON',
              title: `Giấy tờ của Người liên quan (${name}) đã hết hạn`,
              message: `Giấy tờ tùy thân của Người liên quan (${name}) đã hết hạn vào ngày ${formatDateVN(rp.idExpiry)}.`,
              expiryDate: String(rp.idExpiry),
              daysRemaining: days,
            });
          } else if (days <= 180) {
            warnings.push({
              code: 'ID_EXPIRING_SOON',
              target: 'RELATED_PERSON',
              title: `Giấy tờ của Người liên quan (${name}) sắp hết hạn (< 6 tháng)`,
              message: `Giấy tờ tùy thân của Người liên quan (${name}) sẽ hết hạn vào ngày ${formatDateVN(rp.idExpiry)} (còn ${days} ngày, dưới 6 tháng).`,
              expiryDate: String(rp.idExpiry),
              daysRemaining: days,
            });
          }
        }
      }
    }
  }

  // 4. Kiểm tra thời hạn Hợp đồng thế chấp (MortgageContract)
  if (params.loanType === LoanType.THE_CHAP && params.mortgageContract?.contractExpiryDate) {
    const exp = new Date(params.mortgageContract.contractExpiryDate);
    if (!Number.isNaN(exp.getTime())) {
      exp.setHours(0, 0, 0, 0);
      const days = Math.round((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const contractNum = params.mortgageContract.contractNumber
        ? `số ${params.mortgageContract.contractNumber}`
        : '';

      if (days < 0) {
        warnings.push({
          code: 'MORTGAGE_EXPIRED',
          target: 'MORTGAGE_CONTRACT',
          title: 'Hợp đồng thế chấp đã hết hạn',
          message: `Hợp đồng thế chấp ${contractNum} đã hết hạn vào ngày ${formatDateVN(params.mortgageContract.contractExpiryDate)}. Hệ thống vẫn cho phép lưu hồ sơ, vui lòng lưu ý thời hạn để kịp thời theo dõi hoặc gia hạn hợp đồng thế chấp.`,
          expiryDate: String(params.mortgageContract.contractExpiryDate),
          daysRemaining: days,
        });
      } else if (days <= 365) {
        warnings.push({
          code: 'MORTGAGE_EXPIRING_SOON',
          target: 'MORTGAGE_CONTRACT',
          title: 'Hợp đồng thế chấp còn hiệu lực từ 1 năm trở lại',
          message: `Hợp đồng thế chấp ${contractNum} chỉ còn hiệu lực từ 1 năm trở lại (hết hạn ngày ${formatDateVN(params.mortgageContract.contractExpiryDate)}, còn ${days} ngày). Hệ thống vẫn cho phép lưu hồ sơ, vui lòng lưu ý thời hạn để kịp thời theo dõi hoặc gia hạn hợp đồng thế chấp.`,
          expiryDate: String(params.mortgageContract.contractExpiryDate),
          daysRemaining: days,
        });
      }

      if (params.expectedMaturityDate) {
        const expectedExp = new Date(params.expectedMaturityDate);
        if (!Number.isNaN(expectedExp.getTime())) {
          expectedExp.setHours(0, 0, 0, 0);
          if (exp.getTime() < expectedExp.getTime()) {
            warnings.push({
              code: 'MORTGAGE_SHORTENED',
              target: 'MORTGAGE_CONTRACT',
              title: 'Thời hạn vay được xác định theo Hợp đồng thế chấp',
              message: `Hợp đồng thế chấp hết hạn ngày ${formatDateVN(params.mortgageContract.contractExpiryDate)}, ngắn hơn thời hạn vay dự kiến (${params.termMonths ?? 12} tháng — đến ngày ${formatDateVN(params.expectedMaturityDate)}). Ngày đáo hạn thực tế của khoản vay sẽ được điều chỉnh theo HĐ thế chấp.`,
              expiryDate: String(params.mortgageContract.contractExpiryDate),
            });
          }
        }
      }
    }
  }

  return warnings;
}
