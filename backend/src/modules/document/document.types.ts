import { LoanType } from '@prisma/client';

export type DocumentTemplateKey =
  | 'TC1'
  | 'TC2'
  | 'TC3'
  | 'TC4'
  | 'TC7'
  | 'TC8'
  | 'TIN1'
  | 'TIN2'
  | 'TIN3'
  | 'TIN4'
  | 'BC_THU_NHAP'
  | 'PA';

export interface DocumentTemplateDefinition {
  key: DocumentTemplateKey;
  code: string;
  title: string;
  description: string;
  loanType: LoanType | 'ALL';
  groupFolder: 'thế chấp' | 'tín chấp' | 'chung';
  fileName: string;
  outputSuffix: string;
}

export interface DocumentValidationWarning {
  field: string;
  message: string;
  isBlocking?: boolean;
}

export interface LoanDocumentTemplateItem {
  key: DocumentTemplateKey;
  code: string;
  title: string;
  description: string;
  loanType: LoanType | 'ALL';
  fileName: string;
  suggestedFileName: string;
}

export interface GetLoanTemplatesResult {
  loanId: string;
  loanType: LoanType;
  contractNumber: string | null;
  templates: LoanDocumentTemplateItem[];
  warnings: DocumentValidationWarning[];
}

export interface GeneratedDocumentResult {
  fileName: string;
  buffer: Buffer;
  mimeType: string;
}

