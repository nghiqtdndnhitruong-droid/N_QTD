import { httpClient } from '@/lib/http';
import { downloadBlob } from '@/lib/utils/download';
import type { ApiResponse } from '@/shared/types';
import type {
  DatabaseStats,
  DisbursedLoansResponse,
  MaturityLoansResponse,
  RestoreResult,
  UnpaidInterestResponse,
} from '../types/reports.types';

export async function getDisbursedLoansApi(params?: {
  fromDate?: string;
  toDate?: string;
}): Promise<DisbursedLoansResponse> {
  const res = await httpClient.get<ApiResponse<DisbursedLoansResponse>>('/reports/disbursed-loans', {
    params,
  });
  return res.data.data!;
}

export async function downloadDisbursedLoansExcelApi(params?: {
  fromDate?: string;
  toDate?: string;
}): Promise<void> {
  const res = await httpClient.get('/reports/disbursed-loans/export', {
    params,
    responseType: 'blob',
  });

  const disposition = res.headers['content-disposition'];
  let filename = `Danh_sach_giai_ngan_${Date.now()}.xlsx`;
  if (disposition) {
    const match = /filename\*?=['"]?(?:UTF-8'')?([^;"\n]*)['"]?/i.exec(disposition);
    if (match && match[1]) {
      filename = decodeURIComponent(match[1]);
    }
  }

  downloadBlob(new Blob([res.data]), filename);
}

export async function getMaturityLoansApi(params?: {
  month?: number | string;
  year?: number | string;
}): Promise<MaturityLoansResponse> {
  const res = await httpClient.get<ApiResponse<MaturityLoansResponse>>('/reports/maturity-loans', {
    params,
  });
  return res.data.data!;
}

export async function downloadMaturityLoansExcelApi(params?: {
  month?: number | string;
  year?: number | string;
}): Promise<void> {
  const res = await httpClient.get('/reports/maturity-loans/export', {
    params,
    responseType: 'blob',
  });

  const disposition = res.headers['content-disposition'];
  let filename = `Danh_sach_toi_han_${Date.now()}.xlsx`;
  if (disposition) {
    const match = /filename\*?=['"]?(?:UTF-8'')?([^;"\n]*)['"]?/i.exec(disposition);
    if (match && match[1]) {
      filename = decodeURIComponent(match[1]);
    }
  }

  downloadBlob(new Blob([res.data]), filename);
}

export async function getUnpaidInterestLoansApi(params?: {
  months?: string | number;
  search?: string;
}): Promise<UnpaidInterestResponse> {
  const res = await httpClient.get<ApiResponse<UnpaidInterestResponse>>('/reports/unpaid-interest', {
    params,
  });
  return res.data.data!;
}

export async function downloadUnpaidInterestExcelApi(params?: {
  months?: string | number;
  search?: string;
}): Promise<void> {
  const res = await httpClient.get('/reports/unpaid-interest/export', {
    params,
    responseType: 'blob',
  });

  const disposition = res.headers['content-disposition'];
  let filename = `Danh_sach_cham_dong_lai_${Date.now()}.xlsx`;
  if (disposition) {
    const match = /filename\*?=['"]?(?:UTF-8'')?([^;"\n]*)['"]?/i.exec(disposition);
    if (match && match[1]) {
      filename = decodeURIComponent(match[1]);
    }
  }

  downloadBlob(new Blob([res.data]), filename);
}

export async function getDatabaseStatsApi(): Promise<DatabaseStats> {
  const res = await httpClient.get<ApiResponse<DatabaseStats>>('/system/stats');
  return res.data.data!;
}

export async function downloadDatabaseBackupApi(): Promise<void> {
  const res = await httpClient.get('/system/backup', {
    responseType: 'blob',
  });

  const disposition = res.headers['content-disposition'];
  let filename = `NQTD_Backup_${Date.now()}.json`;
  if (disposition) {
    const match = /filename\*?=['"]?(?:UTF-8'')?([^;"\n]*)['"]?/i.exec(disposition);
    if (match && match[1]) {
      filename = decodeURIComponent(match[1]);
    }
  }

  downloadBlob(new Blob([res.data]), filename);
}

export async function uploadDatabaseRestoreApi(file: File): Promise<RestoreResult> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await httpClient.post<ApiResponse<RestoreResult>>('/system/restore', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return res.data.data!;
}

export async function cleanDatabaseApi(): Promise<{ success: boolean; message: string }> {
  const res = await httpClient.post<{ success: boolean; message: string }>('/system/clean');
  return res.data;
}
