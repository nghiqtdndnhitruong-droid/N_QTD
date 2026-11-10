export interface DisbursedLoansFilterQuery {
  fromDate?: string;
  toDate?: string;
}

export interface MaturityLoansFilterQuery {
  month?: string | number;
  year?: string | number;
}

export interface DisbursedLoanItemDto {
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

export interface MaturityLoanItemDto {
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

export interface DisbursedLoansResponse {
  fromDate: string;
  toDate: string;
  tinChap: {
    items: DisbursedLoanItemDto[];
    totalAmount: number;
    count: number;
  };
  theChap: {
    items: DisbursedLoanItemDto[];
    totalAmount: number;
    totalCollateralValue: number;
    count: number;
  };
}

export interface MaturityLoansResponse {
  month: number;
  year: number;
  items: MaturityLoanItemDto[];
  totalAmount: number;
  count: number;
}

export interface UnpaidInterestLoanItemDto {
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

export interface UnpaidInterestFilterQuery {
  months?: string | number; // '3', '4', 'gte_3', 'gte_4', 'all'
  search?: string;
}

export interface UnpaidInterestResponse {
  filterMonths: string;
  count: number;
  totalPrincipalBalance: number;
  totalUnpaidInterest: number;
  items: UnpaidInterestLoanItemDto[];
}

