export type LoanTypeScope = 'ALL' | 'THE_CHAP' | 'TIN_CHAP';

export type MappingDataType =
  | 'TEXT'
  | 'NUMBER'
  | 'DATE'
  | 'CURRENCY'
  | 'CURRENCY_WORDS'
  | 'GENDER_TITLE'
  | 'BOOLEAN'
  | 'LIST';

export interface DataDictionaryField {
  path: string; // vd: "member.fullName"
  label: string; // vd: "Họ và tên thành viên/người vay"
  dataType: MappingDataType;
  description?: string;
  sampleValue?: string | number | boolean;
  isList?: boolean; // Nếu là mảng (vd: collaterals, relatedPersons)
  itemFields?: DataDictionaryField[]; // Các trường bên trong mỗi phần tử mảng
}

export interface DataDictionaryGroup {
  id: string; // "member" | "loan" | "mortgage" | "collaterals" | "relatedPersons" | "heir" | "loanPlan" | "fund"
  label: string; // "Thông tin Thành viên / Người vay"
  description?: string;
  fields: DataDictionaryField[];
}

export interface ParsedKeywordInfo {
  keyword: string;
  isLoop: boolean;
  loopContext?: string;
  occurrences: number;
  locationSample?: string;
}

export interface WordTemplateMappingDto {
  id?: string;
  keyword: string;
  displayName: string;
  isLoop?: boolean;
  loopContext?: string | null;
  dataPath?: string | null;
  dataType?: MappingDataType;
  formatPattern?: string | null;
  defaultValue?: string | null;
  isRequired?: boolean;
  description?: string | null;
  condition?: any;
}

export interface CreateWordTemplateDto {
  code: string;
  title: string;
  category: string;
  loanTypeScope?: LoanTypeScope;
  description?: string;
}

export interface UpdateWordTemplateDto {
  title?: string;
  category?: string;
  loanTypeScope?: LoanTypeScope;
  description?: string;
  isActive?: boolean;
}

export interface SaveMappingsDto {
  mappings: WordTemplateMappingDto[];
}

export interface PreviewTemplateDto {
  loanId: string;
}

export interface ExportLoanDocumentsDto {
  loanId: string;
  templateIds: string[];
}

export interface KeywordValidationWarning {
  keyword: string;
  displayName: string;
  reason: 'MISSING_DATA' | 'UNMAPPED' | 'EMPTY_REQUIRED';
  message: string;
}

export interface TemplatePreviewResult {
  templateId: string;
  templateTitle: string;
  loanId: string;
  resolvedData: Record<string, any>;
  warnings: KeywordValidationWarning[];
  sampleFilledText?: string;
}

export interface ExportResultFile {
  fileName: string;
  buffer: Buffer;
  mimeType: string;
}

