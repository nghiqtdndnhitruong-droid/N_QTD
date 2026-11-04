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
  path: string;
  label: string;
  dataType: MappingDataType;
  description?: string;
  sampleValue?: string | number | boolean;
  isList?: boolean;
  itemFields?: DataDictionaryField[];
}

export interface DataDictionaryGroup {
  id: string;
  label: string;
  description?: string;
  fields: DataDictionaryField[];
}

export interface WordTemplateVersion {
  id: string;
  templateId: string;
  version: number;
  filePath: string;
  fileName: string;
  fileSize: number;
  changeNote?: string | null;
  createdBy: string;
  createdAt: string;
}

export interface WordTemplateMapping {
  id?: string;
  templateId?: string;
  keyword: string;
  displayName: string;
  isLoop: boolean;
  loopContext?: string | null;
  dataPath?: string | null;
  dataType: MappingDataType;
  formatPattern?: string | null;
  defaultValue?: string | null;
  isRequired: boolean;
  description?: string | null;
  condition?: any;
}

export interface WordTemplate {
  id: string;
  code: string;
  title: string;
  category: string;
  loanTypeScope: LoanTypeScope;
  description?: string | null;
  isActive: boolean;
  currentVersion: number;
  currentFilePath: string;
  originalFileName: string;
  fileSize: number;
  versions?: WordTemplateVersion[];
  mappings?: WordTemplateMapping[];
  _count?: {
    mappings: number;
    versions: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateWordTemplateInput {
  code: string;
  title: string;
  category: string;
  loanTypeScope?: LoanTypeScope;
  description?: string;
  file: File;
}

export interface UpdateWordTemplateInput {
  title?: string;
  category?: string;
  loanTypeScope?: LoanTypeScope;
  description?: string;
  isActive?: boolean;
}

export interface KeywordValidationWarning {
  keyword: string;
  displayName: string;
  reason: 'MISSING_DATA' | 'UNMAPPED' | 'EMPTY_REQUIRED';
  message: string;
}

export interface GlobalWordKeyword {
  id: string;
  keyword: string;
  displayName: string;
  category: string;
  dataPath: string;
  dataType: MappingDataType;
  formatPattern?: string | null;
  defaultValue?: string | null;
  isList?: boolean;
  itemProperties?: any;
  description?: string | null;
  isSystem?: boolean;
  usageCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface TemplateDiagnostic {
  code: string;
  message: string;
  severity: 'ERROR' | 'WARNING' | 'INFO';
  rawSnippet?: string;
  suggestion?: string;
}

export interface TemplateValidationResult {
  isValid: boolean;
  diagnostics: TemplateDiagnostic[];
  detectedKeywords: string[];
  detectedLoops: { iterator: string; collection: string }[];
  detectedConditions: string[];
}

export interface TemplatePreviewResult {
  templateId: string;
  templateTitle: string;
  loanId: string;
  resolvedData: Record<string, any>;
  warnings: KeywordValidationWarning[];
}

export interface WordExportLog {
  id: string;
  templateId: string;
  template?: {
    title: string;
    code: string;
    category: string;
  };
  templateVersion: number;
  loanId: string;
  exportedBy: string;
  exportedAt: string;
  outputFileName: string;
  outputFileSize: number;
  status: 'SUCCESS' | 'FAILED' | 'WARNING';
  warnings?: KeywordValidationWarning[] | null;
  errorMessage?: string | null;
}

