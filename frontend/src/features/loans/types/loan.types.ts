import type {
  CollateralAssetType,
  CollateralCertificateType,
  CollateralOwnerType,
  Gender,
  IdDocumentType,
  ListQueryParams,
  LoanStatus,
  LoanTermType,
  LoanType,
  ValuationMethod,
  ValuationType,
} from '@/shared/types';
import type { Member } from '@/features/members/types/member.types';

export interface Heir {
  fullName: string;
  yearOfBirth?: number;
  idType: IdDocumentType;
  idNumber: string;
  idIssueDate: string;
  idIssuePlace?: string;
  idExpiry?: string | null;
  gender?: Gender;
  phoneNumber?: string | null;
  address: string;
  relationship: string;
}

export interface RelatedPerson {
  id: string;
  loanId: string;
  fullName: string;
  yearOfBirth: number;
  gender: Gender;
  idType: IdDocumentType;
  idNumber: string;
  idIssueDate: string;
  idIssuePlace: string;
  idExpiry?: string | null;
  phoneNumber?: string | null;
  relationship?: string | null;
  borrowerRelationship?: string | null;
  relatedPersonRelationship?: string | null;
  creditFundLoan?: string | null;
  provinceId?: string | null;
  provinceName?: string | null;
  communeId?: string | null;
  communeName?: string | null;
  hamletId?: string | null;
  hamletName?: string | null;
  addressDetail?: string | null;
  address: string;
  isDeleted?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRelatedPersonPayload {
  fullName: string;
  yearOfBirth?: number;
  gender?: Gender;
  idType: IdDocumentType;
  idNumber: string;
  idIssueDate: string;
  idIssuePlace?: string;
  idExpiry?: string | null;
  phoneNumber?: string | null;
  relationship?: string | null;
  borrowerRelationship?: string | null;
  relatedPersonRelationship?: string | null;
  creditFundLoan?: string | null;
  provinceId?: string | null;
  communeId?: string | null;
  hamletId?: string | null;
  addressDetail?: string | null;
  address?: string | null;
}

export type UpdateRelatedPersonPayload = Partial<CreateRelatedPersonPayload>;

export interface FinancialItem {
  name: string;
  amount: number;
}

export interface LoanPlan {
  purpose: string;
  loanAmount: number;
  ownCapital: number;
  borrowedCapital: number;
  expenses: FinancialItem[];
  revenues: FinancialItem[];
  totalExpenses?: number;
  totalRevenues?: number;
  profit?: number;
}

export interface MortgageContract {
  contractNumber: string;
  contractDuration?: string | null;
  contractExpiryDate?: string | null;
  committeeAuthDate?: string | null;
}

export interface ThirdPartyInfo {
  fullName: string;
  yearOfBirth?: number;
  idType: IdDocumentType;
  idNumber: string;
  idIssuePlace?: string;
  gender?: Gender;
  address: string;
}

export interface HouseholdMember {
  fullName: string;
  yearOfBirth?: number;
  gender?: Gender;
  idType?: IdDocumentType;
  idNumber: string;
  idIssueDate?: string | null;
  idIssuePlace?: string | null;
  address?: string | null;
}

export interface Collateral {
  id: string;
  loanId: string;
  assetType: CollateralAssetType;
  certificateType?: CollateralCertificateType | null;
  assetCode: string;
  certificateNumber: string;
  issueBookNumber?: string | null;
  sheetNumber: string;
  plotNumber: string;
  area: number;
  actualArea?: number | null;
  pricePerSqMeter?: number | null;
  origin?: string | null;
  usagePurpose?: string | null;
  usageDuration?: string | null;
  usageForm?: string | null;
  useRestrictions?: string | null;
  issuePlace?: string | null;
  issueDate?: string | null;
  // Địa bàn độc lập của tài sản (Tỉnh -> Xã -> Ấp)
  provinceId?: string | null;
  provinceName?: string | null;
  communeId?: string | null;
  communeName?: string | null;
  hamletId?: string | null;
  hamletName?: string | null;
  addressDetail?: string | null;
  address?: string | null;
  valuationAmount?: number | null;
  valuationMethod?: ValuationMethod | null;
  ownerType: CollateralOwnerType;
  thirdPartyInfo?: ThirdPartyInfo | null;
  householdMembers?: HouseholdMember[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface Disbursement {
  id: string;
  loanId: string;
  disbursementDate: string;
  amount: number;
  note?: string | null;
  isDeleted?: boolean;
  deletedAt?: string | null;
  deletedReason?: string | null;
  updatedReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type HalfTermPaymentStatus = 'CHUA_DEN_HAN' | 'DEN_HAN' | 'DA_HOAN_THANH' | 'QUA_HAN';

export interface Repayment {
  id: string;
  loanId: string;
  repaymentDate: string;
  principalAmount: number;
  interestAmount: number;
  interestDays: number;
  interestStartDate?: string | null;
  interestEndDate?: string | null;
  note?: string | null;
  isDeleted?: boolean;
  deletedAt?: string | null;
  deletedReason?: string | null;
  updatedReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Loan {
  id: string;
  memberId: string;
  member?: Member;
  loanType: LoanType;
  termType: LoanTermType;
  termMonths: number;
  loanAmount: number;
  interestRate: number;
  loanStartDate: string | null;
  contractNumber: string | null;
  contractDate: string | null;
  status: LoanStatus;
  expectedMaturityDate?: string | null;
  maturityDate: string | null;
  halfTermPaymentDate?: string | null;
  settlementDate: string | null;
  heir: Heir | null;
  relatedPersons?: RelatedPerson[];
  isRelatedPersonEligible?: boolean;
  isMissingRelatedPerson?: boolean;
  loanPlan: LoanPlan | null;
  mortgageContract: MortgageContract | null;
  householdMembers?: HouseholdMember[] | null;
  collaterals?: Collateral[];
  valuations?: LoanValuation[];
  disbursements?: Disbursement[];
  repayments?: Repayment[];
  _count?: {
    collaterals: number;
    disbursements: number;
    repayments: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface DeleteLoanResult {
  id: string;
  contractNumber: string | null;
  status: LoanStatus;
  deleteMode: 'SOFT_DELETE';
  releasedCollateralsCount: number;
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
  currentPrincipalBalance: number;
  lastInterestReferenceDate: string | null;
  unpaidInterestDays: number;
  unpaidInterestAmount: number;
  isInterestOverdue: boolean;
  expectedMaturityDate: string | null;
  maturityDate: string | null;
  isMortgageShortened: boolean;
  halfTermPaymentDate: string | null;
  halfTermPaymentStatus: HalfTermPaymentStatus | null;
  halfTermRequiredAmount: number | null;
  halfTermPrincipalPaid: number | null;
  isOverdue: boolean;
  overdueDays: number;
}

export interface NextInterestPeriodInfo {
  loanId: string;
  contractNumber: string | null;
  currentPrincipalBalance: number;
  annualInterestRate: number;
  lastInterestRepaymentDate: string | null;
  lastInterestEndDate: string | null;
  suggestedStartDate: string;
}

export interface InterestEstimate {
  loanId: string;
  contractNumber: string | null;
  currentPrincipalBalance: number;
  annualInterestRate: number;
  interestCalculationDays: number;
  estimatedInterestAmount: number;
  formula: string;
}

export interface CreateLoanPayload {
  memberId: string;
  loanType: LoanType;
  termType: LoanTermType;
  loanAmount: number;
  loanStartDate?: string;
  contractNumber?: string;
  contractDate?: string;
  heir?: Heir;
  relatedPersons?: CreateRelatedPersonPayload[];
  loanPlan?: Omit<LoanPlan, 'totalExpenses' | 'totalRevenues' | 'profit'>;
  mortgageContract?: MortgageContract;
  householdMembers?: HouseholdMember[];
  collaterals?: CreateCollateralPayload[];
}

export type UpdateLoanPayload = Partial<Omit<CreateLoanPayload, 'memberId' | 'mortgageContract'>> & {
  mortgageContract?: Partial<MortgageContract>;
};

export interface CreateCollateralPayload {
  assetType: CollateralAssetType;
  certificateType?: CollateralCertificateType | null;
  assetCode: string;
  certificateNumber: string;
  issueBookNumber?: string | null;
  sheetNumber: string;
  plotNumber: string;
  area: number;
  actualArea?: number | null;
  pricePerSqMeter?: number | null;
  origin?: string;
  usagePurpose?: string;
  usageDuration?: string;
  usageForm?: string;
  useRestrictions?: string;
  issuePlace?: string;
  issueDate?: string;
  provinceId?: string | null;
  communeId?: string | null;
  hamletId?: string | null;
  addressDetail?: string | null;
  address?: string | null;
  valuationAmount?: number | null;
  valuationMethod?: ValuationMethod | null;
  ownerType: CollateralOwnerType;
  thirdPartyInfo?: ThirdPartyInfo | null;
  householdMembers?: HouseholdMember[] | null;
}

export type UpdateCollateralPayload = Partial<CreateCollateralPayload>;

export interface CreateDisbursementPayload {
  disbursementDate: string;
  amount: number;
  note?: string;
}

export interface UpdateDisbursementPayload {
  disbursementDate?: string;
  amount?: number;
  note?: string;
  reason?: string;
}

export interface CreateRepaymentPayload {
  repaymentDate: string;
  principalAmount?: number;
  interestAmount?: number;
  interestDays?: number;
  interestStartDate?: string | null;
  interestEndDate?: string | null;
  autoSettleIfPaidInFull?: boolean;
  note?: string;
}

export interface UpdateRepaymentPayload {
  repaymentDate?: string;
  principalAmount?: number;
  interestAmount?: number;
  interestDays?: number;
  interestStartDate?: string | null;
  interestEndDate?: string | null;
  note?: string;
  reason?: string;
}

export interface LoanListQuery extends ListQueryParams {
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

export { ValuationType, CollateralOwnerType } from '@/shared/types';

export const VALUATION_TYPE_LABELS: Record<ValuationType, string> = {
  THEO_NGHI_DINH_QUY: 'Theo nghị định Quỹ',
  THEO_NGHI_DINH_QUY_CU: 'Theo nghị định Quỹ (Cũ)',
  THEO_GIA_THI_TRUONG: 'Theo giá thị trường',
  THEO_GIA_THI_TRUONG_VA_NGHI_DINH_QUY: 'Theo giá thị trường và theo nghị định Quỹ',
};

export interface LoanValuation {
  id: string;
  loanId: string;
  collateralId?: string | null;
  collateralIds?: string[];
  collaterals?: Collateral[];
  collateral?: {
    id: string;
    assetCode: string;
    certificateNumber: string;
    sheetNumber: string;
    plotNumber: string;
  } | null;
  valuationType: ValuationType;
  valuationDate: string | null;
  sheetNumber: string;
  plotNumber: string;
  area: number;
  actualArea?: number | null;
  pricePerSqMeter: number;
  totalPriceBeforeRound?: number | null;
  totalPrice: number;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLoanValuationPayload {
  collateralIds?: string[];
  collateralId?: string | null;
  valuationType: ValuationType;
  valuationDate?: string | null;
  sheetNumber?: string;
  plotNumber?: string;
  area?: number;
  actualArea?: number | null;
  pricePerSqMeter: number;
  totalPriceBeforeRound?: number;
  totalPrice?: number;
  notes?: string | null;
}

export interface UpdateLoanValuationPayload extends Partial<CreateLoanValuationPayload> {}

export interface PreviewGroupValuationPayload {
  collateralIds: string[];
  pricePerSqMeter: number;
}

export interface GroupValuationPreviewResult {
  sheetNumber: string;
  plotNumber: string;
  area: number;
  actualArea: number | null;
  effectiveArea: number;
  pricePerSqMeter: number;
  totalPriceBeforeRound: number;
  totalPrice: number;
  collateralCount: number;
}
