import dayjs from 'dayjs';
import {
  vndToWords,
  numberToVietnameseWords,
  areaToWords,
} from '../../shared/utils/number-to-words.util';
import type {
  DataDictionaryGroup,
  WordTemplateMappingDto,
  KeywordValidationWarning,
} from './word-template.types';

/**
 * Thuật toán chuẩn hóa và gộp dữ liệu tài sản theo quy tắc của Quỹ:
 * - Có nhiều tài sản: tổng hợp phân cách bởi dấu "; "
 * - Nếu các tài sản có giá trị giống nhau: chỉ giữ 1 giá trị duy nhất
 * - Chuẩn hóa khoảng trắng thừa, bỏ qua giá trị rỗng/null/undefined
 */
export function mergeAssetValues<T>(
  items: T[] | undefined,
  extractor: (item: T) => string | number | null | undefined,
  fallbackValue: string = '',
): string {
  if (!items || items.length === 0) {
    return fallbackValue;
  }

  const values: string[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    const raw = extractor(item);
    if (raw === null || raw === undefined) continue;
    const str = String(raw).trim();
    if (str.length === 0) continue;

    const normalizedKey = str.replace(/\s+/g, ' ').toLowerCase();
    if (!seen.has(normalizedKey)) {
      seen.add(normalizedKey);
      values.push(str);
    }
  }

  if (values.length === 0) {
    return fallbackValue;
  }

  return values.join('; ');
}

export class WordTemplateDataDictionaryService {
  /**
   * Danh mục dữ liệu chuẩn của hệ thống có thể ánh xạ vào file Word
   */
  public getDataDictionary(): DataDictionaryGroup[] {
    return [
      {
        id: 'member',
        label: '1. Thông tin Thành viên / Người vay',
        description: 'Thông tin nhân thân, căn cước và địa bàn của thành viên vay vốn',
        fields: [
          { path: 'member.memberCode', label: 'Mã thành viên', dataType: 'TEXT', sampleValue: 'TV-2026-001' },
          { path: 'member.fullName', label: 'Họ và tên thành viên', dataType: 'TEXT', sampleValue: 'Nguyễn Văn An' },
          { path: 'member.gender', label: 'Giới tính (Nam/Nữ)', dataType: 'TEXT', sampleValue: 'Nam' },
          { path: 'member.genderTitle', label: 'Danh xưng (Ông/Bà)', dataType: 'GENDER_TITLE', sampleValue: 'Ông' },
          { path: 'member.yearOfBirth', label: 'Năm sinh', dataType: 'TEXT', sampleValue: '1985' },
          { path: 'member.idType', label: 'Loại giấy tờ (Căn cước / CCCD)', dataType: 'TEXT', sampleValue: 'Căn cước công dân' },
          { path: 'member.idNumber', label: 'Số Căn cước / CCCD', dataType: 'TEXT', sampleValue: '084185001234' },
          { path: 'member.idIssueDate', label: 'Ngày cấp CCCD (dd/mm/yyyy)', dataType: 'DATE', sampleValue: '15/04/2021' },
          { path: 'member.idIssueDateText', label: 'Ngày cấp CCCD bằng chữ (ngày... tháng... năm...)', dataType: 'TEXT', sampleValue: 'ngày 15 tháng 04 năm 2021' },
          { path: 'member.idIssuePlace', label: 'Nơi cấp CCCD', dataType: 'TEXT', sampleValue: 'Cục Cảnh sát QLHC về TTXH' },
          { path: 'member.idExpiry', label: 'Ngày hết hạn CCCD', dataType: 'DATE', sampleValue: '15/04/2045' },
          { path: 'member.phoneNumber', label: 'Số điện thoại', dataType: 'TEXT', sampleValue: '0912345678' },
          { path: 'member.address', label: 'Địa chỉ thường trú đầy đủ', dataType: 'TEXT', sampleValue: 'Ấp Nô Lựa, Xã Nhị Trường, Tỉnh Vĩnh Long' },
          { path: 'member.hamletName', label: 'Tên Ấp / Khu phố', dataType: 'TEXT', sampleValue: 'Ấp Nô Lựa' },
          { path: 'member.communeName', label: 'Tên Xã quản lý', dataType: 'TEXT', sampleValue: 'Xã Nhị Trường' },
          { path: 'member.provinceName', label: 'Tên Tỉnh / Thành phố', dataType: 'TEXT', sampleValue: 'Tỉnh Vĩnh Long' },
        ],
      },
      {
        id: 'loan',
        label: '2. Thông tin Khoản vay & Khế ước',
        description: 'Số tiền, lãi suất, thời hạn, khế ước nhận nợ',
        fields: [
          { path: 'loan.contractNumber', label: 'Số khế ước vay', dataType: 'TEXT', sampleValue: 'KU-2026-0001' },
          { path: 'loan.contractDate', label: 'Ngày cấp khế ước (dd/mm/yyyy)', dataType: 'DATE', sampleValue: '20/05/2026' },
          { path: 'loan.contractDateDay', label: 'Ngày cấp khế ước (chỉ số ngày)', dataType: 'TEXT', sampleValue: '20' },
          { path: 'loan.contractDateMonth', label: 'Tháng cấp khế ước (chỉ số tháng)', dataType: 'TEXT', sampleValue: '05' },
          { path: 'loan.contractDateYear', label: 'Năm cấp khế ước (chỉ số năm)', dataType: 'TEXT', sampleValue: '2026' },
          { path: 'loan.loanType', label: 'Hình thức vay (Thế chấp / Tín chấp)', dataType: 'TEXT', sampleValue: 'Cho vay thế chấp' },
          { path: 'loan.termType', label: 'Loại thời hạn (Ngắn hạn / Trung hạn)', dataType: 'TEXT', sampleValue: 'Ngắn hạn' },
          { path: 'loan.termMonths', label: 'Thời hạn vay (tháng)', dataType: 'NUMBER', sampleValue: 12 },
          { path: 'loan.loanAmount', label: 'Số tiền vay bằng số (VND)', dataType: 'CURRENCY', sampleValue: '150.000.000 đ' },
          { path: 'loan.loanAmountRaw', label: 'Số tiền vay (dạng số thuần túy)', dataType: 'NUMBER', sampleValue: 150000000 },
          { path: 'loan.loanAmountWords', label: 'Số tiền vay bằng chữ', dataType: 'CURRENCY_WORDS', sampleValue: 'Một trăm năm mươi triệu đồng' },
          { path: 'loan.interestRate', label: 'Lãi suất vay (%/năm)', dataType: 'NUMBER', sampleValue: '12.5%' },
          { path: 'loan.purpose', label: 'Mục đích vay vốn', dataType: 'TEXT', sampleValue: 'Trồng lúa và chăn nuôi bò' },
          { path: 'loan.expectedMaturityDate', label: 'Ngày đáo hạn dự kiến (dd/mm/yyyy)', dataType: 'DATE', sampleValue: '20/05/2027' },
          { path: 'loan.maturityDate', label: 'Ngày đáo hạn thực tế (dd/mm/yyyy)', dataType: 'DATE', sampleValue: '20/05/2027' },
          { path: 'loan.halfTermPaymentDate', label: 'Ngày phải trả phân nửa (trung hạn)', dataType: 'DATE', sampleValue: '20/05/2027' },
        ],
      },
      {
        id: 'phuong_an',
        label: '2b. Phương án vay vốn (PHUONG_AN.*)',
        description: 'Mục đích vay, thời hạn vay, tổng nhu cầu vốn, vốn tự có, vốn vay QTD, chi phí, doanh thu, lợi nhuận',
        fields: [
          { path: 'PHUONG_AN.MUC_DICH', label: 'Mục đích vay vốn', dataType: 'TEXT', sampleValue: 'Chăn nuôi bò sinh sản và phát triển kinh tế hộ gia đình' },
          { path: 'PHUONG_AN.THOI_HAN_VAY', label: 'Thời hạn vay (có chữ tháng)', dataType: 'TEXT', sampleValue: '24 tháng' },
          { path: 'PHUONG_AN.THOI_HAN_THANG', label: 'Thời hạn vay (số tháng)', dataType: 'NUMBER', sampleValue: 24 },
          { path: 'PHUONG_AN.LOAI_THOI_HAN', label: 'Loại thời hạn vay (Ngắn hạn / Trung hạn)', dataType: 'TEXT', sampleValue: 'Trung hạn' },
          { path: 'PHUONG_AN.TONG_NHU_CAU_VON', label: 'Tổng nhu cầu vốn bằng số (VND)', dataType: 'CURRENCY', sampleValue: '100.000.000 đ' },
          { path: 'PHUONG_AN.TONG_NHU_CAU_VON_CHU', label: 'Tổng nhu cầu vốn bằng chữ', dataType: 'CURRENCY_WORDS', sampleValue: 'Một trăm triệu đồng' },
          { path: 'PHUONG_AN.VON_TU_CO', label: 'Vốn tự có bằng số (VND)', dataType: 'CURRENCY', sampleValue: '40.000.000 đ' },
          { path: 'PHUONG_AN.VON_TU_CO_CHU', label: 'Vốn tự có bằng chữ', dataType: 'CURRENCY_WORDS', sampleValue: 'Bốn mươi triệu đồng' },
          { path: 'PHUONG_AN.VON_VAY_QTD', label: 'Vốn vay QTD bằng số (VND)', dataType: 'CURRENCY', sampleValue: '60.000.000 đ' },
          { path: 'PHUONG_AN.VON_VAY_QTD_CHU', label: 'Vốn vay QTD bằng chữ', dataType: 'CURRENCY_WORDS', sampleValue: 'Sáu mươi triệu đồng' },
          { path: 'PHUONG_AN.TONG_CHI_PHI', label: 'Tổng chi phí phương án bằng số (VND)', dataType: 'CURRENCY', sampleValue: '255.840.000 đ' },
          { path: 'PHUONG_AN.TONG_CHI_PHI_CHU', label: 'Tổng chi phí phương án bằng chữ', dataType: 'CURRENCY_WORDS', sampleValue: 'Hai trăm năm mươi lăm triệu tám trăm bốn mươi nghìn đồng' },
          { path: 'PHUONG_AN.TONG_THU_NHAP', label: 'Tổng thu nhập / nguồn thu bằng số (VND)', dataType: 'CURRENCY', sampleValue: '305.840.000 đ' },
          { path: 'PHUONG_AN.TONG_THU_NHAP_CHU', label: 'Tổng thu nhập / nguồn thu bằng chữ', dataType: 'CURRENCY_WORDS', sampleValue: 'Ba trăm lẻ năm triệu tám trăm bốn mươi nghìn đồng' },
          { path: 'PHUONG_AN.LOI_NHUAN', label: 'Lợi nhuận phương án bằng số (VND)', dataType: 'CURRENCY', sampleValue: '50.000.000 đ' },
          { path: 'PHUONG_AN.LOI_NHUAN_CHU', label: 'Lợi nhuận phương án bằng chữ', dataType: 'CURRENCY_WORDS', sampleValue: 'Năm mươi triệu đồng' },
        ],
      },
      {
        id: 'mortgage',
        label: '3. Hợp đồng thế chấp tài sản',
        description: 'Thông tin hợp đồng thế chấp (khi vay thế chấp)',
        fields: [
          { path: 'mortgage.contractNumber', label: 'Số hợp đồng thế chấp (HĐTC)', dataType: 'TEXT', sampleValue: '12/2026/HĐTC' },
          { path: 'mortgage.contractExpiryDate', label: 'Ngày hết hạn hợp đồng thế chấp', dataType: 'DATE', sampleValue: '20/05/2030' },
          { path: 'mortgage.committeeAuthDate', label: 'Ngày chứng thực UBND', dataType: 'DATE', sampleValue: '20/05/2026' },
        ],
      },
      {
        id: 'collaterals_summary',
        label: '4. Tổng hợp Tài sản thế chấp',
        description: 'Tổng số tài sản, tổng diện tích, tổng giá trị định giá đã làm tròn',
        fields: [
          { path: 'collaterals_summary.totalCount', label: 'Tổng số lượng tài sản', dataType: 'NUMBER', sampleValue: 2 },
          { path: 'collaterals_summary.totalArea', label: 'Tổng diện tích đất (m²)', dataType: 'NUMBER', sampleValue: '2.500 m²' },
          { path: 'collaterals_summary.totalAreaWords', label: 'Tổng diện tích đất bằng chữ', dataType: 'TEXT', sampleValue: 'Hai nghìn năm trăm mét vuông' },
          { path: 'collaterals_summary.totalValuationAmount', label: 'Tổng giá trị định giá trước làm tròn', dataType: 'CURRENCY', sampleValue: '673.800.000 đ' },
          { path: 'collaterals_summary.totalValuationAmountRounded', label: 'Tổng giá trị định giá sau làm tròn 1.000.000đ', dataType: 'CURRENCY', sampleValue: '673.000.000 đ' },
          { path: 'collaterals_summary.totalValuationAmountWords', label: 'Tổng giá trị định giá sau làm tròn bằng chữ', dataType: 'CURRENCY_WORDS', sampleValue: 'Sáu trăm bảy mươi ba triệu đồng' },
          { path: 'collaterals_summary.firstAssetAddress', label: 'Địa chỉ tài sản đầu tiên', dataType: 'TEXT', sampleValue: 'Ấp Nô Lựa, Xã Nhị Trường, Tỉnh Vĩnh Long' },
          { path: 'collaterals_summary.firstAssetOwner', label: 'Chủ sở hữu tài sản đầu tiên', dataType: 'TEXT', sampleValue: 'Nguyễn Văn An' },
        ],
      },
      {
        id: 'merged_collaterals',
        label: '4b. Tài sản thế chấp gộp (TAI_SAN.*_GOP - Dấu chấm phẩy ;)',
        description: 'Tự động gộp dữ liệu nhiều tài sản phân cách bởi dấu ";", nếu các tài sản có cùng giá trị thì hiển thị 1 lần duy nhất',
        fields: [
          { path: 'TAI_SAN.MA_TAI_SAN_GOP', label: 'Mã tài sản gộp (nối dấu ;)', dataType: 'TEXT', sampleValue: 'TS-001; TS-002' },
          { path: 'TAI_SAN.SO_GCN_GOP', label: 'Số phát hành GCN gộp (nối dấu ;)', dataType: 'TEXT', sampleValue: 'CS 098123; CS 098124' },
          { path: 'TAI_SAN.SO_VAO_SO_GOP', label: 'Số vào sổ cấp GCN gộp (nối dấu ;)', dataType: 'TEXT', sampleValue: 'CH 01234; CH 01235' },
          { path: 'TAI_SAN.SO_VAO_SO_CAP_GCN_GOP', label: 'Cụm câu Loại và Số GCN gộp (Số vào sổ cấp...)', dataType: 'TEXT', sampleValue: 'Số vào sổ cấp GCN: CS 098123, Vào sổ cấp giấy chứng nhận quyền sử dụng đất Số: CS 098124' },
          { path: 'TAI_SAN.SO_THUA_GOP', label: 'Số thửa đất gộp (nối dấu ;)', dataType: 'TEXT', sampleValue: '405; 406' },
          { path: 'TAI_SAN.SO_TO_GOP', label: 'Số tờ bản đồ gộp (nối dấu ;)', dataType: 'TEXT', sampleValue: '12; 15' },
          { path: 'TAI_SAN.DIEN_TICH_GOP', label: 'Diện tích đất gộp (nối dấu ;)', dataType: 'TEXT', sampleValue: '1.200 m²; 800 m²' },
          { path: 'TAI_SAN.DIA_CHI_GOP', label: 'Địa chỉ tài sản gộp (nối dấu ;)', dataType: 'TEXT', sampleValue: 'Ấp Nô Lựa, Xã Nhị Trường' },
          { path: 'TAI_SAN.CHU_SO_HUU_GOP', label: 'Chủ sở hữu gộp (nối dấu ;)', dataType: 'TEXT', sampleValue: 'Nguyễn Văn An' },
          { path: 'TAI_SAN.NGAY_CAP_GOP', label: 'Ngày cấp GCN gộp (dd/mm/yyyy, nối dấu ;)', dataType: 'TEXT', sampleValue: '15/04/2021' },
          { path: 'TAI_SAN.NOI_CAP_GOP', label: 'Nơi cấp GCN gộp (nối dấu ;)', dataType: 'TEXT', sampleValue: 'Sở TN&MT Tỉnh Vĩnh Long' },
          { path: 'TAI_SAN.MUC_DICH_SU_DUNG_GOP', label: 'Mục đích sử dụng đất gộp (nối dấu ;)', dataType: 'TEXT', sampleValue: 'Đất chuyên trồng lúa nước' },
          { path: 'TAI_SAN.THOI_HAN_SU_DUNG_GOP', label: 'Thời hạn sử dụng đất gộp (nối dấu ;)', dataType: 'TEXT', sampleValue: 'Đến năm 2070' },
          { path: 'TAI_SAN.LOAI_TAI_SAN_GOP', label: 'Loại tài sản gộp (nối dấu ;)', dataType: 'TEXT', sampleValue: 'Quyền sử dụng đất' },
          { path: 'TAI_SAN.NGUON_GOC_GOP', label: 'Nguồn gốc đất gộp (nối dấu ;)', dataType: 'TEXT', sampleValue: 'Nhận chuyển nhượng' },
          { path: 'TAI_SAN.GIA_TRI_DINH_GIA_GOP', label: 'Giá trị định giá gộp (nối dấu ;)', dataType: 'TEXT', sampleValue: '72.000.000 đ; 50.000.000 đ' },
          { path: 'TAI_SAN.DON_GIA_GOP', label: 'Đơn giá định giá gộp (nối dấu ;)', dataType: 'TEXT', sampleValue: '60.000 đ' },
          { path: 'TAI_SAN.TONG_DIEN_TICH', label: 'Tổng diện tích tất cả tài sản (m²)', dataType: 'TEXT', sampleValue: '2.500 m²' },
          { path: 'TAI_SAN.TONG_DIEN_TICH_CHU', label: 'Tổng diện tích tất cả tài sản bằng chữ', dataType: 'TEXT', sampleValue: 'Hai nghìn năm trăm mét vuông' },
        ],
      },
      {
        id: 'collaterals',
        label: '5. Danh sách Tài sản (Lặp bảng Word)',
        description: 'Dùng cho bảng lặp {{#collaterals}}...{{/collaterals}}',
        fields: [
          {
            path: 'collaterals',
            label: 'Danh sách tài sản thế chấp (Khối lặp)',
            dataType: 'LIST',
            isList: true,
            itemFields: [
              { path: 'index', label: 'Số thứ tự (1, 2, 3...)', dataType: 'NUMBER', sampleValue: 1 },
              { path: 'assetCode', label: 'Mã số tài sản', dataType: 'TEXT', sampleValue: 'TS-2026-0001' },
              { path: 'assetType', label: 'Loại tài sản', dataType: 'TEXT', sampleValue: 'Quyền sử dụng đất' },
              { path: 'certificateType', label: 'Loại giấy chứng nhận (GCN/GCNQSDĐ...)', dataType: 'TEXT', sampleValue: 'GCN' },
              { path: 'certificateNumber', label: 'Số phát hành Giấy chứng nhận', dataType: 'TEXT', sampleValue: 'CS 098123' },
              { path: 'issueBookNumber', label: 'Số vào sổ cấp GCN', dataType: 'TEXT', sampleValue: 'CH 01234' },
              { path: 'sheetNumber', label: 'Số tờ bản đồ', dataType: 'TEXT', sampleValue: '12' },
              { path: 'plotNumber', label: 'Số thửa đất', dataType: 'TEXT', sampleValue: '405' },
              { path: 'area', label: 'Diện tích (m²)', dataType: 'NUMBER', sampleValue: '1.200 m²' },
              { path: 'areaWords', label: 'Diện tích bằng chữ', dataType: 'TEXT', sampleValue: 'Một nghìn hai trăm mét vuông' },
              { path: 'actualArea', label: 'Diện tích thực tế (m²)', dataType: 'NUMBER', sampleValue: '1.200 m²' },
              { path: 'pricePerSqMeter', label: 'Đơn giá định giá / m²', dataType: 'CURRENCY', sampleValue: '60.000 đ' },
              { path: 'valuationAmount', label: 'Giá trị định giá của thửa đất', dataType: 'CURRENCY', sampleValue: '72.000.000 đ' },
              { path: 'valuationAmountWords', label: 'Giá trị định giá bằng chữ', dataType: 'CURRENCY_WORDS', sampleValue: 'Bảy mươi hai triệu đồng' },
              { path: 'usagePurpose', label: 'Mục đích sử dụng đất', dataType: 'TEXT', sampleValue: 'Đất chuyên trồng lúa nước' },
              { path: 'usageDuration', label: 'Thời hạn sử dụng đất', dataType: 'TEXT', sampleValue: 'Đến năm 2070' },
              { path: 'issuePlace', label: 'Nơi cấp GCN', dataType: 'TEXT', sampleValue: 'Sở TN&MT Tỉnh Vĩnh Long' },
              { path: 'issueDate', label: 'Ngày cấp GCN (dd/mm/yyyy)', dataType: 'DATE', sampleValue: '15/04/2021' },
              { path: 'address', label: 'Địa chỉ tài sản', dataType: 'TEXT', sampleValue: 'Ấp Nô Lựa, Xã Nhị Trường, Tỉnh Vĩnh Long' },
              { path: 'ownerName', label: 'Họ tên chủ sở hữu / bên bảo lãnh', dataType: 'TEXT', sampleValue: 'Nguyễn Văn An' },
            ],
          },
        ],
      },
      {
        id: 'relatedPersons',
        label: '6. Danh sách Người liên quan (Lặp bảng Word)',
        description: 'Dùng cho bảng lặp {{#relatedPersons}}...{{/relatedPersons}}',
        fields: [
          {
            path: 'relatedPersons',
            label: 'Danh sách người liên quan (Khối lặp)',
            dataType: 'LIST',
            isList: true,
            itemFields: [
              { path: 'index', label: 'Số thứ tự (1, 2, 3...)', dataType: 'NUMBER', sampleValue: 1 },
              { path: 'fullName', label: 'Họ và tên người liên quan', dataType: 'TEXT', sampleValue: 'Trần Thị Bích' },
              { path: 'gender', label: 'Giới tính', dataType: 'TEXT', sampleValue: 'Nữ' },
              { path: 'genderTitle', label: 'Danh xưng (Ông/Bà)', dataType: 'GENDER_TITLE', sampleValue: 'Bà' },
              { path: 'yearOfBirth', label: 'Năm sinh', dataType: 'TEXT', sampleValue: '1988' },
              { path: 'idType', label: 'Loại giấy tờ (Căn cước / CCCD / CMND)', dataType: 'TEXT', sampleValue: 'Căn cước công dân' },
              { path: 'idNumber', label: 'Số CCCD / Căn cước', dataType: 'TEXT', sampleValue: '084188005678' },
              { path: 'idIssueDate', label: 'Ngày cấp CCCD', dataType: 'DATE', sampleValue: '10/08/2022' },
              { path: 'idIssuePlace', label: 'Nơi cấp CCCD', dataType: 'TEXT', sampleValue: 'Cục Cảnh sát QLHC về TTXH' },
              { path: 'phoneNumber', label: 'Số điện thoại', dataType: 'TEXT', sampleValue: '0987654321' },
              { path: 'relationship', label: 'Quan hệ người vay (Vợ/Chồng/Con/Mẹ/Cha)', dataType: 'TEXT', sampleValue: 'Vợ' },
              { path: 'relatedPersonRelationship', label: 'Quan hệ người liên quan', dataType: 'TEXT', sampleValue: 'Mẹ' },
              { path: 'address', label: 'Địa chỉ thường trú', dataType: 'TEXT', sampleValue: 'Ấp Nô Lựa, Xã Nhị Trường, Tỉnh Vĩnh Long' },
            ],
          },
        ],
      },
      {
        id: 'heir',
        label: '7. Người thừa kế (nếu có)',
        description: 'Thông tin người thừa kế của khoản vay',
        fields: [
          { path: 'heir.fullName', label: 'Họ và tên người thừa kế', dataType: 'TEXT', sampleValue: 'Nguyễn Văn Bình' },
          { path: 'heir.gender', label: 'Giới tính', dataType: 'TEXT', sampleValue: 'Nam' },
          { path: 'heir.yearOfBirth', label: 'Năm sinh', dataType: 'TEXT', sampleValue: '2005' },
          { path: 'heir.idType', label: 'Loại giấy tờ (Căn cước / CCCD / CMND)', dataType: 'TEXT', sampleValue: 'Căn cước công dân' },
          { path: 'heir.idNumber', label: 'Số CCCD / Căn cước', dataType: 'TEXT', sampleValue: '084205009999' },
          { path: 'heir.idIssueDate', label: 'Ngày cấp CCCD', dataType: 'DATE', sampleValue: '01/06/2023' },
          { path: 'heir.idIssuePlace', label: 'Nơi cấp CCCD', dataType: 'TEXT', sampleValue: 'Cục Cảnh sát QLHC về TTXH' },
          { path: 'heir.relationship', label: 'Quan hệ với người vay', dataType: 'TEXT', sampleValue: 'Con' },
          { path: 'heir.phoneNumber', label: 'Số điện thoại', dataType: 'TEXT', sampleValue: '0919998888' },
          { path: 'heir.address', label: 'Địa chỉ thường trú', dataType: 'TEXT', sampleValue: 'Ấp Nô Lựa, Xã Nhị Trường, Tỉnh Vĩnh Long' },
        ],
      },
      {
        id: 'fund',
        label: '8. Thông tin Quỹ & Thời gian xuất biểu mẫu',
        description: 'Tên Quỹ tín dụng và ngày tháng năm hiện tại',
        fields: [
          { path: 'fund.name', label: 'Tên Quỹ tín dụng nhân dân', dataType: 'TEXT', sampleValue: 'Quỹ tín dụng nhân dân Nhị Trường' },
          { path: 'fund.currentDay', label: 'Ngày hiện tại (chỉ số ngày)', dataType: 'TEXT', sampleValue: dayjs().format('DD') },
          { path: 'fund.currentMonth', label: 'Tháng hiện tại (chỉ số tháng)', dataType: 'TEXT', sampleValue: dayjs().format('MM') },
          { path: 'fund.currentYear', label: 'Năm hiện tại (chỉ số năm)', dataType: 'TEXT', sampleValue: dayjs().format('YYYY') },
          { path: 'fund.currentFullDate', label: 'Ngày tháng năm đầy đủ', dataType: 'TEXT', sampleValue: `ngày ${dayjs().format('DD')} tháng ${dayjs().format('MM')} năm ${dayjs().format('YYYY')}` },
        ],
      },
      {
        id: 'expenses_list',
        label: '9. Danh sách Chi phí phương án (Bảng lặp {#DANH_SACH_CHI_PHI} / {#PHUONG_AN.DANH_SACH_CHI_PHI})',
        description: 'Dùng cho bảng lặp {#DANH_SACH_CHI_PHI}...{/DANH_SACH_CHI_PHI} hoặc {{#FOR cp IN DANH_SACH_CHI_PHI}}',
        fields: [
          {
            path: 'DANH_SACH_CHI_PHI',
            label: 'Danh sách chi phí phương án vay (Khối lặp FOR/Bảng)',
            dataType: 'LIST',
            isList: true,
            itemFields: [
              { path: 'STT', label: 'Số thứ tự (1, 2, 3...)', dataType: 'NUMBER', sampleValue: 1 },
              { path: 'TEN', label: 'Tên khoản chi phí (hoặc TEN_CHI_PHI, KHOAN_CHI, NOI_DUNG)', dataType: 'TEXT', sampleValue: 'Tiền mua con giống' },
              { path: 'SO_TIEN', label: 'Số tiền bằng số có đơn vị (VND)', dataType: 'CURRENCY', sampleValue: '80.000.000 đ' },
              { path: 'SO_TIEN_CHU', label: 'Số tiền bằng chữ', dataType: 'CURRENCY_WORDS', sampleValue: 'Tám mươi triệu đồng' },
              { path: 'GHI_CHU', label: 'Ghi chú khoản chi', dataType: 'TEXT', sampleValue: '' },
            ],
          },
          {
            path: 'PHUONG_AN.DANH_SACH_CHI_PHI',
            label: 'Danh sách chi phí phương án (tiền tố PHUONG_AN)',
            dataType: 'LIST',
            isList: true,
          },
          {
            path: 'PHUONG_AN.CHI_PHI_GOP',
            label: 'Danh sách chi phí gộp dạng văn bản (nối dấu ;)',
            dataType: 'TEXT',
            sampleValue: 'Tiền mua con giống: 80.000.000 đ; Tiền chuồng trại: 15.000.000 đ',
          },
        ],
      },
      {
        id: 'revenues_list',
        label: '10. Danh sách Nguồn thu phương án (Bảng lặp {#DANH_SACH_NGUON_THU} / {#PHUONG_AN.DANH_SACH_NGUON_THU})',
        description: 'Dùng cho bảng lặp {#DANH_SACH_NGUON_THU}...{/DANH_SACH_NGUON_THU} hoặc {{#FOR nt IN DANH_SACH_NGUON_THU}}',
        fields: [
          {
            path: 'DANH_SACH_NGUON_THU',
            label: 'Danh sách nguồn thu phương án vay (Khối lặp FOR/Bảng)',
            dataType: 'LIST',
            isList: true,
            itemFields: [
              { path: 'STT', label: 'Số thứ tự (1, 2, 3...)', dataType: 'NUMBER', sampleValue: 1 },
              { path: 'TEN', label: 'Tên nguồn thu (hoặc TEN_NGUON_THU, KHOAN_THU, NOI_DUNG)', dataType: 'TEXT', sampleValue: 'Nguồn thu từ sản xuất lúa' },
              { path: 'SO_TIEN', label: 'Số tiền bằng số có đơn vị (VND)', dataType: 'CURRENCY', sampleValue: '91.752.000 đ' },
              { path: 'SO_TIEN_CHU', label: 'Số tiền bằng chữ', dataType: 'CURRENCY_WORDS', sampleValue: 'Chín mươi mốt triệu bảy trăm năm mươi hai nghìn đồng' },
              { path: 'GHI_CHU', label: 'Ghi chú nguồn thu', dataType: 'TEXT', sampleValue: '' },
            ],
          },
          {
            path: 'PHUONG_AN.DANH_SACH_NGUON_THU',
            label: 'Danh sách nguồn thu phương án (tiền tố PHUONG_AN)',
            dataType: 'LIST',
            isList: true,
          },
          {
            path: 'PHUONG_AN.NGUON_THU_GOP',
            label: 'Danh sách nguồn thu gộp dạng văn bản (nối dấu ;)',
            dataType: 'TEXT',
            sampleValue: 'Nguồn thu lúa: 91.752.000 đ; Nguồn thu chăn nuôi: 152.920.000 đ',
          },
        ],
      },
    ];
  }

  /**
   * Trích xuất và định dạng toàn bộ dữ liệu từ đối tượng Loan thành cây context cho docxtemplater
   */
  public resolveLoanData(
    loan: any,
    mappings: WordTemplateMappingDto[],
  ): {
    resolvedContext: Record<string, any>;
    warnings: KeywordValidationWarning[];
  } {
    const warnings: KeywordValidationWarning[] = [];
    const rawData = this.buildRawLoanData(loan);

    // Context cuối cùng truyền cho docxtemplater: gán sẵn các biến hệ thống mặc định, danh sách và đối tượng lồng nhau
    const resolvedContext: Record<string, any> = {
      ...rawData.lists,
      ...rawData.nested,
      ...rawData.flatVariables,
    };

    // 2. Duyệt qua từng cấu hình mapping của biểu mẫu
    for (const mapping of mappings) {
      const keyword = mapping.keyword;
      const dataPath = mapping.dataPath;

      // Xử lý danh sách lặp (Loops)
      if (mapping.isLoop) {
        const loopContextName = mapping.loopContext || keyword;
        const listData = (rawData.lists as Record<string, any>)[loopContextName] || [];
        resolvedContext[keyword] = listData;
        continue;
      }

      // Xử lý biến đơn
      if (!dataPath) {
        // Chưa ánh xạ
        if (mapping.isRequired) {
          warnings.push({
            keyword,
            displayName: mapping.displayName,
            reason: 'UNMAPPED',
            message: `Từ khóa "${mapping.displayName}" (${keyword}) bắt buộc nhưng chưa được cấu hình ánh xạ dữ liệu.`,
          });
        }
        resolvedContext[keyword] = mapping.defaultValue || '...................';
        continue;
      }

      // Lấy giá trị thô theo dataPath
      const rawVal = this.getValueByPath(rawData.nested, dataPath);

      if (rawVal === null || rawVal === undefined || rawVal === '') {
        if (mapping.isRequired) {
          warnings.push({
            keyword,
            displayName: mapping.displayName,
            reason: 'EMPTY_REQUIRED',
            message: `Trường dữ liệu "${mapping.displayName}" (${dataPath}) đang bị trống trong hồ sơ khoản vay.`,
          });
        }
        // Trường Mã thành viên khi chưa có/để trống thì xuất ra chuỗi rỗng (không in "Chưa cấp mã" hay chấm chấm)
        if (dataPath === 'member.memberCode' || keyword.includes('MA_THANH_VIEN')) {
          resolvedContext[keyword] =
            mapping.defaultValue !== undefined && mapping.defaultValue !== null
              ? mapping.defaultValue
              : '';
        } else {
          resolvedContext[keyword] =
            mapping.defaultValue !== undefined && mapping.defaultValue !== null
              ? mapping.defaultValue
              : '...................';
        }
      } else {
        // Định dạng giá trị theo dataType và formatPattern
        resolvedContext[keyword] = this.formatValue(
          rawVal,
          mapping.dataType || 'TEXT',
          mapping.formatPattern,
        );
      }
    }

    return { resolvedContext, warnings };
  }

  /**
   * Xây dựng dữ liệu gốc đầy đủ của khoản vay
   */
  /**
   * Trích xuất thông tin chi tiết của chủ sở hữu cho từng tài sản
   */
  public extractOwnerInfo(c: any, member: any, heir: any) {
    const ownerType = c?.ownerType || 'NGUOI_VAY_CA_NHAN';

    if (ownerType === 'BAO_LANH' && c?.thirdPartyInfo) {
      const tp = c.thirdPartyInfo;
      const genderTitle = tp.gender === 'NAM' ? 'Ông' : tp.gender === 'NU' ? 'Bà' : 'Ông/Bà';
      return {
        key: `BAO_LANH_${tp.idNumber || tp.fullName || 'tp'}`,
        ownerType: 'BAO_LANH',
        fullName: tp.fullName || '',
        gender: tp.gender === 'NAM' ? 'Nam' : tp.gender === 'NU' ? 'Nữ' : '',
        genderTitle,
        yearOfBirth: tp.yearOfBirth ? String(tp.yearOfBirth) : '',
        idType: this.formatIdType(tp.idType),
        idNumber: tp.idNumber || '',
        idIssueDate: tp.idIssueDate ? dayjs(tp.idIssueDate).format('DD/MM/YYYY') : '',
        idIssuePlace: tp.idIssuePlace || '',
        address: tp.address || '',
        relationship: 'Bên thứ ba bảo lãnh',
      };
    }

    if (ownerType === 'NGUOI_VAY_VA_NGUOI_THUA_KE') {
      const memberName = member?.fullName || '';
      const heirName = heir?.fullName || 'Người thừa kế';
      return {
        key: `MEMBER_AND_HEIR_${member?.idNumber || 'm'}_${heir?.idNumber || 'h'}`,
        ownerType,
        fullName: `${memberName} và ${heirName}`,
        gender: member?.gender === 'NAM' ? 'Nam' : 'Nữ',
        genderTitle: 'Đồng sở hữu',
        yearOfBirth: member?.yearOfBirth ? String(member.yearOfBirth) : '',
        idType: this.formatIdType(member?.idType),
        idNumber: member?.idNumber || '',
        idIssueDate: member?.idIssueDate ? dayjs(member.idIssueDate).format('DD/MM/YYYY') : '',
        idIssuePlace: member?.idIssuePlace || '',
        address: member?.address || '',
        relationship: 'Người vay và người thừa kế',
      };
    }

    if (ownerType === 'NGUOI_THUA_KE_CA_NHAN' || ownerType === 'NGUOI_THUA_KE_HO') {
      const isHousehold = ownerType === 'NGUOI_THUA_KE_HO';
      const genderTitle = isHousehold
        ? (heir?.gender === 'NAM' ? 'Hộ Ông' : 'Hộ Bà')
        : (heir?.gender === 'NAM' ? 'Ông' : 'Bà');
      return {
        key: `HEIR_${heir?.idNumber || heir?.fullName || 'heir'}`,
        ownerType,
        fullName: isHousehold && heir?.fullName ? `Hộ ${heir.fullName}` : (heir?.fullName || ''),
        gender: heir?.gender === 'NAM' ? 'Nam' : 'Nữ',
        genderTitle,
        yearOfBirth: heir?.yearOfBirth ? String(heir.yearOfBirth) : '',
        idType: this.formatIdType(heir?.idType),
        idNumber: heir?.idNumber || '',
        idIssueDate: heir?.idIssueDate ? dayjs(heir.idIssueDate).format('DD/MM/YYYY') : '',
        idIssuePlace: heir?.idIssuePlace || '',
        address: heir?.address || member?.address || '',
        relationship: heir?.relationship || 'Người thừa kế',
      };
    }

    // Mặc định: NGUOI_VAY_CA_NHAN hoặc NGUOI_VAY_HO
    const isHousehold = ownerType === 'NGUOI_VAY_HO';
    const genderTitle = isHousehold
      ? (member?.gender === 'NAM' ? 'Hộ Ông' : 'Hộ Bà')
      : (member?.gender === 'NAM' ? 'Ông' : 'Bà');
    return {
      key: `MEMBER_${member?.idNumber || member?.fullName || 'member'}`,
      ownerType,
      fullName: isHousehold && member?.fullName ? `Hộ ${member.fullName}` : (member?.fullName || ''),
      gender: member?.gender === 'NAM' ? 'Nam' : 'Nữ',
      genderTitle,
      yearOfBirth: member?.yearOfBirth ? String(member.yearOfBirth) : '',
      idType: this.formatIdType(member?.idType),
      idNumber: member?.idNumber || '',
      idIssueDate: member?.idIssueDate ? dayjs(member.idIssueDate).format('DD/MM/YYYY') : '',
      idIssuePlace: member?.idIssuePlace || '',
      address: member?.address || '',
      relationship: isHousehold ? 'Hộ người vay' : 'Người vay',
    };
  }

  private buildRawLoanData(loan: any) {
    const member = loan.member || {};
    const collaterals = loan.collaterals || [];
    const relatedPersons = loan.relatedPersons || [];
    const heir = loan.heir || null;
    const mortgage = loan.mortgageContract || null;
    const now = dayjs();

    // Tính toán tổng hợp tài sản
    let totalCollateralArea = 0;
    let totalCollateralValuation = 0;
    collaterals.forEach((c: any) => {
      totalCollateralArea += Number(c.area) || 0;
      totalCollateralValuation += Number(c.valuationAmount) || 0;
    });

    // Làm tròn tổng giá trị định giá xuống 1.000.000đ theo quy tắc nghiệp vụ
    const totalCollateralValuationRounded =
      Math.floor(totalCollateralValuation / 1_000_000) * 1_000_000;

    const firstCollateral = collaterals[0] || null;

    // Gộp dữ liệu nhiều tài sản theo quy tắc:
    // Phân cách bởi dấu "; ", nếu các tài sản có cùng giá trị thì giữ nguyên 1 giá trị
    const mergedAssetCodes = mergeAssetValues(collaterals, (c: any) => c.assetCode);
    const mergedCertificateNumbers = mergeAssetValues(collaterals, (c: any) => c.certificateNumber);
    const mergedIssueBookNumbers = mergeAssetValues(collaterals, (c: any) => c.issueBookNumber);
    const mergedPlotNumbers = mergeAssetValues(collaterals, (c: any) => c.plotNumber);
    const mergedSheetNumbers = mergeAssetValues(collaterals, (c: any) => c.sheetNumber);
    const mergedAreas = mergeAssetValues(collaterals, (c: any) =>
      c.area ? `${Number(c.area).toLocaleString('vi-VN')} m²` : ''
    );
    const mergedActualAreas = mergeAssetValues(collaterals, (c: any) =>
      c.actualArea ? `${Number(c.actualArea).toLocaleString('vi-VN')} m²` : ''
    );
    const mergedAddresses = mergeAssetValues(collaterals, (c: any) => c.address);
    // Trích xuất thông tin chủ sở hữu từng tài sản
    const assetOwners = collaterals.map((c: any) => this.extractOwnerInfo(c, member, heir));

    // Lọc danh sách các chủ sở hữu duy nhất (unique)
    // Nếu tài sản thuộc loại NGUOI_VAY_VA_NGUOI_THUA_KE, bổ sung cả 2 người vào danh sách chủ sở hữu
    const uniqueOwnersMap = new Map<string, any>();
    collaterals.forEach((c: any) => {
      if (c.ownerType === 'NGUOI_VAY_VA_NGUOI_THUA_KE') {
        const borrowerOwner = this.extractOwnerInfo({ ownerType: 'NGUOI_VAY_CA_NHAN' }, member, heir);
        const heirOwner = this.extractOwnerInfo({ ownerType: 'NGUOI_THUA_KE_CA_NHAN' }, member, heir);
        [borrowerOwner, heirOwner].forEach((o) => {
          const k = (o.fullName || '').trim().toLowerCase();
          if (k && !uniqueOwnersMap.has(k)) {
            uniqueOwnersMap.set(k, o);
          }
        });
      } else {
        const o = this.extractOwnerInfo(c, member, heir);
        const k = (o.fullName || '').trim().toLowerCase();
        if (k && !uniqueOwnersMap.has(k)) {
          uniqueOwnersMap.set(k, o);
        }
      }
    });

    const uniqueOwnersList = Array.from(uniqueOwnersMap.values()).map((o, idx) => ({
      index: idx + 1,
      ...o,
      HO_TEN: o.fullName,
      XUNG_HO: o.genderTitle,
      DANH_XUNG: o.genderTitle,
      LOAI_GIAY_TO: o.idType,
      SO_GIAY_TO: o.idNumber,
      SO_CCCD: o.idNumber,
      NGAY_CAP: o.idIssueDate,
      NOI_CAP: o.idIssuePlace,
      DIA_CHI: o.address,
      NAM_SINH: o.yearOfBirth,
      QUAN_HE: o.relationship,
    }));

    const uniqueOwnerNames = Array.from(uniqueOwnersMap.values()).map((o) => o.fullName);
    let mergedOwners = '';
    if (uniqueOwnerNames.length === 0) {
      mergedOwners = member.fullName || '';
    } else if (uniqueOwnerNames.length === 1) {
      mergedOwners = uniqueOwnerNames[0];
    } else if (uniqueOwnerNames.length === 2) {
      mergedOwners = `${uniqueOwnerNames[0]} và ${uniqueOwnerNames[1]}`;
    } else {
      const allExceptLast = uniqueOwnerNames.slice(0, -1).join(', ');
      mergedOwners = `${allExceptLast} và ${uniqueOwnerNames[uniqueOwnerNames.length - 1]}`;
    }

    const firstOwner = assetOwners[0] || this.extractOwnerInfo({ ownerType: 'NGUOI_VAY_CA_NHAN' }, member, heir);
    const firstOwnerObj = {
      ...firstOwner,
      HO_TEN: firstOwner.fullName,
      XUNG_HO: firstOwner.genderTitle,
      DANH_XUNG: firstOwner.genderTitle,
      LOAI_GIAY_TO: firstOwner.idType,
      SO_GIAY_TO: firstOwner.idNumber,
      SO_CCCD: firstOwner.idNumber,
      NGAY_CAP: firstOwner.idIssueDate,
      NOI_CAP: firstOwner.idIssuePlace,
      DIA_CHI: firstOwner.address,
      NAM_SINH: firstOwner.yearOfBirth,
      QUAN_HE: firstOwner.relationship,
    };

    const hasSingleOwner = uniqueOwnersMap.size === 1;
    const hasMultipleOwners = uniqueOwnersMap.size > 1;
    const hasCollateralJointBorrowerHeir = collaterals.some(
      (c: any) => c.ownerType === 'NGUOI_VAY_VA_NGUOI_THUA_KE'
    );
    const isOwnerBorrower =
      hasCollateralJointBorrowerHeir ||
      assetOwners.some((o: any) => o.ownerType === 'NGUOI_VAY_CA_NHAN' || o.ownerType === 'NGUOI_VAY_HO');
    const isOwnerHeir =
      hasCollateralJointBorrowerHeir ||
      assetOwners.some((o: any) => o.ownerType === 'NGUOI_THUA_KE_CA_NHAN' || o.ownerType === 'NGUOI_THUA_KE_HO');
    const isOwnerGuarantor = assetOwners.some((o: any) => o.ownerType === 'BAO_LANH');
    const isBothBorrowerAndHeirOwner =
      hasCollateralJointBorrowerHeir || (isOwnerBorrower && isOwnerHeir);

    
    const mergedIssueDates = mergeAssetValues(collaterals, (c: any) =>
      c.issueDate ? dayjs(c.issueDate).format('DD/MM/YYYY') : ''
    );
    const mergedIssuePlaces = mergeAssetValues(collaterals, (c: any) => c.issuePlace);
    const mergedUsagePurposes = mergeAssetValues(collaterals, (c: any) => c.usagePurpose);
    const mergedUsageDurations = mergeAssetValues(collaterals, (c: any) => c.usageDuration);
    const mergedUsageForms = mergeAssetValues(collaterals, (c: any) => c.usageForm);
    const mergedUseRestrictions = mergeAssetValues(
      collaterals,
      (c: any) => c.useRestrictions,
      '...................'
    );
    const mergedCertificateTypes = mergeAssetValues(
      collaterals,
      (c: any) => this.formatCertificateType(c.certificateType),
      'GCN'
    );
    const firstCertificateType = this.formatCertificateType(firstCollateral?.certificateType);

    // Cụm câu kết hợp Loại GCN và Số GCN (tự động phân nhánh "Số vào sổ cấp..." hoặc giữ nguyên "Vào sổ cấp... Số:")
    const certClauses: string[] = [];
    const seenClauses = new Set<string>();
    for (const c of collaterals) {
      const clause = this.formatCertificateClause(c);
      if (!seenClauses.has(clause)) {
        seenClauses.add(clause);
        certClauses.push(clause);
      }
    }
    const mergedCertificateClauses = certClauses.length > 0 ? certClauses.join(', ') : '...................';
    const firstCertificateClause = firstCollateral ? this.formatCertificateClause(firstCollateral) : '...................';

    const firstUseRestrictions = firstCollateral?.useRestrictions?.trim() || '...................';
    const mergedOrigins = mergeAssetValues(collaterals, (c: any) => c.origin);
    const mergedAssetTypes = mergeAssetValues(collaterals, (c: any) =>
      this.formatAssetType(c.assetType)
    );
    const mergedValuations = mergeAssetValues(collaterals, (c: any) =>
      c.valuationAmount ? `${Number(c.valuationAmount).toLocaleString('vi-VN')} đ` : ''
    );
    const mergedPrices = mergeAssetValues(collaterals, (c: any) =>
      c.pricePerSqMeter ? `${Number(c.pricePerSqMeter).toLocaleString('vi-VN')} đ` : ''
    );

    // Chuẩn bị danh sách tài sản lặp
    const collateralsList = collaterals.map((c: any, idx: number) => {
      const area = Number(c.area) || 0;
      const val = Number(c.valuationAmount) || 0;
      const price = Number(c.pricePerSqMeter) || 0;
      const owner = this.extractOwnerInfo(c, member, heir);
      const certType = this.formatCertificateType(c.certificateType);
      const certClause = this.formatCertificateClause(c);
      const restrictions = c.useRestrictions?.trim() || '...................';
      return {
        index: idx + 1,
        assetCode: c.assetCode || '',
        assetType: this.formatAssetType(c.assetType),
        certificateType: certType,
        LOAI_GIAY_CHUNG_NHAN: certType,
        certificateClause: certClause,
        CAU_SO_VAO_SO_GCN: certClause,
        SO_VAO_SO_CAP_GCN: certClause,
        certificateNumber: c.certificateNumber || '',
        issueBookNumber: c.issueBookNumber || '',
        sheetNumber: c.sheetNumber || '',
        plotNumber: c.plotNumber || '',
        area: `${area.toLocaleString('vi-VN')} m²`,
        areaWords: areaToWords(area),
        actualArea: c.actualArea ? `${Number(c.actualArea).toLocaleString('vi-VN')} m²` : '',
        pricePerSqMeter: `${price.toLocaleString('vi-VN')} đ`,
        valuationAmount: `${val.toLocaleString('vi-VN')} đ`,
        valuationAmountWords: vndToWords(val),
        usagePurpose: c.usagePurpose || '',
        usageDuration: c.usageDuration || '',
        usageForm: c.usageForm || '',
        HINH_THUC_SU_DUNG: c.usageForm || '',
        useRestrictions: restrictions,
        HAN_CHE_SU_DUNG: restrictions,
        issuePlace: c.issuePlace || '',
        issueDate: c.issueDate ? dayjs(c.issueDate).format('DD/MM/YYYY') : '',
        address: c.address || '',
        ownerName: owner.fullName,
        CHU_SO_HUU: owner.fullName,
        CHU_SO_HUU_HO_TEN: owner.fullName,
        CHU_SO_HUU_XUNG_HO: owner.genderTitle,
        CHU_SO_HUU_DANH_XUNG: owner.genderTitle,
        CHU_SO_HUU_LOAI_GIAY_TO: owner.idType,
        CHU_SO_HUU_SO_GIAY_TO: owner.idNumber,
        CHU_SO_HUU_SO_CCCD: owner.idNumber,
        CHU_SO_HUU_NGAY_CAP: owner.idIssueDate,
        CHU_SO_HUU_NOI_CAP: owner.idIssuePlace,
        CHU_SO_HUU_DIA_CHI: owner.address,
        CHU_SO_HUU_NAM_SINH: owner.yearOfBirth,
        CHU_SO_HUU_QUAN_HE: owner.relationship,
      };
    });

    // Chuẩn bị danh sách người liên quan lặp
    const relatedPersonsList = relatedPersons.map((rp: any, idx: number) => ({
      index: idx + 1,
      fullName: rp.fullName || '',
      gender: rp.gender === 'NAM' ? 'Nam' : 'Nữ',
      genderTitle: rp.gender === 'NAM' ? 'Ông' : 'Bà',
      yearOfBirth: rp.yearOfBirth ? String(rp.yearOfBirth) : '',
      idType: this.formatIdType(rp.idType),
      idNumber: rp.idNumber || '',
      idIssueDate: rp.idIssueDate ? dayjs(rp.idIssueDate).format('DD/MM/YYYY') : '',
      idIssuePlace: rp.idIssuePlace || '',
      phoneNumber: rp.phoneNumber || '',
      relationship: rp.relationship || '',
      relatedPersonRelationship: rp.relatedPersonRelationship || '',
      address: rp.address || '',
    }));

    const contractDate = loan.contractDate ? dayjs(loan.contractDate) : now;
    const loanAmount = Number(loan.loanAmount) || 0;

    // Tính toán dữ liệu Phương án vay vốn (PHUONG_AN)
    const plan = loan.loanPlan;
    const planPurpose = plan?.purpose || loan.purpose || '';
    const planTerm = loan.termMonths
      ? `${loan.termMonths} tháng`
      : loan.termType === 'TRUNG_HAN'
        ? '24 tháng'
        : '12 tháng';
    const ownCapital = Number(plan?.ownCapital ?? 0);
    const borrowedCapital = Number(plan?.borrowedCapital ?? loan.loanAmount ?? 0);
    const totalCapitalDemand =
      ownCapital + borrowedCapital > 0
        ? ownCapital + borrowedCapital
        : Number(plan?.loanAmount ?? plan?.totalExpenses ?? borrowedCapital);
    const totalExpenses = Number(plan?.totalExpenses ?? 0);
    const totalRevenues = Number(plan?.totalRevenues ?? 0);
    const profit = Number(plan?.profit ?? (totalRevenues - totalExpenses));

    const expensesList = (plan?.expenses || []).map((e: any, idx: number) => {
      const amountNum = Number(e.amount || 0);
      const amountStr = `${amountNum.toLocaleString('vi-VN')} đ`;
      const amountWords = vndToWords(amountNum);
      const name = e.name || '';
      const note = e.notes || e.note || '';
      return {
        index: idx + 1,
        STT: idx + 1,
        name,
        TEN: name,
        TEN_CHI_PHI: name,
        TEN_KHOAN_CHI: name,
        KHOAN_CHI: name,
        NOI_DUNG: name,
        MUC_CHI: name,
        amount: amountStr,
        amountNumber: amountNum,
        amountWords,
        SO_TIEN: amountStr,
        SO_TIEN_SO: amountStr,
        SO_TIEN_CHU: amountWords,
        SO_TIEN_RAW: amountNum,
        GHI_CHU: note,
        note,
      };
    });

    const revenuesList = (plan?.revenues || []).map((r: any, idx: number) => {
      const amountNum = Number(r.amount || 0);
      const amountStr = `${amountNum.toLocaleString('vi-VN')} đ`;
      const amountWords = vndToWords(amountNum);
      const name = r.name || '';
      const note = r.notes || r.note || '';
      return {
        index: idx + 1,
        STT: idx + 1,
        name,
        TEN: name,
        TEN_NGUON_THU: name,
        TEN_KHOAN_THU: name,
        KHOAN_THU: name,
        NGUON_THU: name,
        NOI_DUNG: name,
        MUC_THU: name,
        amount: amountStr,
        amountNumber: amountNum,
        amountWords,
        SO_TIEN: amountStr,
        SO_TIEN_SO: amountStr,
        SO_TIEN_CHU: amountWords,
        SO_TIEN_RAW: amountNum,
        GHI_CHU: note,
        note,
      };
    });

    const mergedExpenses =
      expensesList.length > 0
        ? expensesList.map((e: any) => `${e.TEN}: ${e.SO_TIEN}`).join('; ')
        : '...................';
    const mergedRevenues =
      revenuesList.length > 0
        ? revenuesList.map((r: any) => `${r.TEN}: ${r.SO_TIEN}`).join('; ')
        : '...................';

    const phuongAnObj = {
      MUC_DICH: planPurpose,
      MUC_DICH_VAY: planPurpose,
      THOI_HAN_VAY: planTerm,
      THOI_HAN_THANG: loan.termMonths || 12,
      LOAI_THOI_HAN: loan.termType === 'TRUNG_HAN' ? 'Trung hạn' : 'Ngắn hạn',
      TONG_NHU_CAU_VON: `${totalCapitalDemand.toLocaleString('vi-VN')} đ`,
      TONG_NHU_CAU_VON_SO: `${totalCapitalDemand.toLocaleString('vi-VN')} đ`,
      TONG_NHU_CAU_VON_CHU: vndToWords(totalCapitalDemand),
      VON_TU_CO: `${ownCapital.toLocaleString('vi-VN')} đ`,
      VON_TU_CO_SO: `${ownCapital.toLocaleString('vi-VN')} đ`,
      VON_TU_CO_CHU: vndToWords(ownCapital),
      VON_VAY_QTD: `${borrowedCapital.toLocaleString('vi-VN')} đ`,
      VON_VAY_QTD_SO: `${borrowedCapital.toLocaleString('vi-VN')} đ`,
      VON_VAY_QTD_CHU: vndToWords(borrowedCapital),
      VON_VAY: `${borrowedCapital.toLocaleString('vi-VN')} đ`,
      VON_VAY_SO: `${borrowedCapital.toLocaleString('vi-VN')} đ`,
      VON_VAY_CHU: vndToWords(borrowedCapital),
      TONG_CHI_PHI: `${totalExpenses.toLocaleString('vi-VN')} đ`,
      TONG_CHI_PHI_SO: `${totalExpenses.toLocaleString('vi-VN')} đ`,
      TONG_CHI_PHI_CHU: vndToWords(totalExpenses),
      TONG_THU_NHAP: `${totalRevenues.toLocaleString('vi-VN')} đ`,
      TONG_THU_NHAP_SO: `${totalRevenues.toLocaleString('vi-VN')} đ`,
      TONG_THU_NHAP_CHU: vndToWords(totalRevenues),
      TONG_NGUON_THU: `${totalRevenues.toLocaleString('vi-VN')} đ`,
      TONG_NGUON_THU_SO: `${totalRevenues.toLocaleString('vi-VN')} đ`,
      TONG_NGUON_THU_CHU: vndToWords(totalRevenues),
      LOI_NHUAN: `${profit.toLocaleString('vi-VN')} đ`,
      LOI_NHUAN_SO: `${profit.toLocaleString('vi-VN')} đ`,
      LOI_NHUAN_CHU: vndToWords(profit),
      DANH_SACH_CHI_PHI: expensesList,
      CHI_PHI: expensesList,
      expenses: expensesList,
      CHI_PHI_GOP: mergedExpenses,
      DANH_SACH_CHI_PHI_GOP: mergedExpenses,
      DANH_SACH_NGUON_THU: revenuesList,
      NGUON_THU: revenuesList,
      revenues: revenuesList,
      incomes: revenuesList,
      NGUON_THU_GOP: mergedRevenues,
      DANH_SACH_NGUON_THU_GOP: mergedRevenues,
    };

    const nested = {
      phuong_an: {
        purpose: planPurpose,
        term: planTerm,
        termMonths: loan.termMonths || 12,
        termType: loan.termType === 'TRUNG_HAN' ? 'Trung hạn' : 'Ngắn hạn',
        totalDemand: `${totalCapitalDemand.toLocaleString('vi-VN')} đ`,
        totalDemandWords: vndToWords(totalCapitalDemand),
        ownCapital: `${ownCapital.toLocaleString('vi-VN')} đ`,
        ownCapitalWords: vndToWords(ownCapital),
        borrowedCapital: `${borrowedCapital.toLocaleString('vi-VN')} đ`,
        borrowedCapitalWords: vndToWords(borrowedCapital),
        totalExpenses: `${totalExpenses.toLocaleString('vi-VN')} đ`,
        totalExpensesWords: vndToWords(totalExpenses),
        totalRevenues: `${totalRevenues.toLocaleString('vi-VN')} đ`,
        totalRevenuesWords: vndToWords(totalRevenues),
        profit: `${profit.toLocaleString('vi-VN')} đ`,
        profitWords: vndToWords(profit),
      },
      PHUONG_AN: phuongAnObj,
      member: {
        memberCode: member.memberCode ? member.memberCode.trim() : '',
        fullName: member.fullName || '',
        gender: member.gender === 'NAM' ? 'Nam' : 'Nữ',
        genderTitle: member.gender === 'NAM' ? 'Ông' : 'Bà',
        yearOfBirth: member.yearOfBirth ? String(member.yearOfBirth) : '',
        idType: this.formatIdType(member.idType),
        idNumber: member.idNumber || '',
        idIssueDate: member.idIssueDate ? dayjs(member.idIssueDate).format('DD/MM/YYYY') : '',
        idIssueDateText: member.idIssueDate
          ? `ngày ${dayjs(member.idIssueDate).format('DD')} tháng ${dayjs(member.idIssueDate).format('MM')} năm ${dayjs(member.idIssueDate).format('YYYY')}`
          : '',
        idIssuePlace: member.idIssuePlace || '',
        idExpiry: member.idExpiry ? dayjs(member.idExpiry).format('DD/MM/YYYY') : '',
        phoneNumber: member.phoneNumber || '',
        address: member.address || '',
        hamletName: member.hamletName || '',
        communeName: member.communeName || '',
        provinceName: member.provinceName || 'Tỉnh Vĩnh Long',
      },
      loan: {
        contractNumber: loan.contractNumber || '',
        contractDate: contractDate.format('DD/MM/YYYY'),
        contractDateDay: contractDate.format('DD'),
        contractDateMonth: contractDate.format('MM'),
        contractDateYear: contractDate.format('YYYY'),
        loanType: loan.loanType === 'THE_CHAP' ? 'Cho vay thế chấp' : 'Cho vay tín chấp',
        termType: loan.termType === 'TRUNG_HAN' ? 'Trung hạn' : 'Ngắn hạn',
        termMonths: loan.termMonths || 12,
        loanAmount: `${loanAmount.toLocaleString('vi-VN')} đ`,
        loanAmountRaw: loanAmount,
        loanAmountWords: vndToWords(loanAmount),
        interestRate: `${loan.interestRate || 0}%/năm`,
        purpose: loan.loanPlan?.purpose || '',
        expectedMaturityDate: loan.expectedMaturityDate
          ? dayjs(loan.expectedMaturityDate).format('DD/MM/YYYY')
          : '',
        maturityDate: loan.maturityDate ? dayjs(loan.maturityDate).format('DD/MM/YYYY') : '',
        halfTermPaymentDate: loan.halfTermPaymentDate
          ? dayjs(loan.halfTermPaymentDate).format('DD/MM/YYYY')
          : '',
      },
      mortgage: {
        contractNumber: mortgage?.contractNumber || '',
        contractExpiryDate: mortgage?.contractExpiryDate
          ? dayjs(mortgage.contractExpiryDate).format('DD/MM/YYYY')
          : '',
        committeeAuthDate: mortgage?.committeeAuthDate
          ? dayjs(mortgage.committeeAuthDate).format('DD/MM/YYYY')
          : '',
      },
      collaterals_summary: {
        totalCount: collaterals.length,
        totalArea: `${totalCollateralArea.toLocaleString('vi-VN')} m²`,
        totalAreaWords: areaToWords(totalCollateralArea),
        totalValuationAmount: `${totalCollateralValuation.toLocaleString('vi-VN')} đ`,
        totalValuationAmountRounded: `${totalCollateralValuationRounded.toLocaleString('vi-VN')} đ`,
        totalValuationAmountWords: vndToWords(totalCollateralValuationRounded),
        firstAssetAddress: firstCollateral?.address || '',
        firstAssetOwner:
          firstCollateral?.ownerType === 'BAO_LANH' && firstCollateral?.thirdPartyInfo?.fullName
            ? firstCollateral.thirdPartyInfo.fullName
            : member.fullName,
      },
      TAI_SAN: {
        MA_TAI_SAN_GOP: mergedAssetCodes,
        SO_GCN_GOP: mergedCertificateNumbers,
        SO_PHAT_HANH_GCN_GOP: mergedCertificateNumbers,
        SO_VAO_SO_GOP: mergedIssueBookNumbers,
        SO_VAO_SO_GCN_GOP: mergedIssueBookNumbers,
        SO_THUA_GOP: mergedPlotNumbers,
        SO_TO_GOP: mergedSheetNumbers,
        TO_BAN_DO_GOP: mergedSheetNumbers,
        DIEN_TICH_GOP: mergedAreas,
        DIEN_TICH_THUC_TE_GOP: mergedActualAreas,
        DIA_CHI_GOP: mergedAddresses,
        DIA_CHI_TAI_SAN_GOP: mergedAddresses,
        CHU_SO_HUU_GOP: mergedOwners,
        NGAY_CAP_GOP: mergedIssueDates,
        NGAY_CAP_GCN_GOP: mergedIssueDates,
        NOI_CAP_GOP: mergedIssuePlaces,
        NOI_CAP_GCN_GOP: mergedIssuePlaces,
        MUC_DICH_SU_DUNG_GOP: mergedUsagePurposes,
        THOI_HAN_SU_DUNG_GOP: mergedUsageDurations,
        HINH_THUC_SU_DUNG_GOP: mergedUsageForms,
        HAN_CHE_SU_DUNG_GOP: mergedUseRestrictions || '...................',
        LOAI_GIAY_CHUNG_NHAN_GOP: mergedCertificateTypes,
        SO_VAO_SO_CAP_GCN_GOP: mergedCertificateClauses,
        CAU_SO_VAO_SO_GCN: mergedCertificateClauses,
        LOAI_VA_SO_GCN_GOP: mergedCertificateClauses,
        NGUON_GOC_GOP: mergedOrigins,
        LOAI_TAI_SAN_GOP: mergedAssetTypes,
        TEN_TAI_SAN_GOP: mergedAssetTypes,
        GIA_TRI_DINH_GIA_GOP: mergedValuations,
        DON_GIA_GOP: mergedPrices,

        // Tổng diện tích tất cả tài sản
        TONG_DIEN_TICH: `${totalCollateralArea.toLocaleString('vi-VN')} m²`,
        TONG_DIEN_TICH_SO: totalCollateralArea.toLocaleString('vi-VN'),
        TONG_DIEN_TICH_CHU: areaToWords(totalCollateralArea),
        TONG_DIEN_TICH_DAT: `${totalCollateralArea.toLocaleString('vi-VN')} m²`,
        TONG_DIEN_TICH_TAI_SAN: `${totalCollateralArea.toLocaleString('vi-VN')} m²`,

        // Đơn lẻ / Tài sản đầu tiên
        MA_TAI_SAN: firstCollateral?.assetCode || '',
        SO_GCN: firstCollateral?.certificateNumber || '',
        SO_PHAT_HANH_GCN: firstCollateral?.certificateNumber || '',
        SO_VAO_SO: firstCollateral?.issueBookNumber || '',
        SO_VAO_SO_GCN: firstCollateral?.issueBookNumber || '',
        SO_THUA: firstCollateral?.plotNumber || '',
        SO_TO: firstCollateral?.sheetNumber || '',
        TO_BAN_DO: firstCollateral?.sheetNumber || '',
        DIEN_TICH: firstCollateral?.area ? `${Number(firstCollateral.area).toLocaleString('vi-VN')} m²` : '',
        DIA_CHI: firstCollateral?.address || '',
        CHU_SO_HUU: firstOwner.fullName,
        CHU_SO_HUU_HO_TEN: firstOwner.fullName,
        CHU_SO_HUU_XUNG_HO: firstOwner.genderTitle,
        CHU_SO_HUU_DANH_XUNG: firstOwner.genderTitle,
        CHU_SO_HUU_LOAI_GIAY_TO: firstOwner.idType,
        CHU_SO_HUU_SO_GIAY_TO: firstOwner.idNumber,
        CHU_SO_HUU_SO_CCCD: firstOwner.idNumber,
        CHU_SO_HUU_NGAY_CAP: firstOwner.idIssueDate,
        CHU_SO_HUU_NOI_CAP: firstOwner.idIssuePlace,
        CHU_SO_HUU_DIA_CHI: firstOwner.address,
        CHU_SO_HUU_NAM_SINH: firstOwner.yearOfBirth,
        CHU_SO_HUU_QUAN_HE: firstOwner.relationship,
        CHU_SO_HUU_DAU_TIEN: firstOwnerObj,
        NGAY_CAP: firstCollateral?.issueDate ? dayjs(firstCollateral.issueDate).format('DD/MM/YYYY') : '',
        NOI_CAP: firstCollateral?.issuePlace || '',
        LOAI_GIAY_CHUNG_NHAN: firstCertificateType,
        SO_VAO_SO_CAP_GCN: firstCertificateClause,
        CAU_SO_VAO_SO_GCN_DON: firstCertificateClause,
        MUC_DICH_SU_DUNG: firstCollateral?.usagePurpose || '',
        THOI_HAN_SU_DUNG: firstCollateral?.usageDuration || '',
        HINH_THUC_SU_DUNG: firstCollateral?.usageForm || '',
        HAN_CHE_SU_DUNG: firstUseRestrictions,
        NGUON_GOC: firstCollateral?.origin || '',
        LOAI_TAI_SAN: firstCollateral ? this.formatAssetType(firstCollateral.assetType) : '',
        TEN_TAI_SAN: firstCollateral ? this.formatAssetType(firstCollateral.assetType) : '',
        GIA_TRI_DINH_GIA: firstCollateral?.valuationAmount ? `${Number(firstCollateral.valuationAmount).toLocaleString('vi-VN')} đ` : '',
        DON_GIA: firstCollateral?.pricePerSqMeter ? `${Number(firstCollateral.pricePerSqMeter).toLocaleString('vi-VN')} đ` : '',
      },
      heir: heir
        ? {
            fullName: heir.fullName || '',
            gender: heir.gender === 'NAM' ? 'Nam' : 'Nữ',
            genderTitle: heir.gender === 'NAM' ? 'Ông' : 'Bà',
            yearOfBirth: heir.yearOfBirth ? String(heir.yearOfBirth) : '',
            idType: this.formatIdType(heir.idType),
            idNumber: heir.idNumber || '',
            idIssueDate: heir.idIssueDate ? dayjs(heir.idIssueDate).format('DD/MM/YYYY') : '',
            idIssuePlace: heir.idIssuePlace || '',
            relationship: heir.relationship || '',
            phoneNumber: heir.phoneNumber || '',
            address: heir.address || '',
          }
        : null,
      fund: {
        name: 'Quỹ tín dụng nhân dân Nhị Trường',
        representative: 'Ông Thạch Ngọc Hiệp',
        title: 'Chủ tịch HĐQT',
        currentDay: now.format('DD'),
        currentMonth: now.format('MM'),
        currentYear: now.format('YYYY'),
        currentFullDate: `ngày ${now.format('DD')} tháng ${now.format('MM')} năm ${now.format('YYYY')}`,
      },
    };

    // Danh sách người thừa kế lặp
    const heirsList = heir
      ? [
          {
            index: 1,
            fullName: heir.fullName || '',
            gender: heir.gender === 'NAM' ? 'Nam' : 'Nữ',
            genderTitle: heir.gender === 'NAM' ? 'Ông' : 'Bà',
            yearOfBirth: heir.yearOfBirth ? String(heir.yearOfBirth) : '',
            idType: this.formatIdType(heir.idType),
            idNumber: heir.idNumber || '',
            idIssueDate: heir.idIssueDate ? dayjs(heir.idIssueDate).format('DD/MM/YYYY') : '',
            idIssuePlace: heir.idIssuePlace || '',
            relationship: heir.relationship || '',
            phoneNumber: heir.phoneNumber || '',
            address: heir.address || '',
            HO_TEN: heir.fullName || '',
            DANH_XUNG: heir.gender === 'NAM' ? 'Ông' : 'Bà',
            XUNG_HO: heir.gender === 'NAM' ? 'Ông' : 'Bà',
            GIOI_TINH: heir.gender === 'NAM' ? 'Nam' : 'Nữ',
            NAM_SINH: heir.yearOfBirth ? String(heir.yearOfBirth) : '',
            LOAI_GIAY_TO: this.formatIdType(heir.idType),
            SO_GIAY_TO: heir.idNumber || '',
            SO_CCCD: heir.idNumber || '',
            NGAY_CAP: heir.idIssueDate ? dayjs(heir.idIssueDate).format('DD/MM/YYYY') : '',
            NGAY_CAP_CCCD: heir.idIssueDate ? dayjs(heir.idIssueDate).format('DD/MM/YYYY') : '',
            NOI_CAP: heir.idIssuePlace || '',
            NOI_CAP_CCCD: heir.idIssuePlace || '',
            QUAN_HE: heir.relationship || '',
            SO_DIEN_THOAI: heir.phoneNumber || '',
            DIA_CHI: heir.address || '',
          },
        ]
      : [];

    // Tạo phẳng một số biến tiện dụng
    const flatVariables: Record<string, any> = {
      HO_TEN_NGUOI_VAY: nested.member.fullName,
      'NGUOI_VAY.HO_TEN': nested.member.fullName,
      'NGUOI_VAY.DANH_XUNG': nested.member.genderTitle,
      'NGUOI_VAY.XUNG_HO': nested.member.genderTitle,
      'NGUOI_VAY.GIOI_TINH': nested.member.gender,
      'NGUOI_VAY.NAM_SINH': nested.member.yearOfBirth ? String(nested.member.yearOfBirth) : '',
      'NGUOI_VAY.LOAI_GIAY_TO': nested.member.idType,
      'NGUOI_VAY.SO_GIAY_TO': nested.member.idNumber,
      'NGUOI_VAY.SO_CCCD': nested.member.idNumber,
      'NGUOI_VAY.NGAY_CAP': nested.member.idIssueDate,
      'NGUOI_VAY.NGAY_CAP_CCCD': nested.member.idIssueDate,
      'NGUOI_VAY.NOI_CAP': nested.member.idIssuePlace,
      'NGUOI_VAY.NOI_CAP_CCCD': nested.member.idIssuePlace,
      'NGUOI_VAY.SO_DIEN_THOAI': nested.member.phoneNumber,
      'NGUOI_VAY.DIA_CHI': nested.member.address,
      'NGUOI_VAY.MA_THANH_VIEN': nested.member.memberCode,
      LOAI_GIAY_TO: nested.member.idType,
      LOAI_GIAY_TO_NGUOI_VAY: nested.member.idType,
      NGAY: nested.fund.currentDay,
      THANG: nested.fund.currentMonth,
      NAM: nested.fund.currentYear,

      HO_TEN: nested.member.fullName,
      MA_THANH_VIEN: nested.member.memberCode,
      SO_CCCD: nested.member.idNumber,
      NGAY_CAP_CCCD: nested.member.idIssueDate,
      NOI_CAP_CCCD: nested.member.idIssuePlace,
      DIA_CHI_NGUOI_VAY: nested.member.address,
      SO_DIEN_THOAI: nested.member.phoneNumber,
      DANH_XUNG: nested.member.genderTitle,
      GIOI_TINH: nested.member.gender,
      NAM_SINH: nested.member.yearOfBirth ? String(nested.member.yearOfBirth) : '',
      SO_KHE_UOC: nested.loan.contractNumber,
      SO_HOP_DONG: nested.loan.contractNumber,
      NGAY_HOP_DONG: nested.loan.contractDate,
      LOAI_VAY: loan.loanType,
      SO_TIEN_SO: nested.loan.loanAmount,
      SO_TIEN_CHU: nested.loan.loanAmountWords,
      SO_TIEN_VAY: nested.loan.loanAmount,
      SO_TIEN_VAY_CHU: nested.loan.loanAmountWords,
      THOI_HAN_THANG: nested.loan.termMonths,
      LAI_SUAT: nested.loan.interestRate,
      LAI_SUAT_NAM: nested.loan.interestRate,
      NGAY_KY: nested.loan.contractDate,
      SO_HD_THE_CHAP: nested.mortgage.contractNumber,
      TONG_SO_TAI_SAN: nested.collaterals_summary.totalCount,
      TONG_DIEN_TICH: nested.collaterals_summary.totalArea,
      TONG_DIEN_TICH_SO: totalCollateralArea.toLocaleString('vi-VN'),
      TONG_DIEN_TICH_CHU: nested.collaterals_summary.totalAreaWords,
      TONG_DIEN_TICH_DAT: nested.collaterals_summary.totalArea,
      TONG_DIEN_TICH_TAI_SAN: nested.collaterals_summary.totalArea,
      'TAI_SAN.TONG_DIEN_TICH': nested.collaterals_summary.totalArea,
      'TAI_SAN.TONG_DIEN_TICH_CHU': nested.collaterals_summary.totalAreaWords,
      'TAI_SAN.TONG_DIEN_TICH_DAT': nested.collaterals_summary.totalArea,
      TONG_GIA_TRI_DINH_GIA: nested.collaterals_summary.totalValuationAmountRounded,
      TONG_GIA_TRI_DINH_GIA_CHU: nested.collaterals_summary.totalValuationAmountWords,
      NGAY_HIEN_TAI: nested.fund.currentDay,
      THANG_HIEN_TAI: nested.fund.currentMonth,
      NAM_HIEN_TAI: nested.fund.currentYear,
      // Cờ điều kiện
      CO_MA_THANH_VIEN: Boolean(nested.member.memberCode),
      hasMemberCode: Boolean(nested.member.memberCode),
      CO_NGUOI_THUA_KE: Boolean(heir),
      CO_TAI_SAN: collaterals.length > 0,
      hasHeir: Boolean(heir),
      hasRelatedPersons: relatedPersons.length > 0,
      hasCollaterals: collaterals.length > 0,
      isTheChap: loan.loanType === 'THE_CHAP',
      isTinChap: loan.loanType === 'TIN_CHAP',

      // Người thừa kế (tiền tố NGUOI_THUA_KE.*)
      'NGUOI_THUA_KE.HO_TEN': nested.heir?.fullName || '',
      'NGUOI_THUA_KE.DANH_XUNG': nested.heir?.genderTitle || '',
      'NGUOI_THUA_KE.XUNG_HO': nested.heir?.genderTitle || '',
      'NGUOI_THUA_KE.GIOI_TINH': nested.heir?.gender || '',
      'NGUOI_THUA_KE.NAM_SINH': nested.heir?.yearOfBirth || '',
      'NGUOI_THUA_KE.LOAI_GIAY_TO': nested.heir?.idType || '',
      'NGUOI_THUA_KE.SO_GIAY_TO': nested.heir?.idNumber || '',
      'NGUOI_THUA_KE.SO_CCCD': nested.heir?.idNumber || '',
      'NGUOI_THUA_KE.NGAY_CAP': nested.heir?.idIssueDate || '',
      'NGUOI_THUA_KE.NGAY_CAP_CCCD': nested.heir?.idIssueDate || '',
      'NGUOI_THUA_KE.NOI_CAP': nested.heir?.idIssuePlace || '',
      'NGUOI_THUA_KE.NOI_CAP_CCCD': nested.heir?.idIssuePlace || '',
      'NGUOI_THUA_KE.QUAN_HE': nested.heir?.relationship || '',
      'NGUOI_THUA_KE.SO_DIEN_THOAI': nested.heir?.phoneNumber || '',
      'NGUOI_THUA_KE.DIA_CHI': nested.heir?.address || '',

      // Người thừa kế (phẳng)
      HO_TEN_NGUOI_THUA_KE: nested.heir?.fullName || '',
      DANH_XUNG_NGUOI_THUA_KE: nested.heir?.genderTitle || '',
      XUNG_HO_NGUOI_THUA_KE: nested.heir?.genderTitle || '',
      GIOI_TINH_NGUOI_THUA_KE: nested.heir?.gender || '',
      LOAI_GIAY_TO_NGUOI_THUA_KE: nested.heir?.idType || '',
      SO_GIAY_TO_NGUOI_THUA_KE: nested.heir?.idNumber || '',
      SO_CCCD_NGUOI_THUA_KE: nested.heir?.idNumber || '',
      NGAY_CAP_NGUOI_THUA_KE: nested.heir?.idIssueDate || '',
      NGAY_CAP_CCCD_NGUOI_THUA_KE: nested.heir?.idIssueDate || '',
      NOI_CAP_NGUOI_THUA_KE: nested.heir?.idIssuePlace || '',
      NOI_CAP_CCCD_NGUOI_THUA_KE: nested.heir?.idIssuePlace || '',
      QUAN_HE_NGUOI_THUA_KE: nested.heir?.relationship || '',
      NAM_SINH_NGUOI_THUA_KE: nested.heir?.yearOfBirth || '',
      SO_DIEN_THOAI_NGUOI_THUA_KE: nested.heir?.phoneNumber || '',
      DIA_CHI_NGUOI_THUA_KE: nested.heir?.address || '',
      // Tài sản gộp (hỗ trợ cả cú pháp TAI_SAN.*_GOP và *_GOP)
      'TAI_SAN.MA_TAI_SAN_GOP': mergedAssetCodes,
      MA_TAI_SAN_GOP: mergedAssetCodes,
      'TAI_SAN.SO_GCN_GOP': mergedCertificateNumbers,
      SO_GCN_GOP: mergedCertificateNumbers,
      SO_PHAT_HANH_GCN_GOP: mergedCertificateNumbers,
      'TAI_SAN.SO_VAO_SO_GOP': mergedIssueBookNumbers,
      SO_VAO_SO_GOP: mergedIssueBookNumbers,
      SO_VAO_SO_GCN_GOP: mergedIssueBookNumbers,
      'TAI_SAN.SO_THUA_GOP': mergedPlotNumbers,
      SO_THUA_GOP: mergedPlotNumbers,
      'TAI_SAN.SO_TO_GOP': mergedSheetNumbers,
      SO_TO_GOP: mergedSheetNumbers,
      TO_BAN_DO_GOP: mergedSheetNumbers,
      'TAI_SAN.DIEN_TICH_GOP': mergedAreas,
      DIEN_TICH_GOP: mergedAreas,
      'TAI_SAN.DIEN_TICH_THUC_TE_GOP': mergedActualAreas,
      DIEN_TICH_THUC_TE_GOP: mergedActualAreas,
      'TAI_SAN.DIA_CHI_GOP': mergedAddresses,
      DIA_CHI_GOP: mergedAddresses,
      DIA_CHI_TAI_SAN_GOP: mergedAddresses,
      'CHU_SO_HUU.HO_TEN': firstOwner.fullName,
      'CHU_SO_HUU.XUNG_HO': firstOwner.genderTitle,
      'CHU_SO_HUU.DANH_XUNG': firstOwner.genderTitle,
      'CHU_SO_HUU.LOAI_GIAY_TO': firstOwner.idType,
      'CHU_SO_HUU.SO_GIAY_TO': firstOwner.idNumber,
      'CHU_SO_HUU.SO_CCCD': firstOwner.idNumber,
      'CHU_SO_HUU.NGAY_CAP': firstOwner.idIssueDate,
      'CHU_SO_HUU.NOI_CAP': firstOwner.idIssuePlace,
      'CHU_SO_HUU.DIA_CHI': firstOwner.address,
      'CHU_SO_HUU.NAM_SINH': firstOwner.yearOfBirth,
      'CHU_SO_HUU.QUAN_HE': firstOwner.relationship,
      'TAI_SAN.CHU_SO_HUU': firstOwner.fullName,
      'TAI_SAN.CHU_SO_HUU_GOP': mergedOwners,
      CHU_SO_HUU: firstOwner.fullName,
      CHU_SO_HUU_GOP: mergedOwners,
      CHU_SO_HUU_HO_TEN: firstOwner.fullName,
      CHU_SO_HUU_XUNG_HO: firstOwner.genderTitle,
      CHU_SO_HUU_DANH_XUNG: firstOwner.genderTitle,
      CHU_SO_HUU_LOAI_GIAY_TO: firstOwner.idType,
      CHU_SO_HUU_SO_GIAY_TO: firstOwner.idNumber,
      CHU_SO_HUU_SO_CCCD: firstOwner.idNumber,
      CHU_SO_HUU_NGAY_CAP: firstOwner.idIssueDate,
      CHU_SO_HUU_NOI_CAP: firstOwner.idIssuePlace,
      CHU_SO_HUU_DIA_CHI: firstOwner.address,
      CHU_SO_HUU_NAM_SINH: firstOwner.yearOfBirth,
      CHU_SO_HUU_QUAN_HE: firstOwner.relationship,

      // Cờ điều kiện chủ sở hữu tài sản
      CO_MOT_CHU_SO_HUU: hasSingleOwner,
      CO_NHIEU_CHU_SO_HUU: hasMultipleOwners,
      CHU_SO_HUU_LA_NGUOI_VAY: isOwnerBorrower,
      CHU_SO_HUU_LA_NGUOI_THUA_KE: isOwnerHeir,
      CHU_SO_HUU_LA_BAO_LANH: isOwnerGuarantor,
      CO_CA_NGUOI_VAY_VA_THUA_KE_SO_HUU: isBothBorrowerAndHeirOwner,
      DONG_SO_HUU_NGUOI_VAY_VA_THUA_KE: isBothBorrowerAndHeirOwner,
      CO_NGUOI_VAY_VA_NGUOI_THUA_KE_SO_HUU: isBothBorrowerAndHeirOwner,
      isBothBorrowerAndHeirOwner,
      isBorrowerAndHeirOwner: isBothBorrowerAndHeirOwner,
      isSingleOwner: hasSingleOwner,
      isMultipleOwners: hasMultipleOwners,
      isOwnerBorrower,
      isOwnerHeir,
      isOwnerGuarantor,
      SO_LUONG_CHU_SO_HUU: uniqueOwnersMap.size,
      'TAI_SAN.NGAY_CAP_GOP': mergedIssueDates,
      NGAY_CAP_GOP: mergedIssueDates,
      NGAY_CAP_GCN_GOP: mergedIssueDates,
      'TAI_SAN.NOI_CAP_GOP': mergedIssuePlaces,
      NOI_CAP_GOP: mergedIssuePlaces,
      NOI_CAP_GCN_GOP: mergedIssuePlaces,
      'TAI_SAN.MUC_DICH_SU_DUNG_GOP': mergedUsagePurposes,
      MUC_DICH_SU_DUNG_GOP: mergedUsagePurposes,
      'TAI_SAN.THOI_HAN_SU_DUNG_GOP': mergedUsageDurations,
      THOI_HAN_SU_DUNG_GOP: mergedUsageDurations,
      'TAI_SAN.LOAI_GIAY_CHUNG_NHAN_GOP': mergedCertificateTypes,
      LOAI_GIAY_CHUNG_NHAN_GOP: mergedCertificateTypes,
      'TAI_SAN.LOAI_GIAY_CHUNG_NHAN': firstCertificateType,
      LOAI_GIAY_CHUNG_NHAN: firstCertificateType,
      'TAI_SAN.SO_VAO_SO_CAP_GCN_GOP': mergedCertificateClauses,
      SO_VAO_SO_CAP_GCN_GOP: mergedCertificateClauses,
      'TAI_SAN.CAU_SO_VAO_SO_GCN': mergedCertificateClauses,
      CAU_SO_VAO_SO_GCN: mergedCertificateClauses,
      'TAI_SAN.LOAI_VA_SO_GCN_GOP': mergedCertificateClauses,
      LOAI_VA_SO_GCN_GOP: mergedCertificateClauses,
      'TAI_SAN.SO_VAO_SO_CAP_GCN': firstCertificateClause,
      SO_VAO_SO_CAP_GCN: firstCertificateClause,
      'TAI_SAN.HINH_THUC_SU_DUNG_GOP': mergedUsageForms,
      HINH_THUC_SU_DUNG_GOP: mergedUsageForms,
      'TAI_SAN.HAN_CHE_SU_DUNG_GOP': mergedUseRestrictions || '...................',
      HAN_CHE_SU_DUNG_GOP: mergedUseRestrictions || '...................',
      'TAI_SAN.HINH_THUC_SU_DUNG': firstCollateral?.usageForm || '',
      HINH_THUC_SU_DUNG: firstCollateral?.usageForm || '',
      'TAI_SAN.HAN_CHE_SU_DUNG': firstUseRestrictions,
      HAN_CHE_SU_DUNG: firstUseRestrictions,
      'TAI_SAN.MUC_DICH_SU_DUNG': firstCollateral?.usagePurpose || '',
      MUC_DICH_SU_DUNG: firstCollateral?.usagePurpose || '',
      'TAI_SAN.THOI_HAN_SU_DUNG': firstCollateral?.usageDuration || '',
      THOI_HAN_SU_DUNG: firstCollateral?.usageDuration || '',
      'TAI_SAN.LOAI_TAI_SAN_GOP': mergedAssetTypes,
      LOAI_TAI_SAN_GOP: mergedAssetTypes,
      TEN_TAI_SAN_GOP: mergedAssetTypes,
      'TAI_SAN.NGUON_GOC_GOP': mergedOrigins,
      NGUON_GOC_GOP: mergedOrigins,
      'TAI_SAN.GIA_TRI_DINH_GIA_GOP': mergedValuations,
      GIA_TRI_DINH_GIA_GOP: mergedValuations,
      'TAI_SAN.DON_GIA_GOP': mergedPrices,
      DON_GIA_GOP: mergedPrices,

      // Phương án vay vốn (PHUONG_AN.*)
      'PHUONG_AN.MUC_DICH': planPurpose,
      'PHUONG_AN.MUC_DICH_VAY': planPurpose,
      PHUONG_AN_MUC_DICH: planPurpose,
      'PHUONG_AN.THOI_HAN_VAY': planTerm,
      'PHUONG_AN.THOI_HAN_THANG': loan.termMonths || 12,
      'PHUONG_AN.LOAI_THOI_HAN': loan.termType === 'TRUNG_HAN' ? 'Trung hạn' : 'Ngắn hạn',
      PHUONG_AN_THOI_HAN_VAY: planTerm,
      'PHUONG_AN.TONG_NHU_CAU_VON': `${totalCapitalDemand.toLocaleString('vi-VN')} đ`,
      'PHUONG_AN.TONG_NHU_CAU_VON_SO': `${totalCapitalDemand.toLocaleString('vi-VN')} đ`,
      'PHUONG_AN.TONG_NHU_CAU_VON_CHU': vndToWords(totalCapitalDemand),
      PHUONG_AN_TONG_NHU_CAU_VON: `${totalCapitalDemand.toLocaleString('vi-VN')} đ`,
      PHUONG_AN_TONG_NHU_CAU_VON_CHU: vndToWords(totalCapitalDemand),
      'PHUONG_AN.VON_TU_CO': `${ownCapital.toLocaleString('vi-VN')} đ`,
      'PHUONG_AN.VON_TU_CO_SO': `${ownCapital.toLocaleString('vi-VN')} đ`,
      'PHUONG_AN.VON_TU_CO_CHU': vndToWords(ownCapital),
      PHUONG_AN_VON_TU_CO: `${ownCapital.toLocaleString('vi-VN')} đ`,
      PHUONG_AN_VON_TU_CO_CHU: vndToWords(ownCapital),
      'PHUONG_AN.VON_VAY_QTD': `${borrowedCapital.toLocaleString('vi-VN')} đ`,
      'PHUONG_AN.VON_VAY_QTD_SO': `${borrowedCapital.toLocaleString('vi-VN')} đ`,
      'PHUONG_AN.VON_VAY_QTD_CHU': vndToWords(borrowedCapital),
      PHUONG_AN_VON_VAY_QTD: `${borrowedCapital.toLocaleString('vi-VN')} đ`,
      PHUONG_AN_VON_VAY_QTD_CHU: vndToWords(borrowedCapital),
      'PHUONG_AN.VON_VAY': `${borrowedCapital.toLocaleString('vi-VN')} đ`,
      'PHUONG_AN.VON_VAY_SO': `${borrowedCapital.toLocaleString('vi-VN')} đ`,
      'PHUONG_AN.VON_VAY_CHU': vndToWords(borrowedCapital),
      PHUONG_AN_VON_VAY: `${borrowedCapital.toLocaleString('vi-VN')} đ`,
      PHUONG_AN_VON_VAY_CHU: vndToWords(borrowedCapital),
      'PHUONG_AN.TONG_CHI_PHI': `${totalExpenses.toLocaleString('vi-VN')} đ`,
      'PHUONG_AN.TONG_CHI_PHI_SO': `${totalExpenses.toLocaleString('vi-VN')} đ`,
      'PHUONG_AN.TONG_CHI_PHI_CHU': vndToWords(totalExpenses),
      'PHUONG_AN.TONG_THU_NHAP': `${totalRevenues.toLocaleString('vi-VN')} đ`,
      'PHUONG_AN.TONG_THU_NHAP_SO': `${totalRevenues.toLocaleString('vi-VN')} đ`,
      'PHUONG_AN.TONG_THU_NHAP_CHU': vndToWords(totalRevenues),
      'PHUONG_AN.TONG_NGUON_THU': `${totalRevenues.toLocaleString('vi-VN')} đ`,
      'PHUONG_AN.TONG_NGUON_THU_SO': `${totalRevenues.toLocaleString('vi-VN')} đ`,
      'PHUONG_AN.TONG_NGUON_THU_CHU': vndToWords(totalRevenues),
      'PHUONG_AN.LOI_NHUAN': `${profit.toLocaleString('vi-VN')} đ`,
      'PHUONG_AN.LOI_NHUAN_SO': `${profit.toLocaleString('vi-VN')} đ`,
      'PHUONG_AN.LOI_NHUAN_CHU': vndToWords(profit),

      // Danh sách và gộp Chi phí phương án
      'PHUONG_AN.DANH_SACH_CHI_PHI': expensesList,
      'PHUONG_AN.CHI_PHI': expensesList,
      'PHUONG_AN_DANH_SACH_CHI_PHI': expensesList,
      'PHUONG_AN_CHI_PHI': expensesList,
      DANH_SACH_CHI_PHI: expensesList,
      CHI_PHI: expensesList,
      DANH_SACH_CHI_PHI_PHUONG_AN: expensesList,
      'PHUONG_AN.CHI_PHI_GOP': mergedExpenses,
      PHUONG_AN_CHI_PHI_GOP: mergedExpenses,
      'PHUONG_AN.DANH_SACH_CHI_PHI_GOP': mergedExpenses,
      CHI_PHI_GOP: mergedExpenses,
      DANH_SACH_CHI_PHI_GOP: mergedExpenses,

      // Danh sách và gộp Nguồn thu phương án
      'PHUONG_AN.DANH_SACH_NGUON_THU': revenuesList,
      'PHUONG_AN.NGUON_THU': revenuesList,
      'PHUONG_AN_DANH_SACH_NGUON_THU': revenuesList,
      'PHUONG_AN_NGUON_THU': revenuesList,
      DANH_SACH_NGUON_THU: revenuesList,
      NGUON_THU: revenuesList,
      DANH_SACH_NGUON_THU_PHUONG_AN: revenuesList,
      'PHUONG_AN.NGUON_THU_GOP': mergedRevenues,
      PHUONG_AN_NGUON_THU_GOP: mergedRevenues,
      'PHUONG_AN.DANH_SACH_NGUON_THU_GOP': mergedRevenues,
      NGUON_THU_GOP: mergedRevenues,
      DANH_SACH_NGUON_THU_GOP: mergedRevenues,

      // Alias tương thích mẫu biểu Phương án / Tờ trình thẩm định
      loan_purpose: planPurpose,
      plan_total_need: `${totalCapitalDemand.toLocaleString('vi-VN')} đ`,
      plan_own_capital: `${ownCapital.toLocaleString('vi-VN')} đ`,
      loan_amount: `${borrowedCapital.toLocaleString('vi-VN')} đ`,
      tong_chi_phi: `${totalExpenses.toLocaleString('vi-VN')} đ`,
      tong_nguon_thu: `${totalRevenues.toLocaleString('vi-VN')} đ`,
      loi_nhuan: `${profit.toLocaleString('vi-VN')} đ`,
      expenses: expensesList,
      revenues: revenuesList,
      incomes: revenuesList,
    };

    // Tạo alias cho đối tượng hoa (NGUOI_VAY, KHOAN_VAY, QUY_TIN_DUNG...)
    const fullNested: Record<string, any> = {
      ...nested,
      NGAY: nested.fund.currentDay,
      THANG: nested.fund.currentMonth,
      NAM: nested.fund.currentYear,
      NGUOI_VAY: {
        HO_TEN: nested.member.fullName,
        LOAI_GIAY_TO: nested.member.idType,
        DANH_XUNG: nested.member.genderTitle,
        XUNG_HO: nested.member.genderTitle,
        GIOI_TINH: nested.member.gender,
        NAM_SINH: nested.member.yearOfBirth,
        SO_GIAY_TO: nested.member.idNumber,
        SO_CCCD: nested.member.idNumber,
        NGAY_CAP: nested.member.idIssueDate,
        NGAY_CAP_CCCD: nested.member.idIssueDate,
        NOI_CAP: nested.member.idIssuePlace,
        NOI_CAP_CCCD: nested.member.idIssuePlace,
        SO_DIEN_THOAI: nested.member.phoneNumber,
        DIA_CHI: nested.member.address,
        MA_THANH_VIEN: nested.member.memberCode,
      },
      KHOAN_VAY: {
        SO_HOP_DONG: nested.loan.contractNumber,
        NGAY_HOP_DONG: nested.loan.contractDate,
        NGAY_HOP_DONG_NGAY: nested.loan.contractDateDay,
        NGAY_HOP_DONG_THANG: nested.loan.contractDateMonth,
        NGAY_HOP_DONG_NAM: nested.loan.contractDateYear,
        LOAI_VAY: loan.loanType,
        SO_TIEN_SO: nested.loan.loanAmount,
        SO_TIEN_CHU: nested.loan.loanAmountWords,
        THOI_HAN_THANG: nested.loan.termMonths,
        LAI_SUAT_NAM: nested.loan.interestRate,
        MUC_DICH_VAY: nested.loan.purpose,
        TONG_SO_TAI_SAN: nested.collaterals_summary.totalCount,
        TONG_GIA_TRI_TAI_SAN_SO: nested.collaterals_summary.totalValuationAmountRounded,
        TONG_GIA_TRI_TAI_SAN_CHU: nested.collaterals_summary.totalValuationAmountWords,
      },
      QUY_TIN_DUNG: {
        TEN_QUY: nested.fund.name,
        NGUOI_DAI_DIEN: nested.fund.representative,
        CHUC_VU: nested.fund.title,
      },
      NGUOI_THUA_KE: nested.heir
        ? {
            HO_TEN: nested.heir.fullName,
            DANH_XUNG: nested.heir.genderTitle,
            XUNG_HO: nested.heir.genderTitle,
            GIOI_TINH: nested.heir.gender,
            NAM_SINH: nested.heir.yearOfBirth,
            LOAI_GIAY_TO: nested.heir.idType,
            SO_GIAY_TO: nested.heir.idNumber,
            SO_CCCD: nested.heir.idNumber,
            NGAY_CAP: nested.heir.idIssueDate,
            NGAY_CAP_CCCD: nested.heir.idIssueDate,
            NOI_CAP: nested.heir.idIssuePlace,
            NOI_CAP_CCCD: nested.heir.idIssuePlace,
            QUAN_HE: nested.heir.relationship,
            SO_DIEN_THOAI: nested.heir.phoneNumber,
            DIA_CHI: nested.heir.address,
          }
        : {
            HO_TEN: '',
            DANH_XUNG: '',
            XUNG_HO: '',
            GIOI_TINH: '',
            NAM_SINH: '',
            LOAI_GIAY_TO: '',
            SO_GIAY_TO: '',
            SO_CCCD: '',
            NGAY_CAP: '',
            NGAY_CAP_CCCD: '',
            NOI_CAP: '',
            NOI_CAP_CCCD: '',
            QUAN_HE: '',
            SO_DIEN_THOAI: '',
            DIA_CHI: '',
          },
      CHU_SO_HUU: firstOwnerObj,
      CO_MOT_CHU_SO_HUU: hasSingleOwner,
      CO_NHIEU_CHU_SO_HUU: hasMultipleOwners,
      CHU_SO_HUU_LA_NGUOI_VAY: isOwnerBorrower,
      CHU_SO_HUU_LA_NGUOI_THUA_KE: isOwnerHeir,
      CHU_SO_HUU_LA_BAO_LANH: isOwnerGuarantor,
      CO_CA_NGUOI_VAY_VA_THUA_KE_SO_HUU: isBothBorrowerAndHeirOwner,
      DONG_SO_HUU_NGUOI_VAY_VA_THUA_KE: isBothBorrowerAndHeirOwner,
      CO_NGUOI_VAY_VA_NGUOI_THUA_KE_SO_HUU: isBothBorrowerAndHeirOwner,
      isBothBorrowerAndHeirOwner,
      isBorrowerAndHeirOwner: isBothBorrowerAndHeirOwner,
      DANH_SACH_CHU_SO_HUU: uniqueOwnersList,
      DANH_SACH_TAI_SAN: collateralsList,
      DANH_SACH_NGUOI_LIEN_QUAN: relatedPersonsList,
      DANH_SACH_NGUOI_THUA_KE: heirsList,
      PHUONG_AN: nested.PHUONG_AN,
      DANH_SACH_CHI_PHI: expensesList,
      CHI_PHI: expensesList,
      DANH_SACH_NGUON_THU: revenuesList,
      NGUON_THU: revenuesList,
      expenses: expensesList,
      revenues: revenuesList,
      incomes: revenuesList,
    };

    return {
      nested: fullNested,
      flatVariables,
      lists: {
        collaterals: collateralsList,
        DANH_SACH_TAI_SAN: collateralsList,
        uniqueOwners: uniqueOwnersList,
        DANH_SACH_CHU_SO_HUU: uniqueOwnersList,
        relatedPersons: relatedPersonsList,
        DANH_SACH_NGUOI_LIEN_QUAN: relatedPersonsList,
        heirs: heirsList,
        DANH_SACH_NGUOI_THUA_KE: heirsList,
        expenses: expensesList,
        DANH_SACH_CHI_PHI: expensesList,
        CHI_PHI: expensesList,
        DANH_SACH_CHI_PHI_PHUONG_AN: expensesList,
        'PHUONG_AN.DANH_SACH_CHI_PHI': expensesList,
        'PHUONG_AN.CHI_PHI': expensesList,
        revenues: revenuesList,
        incomes: revenuesList,
        DANH_SACH_NGUON_THU: revenuesList,
        NGUON_THU: revenuesList,
        DANH_SACH_NGUON_THU_PHUONG_AN: revenuesList,
        'PHUONG_AN.DANH_SACH_NGUON_THU': revenuesList,
        'PHUONG_AN.NGUON_THU': revenuesList,
      },
    };
  }

  private getValueByPath(obj: any, path: string): any {
    if (!obj || !path) return undefined;
    const parts = path.split('.');
    let curr = obj;
    for (const part of parts) {
      if (curr === null || curr === undefined) return undefined;
      curr = curr[part];
    }
    return curr;
  }

  private formatValue(value: any, dataType: string, formatPattern?: string | null): any {
    if (value === null || value === undefined) return '';

    switch (dataType) {
      case 'CURRENCY':
        if (typeof value === 'number') {
          return `${value.toLocaleString('vi-VN')} đ`;
        }
        return value;
      case 'CURRENCY_WORDS':
        if (typeof value === 'number') {
          return vndToWords(value);
        }
        return String(value);
      case 'DATE':
        if (dayjs(value).isValid()) {
          const pattern = formatPattern || 'DD/MM/YYYY';
          return dayjs(value).format(pattern);
        }
        return String(value);
      case 'GENDER_TITLE':
        if (value === 'NAM' || value === 'Nam' || value === 'Ông') return 'Ông';
        if (value === 'NU' || value === 'Nữ' || value === 'Bà') return 'Bà';
        return value;
      case 'NUMBER':
        if (typeof value === 'number') {
          // Năm (ví dụ: 1900 - 2100) không được có dấu phân cách hàng nghìn (tránh biến năm sinh 1963 thành 1.963)
          if (Number.isInteger(value) && value >= 1900 && value <= 2100) {
            return String(value);
          }
          return value.toLocaleString('vi-VN');
        }
        if (typeof value === 'string' && /^\d{4}$/.test(value.trim())) {
          return value.trim();
        }
        return value;
      default:
        return String(value);
    }
  }

  public formatAssetType(type: string): string {
    let name = '';
    switch (type) {
      case 'QUYEN_SU_DUNG_DAT':
        name = 'Quyền sử dụng đất';
        break;
      case 'QUYEN_SU_DUNG_DAT_QUYEN_SO_HUU_NHA_O_VA_TAI_SAN_KHAC_GAN_LIEN_VOI_DAT':
        name = 'Quyền sử dụng đất quyền sở hữu nhà ở và tài sản khác gắn liền với đất';
        break;
      case 'QUYEN_SU_DUNG_DAT_QUYEN_SO_HUU_TAI_SAN_GAN_LIEN_VOI_DAT':
        name = 'Quyền sử dụng đất, quyền sở hữu tài sản gắn liền với đất';
        break;
      default:
        name = type || 'Quyền sử dụng đất';
        break;
    }
    const trimmed = name.trim();
    if (!trimmed.toLowerCase().startsWith('giấy chứng nhận')) {
      return `Giấy chứng nhận ${trimmed}`;
    }
    return trimmed;
  }

  private formatIdType(type?: string | null): string {
    if (type === 'CAN_CUOC') return 'Thẻ căn cước';
    if (type === 'CHUNG_MINH_NHAN_DAN') return 'Chứng minh nhân dân';
    return 'Căn cước công dân';
  }

  public formatCertificateType(type?: string | null): string {
    if (!type) return 'GCN';
    const trimmed = type.trim();
    const upper = trimmed.toUpperCase();

    if (upper === 'GCN') {
      return 'GCN';
    }
    if (upper === 'GIAY_CHUNG_NHAN' || trimmed.toLowerCase() === 'giấy chứng nhận') {
      return 'Giấy chứng nhận';
    }
    if (
      upper === 'VAO_SO_CAP_GIAY_CHUNG_NHAN_QUYEN_SU_DUNG_DAT' ||
      upper === 'VAO_SO_CAP_GCN_QSDD' ||
      trimmed.toLowerCase() === 'vào sổ cấp giấy chứng nhận quyền sử dụng đất' ||
      trimmed.toLowerCase() === 'vào sổ cấp giấy chứng nhận quyền sử dụng đất số'
    ) {
      return 'Vào sổ cấp giấy chứng nhận quyền sử dụng đất Số';
    }
    if (
      upper === 'GIAY_CHUNG_NHAN_QUYEN_SU_DUNG_DAT' ||
      upper === 'GCN_QSDD' ||
      trimmed.toLowerCase() === 'giấy chứng nhận quyền sử dụng đất'
    ) {
      return 'Giấy chứng nhận quyền sử dụng đất';
    }

    return trimmed;
  }

  public formatCertificateClause(c: any): string {
    const certType = this.formatCertificateType(c?.certificateType);
    const certNum = c?.certificateNumber ? String(c.certificateNumber).trim() : '...................';
    const lower = certType.toLowerCase().trim();

    // Nếu loại GCN là "Vào sổ cấp giấy chứng nhận quyền sử dụng đất Số" (hoặc bắt đầu bằng "vào sổ cấp")
    if (lower.startsWith('vào sổ cấp')) {
      return `${certType}: ${certNum}`;
    }

    // Các trường hợp khác: "GCN", "Giấy chứng nhận", "Giấy chứng nhận quyền sử dụng đất"
    return `Số vào sổ cấp ${certType}: ${certNum}`;
  }
}

export const wordTemplateDataDictionaryService = new WordTemplateDataDictionaryService();
