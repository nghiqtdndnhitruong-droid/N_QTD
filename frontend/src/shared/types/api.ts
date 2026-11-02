/**
 * Kiểu dữ liệu chuẩn của Backend (khớp backend/src/shared/types/api-response.types.ts).
 * KHÔNG tự ý thay đổi cấu trúc – đây là API Contract đã thống nhất.
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  timestamp: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T[];
  pagination: PaginationMeta;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errorCode: string;
  /** Lỗi validation: key là đường dẫn trường dạng "a.b.0.c", value là danh sách thông điệp. */
  errors?: Record<string, string[]> | unknown;
  timestamp: string;
  stack?: string;
}

/** Kết quả danh sách đã bóc tách để UI sử dụng. */
export interface Paginated<T> {
  items: T[];
  pagination: PaginationMeta;
}

/** Tham số danh sách chung theo quy ước Backend (page, limit ≤ 100, search, sortBy, sortOrder). */
export interface ListQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

