export interface DisbursedLoanItem {
  id: string;
  stt: number;
  contractNumber: string;
  borrowerName: string;
  hamlet: string;
  loanDate: string;
  dueDate: string;
  loanAmount: number;
  collateralCount: number;
  collateralArea: string;
  collateralCodes: string;
  totalCollateralValue?: number;
  collateralType: string;
  loanType: string;
  termType: string;
}

export interface DisbursedLoansGroup {
  count: number;
  totalAmount: number;
  totalCollateralValue?: number;
  items: DisbursedLoanItem[];
}

export interface DisbursedLoansResponse {
  fromDate: string;
  toDate: string;
  tinChap: DisbursedLoansGroup;
  theChap: DisbursedLoansGroup;
}

export interface MaturityLoanItem {
  id: string;
  stt: number;
  borrowerName: string;
  idNumber: string;
  hamlet: string;
  loanAmount: number;
  dueDate: string;
  contractNumber: string;
  loanType: string;
  termType: string;
}

export interface MaturityLoansResponse {
  month: number;
  year: number;
  count: number;
  totalAmount: number;
  items: MaturityLoanItem[];
}

export interface UnpaidInterestLoanItem {
  id: string;
  stt: number;
  contractNumber: string;
  borrowerName: string;
  borrowerPhone: string;
  idNumber: string;
  hamlet: string;
  loanAmount: number;
  principalBalance: number;
  interestRate: number;
  lastInterestDate: string;
  unpaidDays: number;
  unpaidMonths: number;
  unpaidInterest: number;
  loanType: string;
  termType: string;
}

export interface UnpaidInterestResponse {
  filterMonths: string;
  count: number;
  totalPrincipalBalance: number;
  totalUnpaidInterest: number;
  items: UnpaidInterestLoanItem[];
}

export interface DatabaseStats {
  users: number;
  userProfiles: number;
  provinces: number;
  communes: number;
  hamlets: number;
  areaGroups: number;
  interestRateConfigs: number;
  assetPricingRules: number;
  globalWordKeywords: number;
  wordTemplates: number;
  wordTemplateVersions: number;
  wordTemplateMappings: number;
  wordExportLogs: number;
  members: number;
  loans: number;
  relatedPersons: number;
  collaterals: number;
  loanValuations: number;
  disbursements: number;
  repayments: number;
  auditLogs: number;
  [key: string]: number;
}

export interface RestoreResult {
  success: boolean;
  message: string;
  restoredAt: string;
  restoredCounts: Record<string, number>;
  totalRecordsRestored: number;
}

