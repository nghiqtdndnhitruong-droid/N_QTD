import { httpClient } from '@/lib/http';
import { downloadBlob } from '@/lib/utils/download';
import type { ApiResponse } from '@/shared/types';
import type {
  WordTemplate,
  DataDictionaryGroup,
  WordTemplateMapping,
  TemplatePreviewResult,
  WordExportLog,
  CreateWordTemplateInput,
  UpdateWordTemplateInput,
  GlobalWordKeyword,
  TemplateValidationResult,
} from '../types/word-template.types';

export async function getWordTemplatesApi(params?: {
  category?: string;
  loanTypeScope?: string;
  isActive?: boolean;
  search?: string;
}): Promise<WordTemplate[]> {
  const res = await httpClient.get<ApiResponse<WordTemplate[]>>('/word-templates', {
    params,
  });
  return res.data.data!;
}

export async function getWordTemplateByIdApi(id: string): Promise<WordTemplate> {
  const res = await httpClient.get<ApiResponse<WordTemplate>>(`/word-templates/${id}`);
  return res.data.data!;
}

export async function getDataSourcesApi(): Promise<DataDictionaryGroup[]> {
  const res = await httpClient.get<ApiResponse<DataDictionaryGroup[]>>(
    '/word-templates/data-sources',
  );
  return res.data.data!;
}

export async function uploadWordTemplateApi(
  input: CreateWordTemplateInput,
): Promise<WordTemplate> {
  const formData = new FormData();
  formData.append('code', input.code);
  formData.append('title', input.title);
  formData.append('category', input.category);
  if (input.loanTypeScope) formData.append('loanTypeScope', input.loanTypeScope);
  if (input.description) formData.append('description', input.description);
  formData.append('file', input.file);

  const res = await httpClient.post<ApiResponse<WordTemplate>>(
    '/word-templates/upload',
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    },
  );
  return res.data.data!;
}

export async function uploadWordTemplateVersionApi(
  id: string,
  file: File,
  changeNote?: string,
): Promise<WordTemplate> {
  const formData = new FormData();
  formData.append('file', file);
  if (changeNote) formData.append('changeNote', changeNote);

  const res = await httpClient.post<ApiResponse<WordTemplate>>(
    `/word-templates/${id}/versions`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    },
  );
  return res.data.data!;
}

export async function updateWordTemplateApi(
  id: string,
  data: UpdateWordTemplateInput,
): Promise<WordTemplate> {
  const res = await httpClient.put<ApiResponse<WordTemplate>>(
    `/word-templates/${id}`,
    data,
  );
  return res.data.data!;
}

export async function saveWordTemplateMappingsApi(
  id: string,
  mappings: WordTemplateMapping[],
): Promise<WordTemplateMapping[]> {
  const res = await httpClient.put<ApiResponse<WordTemplateMapping[]>>(
    `/word-templates/${id}/mappings`,
    { mappings },
  );
  return res.data.data!;
}

export async function deleteWordTemplateApi(id: string): Promise<void> {
  await httpClient.delete(`/word-templates/${id}`);
}

export async function downloadOriginalTemplateApi(
  id: string,
  defaultName = 'template.docx',
): Promise<void> {
  const res = await httpClient.get(`/word-templates/${id}/download`, {
    responseType: 'blob',
  });

  const disposition = res.headers['content-disposition'];
  let filename = defaultName;
  if (disposition) {
    const match = /filename\*?=['"]?(?:UTF-8'')?([^;"\n]*)['"]?/i.exec(disposition);
    if (match && match[1]) {
      filename = decodeURIComponent(match[1]);
    }
  }

  downloadBlob(new Blob([res.data]), filename);
}

export async function previewWordTemplateApi(
  id: string,
  loanId: string,
): Promise<TemplatePreviewResult> {
  const res = await httpClient.post<ApiResponse<TemplatePreviewResult>>(
    `/word-templates/${id}/preview`,
    { loanId },
  );
  return res.data.data!;
}

export async function exportLoanDocumentsApi(
  loanId: string,
  templateIds: string[],
): Promise<void> {
  const res = await httpClient.post(
    '/word-templates/export-loan',
    { loanId, templateIds },
    { responseType: 'blob' },
  );

  const disposition = res.headers['content-disposition'];
  let filename = templateIds.length > 1 ? `Ho_so_vay_${Date.now()}.zip` : `Tai_lieu_${Date.now()}.docx`;
  if (disposition) {
    const match = /filename\*?=['"]?(?:UTF-8'')?([^;"\n]*)['"]?/i.exec(disposition);
    if (match && match[1]) {
      filename = decodeURIComponent(match[1]);
    }
  }

  downloadBlob(new Blob([res.data]), filename);
}

export async function getWordExportHistoryApi(params?: {
  loanId?: string;
  templateId?: string;
}): Promise<WordExportLog[]> {
  const res = await httpClient.get<ApiResponse<WordExportLog[]>>(
    '/word-templates/export-history',
    { params },
  );
  return res.data.data!;
}

// -------------------------------------------------------------
// GLOBAL KEYWORD CATALOG & SYNTAX VALIDATION APIs
// -------------------------------------------------------------

export async function getGlobalKeywordsCatalogApi(params?: {
  category?: string;
  search?: string;
}): Promise<GlobalWordKeyword[]> {
  const res = await httpClient.get<ApiResponse<GlobalWordKeyword[]>>(
    '/word-templates/catalog',
    { params },
  );
  return res.data.data!;
}

export async function createGlobalKeywordApi(
  data: Partial<GlobalWordKeyword>,
): Promise<GlobalWordKeyword> {
  const res = await httpClient.post<ApiResponse<GlobalWordKeyword>>(
    '/word-templates/catalog',
    data,
  );
  return res.data.data!;
}

export async function updateGlobalKeywordApi(
  id: string,
  data: Partial<GlobalWordKeyword>,
): Promise<{ data: GlobalWordKeyword; affectedTemplates: any[] }> {
  const res = await httpClient.put<ApiResponse<GlobalWordKeyword> & { affectedTemplates: any[] }>(
    `/word-templates/catalog/${id}`,
    data,
  );
  return {
    data: res.data.data!,
    affectedTemplates: res.data.affectedTemplates || [],
  };
}

export async function deleteGlobalKeywordApi(id: string): Promise<void> {
  await httpClient.delete(`/word-templates/catalog/${id}`);
}

export async function validateTemplateSyntaxApi(id: string): Promise<{
  validation: TemplateValidationResult;
  fullPlainText: string;
}> {
  const res = await httpClient.post<
    ApiResponse<{
      validation: TemplateValidationResult;
      fullPlainText: string;
    }>
  >(`/word-templates/${id}/validate-syntax`);
  return res.data.data!;
}
