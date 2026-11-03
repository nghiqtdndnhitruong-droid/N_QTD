import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getWordTemplatesApi,
  getWordTemplateByIdApi,
  getDataSourcesApi,
  uploadWordTemplateApi,
  uploadWordTemplateVersionApi,
  updateWordTemplateApi,
  saveWordTemplateMappingsApi,
  deleteWordTemplateApi,
  downloadOriginalTemplateApi,
  previewWordTemplateApi,
  exportLoanDocumentsApi,
  getWordExportHistoryApi,
  getGlobalKeywordsCatalogApi,
  createGlobalKeywordApi,
  updateGlobalKeywordApi,
  deleteGlobalKeywordApi,
  validateTemplateSyntaxApi,
} from '../api/word-templates.api';
import type {
  CreateWordTemplateInput,
  UpdateWordTemplateInput,
  WordTemplateMapping,
  GlobalWordKeyword,
} from '../types/word-template.types';

export const wordTemplateKeys = {
  all: ['word-templates'] as const,
  lists: () => [...wordTemplateKeys.all, 'list'] as const,
  list: (params?: any) => [...wordTemplateKeys.lists(), params] as const,
  details: () => [...wordTemplateKeys.all, 'detail'] as const,
  detail: (id?: string) => [...wordTemplateKeys.details(), id] as const,
  dataSources: () => [...wordTemplateKeys.all, 'data-sources'] as const,
  catalog: (params?: any) => [...wordTemplateKeys.all, 'catalog', params] as const,
  exportHistory: (params?: any) => [...wordTemplateKeys.all, 'export-history', params] as const,
};

export function useWordTemplates(params?: {
  category?: string;
  loanTypeScope?: string;
  isActive?: boolean;
  search?: string;
}) {
  return useQuery({
    queryKey: wordTemplateKeys.list(params),
    queryFn: () => getWordTemplatesApi(params),
  });
}

export function useWordTemplateDetail(id?: string) {
  return useQuery({
    queryKey: wordTemplateKeys.detail(id),
    queryFn: () => getWordTemplateByIdApi(id!),
    enabled: Boolean(id),
  });
}

export function useDataSources() {
  return useQuery({
    queryKey: wordTemplateKeys.dataSources(),
    queryFn: () => getDataSourcesApi(),
    staleTime: 5 * 60 * 1000, // 5 phút cache
  });
}

export function useUploadWordTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateWordTemplateInput) => uploadWordTemplateApi(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: wordTemplateKeys.lists() });
    },
  });
}

export function useUploadVersion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file, changeNote }: { id: string; file: File; changeNote?: string }) =>
      uploadWordTemplateVersionApi(id, file, changeNote),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: wordTemplateKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: wordTemplateKeys.lists() });
    },
  });
}

export function useUpdateWordTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWordTemplateInput }) =>
      updateWordTemplateApi(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: wordTemplateKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: wordTemplateKeys.lists() });
    },
  });
}

export function useSaveMappings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, mappings }: { id: string; mappings: WordTemplateMapping[] }) =>
      saveWordTemplateMappingsApi(id, mappings),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: wordTemplateKeys.detail(variables.id) });
    },
  });
}

export function useDeleteWordTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteWordTemplateApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: wordTemplateKeys.lists() });
    },
  });
}

export function useDownloadOriginalTemplate() {
  return useMutation({
    mutationFn: ({ id, fileName }: { id: string; fileName?: string }) =>
      downloadOriginalTemplateApi(id, fileName),
  });
}

export function usePreviewTemplate() {
  return useMutation({
    mutationFn: ({ templateId, loanId }: { templateId: string; loanId: string }) =>
      previewWordTemplateApi(templateId, loanId),
  });
}

export function useExportLoanDocuments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ loanId, templateIds }: { loanId: string; templateIds: string[] }) =>
      exportLoanDocumentsApi(loanId, templateIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: wordTemplateKeys.exportHistory() });
    },
  });
}

export function useWordExportHistory(params?: { loanId?: string; templateId?: string }) {
  return useQuery({
    queryKey: wordTemplateKeys.exportHistory(params),
    queryFn: () => getWordExportHistoryApi(params),
  });
}

// -------------------------------------------------------------
// CATALOG & SYNTAX HOOKS
// -------------------------------------------------------------

export function useWordTemplateCatalog(params?: { category?: string; search?: string }) {
  return useQuery({
    queryKey: wordTemplateKeys.catalog(params),
    queryFn: () => getGlobalKeywordsCatalogApi(params),
  });
}

export function useCreateCatalogKeyword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<GlobalWordKeyword>) => createGlobalKeywordApi(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: wordTemplateKeys.catalog() });
    },
  });
}

export function useUpdateCatalogKeyword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<GlobalWordKeyword> }) =>
      updateGlobalKeywordApi(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: wordTemplateKeys.catalog() });
      queryClient.invalidateQueries({ queryKey: wordTemplateKeys.details() });
    },
  });
}

export function useDeleteCatalogKeyword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteGlobalKeywordApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: wordTemplateKeys.catalog() });
    },
  });
}

export function useValidateTemplateSyntax() {
  return useMutation({
    mutationFn: (templateId: string) => validateTemplateSyntaxApi(templateId),
  });
}

