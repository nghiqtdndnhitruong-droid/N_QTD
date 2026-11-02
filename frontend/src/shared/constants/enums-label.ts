import {
  CollateralAssetType,
  CollateralOwnerType,
  Gender,
  IdDocumentType,
  LoanStatus,
  LoanTermType,
  LoanType,
  ValuationMethod,
} from '../types/enums';

export const ID_DOCUMENT_TYPE_LABELS: Record<IdDocumentType, string> = {
  CAN_CUOC: 'Thẻ căn cước',
  CAN_CUOC_CONG_DAN: 'Căn cước công dân (CCCD)',
};

export const GENDER_LABELS: Record<Gender, string> = {
  NAM: 'Nam',
  NU: 'Nữ',
};

export const LOAN_TYPE_LABELS: Record<LoanType, string> = {
  TIN_CHAP: 'Vay tín chấp',
  THE_CHAP: 'Vay thế chấp',
};

export const LOAN_TERM_TYPE_LABELS: Record<LoanTermType, string> = {
  NGAN_HAN: 'Ngắn hạn (12 tháng)',
  TRUNG_HAN: 'Trung hạn (24 tháng)',
};

export const LOAN_TERM_MONTHS: Record<LoanTermType, number> = {
  NGAN_HAN: 12,
  TRUNG_HAN: 24,
};

export type BadgeTone = 'neutral' | 'primary' | 'info' | 'success' | 'warning' | 'danger';

export interface LoanStatusMeta {
  label: string;
  tone: BadgeTone;
  description: string;
}

export const LOAN_STATUS_META: Record<LoanStatus, LoanStatusMeta> = {
  DANG_TAO: {
    label: 'Đang tạo',
    tone: 'neutral',
    description: 'Hồ sơ nháp, đang bổ sung thông tin hoặc tài sản thế chấp',
  },
  DA_HOAN_THANH_HO_SO: {
    label: 'Đã hoàn thành hồ sơ',
    tone: 'primary',
    description: 'Hồ sơ đã đầy đủ điều kiện, sẵn sàng giải ngân',
  },
  DA_GIAI_NGAN: {
    label: 'Đã giải ngân',
    tone: 'info',
    description: 'Đã giải ngân một phần hoặc toàn bộ, đang trong kỳ hạn vay',
  },
  QUA_HAN: {
    label: 'Quá hạn',
    tone: 'danger',
    description: 'Vượt quá thời gian ân hạn sau ngày đáo hạn nhưng chưa tất toán',
  },
  DA_TAT_TOAN: {
    label: 'Đã tất toán',
    tone: 'success',
    description: 'Đã hoàn trả toàn bộ nợ gốc và lãi',
  },
};

export const COLLATERAL_ASSET_TYPE_LABELS: Record<CollateralAssetType, string> = {
  QUYEN_SU_DUNG_DAT: 'Quyền sử dụng đất',
  QUYEN_SU_DUNG_DAT_VA_TAI_SAN_GAN_LIEN: 'Quyền sử dụng đất và tài sản gắn liền với đất',
};

export const COLLATERAL_OWNER_TYPE_LABELS: Record<CollateralOwnerType, string> = {
  NGUOI_VAY_CA_NHAN: 'Người vay đứng tên cá nhân',
  NGUOI_VAY_HO: 'Người vay đứng tên hộ gia đình',
  NGUOI_THUA_KE_CA_NHAN: 'Người thừa kế đứng tên cá nhân',
  NGUOI_THUA_KE_HO: 'Người thừa kế đứng tên hộ gia đình',
  BAO_LANH: 'Bên thứ ba bảo lãnh',
};

export const VALUATION_METHOD_LABELS: Record<ValuationMethod, string> = {
  BANG_GIA_QUY: 'Theo bảng giá Quỹ',
  THI_TRUONG: 'Theo giá thị trường',
};

/** Hạn mức nghiệp vụ dùng để cảnh báo sớm cho người dùng trên UI (Backend vẫn kiểm tra cuối cùng). */
export const BUSINESS_LIMITS = {
  /** Tổng hạn mức vay tín chấp tối đa của 1 thành viên: 100.000.000 ₫ */
  MAX_UNSECURED_LOAN_VND: 100_000_000,
  /** Tỷ lệ cho vay tối đa trên tổng giá trị định giá tài sản thế chấp: 70% */
  MAX_LTV_RATIO: 0.7,
  /** Số ngày ân hạn sau ngày đáo hạn trước khi chuyển sang Quá hạn */
  OVERDUE_GRACE_DAYS: 9,
} as const;

