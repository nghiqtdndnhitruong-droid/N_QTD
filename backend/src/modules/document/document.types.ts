import { LoanType } from '@prisma/client';

export type DocumentTemplateKey = string;

export interface DocumentTemplateDefinition {
  key: DocumentTemplateKey;
  code: string;
  title: string;
  description: string;
  loanType: LoanType | 'ALL';
  groupFolder?: string;
  fileName: string;
  outputSuffix: string;
  filePath?: string;
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

export interface ExportDocumentsDto {
  templateKeys: DocumentTemplateKey[];
}
