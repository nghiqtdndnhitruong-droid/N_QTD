import {
  Collateral,
  CollateralAssetType,
  CollateralOwnerType,
  ValuationMethod,
  Gender,
  IdDocumentType,
} from '@prisma/client';
import { PaginationQuery } from '../../shared/types';

export interface ThirdPartyInfoDto {
  fullName: string;
  yearOfBirth?: number;
  idType: IdDocumentType;
  idNumber: string;
  idIssuePlace?: string;
  gender?: Gender;
  address: string;
}

export interface CreateCollateralDto {
  loanId: string;
  assetType: CollateralAssetType;
  assetCode: string; // Mã số tài sản (bắt buộc, duy nhất toàn hệ thống)
  certificateNumber: string; // Số cấp giấy chứng nhận (cho phép trùng)
  sheetNumber: string; // Số tờ
  plotNumber: string; // Số thửa
  area: number; // Diện tích ghi trên giấy chứng nhận (m²)
  actualArea?: number | null; // Diện tích thực tế thẩm định (m² - tùy chọn)
  pricePerSqMeter?: number | null; // Đơn giá 1 m² (VNĐ - tùy chọn)
  origin?: string; // Nguồn gốc
  usagePurpose?: string; // Mục đích sử dụng
  usageDuration?: string; // Thời hạn sử dụng
  useRestrictions?: string; // Hạn chế sử dụng
  issuePlace?: string; // Nơi cấp
  issueDate?: string | Date; // Ngày cấp
  // Địa bàn tài sản độc lập (Tỉnh -> Xã -> Ấp)
  provinceId?: string | null;
  communeId?: string | null;
  hamletId?: string | null;
  addressDetail?: string | null;
  address?: string | null;
  valuationAmount?: number | null; // Giá trị định giá VNĐ (Bắt buộc với THE_CHAP, không bắt buộc với TIN_CHAP)
  valuationMethod?: ValuationMethod | null;
  ownerType: CollateralOwnerType;
  thirdPartyInfo?: ThirdPartyInfoDto | null;
}

export interface UpdateCollateralDto extends Partial<Omit<CreateCollateralDto, 'loanId'>> {}

export interface CollateralFilterQuery extends PaginationQuery {
  loanId?: string;
  assetCode?: string;
  certificateNumber?: string;
  provinceId?: string;
  communeId?: string;
  hamletId?: string;
}

export type CollateralEntity = Collateral;
