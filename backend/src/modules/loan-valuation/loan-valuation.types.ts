import { Collateral, LoanValuation, ValuationType } from '@prisma/client';

export { ValuationType };

export const VALUATION_TYPE_LABELS: Record<ValuationType, string> = {
  [ValuationType.THEO_NGHI_DINH_QUY]: 'Theo nghị định Quỹ',
  [ValuationType.THEO_NGHI_DINH_QUY_CU]: 'Theo nghị định Quỹ (Cũ)',
  [ValuationType.THEO_GIA_THI_TRUONG]: 'Theo giá thị trường',
  [ValuationType.THEO_GIA_THI_TRUONG_VA_NGHI_DINH_QUY]: 'Theo giá thị trường và theo nghị định Quỹ',
};

export interface CreateLoanValuationDto {
  collateralIds?: string[];      // Danh sách ID tài sản thuộc nhóm (ít nhất 1 tài sản)
  collateralId?: string | null;  // Hỗ trợ tương thích ngược
  valuationType: ValuationType;  // 1 trong 4 loại định giá quy chuẩn
  valuationDate?: string | Date | null;
  sheetNumber?: string;          // Số tờ gộp (vd: "12, 13") - hệ thống tự động tổng hợp nếu không truyền
  plotNumber?: string;           // Số thửa gộp (vd: "100, 101, 200") - hệ thống tự động tổng hợp nếu không truyền
  area?: number;                 // Tổng diện tích (m²) - hệ thống tự động tổng hợp nếu không truyền
  actualArea?: number | null;    // Tổng diện tích thực tế (m²)
  pricePerSqMeter: number;       // Đơn giá áp dụng cho nhóm (VNĐ/m²)
  totalPriceBeforeRound?: number;// Giá tiền trước làm tròn
  totalPrice?: number;           // Giá tiền sau làm tròn xuống hàng triệu (VNĐ)
  notes?: string | null;         // Ghi chú
}

export interface UpdateLoanValuationDto extends Partial<CreateLoanValuationDto> {}

export interface PreviewGroupValuationDto {
  collateralIds: string[];
  pricePerSqMeter: number;
}

export interface GroupValuationPreviewResult {
  sheetNumber: string;
  plotNumber: string;
  area: number;
  actualArea: number | null;
  effectiveArea: number;
  pricePerSqMeter: number;
  totalPriceBeforeRound: number;
  totalPrice: number;
  collateralCount: number;
}

export interface LoanValuationWithCollaterals extends LoanValuation {
  collaterals?: Collateral[];
}

export type LoanValuationEntity = LoanValuation;
