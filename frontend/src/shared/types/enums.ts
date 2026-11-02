/**
 * Các Enum nghiệp vụ khớp 100% với backend/prisma/schema.prisma
 */

export const IdDocumentType = {
  CAN_CUOC: 'CAN_CUOC',
  CAN_CUOC_CONG_DAN: 'CAN_CUOC_CONG_DAN',
} as const;
export type IdDocumentType = (typeof IdDocumentType)[keyof typeof IdDocumentType];

export const Gender = {
  NAM: 'NAM',
  NU: 'NU',
} as const;
export type Gender = (typeof Gender)[keyof typeof Gender];

export const LoanType = {
  TIN_CHAP: 'TIN_CHAP',
  THE_CHAP: 'THE_CHAP',
} as const;
export type LoanType = (typeof LoanType)[keyof typeof LoanType];

export const LoanTermType = {
  NGAN_HAN: 'NGAN_HAN',
  TRUNG_HAN: 'TRUNG_HAN',
} as const;
export type LoanTermType = (typeof LoanTermType)[keyof typeof LoanTermType];

export const LoanStatus = {
  DANG_TAO: 'DANG_TAO',
  DA_HOAN_THANH_HO_SO: 'DA_HOAN_THANH_HO_SO',
  DA_GIAI_NGAN: 'DA_GIAI_NGAN',
  QUA_HAN: 'QUA_HAN',
  DA_TAT_TOAN: 'DA_TAT_TOAN',
} as const;
export type LoanStatus = (typeof LoanStatus)[keyof typeof LoanStatus];

export const CollateralAssetType = {
  QUYEN_SU_DUNG_DAT: 'QUYEN_SU_DUNG_DAT',
  QUYEN_SU_DUNG_DAT_QUYEN_SO_HUU_NHA_O_VA_TAI_SAN_KHAC_GAN_LIEN_VOI_DAT:
    'QUYEN_SU_DUNG_DAT_QUYEN_SO_HUU_NHA_O_VA_TAI_SAN_KHAC_GAN_LIEN_VOI_DAT',
  QUYEN_SU_DUNG_DAT_QUYEN_SO_HUU_TAI_SAN_GAN_LIEN_VOI_DAT:
    'QUYEN_SU_DUNG_DAT_QUYEN_SO_HUU_TAI_SAN_GAN_LIEN_VOI_DAT',
  // Tương thích ngược với dữ liệu cũ
  QUYEN_SU_DUNG_DAT_VA_TAI_SAN_GAN_LIEN: 'QUYEN_SU_DUNG_DAT_VA_TAI_SAN_GAN_LIEN',
} as const;
export type CollateralAssetType = (typeof CollateralAssetType)[keyof typeof CollateralAssetType];

export const CollateralCertificateType = {
  GCN: 'GCN',
  GIAY_CHUNG_NHAN: 'GIAY_CHUNG_NHAN',
  VAO_SO_CAP_GIAY_CHUNG_NHAN_QUYEN_SU_DUNG_DAT: 'VAO_SO_CAP_GIAY_CHUNG_NHAN_QUYEN_SU_DUNG_DAT',
  GIAY_CHUNG_NHAN_QUYEN_SU_DUNG_DAT: 'GIAY_CHUNG_NHAN_QUYEN_SU_DUNG_DAT',
} as const;
export type CollateralCertificateType =
  (typeof CollateralCertificateType)[keyof typeof CollateralCertificateType];

export const CollateralOwnerType = {
  NGUOI_VAY_CA_NHAN: 'NGUOI_VAY_CA_NHAN',
  NGUOI_VAY_HO: 'NGUOI_VAY_HO',
  NGUOI_THUA_KE_CA_NHAN: 'NGUOI_THUA_KE_CA_NHAN',
  NGUOI_THUA_KE_HO: 'NGUOI_THUA_KE_HO',
  BAO_LANH: 'BAO_LANH',
} as const;
export type CollateralOwnerType = (typeof CollateralOwnerType)[keyof typeof CollateralOwnerType];

export const ValuationMethod = {
  BANG_GIA_QUY: 'BANG_GIA_QUY',
  THI_TRUONG: 'THI_TRUONG',
} as const;
export type ValuationMethod = (typeof ValuationMethod)[keyof typeof ValuationMethod];
