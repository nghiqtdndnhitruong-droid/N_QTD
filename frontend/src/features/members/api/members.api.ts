import { apiDelete, apiGet, apiGetPaginated, apiPost, apiPut, httpClient } from '@/lib/http';
import type { Paginated } from '@/shared/types';
import type {
  CreateMemberPayload,
  DeleteMemberResult,
  Member,
  MemberListQuery,
  UpdateMemberPayload,
} from '../types/member.types';

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export const membersApi = {
  list(query: MemberListQuery): Promise<Paginated<Member>> {
    return apiGetPaginated<Member>('/members', query as Record<string, unknown>);
  },

  async exportExcel(query: MemberListQuery): Promise<void> {
    const res = await httpClient.get('/members/export', {
      params: query,
      responseType: 'blob',
    });

    const disposition = res.headers['content-disposition'];
    let filename = 'Danh_sach_thanh_vien.xlsx';
    if (disposition) {
      const utf8Match = /filename\*=UTF-8''([^;\n]+)/i.exec(disposition);
      if (utf8Match?.[1]) {
        filename = decodeURIComponent(utf8Match[1].trim());
      } else {
        const asciiMatch = /filename=['"]?([^;"\n]+)['"]?/i.exec(disposition);
        if (asciiMatch?.[1]) {
          filename = decodeURIComponent(asciiMatch[1].trim());
        }
      }
    }

    downloadBlob(
      new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
      filename,
    );
  },

  getById(id: string): Promise<Member> {
    return apiGet<Member>(`/members/${id}`);
  },

  create(payload: CreateMemberPayload): Promise<Member> {
    return apiPost<Member, CreateMemberPayload>('/members', payload);
  },

  update(id: string, payload: UpdateMemberPayload): Promise<Member> {
    return apiPut<Member, UpdateMemberPayload>(`/members/${id}`, payload);
  },

  remove(id: string, reason?: string): Promise<DeleteMemberResult> {
    return apiDelete<DeleteMemberResult>(`/members/${id}`, {
      data: reason ? { reason } : undefined,
    });
  },

  saveCreditRating(id: string, selections: Record<string, string>): Promise<Member> {
    return apiPut<Member, { selections: Record<string, string> }>(`/members/${id}/credit-rating`, {
      selections,
    });
  },

  deleteCreditRating(id: string): Promise<Member> {
    return apiDelete<Member>(`/members/${id}/credit-rating`);
  },

  async exportCreditRatingDocx(
    id: string,
    selections: Record<string, string>,
    defaultFileName = 'Bang_cham_diem.docx',
  ): Promise<void> {
    const res = await httpClient.post(
      `/members/${id}/credit-rating/export-docx`,
      { selections },
      { responseType: 'blob' },
    );

    const disposition = res.headers['content-disposition'];
    let filename = defaultFileName;
    if (disposition) {
      const utf8Match = /filename\*=UTF-8''([^;\n]+)/i.exec(disposition);
      if (utf8Match?.[1]) {
        filename = decodeURIComponent(utf8Match[1].trim());
      } else {
        const asciiMatch = /filename=['"]?([^;"\n]+)['"]?/i.exec(disposition);
        if (asciiMatch?.[1]) {
          filename = decodeURIComponent(asciiMatch[1].trim());
        }
      }
    }

    downloadBlob(
      new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
      filename,
    );
  },

  batchSaveCreditRating(
    memberIds: string[],
    selections: Record<string, string>,
  ): Promise<Member[]> {
    return apiPut<Member[], { memberIds: string[]; selections: Record<string, string> }>(
      '/members/batch/credit-rating',
      { memberIds, selections },
    );
  },

  async batchExportCreditRatingZip(
    memberIds: string[],
    selections: Record<string, string>,
    defaultFileName = 'Bang_cham_diem_nhom.zip',
  ): Promise<void> {
    const res = await httpClient.post(
      '/members/batch/credit-rating/export-zip',
      { memberIds, selections },
      { responseType: 'blob' },
    );

    const disposition = res.headers['content-disposition'];
    let filename = defaultFileName;
    if (disposition) {
      const utf8Match = /filename\*=UTF-8''([^;\n]+)/i.exec(disposition);
      if (utf8Match?.[1]) {
        filename = decodeURIComponent(utf8Match[1].trim());
      } else {
        const asciiMatch = /filename=['"]?([^;"\n]+)['"]?/i.exec(disposition);
        if (asciiMatch?.[1]) {
          filename = decodeURIComponent(asciiMatch[1].trim());
        }
      }
    }

    downloadBlob(new Blob([res.data], { type: 'application/zip' }), filename);
  },
};
