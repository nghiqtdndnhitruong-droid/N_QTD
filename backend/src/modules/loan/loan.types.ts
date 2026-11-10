import { Loan, LoanType, LoanTermType, LoanStatus, IdDocumentType, Gender } from '@prisma/client';
import { PaginationQuery } from '../../shared/types';
import { CreateCollateralDto, HouseholdMemberDto } from '../collateral/collateral.types';
import { CreateRelatedPersonDto } from '../related-person/related-person.types';

export interface HeirDto {
  fullName: string;
  yearOfBirth?: number;
  idType: IdDocumentType;
  idNumber: string;
  idIssueDate: string | Date;
  idIssuePlace?: string;
  idExpiry?: string | Date | null;
  gender?: Gender;
  phoneNumber?: string | null;
  address: string;
  relationship: string; // "Cha", "Mẹ", "Vợ", "Chồng", "Con"...
}

export interface FinancialItemDto {
  name: string;
  amount: number;
}

export interface LoanPlanDto {
  purpose: string;
  loanAmount: number;
  ownCapital: number;
  borrowedCapital: number;
  expenses: FinancialItemDto[];
  revenues: FinancialItemDto[];
}

export interface MortgageContractDto {
  contractNumber: string;
  contractDuration?: string | null; // Không còn bắt buộc trong nghiệp vụ mới
  contractExpiryDate?: string | Date | null; // Ngày hết hạn hợp đồng thế chấp (ngày/tháng/năm)
  committeeAuthDate?: string | Date | null; // Ngày chứng thực UBND (tùy chọn, nhập sau)
}

export type LoanPlanTemplateKey = 'SUA_NHA' | 'CHAN_NUOI';

export interface CalculateLoanPlanTemplateQuery {
  template: LoanPlanTemplateKey;
  totalCapitalDemand: number;
  loanAmount: number;
  interestRate: number;
  termType: LoanTermType;
}

export interface CreateLoanDto {
  memberId: string;
  loanType: LoanType;
  termType: LoanTermType;
  loanAmount: number;
  loanStartDate?: string | Date; // Ngày khởi tạo khoản vay (tự lấy ngày hiện tại)
  contractNumber?: string | null;
  contractDate?: string | Date | null;
  heir?: HeirDto;
  relatedPersons?: CreateRelatedPersonDto[];
  loanPlan?: LoanPlanDto;
  mortgageContract?: MortgageContractDto;
  householdMembers?: HouseholdMemberDto[];
  collaterals?: Omit<CreateCollateralDto, 'loanId'>[];
}

export interface UpdateLoanDto extends Partial<Omit<CreateLoanDto, 'memberId'>> {
  interestRate?: number;
}

export interface LoanFilterQuery extends PaginationQuery {
  memberId?: string;
  loanType?: LoanType;
  termType?: LoanTermType;
  status?: LoanStatus;
  fromDate?: string;
  toDate?: string;
  provinceId?: string;
  communeId?: string;
  hamletId?: string;
}

export type HalfTermPaymentStatus = 'CHUA_DEN_HAN' | 'DEN_HAN' | 'DA_HOAN_THANH' | 'QUA_HAN';

export interface DeleteLoanResult {
  id: string;
  contractNumber: string | null;
  status: LoanStatus;
  deleteMode: 'SOFT_DELETE';
  releasedCollateralsCount: number;
}

export interface LoanInterestStats {
  totalDisbursed: number;
  totalPrincipalPaid: number;
  currentPrincipalBalance: number;
  totalInterestPaid: number;
  lastInterestReferenceDate: Date | null;
  unpaidInterestDays: number;
  unpaidInterestAmount: number;
  isInterestOverdue: boolean;
}

export interface LoanSummary {
  loanId: string;
  contractNumber: string | null;
  loanType: LoanType;
  termType: LoanTermType;
  termMonths: number;
  approvedLoanAmount: number;
  interestRateAnnual: number;
  status: LoanStatus;
  disbursementCount: number;
  totalDisbursed: number;
  remainingDisbursableAmount: number;
  totalPrincipalPaid: number;
  totalInterestPaid: number;
  currentPrincipalBalance: number; // Dư nợ gốc thực tế còn lại
  lastInterestReferenceDate: Date | null;
  unpaidInterestDays: number;
  unpaidInterestAmount: number;
  isInterestOverdue: boolean;
  expectedMaturityDate: Date | null;
  maturityDate: Date | null;
  isMortgageShortened: boolean;
  halfTermPaymentDate: Date | null;
  halfTermPaymentStatus: HalfTermPaymentStatus | null;
  halfTermRequiredAmount: number | null;
  halfTermPrincipalPaid: number | null;
  isOverdue: boolean;
  overdueDays: number;
}

export type LoanEntity = Loan;
