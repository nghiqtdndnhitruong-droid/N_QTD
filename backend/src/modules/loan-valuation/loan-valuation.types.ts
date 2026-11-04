import { LoanValuation, ValuationType } from '@prisma/client';

export { ValuationType };

export const VALUATION_TYPE_LABELS: Record<ValuationType, string> = {
  [ValuationType.THEO_NGHI_DINH_QUY]: 'Theo nghị định Quỹ',
  [ValuationType.THEO_NGHI_DINH_QUY_CU]: 'Theo nghị định Quỹ (Cũ)',
  [ValuationType.THEO_GIA_THI_TRUONG]: 'Theo giá thị trường',
  [ValuationType.THEO_GIA_THI_TRUONG_VA_NGHI_DINH_QUY]: 'Theo giá thị trường và theo nghị định Quỹ',
};

export interface CreateLoanValuationDto {
  collateralId?: string | null;
  valuationType: ValuationType;
  valuationDate?: string | Date | null;
  sheetNumber: string; // Số tờ - chuỗi để giữ nguyên số 0 ở đầu (vd: "01", "005")
  plotNumber: string;  // Số thửa - chuỗi để giữ nguyên số 0 ở đầu
  area: number;        // Diện tích (m²)
  actualArea?: number | null; // Diện tích thực tế thẩm định (m²)
  pricePerSqMeter: number;    // Đơn giá (VNĐ/m²)
  totalPrice?: number;        // Giá tiền (nếu không truyền sẽ tự động tính = (actualArea || area) * pricePerSqMeter)
  notes?: string | null;      // Ghi chú
}

export interface UpdateLoanValuationDto extends Partial<CreateLoanValuationDto> {}

export type LoanValuationEntity = LoanValuation;

