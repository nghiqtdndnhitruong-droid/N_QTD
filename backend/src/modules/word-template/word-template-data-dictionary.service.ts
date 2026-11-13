import dayjs from 'dayjs';
import { VALUATION_TYPE_LABELS, ValuationType } from '../loan-valuation/loan-valuation.types';
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

/**
 * Tự động đọc và ánh xạ tên khoản thu thành TEN_THU_NHAP chuẩn hóa theo mẫu của Quỹ:
 * - Trồng trọt, lúa, nông nghiệp -> "Thu nhập từ sản xuất nông nghiệp:"
 * - Chăn nuôi, bò, gia súc... -> "Thu nhập từ chăn nuôi:"
 * - Khác -> "Thu nhập khác:"
 */
export function resolveIncomeTitle(
  name: string,
  _index: number = 0,
): { title: string; withoutColon: string; withColon: string } {
  const raw = (name || '').trim();
  const lower = raw.toLowerCase();

  let withoutColon = '';
  // 1. Nông nghiệp / Lúa / Trồng trọt
  if (lower.includes('lúa') || lower.includes('nông nghiệp') || lower.includes('trồng')) {
    withoutColon = 'Thu nhập từ sản xuất nông nghiệp';
  } else if (
    lower.includes('chăn nuôi') ||
    lower.includes('nuôi bò') ||
    lower.includes('bò') ||
    lower.includes('gia súc') ||
    lower.includes('gia cầm') ||
    lower.includes('heo')
  ) {
    withoutColon = 'Thu nhập từ chăn nuôi';
  } else if (lower.includes('khác')) {
    withoutColon = 'Thu nhập khác';
  } else {
    // 4. Mặc định/tùy chỉnh: loại bỏ tiền tố "Trả bằng nguồn thu / Trả bằng nguồn" nếu có
    const clean = raw.replace(/^Trả bằng nguồn (thu )?/i, 'Thu nhập từ ').replace(/:+$/, '').trim();
    withoutColon = clean.replace(/:+$/, '');
  }

  return {
    title: withoutColon,
    withoutColon,
    withColon: `${withoutColon}:`,
  };
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
          { path: 'loan.applicationDate', label: 'Ngày làm hồ sơ vay (dd/mm/yyyy)', dataType: 'DATE', sampleValue: '20/05/2026' },
          { path: 'NGAY', label: 'Ngày làm hồ sơ (chỉ số ngày)', dataType: 'TEXT', sampleValue: '20' },
          { path: 'THANG', label: 'Tháng làm hồ sơ (chỉ số tháng)', dataType: 'TEXT', sampleValue: '05' },
          { path: 'NAM', label: 'Năm làm hồ sơ (chỉ số năm)', dataType: 'TEXT', sampleValue: '2026' },
          { path: 'NGAY_LAM_HO_SO', label: 'Ngày làm hồ sơ (dd/mm/yyyy)', dataType: 'DATE', sampleValue: '20/05/2026' },
          { path: 'NGAY_LAP_HO_SO', label: 'Ngày lập hồ sơ (dd/mm/yyyy)', dataType: 'DATE', sampleValue: '20/05/2026' },
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
          { path: 'isTrungHan', label: 'Khoản vay là trung hạn (True/False)', dataType: 'BOOLEAN', sampleValue: true },
          { path: 'isNganHan', label: 'Khoản vay là ngắn hạn (True/False)', dataType: 'BOOLEAN', sampleValue: false },
          { path: 'KHOAN_VAY.DANH_XUNG', label: 'Danh xưng khoản vay / chủ tài sản (ví dụ: Ông: Lê Văn A hoặc Ông (Bà): Nguyễn A + Nguyễn Thị B)', dataType: 'TEXT', sampleValue: 'Ông: Lê Văn An' },
          { path: 'KHOAN_VAY.SO_KHE_UOC', label: 'Số khế ước nhận nợ (SO_KHE_UOC)', dataType: 'TEXT', sampleValue: '26.11.020' },
          { path: 'KHOAN_VAY.SO_KHE_UOC_NAM', label: 'Năm của số khế ước (chỉ số năm, ví dụ: 26 hoặc 2026)', dataType: 'TEXT', sampleValue: '26' },
          { path: 'KHOAN_VAY.SO_KHE_UOC_THANG', label: 'Tháng của số khế ước (chỉ số tháng, ví dụ: 11)', dataType: 'TEXT', sampleValue: '11' },
          { path: 'KHOAN_VAY.SO_KHE_UOC_NGAY', label: 'Ngày của số khế ước (chỉ số ngày, ví dụ: 05)', dataType: 'TEXT', sampleValue: '05' },
          { path: 'KHOAN_VAY.SO_KHE_UOC_SO', label: 'Số cuối của số khế ước (phần sau dấu chấm thứ 2, ví dụ: 020)', dataType: 'TEXT', sampleValue: '020' },
          { path: 'KHOAN_VAY.SO_HOP_DONG_THE_CHAP_NAM', label: 'Năm của số hợp đồng thế chấp (ví dụ: 26)', dataType: 'TEXT', sampleValue: '26' },
          { path: 'KHOAN_VAY.SO_HOP_DONG_THE_CHAP_THANG', label: 'Tháng của số hợp đồng thế chấp (ví dụ: 11)', dataType: 'TEXT', sampleValue: '11' },
          { path: 'KHOAN_VAY.SO_HOP_DONG_THE_CHAP_NGAY', label: 'Ngày của số hợp đồng thế chấp (ví dụ: 05)', dataType: 'TEXT', sampleValue: '05' },
          { path: 'KHOAN_VAY.SO_HOP_DONG_THE_CHAP_SO', label: 'Số cuối của số hợp đồng thế chấp (ví dụ: 020)', dataType: 'TEXT', sampleValue: '020' },
          { path: 'KHOAN_VAY.NGAY_CAP_KHE_UOC', label: 'Ngày cấp khế ước nhận nợ (dd/mm/yyyy)', dataType: 'DATE', sampleValue: '20/05/2026' },
          { path: 'KHOAN_VAY.SO_HOP_DONG_THE_CHAP', label: 'Số hợp đồng thế chấp (KHOAN_VAY.SO_HOP_DONG_THE_CHAP)', dataType: 'TEXT', sampleValue: '01/2026/HĐTC' },
          { path: 'KHOAN_VAY.IS_SO_KHE_UOC_GIONG_SO_HD_THE_CHAP', label: 'Kiểm tra số khế ước có giống số HĐ thế chấp không (True/False)', dataType: 'BOOLEAN', sampleValue: true },
          { path: 'loan.DANH_XUNG', label: 'Danh xưng khoản vay / chủ tài sản', dataType: 'TEXT', sampleValue: 'Ông: Lê Văn An' },
          { path: 'KHOAN_VAY.DANH_XUNG', label: 'Danh xưng khoản vay / chủ tài sản (ví dụ: Ông: Lê Văn A hoặc Ông (Bà): Nguyễn A + Nguyễn Thị B)', dataType: 'TEXT', sampleValue: 'Ông: Lê Văn An' },
          { path: 'loan.DANH_XUNG', label: 'Danh xưng khoản vay / chủ tài sản', dataType: 'TEXT', sampleValue: 'Ông: Lê Văn An' },
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
          { path: 'PHUONG_AN.IS_TRUNG_HAN', label: 'Phương án là trung hạn (True/False)', dataType: 'BOOLEAN', sampleValue: true },
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
          { path: 'mortgage.committeeAuthDateDay', label: 'Ngày chứng thực ủy ban (chỉ số ngày)', dataType: 'TEXT', sampleValue: '20' },
          { path: 'mortgage.committeeAuthDateMonth', label: 'Ngày chứng thực ủy ban (chỉ số tháng)', dataType: 'TEXT', sampleValue: '05' },
          { path: 'mortgage.committeeAuthDateYear', label: 'Ngày chứng thực ủy ban (chỉ số năm)', dataType: 'TEXT', sampleValue: '2026' },
          { path: 'NGAY_CHUNG_THUC_UY_BAN_NGAY', label: 'Ngày chứng thực ủy ban ngày (chỉ số ngày, ví dụ: 20)', dataType: 'TEXT', sampleValue: '20' },
          { path: 'NGAY_CHUNG_THUC_UY_BAN_THANG', label: 'Ngày chứng thực ủy ban tháng (chỉ số tháng, ví dụ: 05)', dataType: 'TEXT', sampleValue: '05' },
          { path: 'NGAY_CHUNG_THUC_UY_BAN_NAM', label: 'Ngày chứng thực ủy ban năm (chỉ số năm, ví dụ: 2026)', dataType: 'TEXT', sampleValue: '2026' },
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
          { path: 'CHU_SO_HUU.HO_TEN', label: 'Họ tên chủ sở hữu tài sản (người đầu tiên)', dataType: 'TEXT', sampleValue: 'Nguyễn Văn An' },
          { path: 'CHU_SO_HUU.HO_TEN_IN_HOA', label: 'Họ tên chủ sở hữu tài sản viết hoa', dataType: 'TEXT', sampleValue: 'NGUYỄN VĂN AN' },
          { path: 'CHU_SO_HUU_1.HO_TEN', label: 'Họ tên chủ sở hữu thứ nhất', dataType: 'TEXT', sampleValue: 'Nguyễn Văn An' },
          { path: 'CHU_SO_HUU_1.HO_TEN_IN_HOA', label: 'Họ tên chủ sở hữu thứ nhất viết hoa', dataType: 'TEXT', sampleValue: 'NGUYỄN VĂN AN' },
          { path: 'CHU_SO_HUU_1', label: 'Tên chủ sở hữu thứ nhất (viết gọn)', dataType: 'TEXT', sampleValue: 'Nguyễn Văn An' },
          { path: 'CHU_SO_HUU_1.DANH_XUNG', label: 'Danh xưng chủ sở hữu thứ nhất (Ông/Bà/Hộ Ông/Hộ Bà)', dataType: 'TEXT', sampleValue: 'Ông' },
          { path: 'CHU_SO_HUU_1.NAM_SINH', label: 'Năm sinh chủ sở hữu thứ nhất', dataType: 'TEXT', sampleValue: '1985' },
          { path: 'CHU_SO_HUU_1.LOAI_GIAY_TO', label: 'Loại giấy tờ chủ sở hữu thứ nhất', dataType: 'TEXT', sampleValue: 'Căn cước công dân' },
          { path: 'CHU_SO_HUU_1.SO_CCCD', label: 'Số CCCD/Căn cước chủ sở hữu thứ nhất', dataType: 'TEXT', sampleValue: '084185001234' },
          { path: 'CHU_SO_HUU_1.SO_GIAY_TO', label: 'Số giấy tờ chủ sở hữu thứ nhất', dataType: 'TEXT', sampleValue: '084185001234' },
          { path: 'CHU_SO_HUU_1.NGAY_CAP', label: 'Ngày cấp giấy tờ chủ sở hữu thứ nhất (dd/mm/yyyy)', dataType: 'DATE', sampleValue: '10/05/2021' },
          { path: 'CHU_SO_HUU_1.NOI_CAP', label: 'Nơi cấp giấy tờ chủ sở hữu thứ nhất', dataType: 'TEXT', sampleValue: 'Cục CSQLHC về TTXH' },
          { path: 'CHU_SO_HUU_1.DIA_CHI', label: 'Địa chỉ thường trú chủ sở hữu thứ nhất', dataType: 'TEXT', sampleValue: 'Ấp Nô Lựa, Xã Nhị Trường' },
          { path: 'CHU_SO_HUU_1.QUAN_HE', label: 'Quan hệ của chủ sở hữu thứ nhất', dataType: 'TEXT', sampleValue: 'Người vay' },
          { path: 'CHU_SO_HUU_2.HO_TEN', label: 'Họ tên chủ sở hữu thứ hai (nếu có 2 người cùng sở hữu)', dataType: 'TEXT', sampleValue: 'Trần Thị Bích' },
          { path: 'CHU_SO_HUU_2.HO_TEN_IN_HOA', label: 'Họ tên chủ sở hữu thứ hai viết hoa', dataType: 'TEXT', sampleValue: 'TRẦN THỊ BÍCH' },
          { path: 'CHU_SO_HUU_2', label: 'Tên chủ sở hữu thứ hai (viết gọn)', dataType: 'TEXT', sampleValue: 'Trần Thị Bích' },
          { path: 'CHU_SO_HUU_2.DANH_XUNG', label: 'Danh xưng chủ sở hữu thứ hai (Ông/Bà)', dataType: 'TEXT', sampleValue: 'Bà' },
          { path: 'CHU_SO_HUU_2.NAM_SINH', label: 'Năm sinh chủ sở hữu thứ hai', dataType: 'TEXT', sampleValue: '1990' },
          { path: 'CHU_SO_HUU_2.LOAI_GIAY_TO', label: 'Loại giấy tờ chủ sở hữu thứ hai', dataType: 'TEXT', sampleValue: 'Căn cước công dân' },
          { path: 'CHU_SO_HUU_2.SO_CCCD', label: 'Số CCCD chủ sở hữu thứ hai', dataType: 'TEXT', sampleValue: '084192005678' },
          { path: 'CHU_SO_HUU_2.SO_GIAY_TO', label: 'Số giấy tờ chủ sở hữu thứ hai', dataType: 'TEXT', sampleValue: '084192005678' },
          { path: 'CHU_SO_HUU_2.NGAY_CAP', label: 'Ngày cấp giấy tờ chủ sở hữu thứ hai', dataType: 'DATE', sampleValue: '15/06/2022' },
          { path: 'CHU_SO_HUU_2.NOI_CAP', label: 'Nơi cấp giấy tờ chủ sở hữu thứ hai', dataType: 'TEXT', sampleValue: 'Cục CSQLHC về TTXH' },
          { path: 'CHU_SO_HUU_2.DIA_CHI', label: 'Địa chỉ thường trú chủ sở hữu thứ hai', dataType: 'TEXT', sampleValue: 'Ấp Nô Lựa, Xã Nhị Trường' },
          { path: 'CHU_SO_HUU_2.QUAN_HE', label: 'Quan hệ của chủ sở hữu thứ hai', dataType: 'TEXT', sampleValue: 'Người thừa kế' },
          { path: 'CO_CHU_SO_HUU_2', label: 'Khoản vay có 2 chủ sở hữu cùng đứng tên tài sản (True/False)', dataType: 'BOOLEAN', sampleValue: true },
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
          { path: 'TAI_SAN.TONG_DINH_GIA', label: 'Tổng định giá tất cả tài sản (VND)', dataType: 'CURRENCY', sampleValue: '673.000.000 đ' },
          { path: 'TAI_SAN.TONG_DINH_GIA_CHU', label: 'Tổng định giá tất cả tài sản bằng chữ', dataType: 'CURRENCY_WORDS', sampleValue: 'Sáu trăm bảy mươi ba triệu đồng' },
          { path: 'TAI_SAN.TONG_DINH_GIA_70', label: '70% tổng giá trị định giá (làm tròn xuống, VND)', dataType: 'CURRENCY', sampleValue: '471.000.000 đ' },
          { path: 'TAI_SAN.TONG_DINH_GIA_70_SO', label: '70% tổng giá trị định giá (dạng số)', dataType: 'TEXT', sampleValue: '471.000.000' },
          { path: 'TAI_SAN.TONG_DINH_GIA_70_CHU', label: '70% tổng giá trị định giá bằng chữ', dataType: 'CURRENCY_WORDS', sampleValue: 'Bốn trăm bảy mươi mốt triệu đồng' },
          { path: 'TAI_SAN.SO_LUONG_TAI_SAN', label: 'Tổng số lượng tài sản', dataType: 'NUMBER', sampleValue: 2 },
          { path: 'TAI_SAN.TONG_SO_TAI_SAN', label: 'Tổng số lượng tài sản (alias)', dataType: 'NUMBER', sampleValue: 2 },
          { path: 'TAI_SAN.IS_KHAC_DIA_CHI', label: 'Các tài sản ở khác địa chỉ (True/False)', dataType: 'BOOLEAN', sampleValue: false },
          { path: 'TAI_SAN.MA_NHOM', label: 'Mã nhóm địa bàn của tài sản (NHOM_1, NHOM_2...)', dataType: 'TEXT', sampleValue: 'NHOM_1' },
          { path: 'TAI_SAN.TEN_NHOM', label: 'Tên nhóm địa bàn của tài sản (Nhóm 1, Nhóm 2...)', dataType: 'TEXT', sampleValue: 'Nhóm 1' },
          { path: 'TAI_SAN.DANH_SACH_NHOM_GOP', label: 'Danh sách các nhóm địa bàn gộp (nối dấu ;)', dataType: 'TEXT', sampleValue: 'Nhóm 1; Nhóm 2' },
          { path: 'CO_TRONG_NHOM_1', label: 'Điều kiện: Tài sản/Địa chỉ thuộc Nhóm 1 (True/False)', dataType: 'BOOLEAN', sampleValue: true },
          { path: 'CO_TRONG_NHOM_2', label: 'Điều kiện: Tài sản/Địa chỉ thuộc Nhóm 2 (True/False)', dataType: 'BOOLEAN', sampleValue: false },
          { path: 'CO_TRONG_NHOM_3', label: 'Điều kiện: Tài sản/Địa chỉ thuộc Nhóm 3 (True/False)', dataType: 'BOOLEAN', sampleValue: false },
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
          {
            path: 'DANH_SACH_CHU_SO_HUU_VA_THUA_KE',
            label: 'Danh sách chủ sở hữu kèm người thừa kế/người vay (Khối lặp)',
            dataType: 'LIST',
            isList: true,
            itemFields: [
              { path: 'index', label: 'Số thứ tự (1, 2, 3...)', dataType: 'NUMBER', sampleValue: 1 },
              { path: 'HO_TEN', label: 'Họ và tên chủ sở hữu / người thừa kế / người vay', dataType: 'TEXT', sampleValue: 'Nguyễn Văn An' },
              { path: 'DANH_XUNG', label: 'Danh xưng (Ông/Bà/Hộ Ông/Hộ Bà)', dataType: 'TEXT', sampleValue: 'Ông' },
              { path: 'GIOI_TINH', label: 'Giới tính (Nam/Nữ)', dataType: 'TEXT', sampleValue: 'Nam' },
              { path: 'NAM_SINH', label: 'Năm sinh', dataType: 'TEXT', sampleValue: '1980' },
              { path: 'LOAI_GIAY_TO', label: 'Loại giấy tờ (Căn cước / CCCD)', dataType: 'TEXT', sampleValue: 'Căn cước công dân' },
              { path: 'SO_CCCD', label: 'Số CCCD / Căn cước', dataType: 'TEXT', sampleValue: '084080001234' },
              { path: 'NGAY_CAP', label: 'Ngày cấp', dataType: 'DATE', sampleValue: '10/05/2021' },
              { path: 'NOI_CAP', label: 'Nơi cấp', dataType: 'TEXT', sampleValue: 'Cục Cảnh sát QLHC về TTXH' },
              { path: 'DIA_CHI', label: 'Địa chỉ thường trú', dataType: 'TEXT', sampleValue: 'Ấp Nô Lựa, Xã Nhị Trường, Tỉnh Vĩnh Long' },
              { path: 'QUAN_HE', label: 'Quan hệ (Người vay / Người thừa kế / Bên bảo lãnh)', dataType: 'TEXT', sampleValue: 'Người vay' },
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
              { path: 'creditFundLoan', label: 'Vốn vay Quỹ tín dụng', dataType: 'TEXT', sampleValue: 'Không' },
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
      {
        id: 'valuations_list',
        label: '12. Danh sách Định giá tài sản (Bảng lặp {#DANH_SACH_DINH_GIA} / {#KHOAN_VAY.DANH_SACH_DINH_GIA})',
        description: 'Dùng cho bảng lặp {{#FOR dinh_gia IN KHOAN_VAY.DANH_SACH_DINH_GIA}} hoặc {{#DANH_SACH_DINH_GIA}}',
        fields: [
          {
            path: 'KHOAN_VAY.DANH_SACH_DINH_GIA',
            label: 'Danh sách định giá tài sản khoản vay (Khối lặp FOR/Bảng)',
            dataType: 'LIST',
            isList: true,
            itemFields: [
              { path: 'LOAI_DINH_GIA', label: 'Loại định giá (Tên hiển thị)', dataType: 'TEXT', sampleValue: 'Theo nghị định Quỹ' },
              { path: 'NGAY_DINH_GIA', label: 'Ngày định giá (DD/MM/YYYY)', dataType: 'DATE', sampleValue: '25/08/2026' },
              { path: 'SO_TO', label: 'Số tờ (giữ số 0 đầu)', dataType: 'TEXT', sampleValue: '05' },
              { path: 'SO_THUA', label: 'Số thửa (giữ số 0 đầu)', dataType: 'TEXT', sampleValue: '012' },
              { path: 'DIEN_TICH', label: 'Diện tích (m²)', dataType: 'NUMBER', sampleValue: '500' },
              { path: 'DIEN_TICH_THUC_TE', label: 'Diện tích thực tế (m²)', dataType: 'NUMBER', sampleValue: '480' },
              { path: 'DON_GIA', label: 'Đơn giá (VNĐ/m²)', dataType: 'CURRENCY', sampleValue: '1.200.000' },
              { path: 'GIA_TIEN_TRUOC_LAM_TRON', label: 'Giá tiền trước làm tròn (VNĐ)', dataType: 'CURRENCY', sampleValue: '576.500.000' },
              { path: 'GIA_TIEN', label: 'Giá tiền định giá sau làm tròn xuống (VNĐ)', dataType: 'CURRENCY', sampleValue: '576.000.000' },
              { path: 'SO_LUONG_TAI_SAN', label: 'Số tài sản trong nhóm định giá', dataType: 'NUMBER', sampleValue: 2 },
              { path: 'DANH_SACH_TAI_SAN', label: 'Danh sách tài sản cấu thành nhóm (Khối lặp lồng nhau)', dataType: 'LIST', isList: true },
              { path: 'GIA_TIEN_CHU', label: 'Giá tiền bằng chữ', dataType: 'CURRENCY_WORDS', sampleValue: 'Năm trăm bảy mươi sáu triệu đồng' },
              { path: 'GHI_CHU', label: 'Cột ghi chú của dòng định giá (GHI_CHU)', dataType: 'TEXT', sampleValue: 'Gộp 3 thửa đất cùng loại' },
              { path: 'ghi_chu', label: 'Ghi chú (chữ thường)', dataType: 'TEXT', sampleValue: 'Gộp 3 thửa đất cùng loại' },
              { path: 'notes', label: 'Ghi chú (alias notes)', dataType: 'TEXT', sampleValue: 'Gộp 3 thửa đất cùng loại' },
              { path: 'note', label: 'Ghi chú (alias note)', dataType: 'TEXT', sampleValue: 'Gộp 3 thửa đất cùng loại' },
              { path: 'LA_NGHI_DINH_QUY', label: 'Boolean: là Theo nghị định Quỹ', dataType: 'BOOLEAN', sampleValue: true },
              { path: 'LA_NGHI_DINH_QUY_CU', label: 'Boolean: là Theo nghị định Quỹ (Cũ)', dataType: 'BOOLEAN', sampleValue: false },
              { path: 'LA_GIA_THI_TRUONG', label: 'Boolean: là Theo giá thị trường', dataType: 'BOOLEAN', sampleValue: false },
              { path: 'LA_GIA_THI_TRUONG_VA_NGHI_DINH_QUY', label: 'Boolean: là Giá thị trường và theo nghị định Quỹ', dataType: 'BOOLEAN', sampleValue: false },
            ],
          },
          {
            path: 'KHOAN_VAY.SO_LUONG_DINH_GIA',
            label: 'Tổng số lượng bản ghi định giá',
            dataType: 'NUMBER',
            sampleValue: 2,
          },
          {
            path: 'KHOAN_VAY.CO_DINH_GIA',
            label: 'Khoản vay có bản ghi định giá hay không',
            dataType: 'BOOLEAN',
            sampleValue: true,
          },
          {
            path: 'KHOAN_VAY.NGAY_DINH_GIA',
            label: 'Ngày định giá duy nhất (nếu nhiều ngày khác nhau trả về rỗng)',
            dataType: 'TEXT',
            sampleValue: '25/08/2026',
          },
          {
            path: 'KHOAN_VAY.LOAI_DINH_GIA',
            label: 'Loại định giá duy nhất (nếu nhiều loại khác nhau trả về rỗng)',
            dataType: 'TEXT',
            sampleValue: 'Theo nghị định Quỹ',
          },
          {
            path: 'KHOAN_VAY.TONG_GIA_TIEN_DINH_GIA',
            label: 'Tổng giá tiền định giá của khoản vay',
            dataType: 'CURRENCY',
            sampleValue: '1.200.000.000',
          },
          {
            path: 'KHOAN_VAY.TONG_GIA_TIEN_DINH_GIA_CHU',
            label: 'Tổng giá tiền định giá của khoản vay bằng chữ',
            dataType: 'CURRENCY_WORDS',
            sampleValue: 'Một tỷ hai trăm triệu đồng',
          },
          {
            path: 'KHOAN_VAY.CO_DINH_GIA_THEO_NGHI_DINH_QUY',
            label: 'Có bản ghi định giá Theo nghị định Quỹ (True/False)',
            dataType: 'BOOLEAN',
            sampleValue: true,
          },
          {
            path: 'KHOAN_VAY.CO_DINH_GIA_THEO_NGHI_DINH_QUY_CU',
            label: 'Có bản ghi định giá Theo nghị định Quỹ (Cũ) (True/False)',
            dataType: 'BOOLEAN',
            sampleValue: false,
          },
          {
            path: 'KHOAN_VAY.CO_DINH_GIA_THEO_GIA_THI_TRUONG',
            label: 'Có bản ghi định giá Theo giá thị trường (True/False)',
            dataType: 'BOOLEAN',
            sampleValue: false,
          },
          {
            path: 'KHOAN_VAY.CO_DINH_GIA_THEO_GIA_THI_TRUONG_VA_NGHI_DINH_QUY',
            label: 'Có bản ghi định giá Theo giá thị trường và theo nghị định Quỹ (True/False)',
            dataType: 'BOOLEAN',
            sampleValue: false,
          },
          {
            path: 'KHOAN_VAY.DON_GIA_THI_TRUONG',
            label: 'Đơn giá định giá theo giá thị trường (ví dụ: 230.000đ)',
            dataType: 'CURRENCY',
            sampleValue: '230.000đ',
          },
          {
            path: 'DON_GIA_THI_TRUONG',
            label: 'Đơn giá định giá theo giá thị trường (rút gọn)',
            dataType: 'CURRENCY',
            sampleValue: '230.000đ',
          },
        ],
      },
      {
        id: 'incomes_list',
        label: '11. Danh sách Thu nhập phương án (Bảng lặp {#DANH_SACH_THU_NHAP} / {#PHUONG_AN.DANH_SACH_THU_NHAP})',
        description: 'Dùng cho bảng lặp {#DANH_SACH_THU_NHAP}...{/DANH_SACH_THU_NHAP} hoặc {{#FOR tn IN DANH_SACH_THU_NHAP}} với biến TEN_THU_NHAP chuẩn hóa',
        fields: [
          {
            path: 'DANH_SACH_THU_NHAP',
            label: 'Danh sách thu nhập phương án (Khối lặp FOR/Bảng)',
            dataType: 'LIST',
            isList: true,
            itemFields: [
              { path: 'STT', label: 'Số thứ tự (1, 2, 3...)', dataType: 'NUMBER', sampleValue: 1 },
              { path: 'TEN_THU_NHAP', label: 'Tên thu nhập chuẩn hóa (không có dấu :)', dataType: 'TEXT', sampleValue: 'Thu nhập từ sản xuất nông nghiệp' },
              { path: 'TEN_THU_NHAP_KHONG_DAU_HAI_CHAM', label: 'Tên thu nhập (không có dấu :)', dataType: 'TEXT', sampleValue: 'Thu nhập từ sản xuất nông nghiệp' },
              { path: 'SO_TIEN', label: 'Số tiền bằng số có đơn vị (VND)', dataType: 'CURRENCY', sampleValue: '159.960.000 đ' },
              { path: 'SO_TIEN_CHU', label: 'Số tiền bằng chữ', dataType: 'CURRENCY_WORDS', sampleValue: 'Một trăm năm mươi chín triệu chín trăm sáu mươi nghìn đồng' },
              { path: 'GHI_CHU', label: 'Ghi chú nguồn thu', dataType: 'TEXT', sampleValue: '' },
            ],
          },
          {
            path: 'PHUONG_AN.DANH_SACH_THU_NHAP',
            label: 'Danh sách thu nhập phương án (tiền tố PHUONG_AN)',
            dataType: 'LIST',
            isList: true,
          },
          {
            path: 'PHUONG_AN.DANH_SACH_THU_NHAP_GOP',
            label: 'Danh sách thu nhập gộp dạng văn bản (nối dấu ;)',
            dataType: 'TEXT',
            sampleValue: 'Thu nhập từ sản xuất nông nghiệp: 159.960.000 đ; Thu nhập từ chăn nuôi: 266.600.000 đ',
          },
        ],
      },
      {
        id: 'household_members',
        label: '13. Thành viên hộ gia đình (THANH_VIEN_HO.* & DANH_SACH_THANH_VIEN_HO)',
        description: 'Thông tin thành viên trong hộ gia đình khi tài sản thuộc diện Hộ và bảng lặp',
        fields: [
          { path: 'THANH_VIEN_HO.HO_TEN', label: 'Họ tên thành viên hộ (người đầu tiên)', dataType: 'TEXT', sampleValue: 'Nguyễn Văn An' },
          { path: 'THANH_VIEN_HO.DANH_XUNG', label: 'Danh xưng (Ông/Bà)', dataType: 'TEXT', sampleValue: 'Ông' },
          { path: 'THANH_VIEN_HO.NAM_SINH', label: 'Năm sinh', dataType: 'TEXT', sampleValue: '1985' },
          { path: 'THANH_VIEN_HO.GIOI_TINH', label: 'Giới tính (Nam/Nữ)', dataType: 'TEXT', sampleValue: 'Nam' },
          { path: 'THANH_VIEN_HO.SO_GIAY_TO', label: 'Số giấy tờ (CCCD/Căn cước)', dataType: 'TEXT', sampleValue: '084085001234' },
          { path: 'THANH_VIEN_HO.SO_CCCD', label: 'Số CCCD (alias)', dataType: 'TEXT', sampleValue: '084085001234' },
          { path: 'THANH_VIEN_HO.LOAI_GIAY_TO', label: 'Loại giấy tờ', dataType: 'TEXT', sampleValue: 'Căn cước công dân' },
          { path: 'THANH_VIEN_HO.NGAY_CAP', label: 'Ngày cấp (DD/MM/YYYY)', dataType: 'DATE', sampleValue: '15/05/2021' },
          { path: 'THANH_VIEN_HO.NOI_CAP', label: 'Nơi cấp giấy tờ', dataType: 'TEXT', sampleValue: 'Cục Cảnh sát QLHC về TTXH' },
          { path: 'THANH_VIEN_HO.DIA_CHI', label: 'Địa chỉ thường trú (người đầu tiên)', dataType: 'TEXT', sampleValue: 'Ấp Nô Lựa, Xã Nhị Trường' },
          { path: 'THANH_VIEN_HO.HO_TEN_GOP', label: 'Họ tên các thành viên gộp (nối dấu ;)', dataType: 'TEXT', sampleValue: 'Nguyễn Văn An; Trần Thị Bình' },
          { path: 'THANH_VIEN_HO.SO_GIAY_TO_GOP', label: 'Số CCCD các thành viên gộp (nối dấu ;)', dataType: 'TEXT', sampleValue: '084085001234; 084187005678' },
          { path: 'THANH_VIEN_HO.DANH_XUNG_HO_TEN_GOP', label: 'Danh xưng + Họ tên các thành viên gộp', dataType: 'TEXT', sampleValue: 'Ông: Nguyễn Văn An; Bà: Trần Thị Bình' },
          { path: 'THANH_VIEN_HO.DIA_CHI_GOP', label: 'Địa chỉ các thành viên gộp (nối dấu ;)', dataType: 'TEXT', sampleValue: 'Ấp Nô Lựa, Xã Nhị Trường; Ấp Ba Se, Xã Lương Hòa' },
          { path: 'THANH_VIEN_HO.THONG_TIN_CHI_TIET_GOP', label: 'Thông tin chi tiết pháp lý các thành viên gộp', dataType: 'TEXT', sampleValue: 'Ông: Nguyễn Văn An - CCCD số: 084085001234; Bà: Trần Thị Bình - CCCD số: 084187005678' },
          { path: 'KHOAN_VAY.CO_THANH_VIEN_HO', label: 'Khoản vay có thành viên hộ gia đình (True/False)', dataType: 'BOOLEAN', sampleValue: true },
          {
            path: 'DANH_SACH_THANH_VIEN_HO',
            label: 'Danh sách thành viên hộ gia đình (Khối lặp FOR/Bảng)',
            dataType: 'LIST',
            isList: true,
            itemFields: [
              { path: 'STT', label: 'Số thứ tự (1, 2, 3...)', dataType: 'NUMBER', sampleValue: 1 },
              { path: 'HO_TEN', label: 'Họ và tên thành viên hộ', dataType: 'TEXT', sampleValue: 'Nguyễn Văn An' },
              { path: 'DANH_XUNG', label: 'Danh xưng (Ông/Bà)', dataType: 'TEXT', sampleValue: 'Ông' },
              { path: 'NAM_SINH', label: 'Năm sinh', dataType: 'TEXT', sampleValue: '1985' },
              { path: 'GIOI_TINH', label: 'Giới tính (Nam/Nữ)', dataType: 'TEXT', sampleValue: 'Nam' },
              { path: 'SO_GIAY_TO', label: 'Số giấy tờ (CCCD/Căn cước)', dataType: 'TEXT', sampleValue: '084085001234' },
              { path: 'SO_CCCD', label: 'Số CCCD (alias)', dataType: 'TEXT', sampleValue: '084085001234' },
              { path: 'LOAI_GIAY_TO', label: 'Loại giấy tờ', dataType: 'TEXT', sampleValue: 'Căn cước công dân' },
              { path: 'NGAY_CAP', label: 'Ngày cấp (DD/MM/YYYY)', dataType: 'DATE', sampleValue: '15/05/2021' },
              { path: 'NOI_CAP', label: 'Nơi cấp giấy tờ', dataType: 'TEXT', sampleValue: 'Cục Cảnh sát QLHC về TTXH' },
              { path: 'DIA_CHI', label: 'Địa chỉ thường trú', dataType: 'TEXT', sampleValue: 'Ấp Nô Lựa, Xã Nhị Trường' },
            ],
          },
        ],
      },
      {
        id: 'officer',
        label: '7. Cán bộ lập hồ sơ / Đang đăng nhập (CAN_BO.*)',
        description: 'Thông tin cá nhân, giấy tờ căn cước của cán bộ đang đăng nhập thao tác trên hệ thống',
        fields: [
          { path: 'CAN_BO.HO_TEN', label: 'Họ và tên cán bộ', dataType: 'TEXT', sampleValue: 'Nguyễn Văn Cường' },
          { path: 'CAN_BO.HO_TEN_IN_HOA', label: 'Họ và tên cán bộ viết in hoa', dataType: 'TEXT', sampleValue: 'NGUYỄN VĂN CƯỜNG' },
          { path: 'CAN_BO.LOAI_GIAY_TO', label: 'Loại giấy tờ (Căn cước / Căn cước công dân)', dataType: 'TEXT', sampleValue: 'Căn cước công dân' },
          { path: 'CAN_BO.SO_GIAY_TO', label: 'Số giấy tờ / CCCD cán bộ', dataType: 'TEXT', sampleValue: '084090001234' },
          { path: 'CAN_BO.SO_CCCD', label: 'Số CCCD cán bộ (bí danh)', dataType: 'TEXT', sampleValue: '084090001234' },
          { path: 'CAN_BO.NOI_CAP', label: 'Nơi cấp giấy tờ cán bộ', dataType: 'TEXT', sampleValue: 'Cục Cảnh sát QLHC về TTXH' },
          { path: 'CAN_BO.NGAY_CAP', label: 'Ngày cấp giấy tờ (DD/MM/YYYY)', dataType: 'DATE', sampleValue: '10/05/2021' },
          { path: 'CAN_BO.NGAY_CAP_NGAY', label: 'Ngày cấp (chỉ số ngày)', dataType: 'TEXT', sampleValue: '10' },
          { path: 'CAN_BO.NGAY_CAP_THANG', label: 'Ngày cấp (chỉ số tháng)', dataType: 'TEXT', sampleValue: '05' },
          { path: 'CAN_BO.NGAY_CAP_NAM', label: 'Ngày cấp (chỉ số năm)', dataType: 'TEXT', sampleValue: '2021' },
          { path: 'CAN_BO.GIOI_TINH', label: 'Giới tính (Nam/Nữ)', dataType: 'TEXT', sampleValue: 'Nam' },
          { path: 'CAN_BO.NAM_SINH', label: 'Năm sinh cán bộ', dataType: 'TEXT', sampleValue: '1990' },
          { path: 'CAN_BO.DANH_XUNG', label: 'Danh xưng (Ông/Bà)', dataType: 'GENDER_TITLE', sampleValue: 'Ông' },
          { path: 'CAN_BO.XUNG_HO', label: 'Xưng hô (Ông/Bà)', dataType: 'TEXT', sampleValue: 'Ông' },
          { path: 'CAN_BO.CHUC_VU', label: 'Chức danh / Vai trò', dataType: 'TEXT', sampleValue: 'Cán bộ tín dụng' },
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
    areaGroups?: any[],
    currentUserInput?: any,
  ): {
    resolvedContext: Record<string, any>;
    warnings: KeywordValidationWarning[];
  } {
    const warnings: KeywordValidationWarning[] = [];
    const rawData = this.buildRawLoanData(loan, areaGroups, currentUserInput);

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
      let rawVal = this.getValueByPath(rawData.nested, dataPath);
      if ((rawVal === null || rawVal === undefined || rawVal === '') && rawData.flatVariables) {
        if ((rawData.flatVariables as any)[dataPath] !== undefined) {
          rawVal = (rawData.flatVariables as any)[dataPath];
        } else if ((rawData.flatVariables as any)[keyword] !== undefined) {
          rawVal = (rawData.flatVariables as any)[keyword];
        }
      }

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

      // Đồng thời cập nhật vào đối tượng lồng nhau nếu keyword chứa dấu chấm (vd: KHOAN_VAY.NGAY_DINH_GIA -> resolvedContext.KHOAN_VAY.NGAY_DINH_GIA)
      const dotIndex = keyword.indexOf('.');
      if (dotIndex !== -1) {
        const root = keyword.slice(0, dotIndex);
        const sub = keyword.slice(dotIndex + 1);
        if (resolvedContext[root] && typeof resolvedContext[root] === 'object' && !Array.isArray(resolvedContext[root])) {
          resolvedContext[root][sub] = resolvedContext[keyword];
        }
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
        isHousehold: false,
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
        isHousehold: false,
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
        isHousehold,
        fullName: heir?.fullName || '',
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
      isHousehold,
      fullName: member?.fullName || '',
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

  public buildRawLoanData(loan: any, areaGroupsInput?: any[], currentUserInput?: any) {
    const member = loan.member || {};
    const collaterals = loan.collaterals || [];
    const relatedPersons = loan.relatedPersons || [];
    const heir = loan.heir || null;
    const mortgage = loan.mortgageContract || null;
    const now = dayjs();
    const areaGroups: any[] = areaGroupsInput || loan.areaGroups || [];

    // Trích xuất thông tin cán bộ tạo hồ sơ vay (ưu tiên loan.createdBy nếu có) hoặc cán bộ truyền vào
    const loanCreator = loan.createdBy ? (loan.createdBy.profile ? loan.createdBy : null) : null;
    const currentUser = currentUserInput || loanCreator || loan.currentUser || loan.officer || null;
    const officerProfile = currentUser?.profile || currentUser?.user?.profile || currentUser || {};

    const canBoHoTen = (
      officerProfile.fullName ||
      currentUser?.fullName ||
      currentUser?.username ||
      ''
    ).trim();
    const canBoHoTenInHoa = canBoHoTen.toUpperCase();

    let canBoLoaiGiayTo = 'Căn cước công dân';
    const rawIdType = officerProfile.idType ? String(officerProfile.idType).trim() : '';
    if (rawIdType === 'CAN_CUOC' || rawIdType === 'Căn cước') {
      canBoLoaiGiayTo = 'Căn cước';
    } else if (rawIdType === 'CAN_CUOC_CONG_DAN' || rawIdType === 'Căn cước công dân') {
      canBoLoaiGiayTo = 'Căn cước công dân';
    } else if (rawIdType) {
      canBoLoaiGiayTo = rawIdType;
    }

    const canBoSoGiayTo = officerProfile.idNumber ? String(officerProfile.idNumber).trim() : '';
    const canBoNoiCap = officerProfile.idIssuePlace ? String(officerProfile.idIssuePlace).trim() : '';

    let canBoNgayCap = '';
    let canBoNgayCapNgay = '';
    let canBoNgayCapThang = '';
    let canBoNgayCapNam = '';

    if (officerProfile.idIssueDate) {
      const d = dayjs(officerProfile.idIssueDate);
      if (d.isValid()) {
        canBoNgayCap = d.format('DD/MM/YYYY');
        canBoNgayCapNgay = d.format('DD');
        canBoNgayCapThang = d.format('MM');
        canBoNgayCapNam = d.format('YYYY');
      } else if (typeof officerProfile.idIssueDate === 'string') {
        const rawDate = officerProfile.idIssueDate.trim();
        const parts = rawDate.split(/[-/]/);
        if (parts.length === 3) {
          if (parts[0].length === 4) {
            canBoNgayCapNam = parts[0];
            canBoNgayCapThang = parts[1].padStart(2, '0');
            canBoNgayCapNgay = parts[2].padStart(2, '0');
          } else {
            canBoNgayCapNgay = parts[0].padStart(2, '0');
            canBoNgayCapThang = parts[1].padStart(2, '0');
            canBoNgayCapNam = parts[2];
          }
          canBoNgayCap = `${canBoNgayCapNgay}/${canBoNgayCapThang}/${canBoNgayCapNam}`;
        } else {
          canBoNgayCap = rawDate;
        }
      }
    }

    let canBoGioiTinh = 'Nam';
    const rawGender = officerProfile.gender ? String(officerProfile.gender).trim() : '';
    if (rawGender === 'NU' || rawGender === 'Nữ' || rawGender.toLowerCase() === 'nu') {
      canBoGioiTinh = 'Nữ';
    } else if (rawGender === 'NAM' || rawGender === 'Nam' || rawGender.toLowerCase() === 'nam') {
      canBoGioiTinh = 'Nam';
    } else if (rawGender) {
      canBoGioiTinh = rawGender;
    }

    const canBoNamSinh = officerProfile.yearOfBirth ? String(officerProfile.yearOfBirth).trim() : '';
    const canBoDanhXung = canBoGioiTinh === 'Nữ' ? 'Bà' : 'Ông';
    const canBoChucVu =
      currentUser?.title ||
      (currentUser?.role === 'ADMIN' ? 'Quản trị hệ thống' : 'Cán bộ tín dụng');

    const canBoObject = {
      HO_TEN: canBoHoTen,
      HO_TEN_IN_HOA: canBoHoTenInHoa,
      HO_TEN_VIET_HOA: canBoHoTenInHoa,
      LOAI_GIAY_TO: canBoLoaiGiayTo,
      SO_GIAY_TO: canBoSoGiayTo,
      SO_CCCD: canBoSoGiayTo,
      NOI_CAP: canBoNoiCap,
      NOI_CAP_GIAY_TO: canBoNoiCap,
      NOI_CAP_CCCD: canBoNoiCap,
      NGAY_CAP: canBoNgayCap,
      NGAY_CAP_GIAY_TO: canBoNgayCap,
      NGAY_CAP_CCCD: canBoNgayCap,
      NGAY_CAP_NGAY: canBoNgayCapNgay,
      NGAY_CAP_THANG: canBoNgayCapThang,
      NGAY_CAP_NAM: canBoNgayCapNam,
      GIOI_TINH: canBoGioiTinh,
      NAM_SINH: canBoNamSinh,
      DANH_XUNG: canBoDanhXung,
      XUNG_HO: canBoDanhXung,
      CHUC_VU: canBoChucVu,
      VAI_TRO: canBoChucVu,
      fullName: canBoHoTen,
      idType: canBoLoaiGiayTo,
      idNumber: canBoSoGiayTo,
      idIssuePlace: canBoNoiCap,
      idIssueDate: canBoNgayCap,
      gender: canBoGioiTinh,
      yearOfBirth: canBoNamSinh,
      toString() {
        return canBoHoTen;
      },
    };

    // Xử lý phân nhóm địa bàn cấp Xã
    const effectiveAreaGroups =
      areaGroups && areaGroups.length > 0
        ? areaGroups
        : [
            { id: 'default-g1', code: 'NHOM_1', name: 'Nhóm 1', communeNames: ['Nhị Trường'] },
            { id: 'default-g2', code: 'NHOM_2', name: 'Nhóm 2', communeNames: ['Tập Sơn'] },
            { id: 'default-g3', code: 'NHOM_3', name: 'Nhóm 3', communeNames: ['Long Hiệp'] },
          ];

    const matchesGroup = (item: any, group: any): boolean => {
      if (!item || !group) return false;
      const itemCommuneId = item.communeId ? String(item.communeId) : '';
      const groupCommuneIds = (group.communeIds || []).map((id: any) => String(id));
      if (itemCommuneId && groupCommuneIds.includes(itemCommuneId)) {
        return true;
      }

      const groupCommuneNames: string[] = [];
      if (Array.isArray(group.communes)) {
        for (const c of group.communes) {
          if (c?.name) groupCommuneNames.push(c.name);
        }
      }
      if (Array.isArray(group.communeNames)) {
        for (const cn of group.communeNames) {
          if (cn) groupCommuneNames.push(cn);
        }
      }

      const itemCommuneName = (item.communeName || '').toLowerCase().trim();
      const itemAddress = (item.address || '').toLowerCase().trim();

      for (const cName of groupCommuneNames) {
        const rawC = cName.toLowerCase().replace(/^(xã|phường|thị trấn)\s+/i, '').trim();
        if (rawC.length >= 2) {
          if (itemCommuneName && (itemCommuneName.includes(rawC) || rawC.includes(itemCommuneName))) {
            return true;
          }
          if (itemAddress && itemAddress.includes(rawC)) {
            return true;
          }
        }
      }

      const groupNameClean = (group.name || '')
        .toLowerCase()
        .replace(/^(nhóm|vùng|khu vực)\s+/i, '')
        .trim();
      if (groupNameClean && groupNameClean.length >= 3 && itemAddress.includes(groupNameClean)) {
        return true;
      }

      return false;
    };

    // Kiểm tra nhóm cho từng tài sản và cho khoản vay
    const loanTargetItems = collaterals.length > 0 ? collaterals : (member ? [member] : []);
    const loanGroupConditions: Record<string, boolean> = {
      CO_TRONG_NHOM_1: false,
      CO_TRONG_NHOM_2: false,
      CO_TRONG_NHOM_3: false,
      CO_TRONG_NHOM_4: false,
      CO_TRONG_NHOM_5: false,
      CO_TAI_SAN_NHOM_1: false,
      CO_TAI_SAN_NHOM_2: false,
      CO_TAI_SAN_NHOM_3: false,
    };

    const allMatchedLoanGroups: any[] = [];

    effectiveAreaGroups.forEach((g: any, gIdx: number) => {
      const isMatched = loanTargetItems.some((it: any) => matchesGroup(it, g));
      if (isMatched && !allMatchedLoanGroups.some((mg) => mg.id === g.id || mg.code === g.code)) {
        allMatchedLoanGroups.push(g);
      }

      const codeKey = (g.code || `NHOM_${gIdx + 1}`).toUpperCase().trim();
      const numMatch = codeKey.match(/\d+/) || (g.name || '').match(/\d+/);
      const groupNum = numMatch ? numMatch[0] : String(gIdx + 1);

      loanGroupConditions[`CO_TRONG_NHOM_${groupNum}`] = isMatched;
      loanGroupConditions[`CO_TAI_SAN_NHOM_${groupNum}`] = isMatched;
      loanGroupConditions[`CO_TRONG_${codeKey}`] = isMatched;
      loanGroupConditions[`CO_TAI_SAN_${codeKey}`] = isMatched;
      loanGroupConditions[`CO_${codeKey}`] = isMatched;
    });

    const firstMatchedLoanGroup = allMatchedLoanGroups[0] || null;

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
      c.area ? `${formatAreaDisplay(c.area)} m²` : ''
    );
    const mergedActualAreas = mergeAssetValues(collaterals, (c: any) =>
      c.actualArea ? `${formatAreaDisplay(c.actualArea)} m²` : ''
    );
    const mergedAddresses = mergeAssetValues(collaterals, (c: any) => c.address);
    // Trích xuất thông tin chủ sở hữu từng tài sản
    const assetOwners = collaterals.map((c: any) => this.extractOwnerInfo(c, member, heir));

    // Lọc danh sách các chủ sở hữu duy nhất (unique)
    // Nếu tài sản thuộc loại NGUOI_VAY_VA_NGUOI_THUA_KE, bổ sung cả 2 người vào danh sách chủ sở hữu
    const uniqueOwnersMap = new Map<string, any>();
    const addOwner = (o: any) => {
      if (!o || !o.fullName) return;
      const baseName = (o.fullName || '').replace(/^Hộ\s+/i, '').trim().toLowerCase();
      const idKey = (o.idNumber || '').trim().toLowerCase();
      // Khóa định danh cá nhân duy nhất (dựa trên CCCD nếu có, hoặc tên không tiền tố "Hộ ")
      const personKey = idKey ? `id:${idKey}` : `name:${baseName}`;
      if (!personKey) return;

      const existing = uniqueOwnersMap.get(personKey);
      if (!existing) {
        uniqueOwnersMap.set(personKey, { ...o });
      } else {
        // Yêu cầu: Nếu có 2 tài sản (1 Hộ, 1 Cá nhân) cùng một người, biến danh xưng vẫn giữ nguyên là Hộ Ông / Bà theo giới tính
        if (o.isHousehold && !existing.isHousehold) {
          existing.isHousehold = true;
          existing.ownerType = o.ownerType;
          existing.genderTitle = o.genderTitle;
          existing.relationship = o.relationship;
        }
      }
    };

    collaterals.forEach((c: any) => {
      if (c.ownerType === 'NGUOI_VAY_VA_NGUOI_THUA_KE') {
        const borrowerOwner = this.extractOwnerInfo({ ownerType: 'NGUOI_VAY_CA_NHAN' }, member, heir);
        const heirOwner = this.extractOwnerInfo({ ownerType: 'NGUOI_THUA_KE_CA_NHAN' }, member, heir);
        [borrowerOwner, heirOwner].forEach((o) => addOwner(o));
      } else {
        const o = this.extractOwnerInfo(c, member, heir);
        addOwner(o);
      }
    });

    const mapOwnerItem = (o: any, idx: number) => {
      const idxNum = idx + 1;
      return {
        ...o,
        index: idxNum,
        _index: idxNum,
        _number: idxNum,
        STT: idxNum,
        stt: idxNum,
        fullName: o.fullName || '',
        ho_ten: o.fullName || '',
        HO_TEN: o.fullName || '',
        HO_TEN_IN_HOA: (o.fullName || '').toUpperCase(),
        HO_TEN_VIET_HOA: (o.fullName || '').toUpperCase(),
        HO_TEN_HOA: (o.fullName || '').toUpperCase(),
        ho_ten_in_hoa: (o.fullName || '').toUpperCase(),
        ho_ten_viet_hoa: (o.fullName || '').toUpperCase(),
        IN_HOA: (o.fullName || '').toUpperCase(),
        VIET_HOA: (o.fullName || '').toUpperCase(),
        gender: o.gender || '',
        gioi_tinh: o.gender || '',
        GIOI_TINH: o.gender || '',
        genderTitle: o.genderTitle || '',
        danh_xung: o.genderTitle || '',
        DANH_XUNG: o.genderTitle || '',
        xung_ho: o.genderTitle || '',
        XUNG_HO: o.genderTitle || '',
        idType: o.idType || '',
        loai_giay_to: o.idType || '',
        LOAI_GIAY_TO: o.idType || '',
        idNumber: o.idNumber || '',
        so_giay_to: o.idNumber || '',
        SO_GIAY_TO: o.idNumber || '',
        so_cccd: o.idNumber || '',
        SO_CCCD: o.idNumber || '',
        idIssueDate: o.idIssueDate || '',
        ngay_cap: o.idIssueDate || '',
        NGAY_CAP: o.idIssueDate || '',
        NGAY_CAP_CCCD: o.idIssueDate || '',
        idIssuePlace: o.idIssuePlace || '',
        noi_cap: o.idIssuePlace || '',
        NOI_CAP: o.idIssuePlace || '',
        noi_cap_cccd: o.idIssuePlace || '',
        NOI_CAP_CCCD: o.idIssuePlace || '',
        address: o.address || '',
        dia_chi: o.address || '',
        DIA_CHI: o.address || '',
        yearOfBirth: o.yearOfBirth ? String(o.yearOfBirth) : '',
        nam_sinh: o.yearOfBirth ? String(o.yearOfBirth) : '',
        NAM_SINH: o.yearOfBirth ? String(o.yearOfBirth) : '',
        relationship: o.relationship || '',
        quan_he: o.relationship || '',
        QUAN_HE: o.relationship || '',
        phoneNumber: o.phoneNumber || '',
        so_dien_thoai: o.phoneNumber || '',
        SO_DIEN_THOAI: o.phoneNumber || '',
      };
    };

    const uniqueOwnersList = Array.from(uniqueOwnersMap.values()).map(mapOwnerItem);

    // Xây dựng danh sách chủ sở hữu mở rộng (DANH_SACH_CHU_SO_HUU_VA_THUA_KE)
    // Quy tắc tự động:
    // 0. Trường hợp có người bảo lãnh trong vòng lặp -> Chỉ hiển thị duy nhất người bảo lãnh (không thêm người vay, không thêm người thừa kế)
    // 1. Nếu trong danh sách chủ sở hữu đã có 2 người trở lên -> Không thêm ai vào
    // 2. Nếu trong danh sách chủ sở hữu có người vay -> Tự thêm người thừa kế vào cuối (nếu có người thừa kế)
    // 3. Nếu trong danh sách chủ sở hữu có người thừa kế -> Tự thêm người vay vào cuối
    let extendedOwnersRaw: any[] = Array.from(uniqueOwnersMap.values()).map((o) => ({ ...o }));

    const hasGuarantorInOwners = extendedOwnersRaw.some((o: any) => o.ownerType === 'BAO_LANH');

    if (hasGuarantorInOwners) {
      // Trường hợp có người bảo lãnh: chỉ hiển thị duy nhất người bảo lãnh
      extendedOwnersRaw = extendedOwnersRaw.filter((o: any) => o.ownerType === 'BAO_LANH');
    } else {
      const hasBorrowerInOwners = extendedOwnersRaw.some((o: any) =>
        o.ownerType === 'NGUOI_VAY_CA_NHAN' ||
        o.ownerType === 'NGUOI_VAY_HO' ||
        (o.key && o.key.startsWith('MEMBER_')) ||
        (member?.idNumber && o.idNumber === member.idNumber) ||
        (member?.fullName && (o.fullName || '').replace(/^Hộ\s+/i, '').trim().toLowerCase() === member.fullName.trim().toLowerCase())
      );

      const hasHeirInOwners = extendedOwnersRaw.some((o: any) =>
        o.ownerType === 'NGUOI_THUA_KE_CA_NHAN' ||
        o.ownerType === 'NGUOI_THUA_KE_HO' ||
        (o.key && o.key.startsWith('HEIR_')) ||
        (heir?.idNumber && o.idNumber === heir.idNumber) ||
        (heir?.fullName && (o.fullName || '').replace(/^Hộ\s+/i, '').trim().toLowerCase() === heir.fullName.trim().toLowerCase())
      );

      const hasValidHeir = Boolean(heir && heir.fullName && heir.fullName.trim() !== '');

      if (extendedOwnersRaw.length >= 2) {
        // Đã có từ 2 người trở lên -> Không thêm ai vào
      } else if (hasBorrowerInOwners) {
        // Đã có người vay -> Tự thêm người thừa kế vào cuối (nếu có người thừa kế)
        if (hasValidHeir) {
          const heirOwner = this.extractOwnerInfo({ ownerType: 'NGUOI_THUA_KE_CA_NHAN' }, member, heir);
          extendedOwnersRaw.push(heirOwner);
        }
      } else if (hasHeirInOwners) {
        // Có người thừa kế -> Tự thêm người vay vào cuối
        if (member && member.fullName && member.fullName.trim()) {
          const borrowerOwner = this.extractOwnerInfo({ ownerType: 'NGUOI_VAY_CA_NHAN' }, member, heir);
          extendedOwnersRaw.push(borrowerOwner);
        }
      }
    }

    const extendedOwnersList = extendedOwnersRaw.map(mapOwnerItem);

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

    const firstOwner = uniqueOwnersList[0] || assetOwners[0] || this.extractOwnerInfo({ ownerType: 'NGUOI_VAY_CA_NHAN' }, member, heir);
    const firstOwnerBirthYear = firstOwner.yearOfBirth ? String(firstOwner.yearOfBirth) : '';
    const firstOwnerUpper = (firstOwner.fullName || '').toUpperCase();
    const firstOwnerObj = {
      ...firstOwner,
      fullName: firstOwner.fullName || '',
      ho_ten: firstOwner.fullName || '',
      HO_TEN: firstOwner.fullName || '',
      HO_TEN_IN_HOA: firstOwnerUpper,
      HO_TEN_VIET_HOA: firstOwnerUpper,
      HO_TEN_HOA: firstOwnerUpper,
      ho_ten_in_hoa: firstOwnerUpper,
      ho_ten_viet_hoa: firstOwnerUpper,
      IN_HOA: firstOwnerUpper,
      VIET_HOA: firstOwnerUpper,
      gender: firstOwner.gender || '',
      gioi_tinh: firstOwner.gender || '',
      GIOI_TINH: firstOwner.gender || '',
      genderTitle: firstOwner.genderTitle || '',
      XUNG_HO: firstOwner.genderTitle || '',
      DANH_XUNG: firstOwner.genderTitle || '',
      danh_xung: firstOwner.genderTitle || '',
      xung_ho: firstOwner.genderTitle || '',
      LOAI_GIAY_TO: firstOwner.idType || '',
      loai_giay_to: firstOwner.idType || '',
      SO_GIAY_TO: firstOwner.idNumber || '',
      so_giay_to: firstOwner.idNumber || '',
      SO_CCCD: firstOwner.idNumber || '',
      so_cccd: firstOwner.idNumber || '',
      NGAY_CAP: firstOwner.idIssueDate || '',
      ngay_cap: firstOwner.idIssueDate || '',
      NGAY_CAP_CCCD: firstOwner.idIssueDate || '',
      NOI_CAP: firstOwner.idIssuePlace || '',
      noi_cap: firstOwner.idIssuePlace || '',
      NOI_CAP_CCCD: firstOwner.idIssuePlace || '',
      DIA_CHI: firstOwner.address || '',
      dia_chi: firstOwner.address || '',
      NAM_SINH: firstOwnerBirthYear,
      nam_sinh: firstOwnerBirthYear,
      QUAN_HE: firstOwner.relationship || '',
      quan_he: firstOwner.relationship || '',
      SO_DIEN_THOAI: (firstOwner as any).phoneNumber || '',
      so_dien_thoai: (firstOwner as any).phoneNumber || '',
    };

    const secondOwner = uniqueOwnersList[1] || null;
    const hasSecondOwner = Boolean(secondOwner && secondOwner.fullName && secondOwner.fullName.trim() !== '');
    const secondOwnerUpper = (secondOwner?.fullName || '').toUpperCase();
    const secondOwnerObj = secondOwner
      ? {
          ...secondOwner,
          fullName: secondOwner.fullName || '',
          ho_ten: secondOwner.fullName || '',
          HO_TEN: secondOwner.fullName || '',
          HO_TEN_IN_HOA: secondOwnerUpper,
          HO_TEN_VIET_HOA: secondOwnerUpper,
          HO_TEN_HOA: secondOwnerUpper,
          ho_ten_in_hoa: secondOwnerUpper,
          ho_ten_viet_hoa: secondOwnerUpper,
          IN_HOA: secondOwnerUpper,
          VIET_HOA: secondOwnerUpper,
          gender: secondOwner.gender || '',
          genderTitle: secondOwner.genderTitle || '',
          XUNG_HO: secondOwner.genderTitle || '',
          DANH_XUNG: secondOwner.genderTitle || '',
          danh_xung: secondOwner.genderTitle || '',
          LOAI_GIAY_TO: secondOwner.idType || '',
          loai_giay_to: secondOwner.idType || '',
          SO_GIAY_TO: secondOwner.idNumber || '',
          so_giay_to: secondOwner.idNumber || '',
          SO_CCCD: secondOwner.idNumber || '',
          so_cccd: secondOwner.idNumber || '',
          NGAY_CAP: secondOwner.idIssueDate || '',
          ngay_cap: secondOwner.idIssueDate || '',
          NOI_CAP: secondOwner.idIssuePlace || '',
          noi_cap: secondOwner.idIssuePlace || '',
          DIA_CHI: secondOwner.address || '',
          dia_chi: secondOwner.address || '',
          NAM_SINH: secondOwner.yearOfBirth ? String(secondOwner.yearOfBirth) : '',
          nam_sinh: secondOwner.yearOfBirth ? String(secondOwner.yearOfBirth) : '',
          QUAN_HE: secondOwner.relationship || '',
          quan_he: secondOwner.relationship || '',
        }
      : {
          fullName: '',
          ho_ten: '',
          HO_TEN: '',
          HO_TEN_IN_HOA: '',
          HO_TEN_VIET_HOA: '',
          HO_TEN_HOA: '',
          ho_ten_in_hoa: '',
          ho_ten_viet_hoa: '',
          IN_HOA: '',
          VIET_HOA: '',
          gender: '',
          genderTitle: '',
          XUNG_HO: '',
          DANH_XUNG: '',
          danh_xung: '',
          LOAI_GIAY_TO: '',
          loai_giay_to: '',
          SO_GIAY_TO: '',
          so_giay_to: '',
          SO_CCCD: '',
          so_cccd: '',
          NGAY_CAP: '',
          ngay_cap: '',
          NOI_CAP: '',
          noi_cap: '',
          DIA_CHI: '',
          dia_chi: '',
          NAM_SINH: '',
          nam_sinh: '',
          QUAN_HE: '',
          quan_he: '',
        };

    // 1. Xác định danh xưng khoản vay (KHOAN_VAY.DANH_XUNG)
    // - Tài sản là 1 người: căn cứ vào giới tính mà ghi là Ông/Bà/Hộ Ông/Hộ Bà + : + Tên của họ (ví dụ: Ông: Lê Văn A)
    // - Tài sản là từ 2 người khác nhau: hiển thị là Ông (Bà): + Tên 1 + Tên 2 (ví dụ: Ông (Bà): Nguyễn A + Nguyễn Thị B). Nếu Hộ thì Hộ Ông (Bà).
    let loanDanhXung = '';
    if (uniqueOwnersList.length === 1) {
      const o = uniqueOwnersList[0];
      const isHousehold = o.isHousehold || (o.genderTitle && o.genderTitle.includes('Hộ'));
      let title = o.genderTitle;
      if (!title || title === 'Đồng sở hữu') {
        const isMale = o.gender === 'NAM' || o.gender === 'Nam';
        title = isHousehold ? (isMale ? 'Hộ Ông' : 'Hộ Bà') : (isMale ? 'Ông' : 'Bà');
      }
      const cleanName = (o.fullName || '').replace(/^Hộ\s+/i, '').trim();
      loanDanhXung = `${title}: ${cleanName}`;
    } else if (uniqueOwnersList.length >= 2) {
      const isAnyHousehold = uniqueOwnersList.some(
        (o: any) => o.isHousehold || (o.genderTitle && o.genderTitle.includes('Hộ'))
      );
      const prefix = isAnyHousehold ? 'Hộ Ông (Bà): ' : 'Ông (Bà): ';
      const cleanNames = uniqueOwnersList
        .map((o: any) => (o.fullName || '').replace(/^Hộ\s+/i, '').trim())
        .filter(Boolean);
      loanDanhXung = `${prefix}${cleanNames.join(' + ')}`;
    } else {
      const isMale = member?.gender === 'NAM' || member?.gender === 'Nam';
      const memberTitle = isMale ? 'Ông' : 'Bà';
      const cleanMemberName = (member?.fullName || '').trim();
      loanDanhXung = cleanMemberName ? `${memberTitle}: ${cleanMemberName}` : '';
    }

    // 2. Xác định các tài sản ở khác địa chỉ (TAI_SAN.IS_KHAC_DIA_CHI)
    // Nếu có nhiều tài sản và các tài sản ở khác địa chỉ:
    // (ví dụ 1 cái chỉ có địa chỉ ở cấp Xã, 1 cái thì địa chỉ ở cấp Ấp thì cũng tính là khác địa chỉ)
    const normalizeAddrStr = (str: string) =>
      str ? str.trim().toLowerCase().replace(/\s+/g, ' ') : '';

    const getCollateralAddressKey = (c: any) => {
      const fullAddr = normalizeAddrStr(c?.address || '');
      const hamlet = normalizeAddrStr(c?.hamletName || '');
      const commune = normalizeAddrStr(c?.communeName || '');
      const province = normalizeAddrStr(c?.provinceName || '');
      const detail = normalizeAddrStr(c?.addressDetail || '');
      return `${fullAddr}|h:${hamlet}|c:${commune}|p:${province}|d:${detail}`;
    };

    const uniqueAddressKeys = new Set(collaterals.map(getCollateralAddressKey));
    const isKhacDiaChi = collaterals.length > 1 && uniqueAddressKeys.size > 1;

    // 3. Kiểm tra số khế ước có giống với số hợp đồng thế chấp không
    const soKheUoc = (loan.contractNumber || '').trim();
    const soHdTheChap = (mortgage?.contractNumber || '').trim();
    const isSoKheUocGiongSoHdTheChap = Boolean(
      soKheUoc && soHdTheChap && soKheUoc.toLowerCase() === soHdTheChap.toLowerCase()
    );

    // 4. Xử lý danh sách Định giá khoản vay (KHOAN_VAY.DANH_SACH_DINH_GIA & các trường liên quan)
    const rawValuations = Array.isArray(loan.valuations)
      ? loan.valuations
      : Array.isArray(loan.loanValuations)
      ? loan.loanValuations
      : loan.loanValuation
      ? [loan.loanValuation]
      : [];
    const valuationsList = rawValuations.map((v: any, index: number) => {
      const vType = v.valuationType;
      const vTypeLabel = (VALUATION_TYPE_LABELS as any)[vType] || vType;
      const vDateFormatted = v.valuationDate ? dayjs(v.valuationDate).format('DD/MM/YYYY') : '';
      const sheetNumber = String(v.sheetNumber ?? '');
      const plotNumber = String(v.plotNumber ?? '');
      const areaNum = Number(v.area) || 0;
      const actualAreaNum = v.actualArea !== undefined && v.actualArea !== null ? Number(v.actualArea) : null;
      const pricePerSqMeterNum = Number(v.pricePerSqMeter) || 0;

      const effArea = actualAreaNum && actualAreaNum > 0 ? actualAreaNum : areaNum;
      const computedBeforeRound =
        v.totalPriceBeforeRound !== undefined && v.totalPriceBeforeRound !== null
          ? Number(v.totalPriceBeforeRound)
          : Math.round(effArea * pricePerSqMeterNum);

      const rawPrice =
        v.totalPrice !== undefined && v.totalPrice !== null
          ? v.totalPrice
          : v.totalValuationPrice !== undefined && v.totalValuationPrice !== null
          ? v.totalValuationPrice
          : computedBeforeRound;

      const flooredPrice = Math.floor(Number(rawPrice) / 1_000_000) * 1_000_000;

      const areaFormatted = formatAreaDisplay(areaNum);
      const actualAreaFormatted = actualAreaNum !== null ? formatAreaDisplay(actualAreaNum) : '';
      const pricePerSqMeterFormatted = pricePerSqMeterNum.toLocaleString('vi-VN');
      const totalPriceBeforeRoundFormatted = computedBeforeRound.toLocaleString('vi-VN');
      const totalPriceFormatted = flooredPrice.toLocaleString('vi-VN');
      const totalPriceWords = vndToWords(flooredPrice);

      const isTheoNghiDinhQuy = vType === 'THEO_NGHI_DINH_QUY';
      const isTheoNghiDinhQuyCu = vType === 'THEO_NGHI_DINH_QUY_CU';
      const isTheoGiaThiTruong = vType === 'THEO_GIA_THI_TRUONG';
      const isTheoGiaThiTruongVaNghiDinhQuy = vType === 'THEO_GIA_THI_TRUONG_VA_NGHI_DINH_QUY';

      // Tìm các tài sản cấu thành nhóm này
      const groupCollaterals = (v.collaterals && v.collaterals.length > 0)
        ? v.collaterals
        : (loan.collaterals || []).filter((c: any) => {
            const ids = Array.isArray(v.collateralIds) ? v.collateralIds : [];
            return ids.includes(c.id) || v.collateralId === c.id;
          });

      const collateralsListInGroup = groupCollaterals.map((c: any, cIdx: number) => {
        const cArea = Number(c.area) || 0;
        const cActualArea = c.actualArea !== null && c.actualArea !== undefined ? Number(c.actualArea) : null;
        const cEffArea = cActualArea && cActualArea > 0 ? cActualArea : cArea;
        const cValAmount = Math.floor(Math.round(cEffArea * pricePerSqMeterNum) / 1_000_000) * 1_000_000;

        return {
          _index: cIdx,
          _number: cIdx + 1,
          _first: cIdx === 0,
          _last: cIdx === groupCollaterals.length - 1,
          _length: groupCollaterals.length,
          id: c.id,
          MA_TAI_SAN: c.assetCode || '',
          assetCode: c.assetCode || '',
          SO_GCN: c.certificateNumber || '',
          certificateNumber: c.certificateNumber || '',
          SO_TO: String(c.sheetNumber ?? ''),
          sheetNumber: String(c.sheetNumber ?? ''),
          SO_THUA: String(c.plotNumber ?? ''),
          plotNumber: String(c.plotNumber ?? ''),
          DIEN_TICH: formatAreaDisplay(cArea),
          DIEN_TICH_SO: formatAreaDisplay(cArea),
          area: formatAreaDisplay(cArea),
          areaNumber: cArea,
          DIEN_TICH_THUC_TE: cActualArea !== null ? formatAreaDisplay(cActualArea) : '',
          DIEN_TICH_THUC_TE_SO: cActualArea !== null ? formatAreaDisplay(cActualArea) : '',
          actualArea: cActualArea !== null ? formatAreaDisplay(cActualArea) : '',
          actualAreaNumber: cActualArea,
          DON_GIA: pricePerSqMeterFormatted,
          DON_GIA_SO: pricePerSqMeterNum,
          GIA_TRI_DINH_GIA: cValAmount.toLocaleString('vi-VN'),
          GIA_TRI_DINH_GIA_SO: cValAmount.toLocaleString('vi-VN'),
          GIA_TRI_DINH_GIA_RAW: cValAmount,
          DIA_CHI: c.address || '',
          address: c.address || '',
          CHU_SO_HUU: c.ownerName || '',
          ownerName: c.ownerName || '',
          CHU_SO_HUU_1: firstOwner.fullName,
          CHU_SO_HUU_2: secondOwnerObj.HO_TEN,
          CHU_SO_HUU_THU_HAI: secondOwnerObj.HO_TEN,
          CO_CHU_SO_HUU_2: hasSecondOwner,
        };
      });

      return {
        _index: index,
        _number: index + 1,
        _first: index === 0,
        _last: index === rawValuations.length - 1,
        _length: rawValuations.length,
        id: v.id,
        ID: v.id,
        collateralId: v.collateralId || '',
        collateralIds: v.collateralIds || [],
        LOAI_DINH_GIA: vTypeLabel,
        valuationType: vType,
        valuationTypeLabel: vTypeLabel,
        NGAY_DINH_GIA: vDateFormatted,
        valuationDate: vDateFormatted,
        SO_TO: sheetNumber,
        sheetNumber,
        sheet_no: sheetNumber,
        SO_THUA: plotNumber,
        plotNumber,
        plot_no: plotNumber,
        DIEN_TICH: areaFormatted,
        DIEN_TICH_SO: areaNum,
        area: areaFormatted,
        areaNumber: areaNum,
        DIEN_TICH_THUC_TE: actualAreaFormatted,
        DIEN_TICH_THUC_TE_SO: actualAreaNum,
        actualArea: actualAreaFormatted,
        actualAreaNumber: actualAreaNum,
        DON_GIA: pricePerSqMeterFormatted,
        DON_GIA_SO: pricePerSqMeterNum,
        pricePerSqMeter: pricePerSqMeterFormatted,
        pricePerSqMeterNumber: pricePerSqMeterNum,
        GIA_TIEN_TRUOC_LAM_TRON: totalPriceBeforeRoundFormatted,
        GIA_TIEN_TRUOC_LAM_TRON_SO: totalPriceBeforeRoundFormatted,
        GIA_TIEN_TRUOC_LAM_TRON_RAW: computedBeforeRound,
        totalPriceBeforeRound: totalPriceBeforeRoundFormatted,
        totalPriceBeforeRoundNumber: computedBeforeRound,
        GIA_TIEN: totalPriceFormatted,
        GIA_TIEN_SO: totalPriceFormatted,
        GIA_TIEN_RAW: flooredPrice,
        GIA_TIEN_CHU: totalPriceWords,
        totalPrice: totalPriceFormatted,
        totalPriceNumber: flooredPrice,
        totalPriceWords,
        GHI_CHU: v.notes || v.note || '',
        ghi_chu: v.notes || v.note || '',
        GHI_CHU_DINH_GIA: v.notes || v.note || '',
        note: v.notes || v.note || '',
        notes: v.notes || v.note || '',
        NOTE: v.notes || v.note || '',
        NOTES: v.notes || v.note || '',
        price_per_m2: pricePerSqMeterFormatted,
        total_value: totalPriceFormatted,
        SO_LUONG_TAI_SAN: groupCollaterals.length,
        collateralCount: groupCollaterals.length,
        DANH_SACH_TAI_SAN: collateralsListInGroup,
        collaterals: collateralsListInGroup,
        collateralsList: collateralsListInGroup,
        // Boolean flags cho từng dòng
        LA_NGHI_DINH_QUY: isTheoNghiDinhQuy,
        LA_NGHI_DINH_QUY_CU: isTheoNghiDinhQuyCu,
        LA_GIA_THI_TRUONG: isTheoGiaThiTruong,
        LA_GIA_THI_TRUONG_VA_NGHI_DINH_QUY: isTheoGiaThiTruongVaNghiDinhQuy,
        isTheoNghiDinhQuy,
        isTheoNghiDinhQuyCu,
        isTheoGiaThiTruong,
        isTheoGiaThiTruongVaNghiDinhQuy,
      };
    });

    const valuationCount = valuationsList.length;
    const hasValuations = valuationCount > 0;
    const uniqueValuationDates: string[] = Array.from(new Set(valuationsList.map((v: any) => String(v.NGAY_DINH_GIA || '')).filter(Boolean)));
    const loanValuationDate: string = uniqueValuationDates.length > 0
      ? (uniqueValuationDates.length === 1 ? uniqueValuationDates[0] : uniqueValuationDates.join(', '))
      : (loan.valuationDate ? dayjs(loan.valuationDate).format('DD/MM/YYYY') : '');

    let valuationDay = '';
    let valuationMonth = '';
    let valuationYear = '';
    if (loanValuationDate && loanValuationDate.includes('/')) {
      const parts = loanValuationDate.split('/');
      if (parts.length >= 3) {
        valuationDay = parts[0].trim();
        valuationMonth = parts[1].trim();
        valuationYear = parts[2].split(',')[0].trim();
      }
    }

    const uniqueValuationTypes = Array.from(new Set(valuationsList.map((v: any) => v.LOAI_DINH_GIA).filter(Boolean)));
    const loanValuationType = uniqueValuationTypes.length === 1 ? uniqueValuationTypes[0] : '';

    const totalValuationPrice = valuationsList.reduce(
      (sum: number, v: any) =>
        sum + (Number(v.GIA_TIEN_RAW || v.totalPriceNumber || v.totalPrice || v.totalValuationPrice || 0) || 0),
      0
    );
    const totalValuationPriceFormatted = totalValuationPrice.toLocaleString('vi-VN');
    const totalValuationPriceWords = vndToWords(totalValuationPrice);

    const hasValuationTheoNghiDinhQuy = valuationsList.some((v: any) => v.LA_NGHI_DINH_QUY);
    const hasValuationTheoNghiDinhQuyCu = valuationsList.some((v: any) => v.LA_NGHI_DINH_QUY_CU);
    const hasValuationTheoGiaThiTruong = valuationsList.some((v: any) => v.LA_GIA_THI_TRUONG);
    const hasValuationTheoGiaThiTruongVaNghiDinhQuy = valuationsList.some((v: any) => v.LA_GIA_THI_TRUONG_VA_NGHI_DINH_QUY);

    // Trích xuất Đơn giá thị trường của khoản vay (khoản vay áp dụng mức giá thị trường)
    const marketValuation =
      valuationsList.find(
        (v: any) => v.LA_GIA_THI_TRUONG || v.LA_GIA_THI_TRUONG_VA_NGHI_DINH_QUY
      ) ||
      (valuationsList.length === 1 ? valuationsList[0] : null);

    const marketPriceNum = marketValuation
      ? Number(marketValuation.DON_GIA_SO || 0)
      : (firstCollateral?.pricePerSqMeter ? Number(firstCollateral.pricePerSqMeter) : 0);

    const donGiaThiTruongFormatted = marketPriceNum > 0 ? `${marketPriceNum.toLocaleString('vi-VN')}đ` : '';
    const donGiaThiTruongWithSpace = marketPriceNum > 0 ? `${marketPriceNum.toLocaleString('vi-VN')} đ` : '';
    const donGiaThiTruongNoUnit = marketPriceNum > 0 ? marketPriceNum.toLocaleString('vi-VN') : '';

    // Tính toán 70% tổng giá trị định giá và làm tròn xuống
    const fallbackDirectValuation = Number(
      loan.totalValuationPrice || loan.loanValuation?.totalValuationPrice || 0
    );
    const effectiveTotalValuation =
      totalValuationPrice > 0
        ? totalValuationPrice
        : totalCollateralValuationRounded > 0
        ? totalCollateralValuationRounded
        : fallbackDirectValuation;
    const rawValuation70 = effectiveTotalValuation * 0.7;
    let valuation70Rounded = Math.floor(rawValuation70 / 1_000_000) * 1_000_000;
    if (valuation70Rounded === 0 && rawValuation70 > 0) {
      valuation70Rounded = Math.floor(rawValuation70);
    }
    const valuation70Formatted = `${valuation70Rounded.toLocaleString('vi-VN')} đ`;
    const valuation70NumberFormatted = valuation70Rounded.toLocaleString('vi-VN');
    const valuation70Words = vndToWords(valuation70Rounded);


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

    // Xác định cờ có người thừa kế linh hoạt:
    // 1. Hồ sơ có khai báo người thừa kế (bước 3)
    // 2. Hoặc đối với loại vay thế chấp: có tài sản bảo đảm đứng tên Người thừa kế / Người vay và người thừa kế
    const hasValidDeclaredHeir = Boolean(
      heir &&
      heir.fullName &&
      String(heir.fullName).trim().length > 0
    );
    const hasHeirOwnerInCollaterals = Boolean(isOwnerHeir || isBothBorrowerAndHeirOwner);
    const coNguoiThuaKe = Boolean(hasValidDeclaredHeir || hasHeirOwnerInCollaterals);

    
    const mergedIssueDates = mergeAssetValues(collaterals, (c: any) =>
      c.issueDate ? dayjs(c.issueDate).format('DD/MM/YYYY') : ''
    );
    const mergedIssuePlaces = mergeAssetValues(collaterals, (c: any) => c.issuePlace);
    const mergedUsagePurposes = mergeAssetValues(collaterals, (c: any) => c.usagePurpose);
    const mergedUsageDurations = mergeAssetValues(collaterals, (c: any) => c.usageDuration);
    const mergedUsageForms = this.formatMergedUsageForms(collaterals);
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
    const mergedCertificateClauses = this.formatMergedCertificateClauses(collaterals);
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

    // Chuẩn bị danh sách tài sản lặp (DANH_SACH_TAI_SAN)
    // Quy tắc gộp theo địa chỉ:
    // 1. Các tài sản có cùng địa chỉ (không phân biệt hoa/thường, khoảng trắng) được gộp vào chung 1 ô/phần tử lặp (index 0, index 1...)
    // 2. Trong mỗi phần tử lặp, các thông tin (Mã, Số thửa, Số tờ, Số GCN, Diện tích...) được gộp phân cách bởi dấu "; " (giống quy tắc tài sản gộp TAI_SAN.*_GOP)
    // 3. Các tài sản có địa chỉ khác nhau sẽ được tách sang các phần tử (index) kế tiếp
    // 4. Nếu không khai báo địa chỉ, mỗi tài sản giữ nhóm riêng biệt để tránh gộp ngoài ý muốn
    const addressGroupsMap = new Map<string, any[]>();
    let emptyAddressCounter = 0;
    for (const c of collaterals) {
      const rawAddr = (c.address || '').trim().replace(/\s+/g, ' ');
      const groupKey = rawAddr ? rawAddr.toLowerCase() : `__unspecified_addr_${emptyAddressCounter++}`;
      if (!addressGroupsMap.has(groupKey)) {
        addressGroupsMap.set(groupKey, []);
      }
      addressGroupsMap.get(groupKey)!.push(c);
    }

    const addressGroupList = Array.from(addressGroupsMap.values());
    const totalGroups = addressGroupList.length;

    const collateralsList = addressGroupList.map((groupCollaterals: any[], groupIdx: number) => {
      const idxNum = groupIdx + 1;

      // Gộp các giá trị bằng mergeAssetValues
      const assetCode = mergeAssetValues(groupCollaterals, (c: any) => c.assetCode);
      const assetType = mergeAssetValues(groupCollaterals, (c: any) => this.formatAssetType(c.assetType));
      const assetName = mergeAssetValues(groupCollaterals, (c: any) => c.assetName || this.formatAssetType(c.assetType));
      const certType = mergeAssetValues(groupCollaterals, (c: any) => this.formatCertificateType(c.certificateType), 'GCN');
      const certNumber = mergeAssetValues(groupCollaterals, (c: any) => c.certificateNumber);
      const issueBookNumber = mergeAssetValues(groupCollaterals, (c: any) => c.issueBookNumber);
      const sheetNumber = mergeAssetValues(groupCollaterals, (c: any) => c.sheetNumber);
      const plotNumber = mergeAssetValues(groupCollaterals, (c: any) => c.plotNumber);
      const address = mergeAssetValues(groupCollaterals, (c: any) => c.address);

      // Cụm câu số vào sổ cấp GCN
      const certClause = this.formatMergedCertificateClauses(groupCollaterals);

      // Phân nhóm địa bàn cho nhóm tài sản này
      const itemMatchedGroups = effectiveAreaGroups.filter((g: any) =>
        groupCollaterals.some((c: any) => matchesGroup(c, g))
      );
      const itemFirstGroup = itemMatchedGroups[0] || null;
      const itemGroupConditions: Record<string, boolean> = {
        CO_TRONG_NHOM_1: false,
        CO_TRONG_NHOM_2: false,
        CO_TRONG_NHOM_3: false,
        CO_TRONG_NHOM_4: false,
        CO_TRONG_NHOM_5: false,
        CO_TAI_SAN_NHOM_1: false,
        CO_TAI_SAN_NHOM_2: false,
        CO_TAI_SAN_NHOM_3: false,
      };

      effectiveAreaGroups.forEach((g: any, gIdx: number) => {
        const isMatched = groupCollaterals.some((c: any) => matchesGroup(c, g));
        const codeKey = (g.code || `NHOM_${gIdx + 1}`).toUpperCase().trim();
        const numMatch = codeKey.match(/\d+/) || (g.name || '').match(/\d+/);
        const groupNum = numMatch ? numMatch[0] : String(gIdx + 1);

        itemGroupConditions[`CO_TRONG_NHOM_${groupNum}`] = isMatched;
        itemGroupConditions[`CO_TAI_SAN_NHOM_${groupNum}`] = isMatched;
        itemGroupConditions[`CO_NHOM_${groupNum}`] = isMatched;
        itemGroupConditions[`CO_TRONG_${codeKey}`] = isMatched;
        itemGroupConditions[`CO_TAI_SAN_${codeKey}`] = isMatched;
      });

      // Diện tích và định giá
      const groupAreaSum = groupCollaterals.reduce((sum, c) => sum + (Number(c.area) || 0), 0);
      const area = mergeAssetValues(groupCollaterals, (c: any) =>
        c.area ? `${formatAreaDisplay(c.area)} m²` : ''
      );
      const actualArea = mergeAssetValues(groupCollaterals, (c: any) =>
        c.actualArea ? `${formatAreaDisplay(c.actualArea)} m²` : ''
      );
      const pricePerSqMeter = mergeAssetValues(groupCollaterals, (c: any) =>
        c.pricePerSqMeter ? `${Number(c.pricePerSqMeter).toLocaleString('vi-VN')} đ` : ''
      );
      const groupValSum = groupCollaterals.reduce((sum, c) => sum + (Number(c.valuationAmount) || 0), 0);
      const valuationAmount = mergeAssetValues(groupCollaterals, (c: any) =>
        c.valuationAmount ? `${Number(c.valuationAmount).toLocaleString('vi-VN')} đ` : ''
      );

      // Mục đích, thời hạn, hình thức, hạn chế sử dụng
      const usagePurpose = mergeAssetValues(groupCollaterals, (c: any) => c.usagePurpose);
      const usageDuration = mergeAssetValues(groupCollaterals, (c: any) => c.usageDuration);
      const usageForm = this.formatMergedUsageForms(groupCollaterals);
      const restrictions = mergeAssetValues(groupCollaterals, (c: any) => c.useRestrictions, '...................');
      const origin = mergeAssetValues(groupCollaterals, (c: any) => c.origin);

      // Nơi cấp, ngày cấp
      const issuePlace = mergeAssetValues(groupCollaterals, (c: any) => c.issuePlace);
      const issueDate = mergeAssetValues(groupCollaterals, (c: any) =>
        c.issueDate ? dayjs(c.issueDate).format('DD/MM/YYYY') : ''
      );

      // Thông tin chủ sở hữu của nhóm tài sản
      const groupOwners = groupCollaterals.map((c: any) => this.extractOwnerInfo(c, member, heir));
      const ownerFullName = mergeAssetValues(groupOwners, (o: any) => o.fullName);
      const ownerGenderTitle = mergeAssetValues(groupOwners, (o: any) => o.genderTitle);
      const ownerIdType = mergeAssetValues(groupOwners, (o: any) => o.idType);
      const ownerIdNumber = mergeAssetValues(groupOwners, (o: any) => o.idNumber);
      const ownerIdIssueDate = mergeAssetValues(groupOwners, (o: any) => o.idIssueDate);
      const ownerIdIssuePlace = mergeAssetValues(groupOwners, (o: any) => o.idIssuePlace);
      const ownerAddress = mergeAssetValues(groupOwners, (o: any) => o.address);
      const ownerYearOfBirth = mergeAssetValues(groupOwners, (o: any) => o.yearOfBirth);
      const ownerRelationship = mergeAssetValues(groupOwners, (o: any) => o.relationship);

      // Thành viên hộ của nhóm tài sản
      const groupHMembersMap = new Map<string, any>();
      for (const c of groupCollaterals) {
        const cMembersRaw = Array.isArray(c.householdMembers) ? c.householdMembers : [];
        for (const hm of cMembersRaw) {
          const key = (hm.idNumber || hm.fullName || '').trim().toLowerCase();
          if (key && !groupHMembersMap.has(key)) {
            groupHMembersMap.set(key, hm);
          }
        }
      }
      const cHouseholdMembers = Array.from(groupHMembersMap.values()).map((hm: any, hIdx: number) => {
        const hIdxNum = hIdx + 3;
        const hFullName = (hm.fullName || '').trim();
        const hIsNam = hm.gender === 'NAM';
        const hGender = hIsNam ? 'Nam' : 'Nữ';
        const hGenderTitle = hIsNam ? 'Ông' : 'Bà';
        const hYearOfBirth = hm.yearOfBirth ? String(hm.yearOfBirth) : '';
        const hIdType = this.formatIdType(hm.idType);
        const hIdNumber = (hm.idNumber || '').trim();
        const hIdIssueDate = hm.idIssueDate ? dayjs(hm.idIssueDate).format('DD/MM/YYYY') : '';
        const hIdIssuePlace = (hm.idIssuePlace || '').trim();
        const hDetail = `${hGenderTitle}: ${hFullName}${hYearOfBirth ? ` (sinh năm: ${hYearOfBirth})` : ''} - ${hIdType} số: ${hIdNumber}${hIdIssueDate ? `, cấp ngày: ${hIdIssueDate}` : ''}${hIdIssuePlace ? ` tại ${hIdIssuePlace}` : ''}`;
        return {
          index: hIdxNum,
          _index: hIdxNum,
          _number: hIdxNum,
          STT: hIdxNum,
          stt: hIdxNum,
          fullName: hFullName,
          ho_ten: hFullName,
          HO_TEN: hFullName,
          TEN: hFullName,
          ten: hFullName,
          gender: hGender,
          gioi_tinh: hGender,
          GIOI_TINH: hGender,
          genderTitle: hGenderTitle,
          danh_xung: hGenderTitle,
          DANH_XUNG: hGenderTitle,
          xung_ho: hGenderTitle,
          XUNG_HO: hGenderTitle,
          yearOfBirth: hYearOfBirth,
          nam_sinh: hYearOfBirth,
          NAM_SINH: hYearOfBirth,
          idType: hIdType,
          loai_giay_to: hIdType,
          LOAI_GIAY_TO: hIdType,
          idNumber: hIdNumber,
          so_giay_to: hIdNumber,
          SO_GIAY_TO: hIdNumber,
          so_cccd: hIdNumber,
          SO_CCCD: hIdNumber,
          idIssueDate: hIdIssueDate,
          ngay_cap: hIdIssueDate,
          NGAY_CAP: hIdIssueDate,
          idIssuePlace: hIdIssuePlace,
          noi_cap: hIdIssuePlace,
          NOI_CAP: hIdIssuePlace,
          thong_tin_chi_tiet: hDetail,
          THONG_TIN_CHI_TIET: hDetail,
        };
      });
      const hasCHouseholdMembers = cHouseholdMembers.length > 0;

      return {
        index: idxNum,
        _index: groupIdx,
        _number: idxNum,
        _first: groupIdx === 0,
        _last: groupIdx === totalGroups - 1,
        _length: totalGroups,
        STT: idxNum,
        stt: idxNum,
        SO_LUONG_TAI_SAN: groupCollaterals.length,
        collateralCount: groupCollaterals.length,

        // Mã tài sản
        assetCode,
        ma_tai_san: assetCode,
        MA_TAI_SAN: assetCode,
        MA_TAI_SAN_GOP: assetCode,

        // Tên tài sản
        assetName,
        ten_tai_san: assetName,
        TEN_TAI_SAN: assetName,

        // Loại tài sản
        assetType,
        loai_tai_san: assetType,
        LOAI_TAI_SAN: assetType,
        LOAI_TAI_SAN_GOP: assetType,

        // Loại GCN
        certificateType: certType,
        loai_giay_chung_nhan: certType,
        LOAI_GIAY_CHUNG_NHAN: certType,
        LOAI_GIAY_CHUNG_NHAN_GOP: certType,

        // Câu số vào sổ cấp GCN
        certificateClause: certClause,
        CAU_SO_VAO_SO_GCN: certClause,
        cau_so_vao_so_gcn: certClause,
        SO_VAO_SO_CAP_GCN: certClause,
        so_vao_so_cap_gcn: certClause,
        CAU_SO_VAO_SO_GCN_GOP: certClause,
        SO_VAO_SO_CAP_GCN_GOP: certClause,

        // Số GCN
        certificateNumber: certNumber,
        so_gcn: certNumber,
        SO_GCN: certNumber,
        SO_PHAT_HANH_GCN: certNumber,
        so_phat_hanh_gcn: certNumber,
        SO_GCN_GOP: certNumber,

        // Số vào sổ
        issueBookNumber,
        so_vao_so: issueBookNumber,
        SO_VAO_SO: issueBookNumber,
        SO_VAO_SO_GCN: issueBookNumber,
        SO_VAO_SO_GOP: issueBookNumber,

        // Tờ bản đồ
        sheetNumber,
        so_to: sheetNumber,
        SO_TO: sheetNumber,
        to_ban_do: sheetNumber,
        TO_BAN_DO: sheetNumber,
        SO_TO_GOP: sheetNumber,
        TO_BAN_DO_GOP: sheetNumber,

        // Thửa đất
        plotNumber,
        so_thua: plotNumber,
        SO_THUA: plotNumber,
        SO_THUA_GOP: plotNumber,

        // Diện tích
        area,
        dien_tich: area,
        DIEN_TICH: area,
        DIEN_TICH_GOP: area,
        areaWords: areaToWords(groupAreaSum),
        DIEN_TICH_CHU: areaToWords(groupAreaSum),
        TONG_DIEN_TICH: `${formatAreaDisplay(groupAreaSum)} m²`,
        TONG_DIEN_TICH_CHU: areaToWords(groupAreaSum),
        areaNumber: groupAreaSum,
        DIEN_TICH_SO: formatAreaDisplay(groupAreaSum),

        // Diện tích thực tế
        actualArea,
        dien_tich_thuc_te: actualArea,
        DIEN_TICH_THUC_TE: actualArea,
        DIEN_TICH_THUC_TE_GOP: actualArea,

        // Đơn giá & Định giá
        pricePerSqMeter,
        don_gia: pricePerSqMeter,
        DON_GIA: pricePerSqMeter,
        valuationAmount,
        gia_tri_dinh_gia: valuationAmount,
        GIA_TRI_DINH_GIA: valuationAmount,
        valuationAmountWords: vndToWords(groupValSum),
        GIA_TRI_DINH_GIA_CHU: vndToWords(groupValSum),
        TONG_GIA_TRI_DINH_GIA: `${groupValSum.toLocaleString('vi-VN')} đ`,

        // Mục đích, thời hạn, hình thức, hạn chế
        usagePurpose,
        muc_dich_su_dung: usagePurpose,
        MUC_DICH_SU_DUNG: usagePurpose,
        MUC_DICH_SU_DUNG_GOP: usagePurpose,

        usageDuration,
        thoi_han_su_dung: usageDuration,
        THOI_HAN_SU_DUNG: usageDuration,
        THOI_HAN_SU_DUNG_GOP: usageDuration,

        usageForm,
        hinh_thuc_su_dung: usageForm,
        HINH_THUC_SU_DUNG: usageForm,
        HINH_THUC_SU_DUNG_GOP: usageForm,

        useRestrictions: restrictions,
        han_che_su_dung: restrictions,
        HAN_CHE_SU_DUNG: restrictions,
        HAN_CHE_SU_DUNG_GOP: restrictions,

        origin,
        nguon_goc_su_dung: origin,
        NGUON_GOC_SU_DUNG: origin,

        // Nơi cấp & ngày cấp
        issuePlace,
        noi_cap: issuePlace,
        NOI_CAP: issuePlace,
        noi_cap_gcn: issuePlace,
        NOI_CAP_GCN: issuePlace,

        issueDate,
        ngay_cap: issueDate,
        NGAY_CAP: issueDate,
        ngay_cap_gcn: issueDate,
        NGAY_CAP_GCN: issueDate,

        // Địa chỉ
        address,
        dia_chi: address,
        DIA_CHI: address,
        DIA_CHI_TAI_SAN: address,
        DIA_CHI_GOP: address,

        // Chủ sở hữu
        ownerName: ownerFullName,
        CHU_SO_HUU: ownerFullName,
        chu_so_huu: ownerFullName,
        CHU_SO_HUU_HO_TEN: ownerFullName,
        chu_so_huu_ho_ten: ownerFullName,
        CHU_SO_HUU_HO_TEN_IN_HOA: (ownerFullName || '').toUpperCase(),
        chu_so_huu_ho_ten_in_hoa: (ownerFullName || '').toUpperCase(),
        CHU_SO_HUU_HO_TEN_VIET_HOA: (ownerFullName || '').toUpperCase(),
        chu_so_huu_ho_ten_viet_hoa: (ownerFullName || '').toUpperCase(),
        CHU_SO_HUU_XUNG_HO: ownerGenderTitle,
        chu_so_huu_xung_ho: ownerGenderTitle,
        CHU_SO_HUU_DANH_XUNG: ownerGenderTitle,
        chu_so_huu_danh_xung: ownerGenderTitle,
        CHU_SO_HUU_LOAI_GIAY_TO: ownerIdType,
        chu_so_huu_loai_giay_to: ownerIdType,
        CHU_SO_HUU_SO_GIAY_TO: ownerIdNumber,
        chu_so_huu_so_giay_to: ownerIdNumber,
        CHU_SO_HUU_SO_CCCD: ownerIdNumber,
        chu_so_huu_so_cccd: ownerIdNumber,
        CHU_SO_HUU_NGAY_CAP: ownerIdIssueDate,
        chu_so_huu_ngay_cap: ownerIdIssueDate,
        CHU_SO_HUU_NOI_CAP: ownerIdIssuePlace,
        chu_so_huu_noi_cap: ownerIdIssuePlace,
        CHU_SO_HUU_DIA_CHI: ownerAddress,
        chu_so_huu_dia_chi: ownerAddress,
        CHU_SO_HUU_NAM_SINH: ownerYearOfBirth,
        chu_so_huu_nam_sinh: ownerYearOfBirth,
        CHU_SO_HUU_QUAN_HE: ownerRelationship,
        chu_so_huu_quan_he: ownerRelationship,
        CHU_SO_HUU_1: firstOwner.fullName,
        CHU_SO_HUU_1_HO_TEN: firstOwner.fullName,
        CHU_SO_HUU_1_HO_TEN_IN_HOA: firstOwnerUpper,
        CHU_SO_HUU_1_HO_TEN_VIET_HOA: firstOwnerUpper,
        CHU_SO_HUU_1_IN_HOA: firstOwnerUpper,
        CHU_SO_HUU_1_VIET_HOA: firstOwnerUpper,
        CHU_SO_HUU_1_XUNG_HO: firstOwner.genderTitle,
        CHU_SO_HUU_1_DANH_XUNG: firstOwner.genderTitle,
        CHU_SO_HUU_1_LOAI_GIAY_TO: firstOwner.idType,
        CHU_SO_HUU_1_SO_GIAY_TO: firstOwner.idNumber,
        CHU_SO_HUU_1_SO_CCCD: firstOwner.idNumber,
        CHU_SO_HUU_1_NGAY_CAP: firstOwner.idIssueDate,
        CHU_SO_HUU_1_NOI_CAP: firstOwner.idIssuePlace,
        CHU_SO_HUU_1_DIA_CHI: firstOwner.address,
        CHU_SO_HUU_1_NAM_SINH: firstOwnerBirthYear,
        CHU_SO_HUU_1_QUAN_HE: firstOwner.relationship,
        CHU_SO_HUU_THU_NHAT: firstOwner.fullName,
        CHU_SO_HUU_THU_1: firstOwner.fullName,
        chu_so_huu_1: firstOwnerObj,
        CHU_SO_HUU_2: secondOwnerObj.HO_TEN,
        CHU_SO_HUU_2_HO_TEN: secondOwnerObj.HO_TEN,
        CHU_SO_HUU_2_HO_TEN_IN_HOA: secondOwnerUpper,
        CHU_SO_HUU_2_HO_TEN_VIET_HOA: secondOwnerUpper,
        CHU_SO_HUU_2_IN_HOA: secondOwnerUpper,
        CHU_SO_HUU_2_VIET_HOA: secondOwnerUpper,
        CHU_SO_HUU_2_XUNG_HO: secondOwnerObj.XUNG_HO,
        CHU_SO_HUU_2_DANH_XUNG: secondOwnerObj.DANH_XUNG,
        CHU_SO_HUU_2_LOAI_GIAY_TO: secondOwnerObj.LOAI_GIAY_TO,
        CHU_SO_HUU_2_SO_GIAY_TO: secondOwnerObj.SO_GIAY_TO,
        CHU_SO_HUU_2_SO_CCCD: secondOwnerObj.SO_CCCD,
        CHU_SO_HUU_2_NGAY_CAP: secondOwnerObj.NGAY_CAP,
        CHU_SO_HUU_2_NOI_CAP: secondOwnerObj.NOI_CAP,
        CHU_SO_HUU_2_DIA_CHI: secondOwnerObj.DIA_CHI,
        CHU_SO_HUU_2_NAM_SINH: secondOwnerObj.NAM_SINH,
        CHU_SO_HUU_2_QUAN_HE: secondOwnerObj.QUAN_HE,
        CHU_SO_HUU_THU_HAI: secondOwnerObj.HO_TEN,
        CHU_SO_HUU_THU_2: secondOwnerObj.HO_TEN,
        chu_so_huu_2: secondOwnerObj,
        CO_CHU_SO_HUU_2: hasSecondOwner,
        CO_CHU_SO_HUU_THU_HAI: hasSecondOwner,

        // Thành viên hộ
        householdMembers: cHouseholdMembers,
        DANH_SACH_THANH_VIEN_HO: cHouseholdMembers,
        danh_sach_thanh_vien_ho: cHouseholdMembers,
        CO_THANH_VIEN_HO: hasCHouseholdMembers,
        co_thanh_vien_ho: hasCHouseholdMembers,
        'TAI_SAN.CO_THANH_VIEN_HO': hasCHouseholdMembers,

        // Phân nhóm địa bàn cấp Xã
        MA_NHOM: itemFirstGroup?.code || '',
        ma_nhom: itemFirstGroup?.code || '',
        TEN_NHOM: itemFirstGroup?.name || '',
        ten_nhom: itemFirstGroup?.name || '',
        DANH_SACH_NHOM_GOP: itemMatchedGroups.map((g: any) => g.name).join('; '),
        ...itemGroupConditions,

        // Danh sách tài sản con trong nhóm
        groupCollaterals,
        collaterals: groupCollaterals,
      };
    });

    // Chuẩn bị danh sách người liên quan lặp
    const relatedPersonsList = relatedPersons.map((rp: any, idx: number) => {
      const idxNum = idx + 1;
      const fullName = rp.fullName || '';
      const gender = rp.gender === 'NAM' ? 'Nam' : 'Nữ';
      const genderTitle = rp.gender === 'NAM' ? 'Ông' : 'Bà';
      const yearOfBirth = rp.yearOfBirth ? String(rp.yearOfBirth) : '';
      const idType = this.formatIdType(rp.idType);
      const idNumber = rp.idNumber || '';
      const idIssueDate = rp.idIssueDate ? dayjs(rp.idIssueDate).format('DD/MM/YYYY') : '';
      const idIssuePlace = rp.idIssuePlace || '';
      const phoneNumber = rp.phoneNumber || '';
      const relationship = rp.borrowerRelationship || rp.relationship || '';
      const creditFundLoan = rp.creditFundLoan || 'Không';
      const address = rp.address || '';

      return {
        index: idxNum,
        _index: idxNum,
        _number: idxNum,
        STT: idxNum,
        stt: idxNum,
        fullName,
        ho_ten: fullName,
        HO_TEN: fullName,
        TEN: fullName,
        ten: fullName,
        gender,
        gioi_tinh: gender,
        GIOI_TINH: gender,
        genderTitle,
        danh_xung: genderTitle,
        DANH_XUNG: genderTitle,
        xung_ho: genderTitle,
        XUNG_HO: genderTitle,
        yearOfBirth,
        nam_sinh: yearOfBirth,
        NAM_SINH: yearOfBirth,
        idType,
        loai_giay_to: idType,
        LOAI_GIAY_TO: idType,
        idNumber,
        so_giay_to: idNumber,
        SO_GIAY_TO: idNumber,
        so_cccd: idNumber,
        SO_CCCD: idNumber,
        idIssueDate,
        ngay_cap: idIssueDate,
        NGAY_CAP: idIssueDate,
        ngay_cap_cccd: idIssueDate,
        NGAY_CAP_CCCD: idIssueDate,
        idIssuePlace,
        noi_cap: idIssuePlace,
        NOI_CAP: idIssuePlace,
        noi_cap_cccd: idIssuePlace,
        NOI_CAP_CCCD: idIssuePlace,
        phoneNumber,
        so_dien_thoai: phoneNumber,
        SO_DIEN_THOAI: phoneNumber,
        relationship,
        quan_he: relationship,
        QUAN_HE: relationship,
        quan_he_nguoi_vay: relationship,
        QUAN_HE_NGUOI_VAY: relationship,
        creditFundLoan,
        von_vay: creditFundLoan,
        VON_VAY: creditFundLoan,
        von_vay_qtd: creditFundLoan,
        VON_VAY_QTD: creditFundLoan,
        von_vay_quy_tin_dung: creditFundLoan,
        VON_VAY_QUY_TIN_DUNG: creditFundLoan,
        address,
        dia_chi: address,
        DIA_CHI: address,
      };
    });

    // Chuẩn bị danh sách thành viên hộ gia đình toàn cục
    const allHouseholdMembersRaw: any[] = [];
    if (Array.isArray((loan as any).householdMembers) && (loan as any).householdMembers.length > 0) {
      (loan as any).householdMembers.forEach((hm: any) => {
        allHouseholdMembersRaw.push(hm);
      });
    } else {
      collaterals.forEach((c: any) => {
        if (Array.isArray(c.householdMembers) && c.householdMembers.length > 0) {
          c.householdMembers.forEach((hm: any) => {
            allHouseholdMembersRaw.push(hm);
          });
        }
      });
    }

    const householdMembersList = allHouseholdMembersRaw.map((hm: any, idx: number) => {
      const idxNum = idx + 3;
      const fullName = (hm.fullName || '').trim();
      const isNam = hm.gender === 'NAM';
      const gender = isNam ? 'Nam' : 'Nữ';
      const genderTitle = isNam ? 'Ông' : 'Bà';
      const yearOfBirth = hm.yearOfBirth ? String(hm.yearOfBirth) : '';
      const idType = this.formatIdType(hm.idType);
      const idNumber = (hm.idNumber || '').trim();
      const idIssueDate = hm.idIssueDate ? dayjs(hm.idIssueDate).format('DD/MM/YYYY') : '';
      const idIssuePlace = (hm.idIssuePlace || '').trim();
      const address = (hm.address || '').trim();
      const detail = `${genderTitle}: ${fullName}${yearOfBirth ? ` (sinh năm: ${yearOfBirth})` : ''} - ${idType} số: ${idNumber}${idIssueDate ? `, cấp ngày: ${idIssueDate}` : ''}${idIssuePlace ? ` tại ${idIssuePlace}` : ''}${address ? `, địa chỉ: ${address}` : ''}`;

      return {
        index: idxNum,
        _index: idxNum,
        _number: idxNum,
        STT: idxNum,
        stt: idxNum,
        fullName,
        ho_ten: fullName,
        HO_TEN: fullName,
        TEN: fullName,
        ten: fullName,
        gender,
        gioi_tinh: gender,
        GIOI_TINH: gender,
        genderTitle,
        danh_xung: genderTitle,
        DANH_XUNG: genderTitle,
        xung_ho: genderTitle,
        XUNG_HO: genderTitle,
        yearOfBirth,
        nam_sinh: yearOfBirth,
        NAM_SINH: yearOfBirth,
        idType,
        loai_giay_to: idType,
        LOAI_GIAY_TO: idType,
        idNumber,
        so_giay_to: idNumber,
        SO_GIAY_TO: idNumber,
        so_cccd: idNumber,
        SO_CCCD: idNumber,
        idIssueDate,
        ngay_cap: idIssueDate,
        NGAY_CAP: idIssueDate,
        idIssuePlace,
        noi_cap: idIssuePlace,
        NOI_CAP: idIssuePlace,
        address,
        dia_chi: address,
        DIA_CHI: address,
        thong_tin_chi_tiet: detail,
        THONG_TIN_CHI_TIET: detail,
      };
    });

    const firstHouseholdMember = householdMembersList[0] || null;
    const hasHouseholdMembers = householdMembersList.length > 0;
    const mergedHouseholdMemberNames = mergeAssetValues(householdMembersList, (m) => m.HO_TEN);
    const mergedHouseholdMemberIdNumbers = mergeAssetValues(householdMembersList, (m) => m.SO_GIAY_TO);
    const mergedHouseholdMemberTitlesAndNames = mergeAssetValues(householdMembersList, (m) => `${m.DANH_XUNG}: ${m.HO_TEN}`);
    const mergedHouseholdMemberAddresses = mergeAssetValues(householdMembersList, (m) => m.DIA_CHI);
    const mergedHouseholdMemberDetails = mergeAssetValues(householdMembersList, (m) => m.THONG_TIN_CHI_TIET);

    const contractDate = loan.contractDate ? dayjs(loan.contractDate) : now;
    const appDate = loan.applicationDate && dayjs(loan.applicationDate).isValid()
      ? dayjs(loan.applicationDate)
      : (loan.createdAt && dayjs(loan.createdAt).isValid() ? dayjs(loan.createdAt) : now);
    const appDay = appDate.format('DD');
    const appMonth = appDate.format('MM');
    const appYear = appDate.format('YYYY');
    const appDateFormatted = appDate.format('DD/MM/YYYY');
    const appFullDate = `ngày ${appDay} tháng ${appMonth} năm ${appYear}`;
    const loanAmount = Number(loan.loanAmount) || 0;

    // Trích xuất Năm, Tháng, Ngày của Số khế ước nhận nợ (định dạng YY.MM.XXX hoặc từ ngày lập khế ước)
    const rawSoKheUoc = String(loan.contractNumber || '').trim();
    const kheUocParts = rawSoKheUoc.split('.');
    let soKheUocNam = '';
    let soKheUocThang = '';
    let soKheUocNgay = contractDate.format('DD');
    let soKheUocSo = '';

    if (kheUocParts.length >= 2 && /^\d+$/.test(kheUocParts[0]) && /^\d+$/.test(kheUocParts[1])) {
      soKheUocNam = kheUocParts[0];
      soKheUocThang = kheUocParts[1].padStart(2, '0');
      soKheUocSo = kheUocParts.slice(2).join('.');
    } else {
      soKheUocNam = contractDate.format('YY');
      soKheUocThang = contractDate.format('MM');
      soKheUocSo = rawSoKheUoc;
    }

    // Trích xuất Năm, Tháng, Ngày của Số hợp đồng thế chấp
    const rawSoHdTheChap = String(mortgage?.contractNumber || '').trim();
    const hdTheChapParts = rawSoHdTheChap.split('.');
    let soHdTheChapNam = '';
    let soHdTheChapThang = '';
    let soHdTheChapNgay = contractDate.format('DD');
    let soHdTheChapSo = '';

    if (hdTheChapParts.length >= 2 && /^\d+$/.test(hdTheChapParts[0]) && /^\d+$/.test(hdTheChapParts[1])) {
      soHdTheChapNam = hdTheChapParts[0];
      soHdTheChapThang = hdTheChapParts[1].padStart(2, '0');
      soHdTheChapSo = hdTheChapParts.slice(2).join('.');
    } else {
      soHdTheChapNam = contractDate.format('YY');
      soHdTheChapThang = contractDate.format('MM');
      soHdTheChapSo = rawSoHdTheChap;
    }

    // Trích xuất Ngày, Tháng, Năm của Ngày chứng thực UBND / Ủy ban
    let committeeAuthDateDay = '';
    let committeeAuthDateMonth = '';
    let committeeAuthDateYear = '';
    let committeeAuthDateFormatted = '';

    if (mortgage?.committeeAuthDate) {
      const d = dayjs(mortgage.committeeAuthDate);
      if (d.isValid()) {
        committeeAuthDateDay = d.format('DD');
        committeeAuthDateMonth = d.format('MM');
        committeeAuthDateYear = d.format('YYYY');
        committeeAuthDateFormatted = d.format('DD/MM/YYYY');
      } else if (typeof mortgage.committeeAuthDate === 'string' && mortgage.committeeAuthDate.includes('/')) {
        const parts = mortgage.committeeAuthDate.split('/');
        if (parts.length >= 3) {
          committeeAuthDateDay = parts[0].trim().padStart(2, '0');
          committeeAuthDateMonth = parts[1].trim().padStart(2, '0');
          committeeAuthDateYear = parts[2].trim();
          committeeAuthDateFormatted = `${committeeAuthDateDay}/${committeeAuthDateMonth}/${committeeAuthDateYear}`;
        }
      }
    }

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
      const { withColon, withoutColon } = resolveIncomeTitle(name, idx);
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
        TEN_THU_NHAP: withoutColon,
        TEN_THU_NHAP_CO_DAU_HAI_CHAM: withColon,
        TEN_THU_NHAP_KHONG_DAU_HAI_CHAM: withoutColon,
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

    const incomesList = (plan?.revenues || []).map((r: any, idx: number) => {
      const amountNum = Number(r.amount || 0);
      const amountStr = `${amountNum.toLocaleString('vi-VN')} đ`;
      const amountWords = vndToWords(amountNum);
      const rawName = r.name || '';
      const note = r.notes || r.note || '';
      const { withColon, withoutColon } = resolveIncomeTitle(rawName, idx);
      return {
        index: idx + 1,
        STT: idx + 1,
        TEN_THU_NHAP: withoutColon,
        TEN_THU_NHAP_CO_DAU_HAI_CHAM: withColon,
        TEN_THU_NHAP_KHONG_DAU_HAI_CHAM: withoutColon,
        name: withoutColon,
        TEN: withoutColon,
        TEN_NGUON_THU: withoutColon,
        TEN_KHOAN_THU: withoutColon,
        KHOAN_THU: withoutColon,
        NGUON_THU: withoutColon,
        NOI_DUNG: withoutColon,
        MUC_THU: withoutColon,
        TEN_GOC: rawName,
        ORIGINAL_NAME: rawName,
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

    const mergedIncomes =
      incomesList.length > 0
        ? incomesList.map((i: any) => `${i.TEN_THU_NHAP} ${i.SO_TIEN}`).join('; ')
        : '...................';

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
      NGUON_THU_GOP: mergedRevenues,
      DANH_SACH_NGUON_THU_GOP: mergedRevenues,
      DANH_SACH_THU_NHAP: incomesList,
      THU_NHAP: incomesList,
      incomes: incomesList,
      DANH_SACH_THU_NHAP_PHUONG_AN: incomesList,
      DANH_SACH_THU_NHAP_GOP: mergedIncomes,
      'PHUONG_AN.DANH_SACH_THU_NHAP': incomesList,
      'PHUONG_AN.THU_NHAP': incomesList,
      'PHUONG_AN_DANH_SACH_THU_NHAP': incomesList,
      'PHUONG_AN.DANH_SACH_THU_NHAP_GOP': mergedIncomes,
      PHUONG_AN_DANH_SACH_THU_NHAP_GOP: mergedIncomes,
      isTrungHan: loan.termType === 'TRUNG_HAN',
      IS_TRUNG_HAN: loan.termType === 'TRUNG_HAN',
      LA_TRUNG_HAN: loan.termType === 'TRUNG_HAN',
      isNganHan: loan.termType === 'NGAN_HAN',
      IS_NGAN_HAN: loan.termType === 'NGAN_HAN',
      LA_NGAN_HAN: loan.termType === 'NGAN_HAN',
    };

    const nested = {
      CAN_BO: canBoObject,
      can_bo: canBoObject,
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
        applicationDate: appDateFormatted,
        applicationDateDay: appDay,
        applicationDateMonth: appMonth,
        applicationDateYear: appYear,
        NGAY_LAM_HO_SO: appDateFormatted,
        NGAY_LAP_HO_SO: appDateFormatted,
        NGAY: appDay,
        THANG: appMonth,
        NAM: appYear,
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
        isTrungHan: loan.termType === 'TRUNG_HAN',
        isNganHan: loan.termType === 'NGAN_HAN',
        DANH_XUNG: loanDanhXung,
        SO_KHE_UOC: loan.contractNumber || '',
        SO_KHE_UOC_NAM: soKheUocNam,
        SO_KHE_UOC_THANG: soKheUocThang,
        SO_KHE_UOC_NGAY: soKheUocNgay,
        SO_KHE_UOC_SO: soKheUocSo,
        soKheUocNam,
        soKheUocThang,
        soKheUocNgay,
        soKheUocSo,
        NGAY_CAP_KHE_UOC: contractDate.format('DD/MM/YYYY'),
        SO_HOP_DONG_THE_CHAP: mortgage?.contractNumber || '',
        SO_HOP_DONG_THE_CHAP_NAM: soHdTheChapNam,
        SO_HOP_DONG_THE_CHAP_THANG: soHdTheChapThang,
        SO_HOP_DONG_THE_CHAP_NGAY: soHdTheChapNgay,
        SO_HOP_DONG_THE_CHAP_SO: soHdTheChapSo,
        NGAY_CHUNG_THUC_UY_BAN_NGAY: committeeAuthDateDay,
        NGAY_CHUNG_THUC_UY_BAN_THANG: committeeAuthDateMonth,
        NGAY_CHUNG_THUC_UY_BAN_NAM: committeeAuthDateYear,
        NGAY_CHUNG_THUC_UBND_NGAY: committeeAuthDateDay,
        NGAY_CHUNG_THUC_UBND_THANG: committeeAuthDateMonth,
        NGAY_CHUNG_THUC_UBND_NAM: committeeAuthDateYear,
        NGAY_CHUNG_THUC_NGAY: committeeAuthDateDay,
        NGAY_CHUNG_THUC_THANG: committeeAuthDateMonth,
        NGAY_CHUNG_THUC_NAM: committeeAuthDateYear,
        NGAY_CHUNG_THUC_UY_BAN: committeeAuthDateFormatted,
        NGAY_CHUNG_THUC_UBND: committeeAuthDateFormatted,
        NGAY_CHUNG_THUC: committeeAuthDateFormatted,
        soHdTheChapNam,
        soHdTheChapThang,
        soHdTheChapNgay,
        soHdTheChapSo,
        isSoKheUocGiongSoHdTheChap,
        IS_SO_KHE_UOC_GIONG_SO_HD_THE_CHAP: isSoKheUocGiongSoHdTheChap,
        valuationDate: loanValuationDate,
        NGAY_DINH_GIA: loanValuationDate,
        NGAY_DINH_GIA_NGAY: valuationDay,
        NGAY_DINH_GIA_THANG: valuationMonth,
        NGAY_DINH_GIA_NAM: valuationYear,
        valuationType: loanValuationType,
        LOAI_DINH_GIA: loanValuationType,
        totalValuationPrice: totalValuationPriceFormatted,
        totalValuationPriceRaw: totalValuationPrice,
        totalValuationPriceWords: totalValuationPriceWords,
        hasValuations,
        hasValuationTheoNghiDinhQuy,
        hasValuationTheoNghiDinhQuyCu,
        hasValuationTheoGiaThiTruong,
        hasValuationTheoGiaThiTruongVaNghiDinhQuy,
        DON_GIA_THI_TRUONG: donGiaThiTruongFormatted,
        DON_GIA_THI_TRUONG_TEXT: donGiaThiTruongWithSpace,
        DON_GIA_THI_TRUONG_KHONG_DON_VI: donGiaThiTruongNoUnit,
        DON_GIA_THI_TRUONG_SO: marketPriceNum,
        DON_GIA_GIA_THI_TRUONG: donGiaThiTruongFormatted,
        don_gia_dinh_gia: donGiaThiTruongFormatted,
        DON_GIA_DINH_GIA: donGiaThiTruongFormatted,
        don_gia_thi_truong: donGiaThiTruongFormatted,
        TONG_DINH_GIA_70: valuation70Formatted,
        TONG_DINH_GIA_70_SO: valuation70NumberFormatted,
        TONG_DINH_GIA_70_RAW: valuation70Rounded,
        TONG_DINH_GIA_70_CHU: valuation70Words,
        totalValuation70Amount: valuation70Formatted,
        totalValuation70AmountWords: valuation70Words,
      },
      mortgage: {
        contractNumber: mortgage?.contractNumber || '',
        contractExpiryDate: mortgage?.contractExpiryDate
          ? dayjs(mortgage.contractExpiryDate).format('DD/MM/YYYY')
          : '',
        committeeAuthDate: committeeAuthDateFormatted,
        committeeAuthDateDay,
        committeeAuthDateMonth,
        committeeAuthDateYear,
        NGAY_CHUNG_THUC_UY_BAN_NGAY: committeeAuthDateDay,
        NGAY_CHUNG_THUC_UY_BAN_THANG: committeeAuthDateMonth,
        NGAY_CHUNG_THUC_UY_BAN_NAM: committeeAuthDateYear,
        NGAY_CHUNG_THUC_UBND_NGAY: committeeAuthDateDay,
        NGAY_CHUNG_THUC_UBND_THANG: committeeAuthDateMonth,
        NGAY_CHUNG_THUC_UBND_NAM: committeeAuthDateYear,
        NGAY_CHUNG_THUC_NGAY: committeeAuthDateDay,
        NGAY_CHUNG_THUC_THANG: committeeAuthDateMonth,
        NGAY_CHUNG_THUC_NAM: committeeAuthDateYear,
        NGAY_CHUNG_THUC_UY_BAN: committeeAuthDateFormatted,
        NGAY_CHUNG_THUC_UBND: committeeAuthDateFormatted,
        NGAY_CHUNG_THUC: committeeAuthDateFormatted,
      },
      collaterals_summary: {
        totalCount: collaterals.length,
        totalArea: `${formatAreaDisplay(totalCollateralArea)} m²`,
        totalAreaWords: areaToWords(totalCollateralArea),
        totalValuationAmount: `${totalCollateralValuation.toLocaleString('vi-VN')} đ`,
        totalValuationAmountRounded: `${totalCollateralValuationRounded.toLocaleString('vi-VN')} đ`,
        totalValuationAmountWords: vndToWords(totalCollateralValuationRounded),
        totalValuation70Amount: valuation70Formatted,
        totalValuation70AmountNumber: valuation70NumberFormatted,
        totalValuation70AmountWords: valuation70Words,
        firstAssetAddress: firstCollateral?.address || '',
        firstAssetOwner:
          firstCollateral?.ownerType === 'BAO_LANH' && firstCollateral?.thirdPartyInfo?.fullName
            ? firstCollateral.thirdPartyInfo.fullName
            : member.fullName,
        isKhacDiaChi,
        IS_KHAC_DIA_CHI: isKhacDiaChi,
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
        IS_KHAC_DIA_CHI: isKhacDiaChi,
        LA_KHAC_DIA_CHI: isKhacDiaChi,

        // Phân nhóm địa bàn cấp Xã
        MA_NHOM: firstMatchedLoanGroup?.code || '',
        TEN_NHOM: firstMatchedLoanGroup?.name || '',
        DANH_SACH_NHOM_GOP: allMatchedLoanGroups.map((g: any) => g.name).join('; '),
        ...loanGroupConditions,

        // Tổng diện tích tất cả tài sản
        TONG_DIEN_TICH: `${formatAreaDisplay(totalCollateralArea)} m²`,
        TONG_DIEN_TICH_SO: formatAreaDisplay(totalCollateralArea),
        TONG_DIEN_TICH_CHU: areaToWords(totalCollateralArea),
        TONG_DIEN_TICH_DAT: `${formatAreaDisplay(totalCollateralArea)} m²`,
        TONG_DIEN_TICH_TAI_SAN: `${formatAreaDisplay(totalCollateralArea)} m²`,

        // Tổng định giá tất cả tài sản
        TONG_DINH_GIA: `${totalCollateralValuationRounded.toLocaleString('vi-VN')} đ`,
        TONG_DINH_GIA_SO: `${totalCollateralValuationRounded.toLocaleString('vi-VN')} đ`,
        TONG_DINH_GIA_CHU: vndToWords(totalCollateralValuationRounded),
        TONG_DINH_GIA_RAW: totalCollateralValuationRounded,
        TONG_GIA_TRI_DINH_GIA: `${totalCollateralValuationRounded.toLocaleString('vi-VN')} đ`,
        TONG_GIA_TRI_DINH_GIA_CHU: vndToWords(totalCollateralValuationRounded),

        // 70% tổng giá trị định giá (làm tròn xuống)
        TONG_DINH_GIA_70: valuation70Formatted,
        TONG_DINH_GIA_70_SO: valuation70NumberFormatted,
        TONG_DINH_GIA_70_RAW: valuation70Rounded,
        TONG_DINH_GIA_70_CHU: valuation70Words,
        GIA_TRI_DINH_GIA_70: valuation70Formatted,
        GIA_TRI_DINH_GIA_70_SO: valuation70NumberFormatted,
        GIA_TRI_DINH_GIA_70_CHU: valuation70Words,

        // Tổng số lượng tài sản
        SO_LUONG_TAI_SAN: collaterals.length,
        TONG_SO_TAI_SAN: collaterals.length,
        SO_LUONG: collaterals.length,

        // Đơn lẻ / Tài sản đầu tiên
        MA_TAI_SAN: firstCollateral?.assetCode || '',
        SO_GCN: firstCollateral?.certificateNumber || '',
        SO_PHAT_HANH_GCN: firstCollateral?.certificateNumber || '',
        SO_VAO_SO: firstCollateral?.issueBookNumber || '',
        SO_VAO_SO_GCN: firstCollateral?.issueBookNumber || '',
        SO_THUA: firstCollateral?.plotNumber || '',
        SO_TO: firstCollateral?.sheetNumber || '',
        TO_BAN_DO: firstCollateral?.sheetNumber || '',
        DIEN_TICH: firstCollateral?.area ? `${formatAreaDisplay(firstCollateral.area)} m²` : '',
        DIA_CHI: firstCollateral?.address || '',
        CHU_SO_HUU: firstOwner.fullName,
        CHU_SO_HUU_HO_TEN: firstOwner.fullName,
        CHU_SO_HUU_HO_TEN_IN_HOA: firstOwnerUpper,
        CHU_SO_HUU_HO_TEN_VIET_HOA: firstOwnerUpper,
        CHU_SO_HUU_1: firstOwner.fullName,
        CHU_SO_HUU_1_HO_TEN: firstOwner.fullName,
        CHU_SO_HUU_1_HO_TEN_IN_HOA: firstOwnerUpper,
        CHU_SO_HUU_1_HO_TEN_VIET_HOA: firstOwnerUpper,
        CHU_SO_HUU_1_IN_HOA: firstOwnerUpper,
        CHU_SO_HUU_1_VIET_HOA: firstOwnerUpper,
        CHU_SO_HUU_1_XUNG_HO: firstOwner.genderTitle,
        CHU_SO_HUU_1_DANH_XUNG: firstOwner.genderTitle,
        CHU_SO_HUU_1_LOAI_GIAY_TO: firstOwner.idType,
        CHU_SO_HUU_1_SO_GIAY_TO: firstOwner.idNumber,
        CHU_SO_HUU_1_SO_CCCD: firstOwner.idNumber,
        CHU_SO_HUU_1_NGAY_CAP: firstOwner.idIssueDate,
        CHU_SO_HUU_1_NOI_CAP: firstOwner.idIssuePlace,
        CHU_SO_HUU_1_DIA_CHI: firstOwner.address,
        CHU_SO_HUU_1_NAM_SINH: firstOwnerBirthYear,
        CHU_SO_HUU_1_QUAN_HE: firstOwner.relationship,
        CHU_SO_HUU_THU_NHAT: firstOwner.fullName,
        CHU_SO_HUU_THU_NHAT_HO_TEN_IN_HOA: firstOwnerUpper,
        CHU_SO_HUU_THU_1: firstOwner.fullName,
        CHU_SO_HUU_THU_1_HO_TEN_IN_HOA: firstOwnerUpper,
        CHU_SO_HUU_2: secondOwnerObj.HO_TEN,
        CHU_SO_HUU_2_HO_TEN: secondOwnerObj.HO_TEN,
        CHU_SO_HUU_2_HO_TEN_IN_HOA: secondOwnerUpper,
        CHU_SO_HUU_2_HO_TEN_VIET_HOA: secondOwnerUpper,
        CHU_SO_HUU_2_IN_HOA: secondOwnerUpper,
        CHU_SO_HUU_2_VIET_HOA: secondOwnerUpper,
        CHU_SO_HUU_2_XUNG_HO: secondOwnerObj.XUNG_HO,
        CHU_SO_HUU_2_DANH_XUNG: secondOwnerObj.DANH_XUNG,
        CHU_SO_HUU_2_LOAI_GIAY_TO: secondOwnerObj.LOAI_GIAY_TO,
        CHU_SO_HUU_2_SO_GIAY_TO: secondOwnerObj.SO_GIAY_TO,
        CHU_SO_HUU_2_SO_CCCD: secondOwnerObj.SO_CCCD,
        CHU_SO_HUU_2_NGAY_CAP: secondOwnerObj.NGAY_CAP,
        CHU_SO_HUU_2_NOI_CAP: secondOwnerObj.NOI_CAP,
        CHU_SO_HUU_2_DIA_CHI: secondOwnerObj.DIA_CHI,
        CHU_SO_HUU_2_NAM_SINH: secondOwnerObj.NAM_SINH,
        CHU_SO_HUU_2_QUAN_HE: secondOwnerObj.QUAN_HE,
        CHU_SO_HUU_THU_HAI: secondOwnerObj.HO_TEN,
        CHU_SO_HUU_THU_2: secondOwnerObj.HO_TEN,
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
        CO_CHU_SO_HUU_2: hasSecondOwner,
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
      THANH_VIEN_HO: {
        HO_TEN: firstHouseholdMember?.HO_TEN || '',
        ho_ten: firstHouseholdMember?.HO_TEN || '',
        TEN: firstHouseholdMember?.HO_TEN || '',
        DANH_XUNG: firstHouseholdMember?.DANH_XUNG || '',
        danh_xung: firstHouseholdMember?.DANH_XUNG || '',
        XUNG_HO: firstHouseholdMember?.DANH_XUNG || '',
        GIOI_TINH: firstHouseholdMember?.GIOI_TINH || '',
        gioi_tinh: firstHouseholdMember?.GIOI_TINH || '',
        NAM_SINH: firstHouseholdMember?.NAM_SINH || '',
        nam_sinh: firstHouseholdMember?.NAM_SINH || '',
        SO_GIAY_TO: firstHouseholdMember?.SO_GIAY_TO || '',
        so_giay_to: firstHouseholdMember?.SO_GIAY_TO || '',
        SO_CCCD: firstHouseholdMember?.SO_GIAY_TO || '',
        so_cccd: firstHouseholdMember?.SO_GIAY_TO || '',
        LOAI_GIAY_TO: firstHouseholdMember?.LOAI_GIAY_TO || '',
        loai_giay_to: firstHouseholdMember?.LOAI_GIAY_TO || '',
        NGAY_CAP: firstHouseholdMember?.NGAY_CAP || '',
        ngay_cap: firstHouseholdMember?.NGAY_CAP || '',
        NOI_CAP: firstHouseholdMember?.NOI_CAP || '',
        noi_cap: firstHouseholdMember?.NOI_CAP || '',
        DIA_CHI: firstHouseholdMember?.DIA_CHI || '',
        dia_chi: firstHouseholdMember?.DIA_CHI || '',
        HO_TEN_GOP: mergedHouseholdMemberNames,
        SO_GIAY_TO_GOP: mergedHouseholdMemberIdNumbers,
        SO_CCCD_GOP: mergedHouseholdMemberIdNumbers,
        DANH_SACH_GOP: mergedHouseholdMemberNames,
        DANH_XUNG_HO_TEN_GOP: mergedHouseholdMemberTitlesAndNames,
        DIA_CHI_GOP: mergedHouseholdMemberAddresses,
        THONG_TIN_CHI_TIET_GOP: mergedHouseholdMemberDetails,
        CO_THANH_VIEN_HO: hasHouseholdMembers,
        co_thanh_vien_ho: hasHouseholdMembers,
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
      // Thông tin Cán bộ đang đăng nhập / Cán bộ lập hồ sơ
      'CAN_BO.HO_TEN': canBoHoTen,
      'CAN_BO.HO_TEN_IN_HOA': canBoHoTenInHoa,
      'CAN_BO.HO_TEN_VIET_HOA': canBoHoTenInHoa,
      'CAN_BO.LOAI_GIAY_TO': canBoLoaiGiayTo,
      'CAN_BO.SO_GIAY_TO': canBoSoGiayTo,
      'CAN_BO.SO_CCCD': canBoSoGiayTo,
      'CAN_BO.NOI_CAP': canBoNoiCap,
      'CAN_BO.NOI_CAP_GIAY_TO': canBoNoiCap,
      'CAN_BO.NOI_CAP_CCCD': canBoNoiCap,
      'CAN_BO.NGAY_CAP': canBoNgayCap,
      'CAN_BO.NGAY_CAP_GIAY_TO': canBoNgayCap,
      'CAN_BO.NGAY_CAP_CCCD': canBoNgayCap,
      'CAN_BO.NGAY_CAP_NGAY': canBoNgayCapNgay,
      'CAN_BO.NGAY_CAP_THANG': canBoNgayCapThang,
      'CAN_BO.NGAY_CAP_NAM': canBoNgayCapNam,
      'CAN_BO.GIOI_TINH': canBoGioiTinh,
      'CAN_BO.NAM_SINH': canBoNamSinh,
      'CAN_BO.DANH_XUNG': canBoDanhXung,
      'CAN_BO.XUNG_HO': canBoDanhXung,
      'CAN_BO.CHUC_VU': canBoChucVu,
      'CAN_BO.VAI_TRO': canBoChucVu,

      // CAN_BO bí danh không dấu chấm
      CAN_BO: canBoObject,
      CAN_BO_HO_TEN: canBoHoTen,
      CAN_BO_HO_TEN_IN_HOA: canBoHoTenInHoa,
      CAN_BO_HO_TEN_VIET_HOA: canBoHoTenInHoa,
      CAN_BO_LOAI_GIAY_TO: canBoLoaiGiayTo,
      CAN_BO_SO_GIAY_TO: canBoSoGiayTo,
      CAN_BO_SO_CCCD: canBoSoGiayTo,
      CAN_BO_NOI_CAP: canBoNoiCap,
      CAN_BO_NOI_CAP_GIAY_TO: canBoNoiCap,
      CAN_BO_NOI_CAP_CCCD: canBoNoiCap,
      CAN_BO_NGAY_CAP: canBoNgayCap,
      CAN_BO_NGAY_CAP_GIAY_TO: canBoNgayCap,
      CAN_BO_NGAY_CAP_CCCD: canBoNgayCap,
      CAN_BO_NGAY_CAP_NGAY: canBoNgayCapNgay,
      CAN_BO_NGAY_CAP_THANG: canBoNgayCapThang,
      CAN_BO_NGAY_CAP_NAM: canBoNgayCapNam,
      CAN_BO_GIOI_TINH: canBoGioiTinh,
      CAN_BO_NAM_SINH: canBoNamSinh,
      CAN_BO_DANH_XUNG: canBoDanhXung,
      CAN_BO_XUNG_HO: canBoDanhXung,
      CAN_BO_CHUC_VU: canBoChucVu,
      CAN_BO_VAI_TRO: canBoChucVu,

      // can_bo chữ thường
      'can_bo.ho_ten': canBoHoTen,
      'can_bo.ho_ten_in_hoa': canBoHoTenInHoa,
      'can_bo.loai_giay_to': canBoLoaiGiayTo,
      'can_bo.so_giay_to': canBoSoGiayTo,
      'can_bo.so_cccd': canBoSoGiayTo,
      'can_bo.noi_cap': canBoNoiCap,
      'can_bo.ngay_cap': canBoNgayCap,
      'can_bo.ngay_cap_ngay': canBoNgayCapNgay,
      'can_bo.ngay_cap_thang': canBoNgayCapThang,
      'can_bo.ngay_cap_nam': canBoNgayCapNam,
      'can_bo.gioi_tinh': canBoGioiTinh,
      'can_bo.nam_sinh': canBoNamSinh,
      'can_bo.danh_xung': canBoDanhXung,
      'can_bo.xung_ho': canBoDanhXung,
      'can_bo.chuc_vu': canBoChucVu,
      can_bo_ho_ten: canBoHoTen,
      can_bo_so_giay_to: canBoSoGiayTo,
      can_bo_so_cccd: canBoSoGiayTo,
      can_bo_noi_cap: canBoNoiCap,
      can_bo_ngay_cap: canBoNgayCap,
      can_bo_gioi_tinh: canBoGioiTinh,
      can_bo_nam_sinh: canBoNamSinh,

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
      NGAY: appDay,
      THANG: appMonth,
      NAM: appYear,
      NGAY_LAM_HO_SO: appDateFormatted,
      NGAY_LAP_HO_SO: appDateFormatted,
      NGAY_LAM_HO_SO_NGAY: appDay,
      NGAY_LAM_HO_SO_THANG: appMonth,
      NGAY_LAM_HO_SO_NAM: appYear,
      NGAY_LAM_HO_SO_DAY_DU: appFullDate,
      NGAY_LAP_HO_SO_DAY_DU: appFullDate,

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
      SO_LUONG_TAI_SAN: nested.collaterals_summary.totalCount,
      'TAI_SAN.SO_LUONG_TAI_SAN': nested.collaterals_summary.totalCount,
      'TAI_SAN.TONG_SO_TAI_SAN': nested.collaterals_summary.totalCount,
      'TAI_SAN.SO_LUONG': nested.collaterals_summary.totalCount,
      TONG_DIEN_TICH: nested.collaterals_summary.totalArea,
      TONG_DIEN_TICH_SO: formatAreaDisplay(totalCollateralArea),
      TONG_DIEN_TICH_CHU: nested.collaterals_summary.totalAreaWords,
      TONG_DIEN_TICH_DAT: nested.collaterals_summary.totalArea,
      TONG_DIEN_TICH_TAI_SAN: nested.collaterals_summary.totalArea,
      'TAI_SAN.TONG_DIEN_TICH': nested.collaterals_summary.totalArea,
      'TAI_SAN.TONG_DIEN_TICH_CHU': nested.collaterals_summary.totalAreaWords,
      'TAI_SAN.TONG_DIEN_TICH_DAT': nested.collaterals_summary.totalArea,
      TONG_GIA_TRI_DINH_GIA: nested.collaterals_summary.totalValuationAmountRounded,
      TONG_GIA_TRI_DINH_GIA_CHU: nested.collaterals_summary.totalValuationAmountWords,
      TONG_DINH_GIA: nested.collaterals_summary.totalValuationAmountRounded,
      TONG_DINH_GIA_SO: nested.collaterals_summary.totalValuationAmountRounded,
      TONG_DINH_GIA_CHU: nested.collaterals_summary.totalValuationAmountWords,
      'TAI_SAN.TONG_DINH_GIA': nested.collaterals_summary.totalValuationAmountRounded,
      'TAI_SAN.TONG_DINH_GIA_SO': nested.collaterals_summary.totalValuationAmountRounded,
      'TAI_SAN.TONG_DINH_GIA_CHU': nested.collaterals_summary.totalValuationAmountWords,
      'TAI_SAN.TONG_DINH_GIA_RAW': totalCollateralValuationRounded,
      'TAI_SAN.TONG_GIA_TRI_DINH_GIA':
        totalValuationPrice > 0 ? totalValuationPriceFormatted : nested.collaterals_summary.totalValuationAmountRounded,
      'TAI_SAN.TONG_GIA_TRI_DINH_GIA_CHU':
        totalValuationPrice > 0 ? totalValuationPriceWords : nested.collaterals_summary.totalValuationAmountWords,

      // 70% Tổng giá trị định giá (làm tròn xuống)
      TONG_DINH_GIA_70: valuation70Formatted,
      TONG_DINH_GIA_70_SO: valuation70NumberFormatted,
      TONG_DINH_GIA_70_RAW: valuation70Rounded,
      TONG_DINH_GIA_70_CHU: valuation70Words,
      'TAI_SAN.TONG_DINH_GIA_70': valuation70Formatted,
      'TAI_SAN.TONG_DINH_GIA_70_SO': valuation70NumberFormatted,
      'TAI_SAN.TONG_DINH_GIA_70_RAW': valuation70Rounded,
      'TAI_SAN.TONG_DINH_GIA_70_CHU': valuation70Words,
      'TAI_SAN.GIA_TRI_DINH_GIA_70': valuation70Formatted,
      'TAI_SAN.GIA_TRI_DINH_GIA_70_SO': valuation70NumberFormatted,
      'TAI_SAN.GIA_TRI_DINH_GIA_70_CHU': valuation70Words,
      'KHOAN_VAY.TONG_DINH_GIA_70': valuation70Formatted,
      'KHOAN_VAY.TONG_DINH_GIA_70_SO': valuation70NumberFormatted,
      'KHOAN_VAY.TONG_DINH_GIA_70_RAW': valuation70Rounded,
      'KHOAN_VAY.TONG_DINH_GIA_70_CHU': valuation70Words,
      'KHOAN_VAY.TONG_GIA_TRI_DINH_GIA_70': valuation70Formatted,
      'KHOAN_VAY.TONG_GIA_TRI_DINH_GIA_70_SO': valuation70NumberFormatted,
      'KHOAN_VAY.TONG_GIA_TRI_DINH_GIA_70_RAW': valuation70Rounded,
      'KHOAN_VAY.TONG_GIA_TRI_DINH_GIA_70_CHU': valuation70Words,
      GIA_TRI_70_PHAN_TRAM: valuation70Formatted,
      GIA_TRI_70_PHAN_TRAM_CHU: valuation70Words,
      MUC_CHO_VAY_TOI_DA_70: valuation70Formatted,
      MUC_CHO_VAY_TOI_DA_70_CHU: valuation70Words,
      'KHOAN_VAY.MUC_CHO_VAY_TOI_DA_70': valuation70Formatted,
      'KHOAN_VAY.MUC_CHO_VAY_TOI_DA_70_CHU': valuation70Words,

      // Phân nhóm địa bàn cấp Xã
      'TAI_SAN.MA_NHOM': firstMatchedLoanGroup?.code || '',
      MA_NHOM: firstMatchedLoanGroup?.code || '',
      'TAI_SAN.TEN_NHOM': firstMatchedLoanGroup?.name || '',
      TEN_NHOM: firstMatchedLoanGroup?.name || '',
      TEN_NHOM_DIA_BAN: firstMatchedLoanGroup?.name || '',
      'TAI_SAN.DANH_SACH_NHOM_GOP': allMatchedLoanGroups.map((g: any) => g.name).join('; '),
      DANH_SACH_NHOM_GOP: allMatchedLoanGroups.map((g: any) => g.name).join('; '),
      ...loanGroupConditions,
      ...Object.fromEntries(Object.entries(loanGroupConditions).map(([k, v]) => [`TAI_SAN.${k}`, v])),
      ...Object.fromEntries(Object.entries(loanGroupConditions).map(([k, v]) => [`KHOAN_VAY.${k}`, v])),

      NGAY_HIEN_TAI: nested.fund.currentDay,
      THANG_HIEN_TAI: nested.fund.currentMonth,
      NAM_HIEN_TAI: nested.fund.currentYear,
      NGAY_LAM_HO_SO: appDateFormatted,
      NGAY_LAP_HO_SO: appDateFormatted,
      'KHOAN_VAY.NGAY_LAM_HO_SO': appDateFormatted,
      'KHOAN_VAY.NGAY_LAP_HO_SO': appDateFormatted,
      'KHOAN_VAY.NGAY': appDay,
      'KHOAN_VAY.THANG': appMonth,
      'KHOAN_VAY.NAM': appYear,
      // Cờ điều kiện
      CO_MA_THANH_VIEN: Boolean(nested.member.memberCode),
      hasMemberCode: Boolean(nested.member.memberCode),
      CO_NGUOI_THUA_KE: coNguoiThuaKe,
      CO_NGUO_THUA_KE: coNguoiThuaKe,
      'KHOAN_VAY.CO_NGUOI_THUA_KE': coNguoiThuaKe,
      'KHOAN_VAY.CO_NGUO_THUA_KE': coNguoiThuaKe,
      'TAI_SAN.CO_NGUOI_THUA_KE': hasHeirOwnerInCollaterals,
      'TAI_SAN.CO_NGUO_THUA_KE': hasHeirOwnerInCollaterals,
      CO_TAI_SAN: collaterals.length > 0,
      hasHeir: coNguoiThuaKe,
      hasRelatedPersons: relatedPersons.length > 0,
      hasCollaterals: collaterals.length > 0,
      isTheChap: loan.loanType === 'THE_CHAP',
      isTinChap: loan.loanType === 'TIN_CHAP',
      isTrungHan: loan.termType === 'TRUNG_HAN',
      IS_TRUNG_HAN: loan.termType === 'TRUNG_HAN',
      LA_TRUNG_HAN: loan.termType === 'TRUNG_HAN',
      isNganHan: loan.termType === 'NGAN_HAN',
      IS_NGAN_HAN: loan.termType === 'NGAN_HAN',
      LA_NGAN_HAN: loan.termType === 'NGAN_HAN',
      'loan.isTrungHan': loan.termType === 'TRUNG_HAN',
      'loan.isNganHan': loan.termType === 'NGAN_HAN',
      'PHUONG_AN.IS_TRUNG_HAN': loan.termType === 'TRUNG_HAN',
      'PHUONG_AN.LA_TRUNG_HAN': loan.termType === 'TRUNG_HAN',
      'PHUONG_AN.IS_NGAN_HAN': loan.termType === 'NGAN_HAN',
      'PHUONG_AN.LA_NGAN_HAN': loan.termType === 'NGAN_HAN',
      'KHOAN_VAY.IS_TRUNG_HAN': loan.termType === 'TRUNG_HAN',
      'KHOAN_VAY.LA_TRUNG_HAN': loan.termType === 'TRUNG_HAN',
      'KHOAN_VAY.IS_NGAN_HAN': loan.termType === 'NGAN_HAN',
      'KHOAN_VAY.LA_NGAN_HAN': loan.termType === 'NGAN_HAN',
      DANH_SACH_THU_NHAP: incomesList,
      THU_NHAP: incomesList,

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

      // Thành viên hộ gia đình (THANH_VIEN_HO.* & phẳng)
      'THANH_VIEN_HO.HO_TEN': firstHouseholdMember?.HO_TEN || '',
      'THANH_VIEN_HO.DANH_XUNG': firstHouseholdMember?.DANH_XUNG || '',
      'THANH_VIEN_HO.XUNG_HO': firstHouseholdMember?.DANH_XUNG || '',
      'THANH_VIEN_HO.GIOI_TINH': firstHouseholdMember?.GIOI_TINH || '',
      'THANH_VIEN_HO.NAM_SINH': firstHouseholdMember?.NAM_SINH || '',
      'THANH_VIEN_HO.SO_GIAY_TO': firstHouseholdMember?.SO_GIAY_TO || '',
      'THANH_VIEN_HO.SO_CCCD': firstHouseholdMember?.SO_GIAY_TO || '',
      'THANH_VIEN_HO.LOAI_GIAY_TO': firstHouseholdMember?.LOAI_GIAY_TO || '',
      'THANH_VIEN_HO.NGAY_CAP': firstHouseholdMember?.NGAY_CAP || '',
      'THANH_VIEN_HO.NOI_CAP': firstHouseholdMember?.NOI_CAP || '',
      'THANH_VIEN_HO.DIA_CHI': firstHouseholdMember?.DIA_CHI || '',
      'THANH_VIEN_HO.HO_TEN_GOP': mergedHouseholdMemberNames,
      'THANH_VIEN_HO.SO_GIAY_TO_GOP': mergedHouseholdMemberIdNumbers,
      'THANH_VIEN_HO.SO_CCCD_GOP': mergedHouseholdMemberIdNumbers,
      'THANH_VIEN_HO.DANH_SACH_GOP': mergedHouseholdMemberNames,
      'THANH_VIEN_HO.DANH_XUNG_HO_TEN_GOP': mergedHouseholdMemberTitlesAndNames,
      'THANH_VIEN_HO.DIA_CHI_GOP': mergedHouseholdMemberAddresses,
      'THANH_VIEN_HO.THONG_TIN_CHI_TIET_GOP': mergedHouseholdMemberDetails,
      THANH_VIEN_HO_HO_TEN_GOP: mergedHouseholdMemberNames,
      THANH_VIEN_HO_SO_GIAY_TO_GOP: mergedHouseholdMemberIdNumbers,
      THANH_VIEN_HO_DANH_XUNG_HO_TEN_GOP: mergedHouseholdMemberTitlesAndNames,
      THANH_VIEN_HO_DIA_CHI: firstHouseholdMember?.DIA_CHI || '',
      THANH_VIEN_HO_DIA_CHI_GOP: mergedHouseholdMemberAddresses,
      THANH_VIEN_HO_THONG_TIN_CHI_TIET_GOP: mergedHouseholdMemberDetails,
      'KHOAN_VAY.CO_THANH_VIEN_HO': hasHouseholdMembers,
      'TAI_SAN.CO_THANH_VIEN_HO': hasHouseholdMembers,
      CO_THANH_VIEN_HO: hasHouseholdMembers,
      co_thanh_vien_ho: hasHouseholdMembers,
      DANH_SACH_THANH_VIEN_HO: householdMembersList,
      danh_sach_thanh_vien_ho: householdMembersList,
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
      'CHU_SO_HUU.HO_TEN_IN_HOA': firstOwnerUpper,
      'CHU_SO_HUU.HO_TEN_VIET_HOA': firstOwnerUpper,
      'CHU_SO_HUU.IN_HOA': firstOwnerUpper,
      'CHU_SO_HUU.VIET_HOA': firstOwnerUpper,
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
      CHU_SO_HUU_HO_TEN_IN_HOA: firstOwnerUpper,
      CHU_SO_HUU_HO_TEN_VIET_HOA: firstOwnerUpper,
      CHU_SO_HUU_IN_HOA: firstOwnerUpper,
      CHU_SO_HUU_VIET_HOA: firstOwnerUpper,
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

      // Chủ sở hữu 1 (đầu tiên)
      'CHU_SO_HUU_1.HO_TEN': firstOwner.fullName,
      'CHU_SO_HUU_1.HO_TEN_IN_HOA': firstOwnerUpper,
      'CHU_SO_HUU_1.HO_TEN_VIET_HOA': firstOwnerUpper,
      'CHU_SO_HUU_1.HO_TEN_HOA': firstOwnerUpper,
      'CHU_SO_HUU_1.IN_HOA': firstOwnerUpper,
      'CHU_SO_HUU_1.VIET_HOA': firstOwnerUpper,
      'CHU_SO_HUU_1.XUNG_HO': firstOwner.genderTitle,
      'CHU_SO_HUU_1.DANH_XUNG': firstOwner.genderTitle,
      'CHU_SO_HUU_1.GIOI_TINH': firstOwner.gender || '',
      'CHU_SO_HUU_1.LOAI_GIAY_TO': firstOwner.idType,
      'CHU_SO_HUU_1.SO_GIAY_TO': firstOwner.idNumber,
      'CHU_SO_HUU_1.SO_CCCD': firstOwner.idNumber,
      'CHU_SO_HUU_1.NGAY_CAP': firstOwner.idIssueDate,
      'CHU_SO_HUU_1.NGAY_CAP_CCCD': firstOwner.idIssueDate,
      'CHU_SO_HUU_1.NOI_CAP': firstOwner.idIssuePlace,
      'CHU_SO_HUU_1.NOI_CAP_CCCD': firstOwner.idIssuePlace,
      'CHU_SO_HUU_1.DIA_CHI': firstOwner.address,
      'CHU_SO_HUU_1.NAM_SINH': firstOwnerBirthYear,
      'CHU_SO_HUU_1.QUAN_HE': firstOwner.relationship,
      'CHU_SO_HUU_1.SO_DIEN_THOAI': (firstOwner as any).phoneNumber || '',

      CHU_SO_HUU_1: firstOwner.fullName,
      CHU_SO_HUU_1_HO_TEN: firstOwner.fullName,
      CHU_SO_HUU_1_HO_TEN_IN_HOA: firstOwnerUpper,
      CHU_SO_HUU_1_HO_TEN_VIET_HOA: firstOwnerUpper,
      CHU_SO_HUU_1_HO_TEN_HOA: firstOwnerUpper,
      CHU_SO_HUU_1_IN_HOA: firstOwnerUpper,
      CHU_SO_HUU_1_VIET_HOA: firstOwnerUpper,
      CHU_SO_HUU_1_XUNG_HO: firstOwner.genderTitle,
      CHU_SO_HUU_1_DANH_XUNG: firstOwner.genderTitle,
      CHU_SO_HUU_1_GIOI_TINH: firstOwner.gender || '',
      CHU_SO_HUU_1_LOAI_GIAY_TO: firstOwner.idType,
      CHU_SO_HUU_1_SO_CCCD: firstOwner.idNumber,
      CHU_SO_HUU_1_SO_GIAY_TO: firstOwner.idNumber,
      CHU_SO_HUU_1_NGAY_CAP: firstOwner.idIssueDate,
      CHU_SO_HUU_1_NGAY_CAP_CCCD: firstOwner.idIssueDate,
      CHU_SO_HUU_1_NOI_CAP: firstOwner.idIssuePlace,
      CHU_SO_HUU_1_NOI_CAP_CCCD: firstOwner.idIssuePlace,
      CHU_SO_HUU_1_DIA_CHI: firstOwner.address,
      CHU_SO_HUU_1_NAM_SINH: firstOwnerBirthYear,
      CHU_SO_HUU_1_QUAN_HE: firstOwner.relationship,
      CHU_SO_HUU_1_SO_DIEN_THOAI: (firstOwner as any).phoneNumber || '',

      'CHU_SO_HUU_THU_NHAT.HO_TEN': firstOwner.fullName,
      'CHU_SO_HUU_THU_NHAT.HO_TEN_IN_HOA': firstOwnerUpper,
      'CHU_SO_HUU_THU_NHAT.HO_TEN_VIET_HOA': firstOwnerUpper,
      'CHU_SO_HUU_THU_NHAT.IN_HOA': firstOwnerUpper,
      'CHU_SO_HUU_THU_NHAT.VIET_HOA': firstOwnerUpper,
      'CHU_SO_HUU_THU_NHAT.XUNG_HO': firstOwner.genderTitle,
      'CHU_SO_HUU_THU_NHAT.DANH_XUNG': firstOwner.genderTitle,
      'CHU_SO_HUU_THU_NHAT.GIOI_TINH': firstOwner.gender || '',
      'CHU_SO_HUU_THU_NHAT.LOAI_GIAY_TO': firstOwner.idType,
      'CHU_SO_HUU_THU_NHAT.SO_GIAY_TO': firstOwner.idNumber,
      'CHU_SO_HUU_THU_NHAT.SO_CCCD': firstOwner.idNumber,
      'CHU_SO_HUU_THU_NHAT.NGAY_CAP': firstOwner.idIssueDate,
      'CHU_SO_HUU_THU_NHAT.NOI_CAP': firstOwner.idIssuePlace,
      'CHU_SO_HUU_THU_NHAT.DIA_CHI': firstOwner.address,
      'CHU_SO_HUU_THU_NHAT.NAM_SINH': firstOwnerBirthYear,
      'CHU_SO_HUU_THU_NHAT.QUAN_HE': firstOwner.relationship,
      CHU_SO_HUU_THU_NHAT: firstOwner.fullName,
      CHU_SO_HUU_THU_NHAT_HO_TEN: firstOwner.fullName,
      CHU_SO_HUU_THU_NHAT_HO_TEN_IN_HOA: firstOwnerUpper,
      CHU_SO_HUU_THU_NHAT_HO_TEN_VIET_HOA: firstOwnerUpper,
      CHU_SO_HUU_THU_NHAT_IN_HOA: firstOwnerUpper,
      CHU_SO_HUU_THU_NHAT_VIET_HOA: firstOwnerUpper,
      CHU_SO_HUU_THU_NHAT_XUNG_HO: firstOwner.genderTitle,
      CHU_SO_HUU_THU_NHAT_DANH_XUNG: firstOwner.genderTitle,
      CHU_SO_HUU_THU_NHAT_SO_CCCD: firstOwner.idNumber,
      CHU_SO_HUU_THU_NHAT_SO_GIAY_TO: firstOwner.idNumber,
      CHU_SO_HUU_THU_NHAT_NGAY_CAP: firstOwner.idIssueDate,
      CHU_SO_HUU_THU_NHAT_NOI_CAP: firstOwner.idIssuePlace,
      CHU_SO_HUU_THU_NHAT_DIA_CHI: firstOwner.address,
      CHU_SO_HUU_THU_NHAT_NAM_SINH: firstOwnerBirthYear,

      'CHU_SO_HUU_THU_1.HO_TEN': firstOwner.fullName,
      'CHU_SO_HUU_THU_1.HO_TEN_IN_HOA': firstOwnerUpper,
      'CHU_SO_HUU_THU_1.HO_TEN_VIET_HOA': firstOwnerUpper,
      'CHU_SO_HUU_THU_1.IN_HOA': firstOwnerUpper,
      'CHU_SO_HUU_THU_1.VIET_HOA': firstOwnerUpper,
      'CHU_SO_HUU_THU_1.XUNG_HO': firstOwner.genderTitle,
      'CHU_SO_HUU_THU_1.DANH_XUNG': firstOwner.genderTitle,
      'CHU_SO_HUU_THU_1.LOAI_GIAY_TO': firstOwner.idType,
      'CHU_SO_HUU_THU_1.SO_GIAY_TO': firstOwner.idNumber,
      'CHU_SO_HUU_THU_1.SO_CCCD': firstOwner.idNumber,
      'CHU_SO_HUU_THU_1.NGAY_CAP': firstOwner.idIssueDate,
      'CHU_SO_HUU_THU_1.NOI_CAP': firstOwner.idIssuePlace,
      'CHU_SO_HUU_THU_1.DIA_CHI': firstOwner.address,
      'CHU_SO_HUU_THU_1.NAM_SINH': firstOwnerBirthYear,
      'CHU_SO_HUU_THU_1.QUAN_HE': firstOwner.relationship,
      CHU_SO_HUU_THU_1: firstOwner.fullName,
      CHU_SO_HUU_THU_1_HO_TEN: firstOwner.fullName,
      CHU_SO_HUU_THU_1_HO_TEN_IN_HOA: firstOwnerUpper,
      CHU_SO_HUU_THU_1_HO_TEN_VIET_HOA: firstOwnerUpper,
      CHU_SO_HUU_THU_1_IN_HOA: firstOwnerUpper,
      CHU_SO_HUU_THU_1_VIET_HOA: firstOwnerUpper,

      'TAI_SAN.CHU_SO_HUU_1': firstOwner.fullName,
      'TAI_SAN.CHU_SO_HUU_1.HO_TEN': firstOwner.fullName,
      'TAI_SAN.CHU_SO_HUU_1.HO_TEN_IN_HOA': firstOwnerUpper,
      'TAI_SAN.CHU_SO_HUU_1.HO_TEN_VIET_HOA': firstOwnerUpper,
      'TAI_SAN.CHU_SO_HUU_1.IN_HOA': firstOwnerUpper,
      'TAI_SAN.CHU_SO_HUU_1.VIET_HOA': firstOwnerUpper,
      'TAI_SAN.CHU_SO_HUU_1.XUNG_HO': firstOwner.genderTitle,
      'TAI_SAN.CHU_SO_HUU_1.DANH_XUNG': firstOwner.genderTitle,
      'TAI_SAN.CHU_SO_HUU_1.LOAI_GIAY_TO': firstOwner.idType,
      'TAI_SAN.CHU_SO_HUU_1.SO_GIAY_TO': firstOwner.idNumber,
      'TAI_SAN.CHU_SO_HUU_1.SO_CCCD': firstOwner.idNumber,
      'TAI_SAN.CHU_SO_HUU_1.NGAY_CAP': firstOwner.idIssueDate,
      'TAI_SAN.CHU_SO_HUU_1.NOI_CAP': firstOwner.idIssuePlace,
      'TAI_SAN.CHU_SO_HUU_1.DIA_CHI': firstOwner.address,
      'TAI_SAN.CHU_SO_HUU_1.NAM_SINH': firstOwnerBirthYear,
      'TAI_SAN.CHU_SO_HUU_1.QUAN_HE': firstOwner.relationship,
      'TAI_SAN.CHU_SO_HUU_THU_NHAT': firstOwner.fullName,
      'TAI_SAN.CHU_SO_HUU_THU_NHAT.HO_TEN': firstOwner.fullName,
      'TAI_SAN.CHU_SO_HUU_THU_NHAT.HO_TEN_IN_HOA': firstOwnerUpper,
      'TAI_SAN.CHU_SO_HUU_THU_NHAT.HO_TEN_VIET_HOA': firstOwnerUpper,
      'TAI_SAN.CHU_SO_HUU_THU_1': firstOwner.fullName,
      'TAI_SAN.CHU_SO_HUU_THU_1.HO_TEN': firstOwner.fullName,
      'TAI_SAN.CHU_SO_HUU_THU_1.HO_TEN_IN_HOA': firstOwnerUpper,
      'TAI_SAN.CHU_SO_HUU_THU_1.HO_TEN_VIET_HOA': firstOwnerUpper,

      // Chủ sở hữu 2 (thứ hai)
      'CHU_SO_HUU_2.HO_TEN': secondOwnerObj.HO_TEN,
      'CHU_SO_HUU_2.HO_TEN_IN_HOA': secondOwnerUpper,
      'CHU_SO_HUU_2.HO_TEN_VIET_HOA': secondOwnerUpper,
      'CHU_SO_HUU_2.HO_TEN_HOA': secondOwnerUpper,
      'CHU_SO_HUU_2.IN_HOA': secondOwnerUpper,
      'CHU_SO_HUU_2.VIET_HOA': secondOwnerUpper,
      'CHU_SO_HUU_2.XUNG_HO': secondOwnerObj.XUNG_HO,
      'CHU_SO_HUU_2.DANH_XUNG': secondOwnerObj.DANH_XUNG,
      'CHU_SO_HUU_2.LOAI_GIAY_TO': secondOwnerObj.LOAI_GIAY_TO,
      'CHU_SO_HUU_2.SO_GIAY_TO': secondOwnerObj.SO_GIAY_TO,
      'CHU_SO_HUU_2.SO_CCCD': secondOwnerObj.SO_CCCD,
      'CHU_SO_HUU_2.NGAY_CAP': secondOwnerObj.NGAY_CAP,
      'CHU_SO_HUU_2.NOI_CAP': secondOwnerObj.NOI_CAP,
      'CHU_SO_HUU_2.DIA_CHI': secondOwnerObj.DIA_CHI,
      'CHU_SO_HUU_2.NAM_SINH': secondOwnerObj.NAM_SINH,
      'CHU_SO_HUU_2.QUAN_HE': secondOwnerObj.QUAN_HE,
      CHU_SO_HUU_2: secondOwnerObj.HO_TEN,
      CHU_SO_HUU_2_HO_TEN: secondOwnerObj.HO_TEN,
      CHU_SO_HUU_2_HO_TEN_IN_HOA: secondOwnerUpper,
      CHU_SO_HUU_2_HO_TEN_VIET_HOA: secondOwnerUpper,
      CHU_SO_HUU_2_HO_TEN_HOA: secondOwnerUpper,
      CHU_SO_HUU_2_IN_HOA: secondOwnerUpper,
      CHU_SO_HUU_2_VIET_HOA: secondOwnerUpper,
      CHU_SO_HUU_2_XUNG_HO: secondOwnerObj.XUNG_HO,
      CHU_SO_HUU_2_DANH_XUNG: secondOwnerObj.DANH_XUNG,
      CHU_SO_HUU_2_SO_CCCD: secondOwnerObj.SO_CCCD,
      CHU_SO_HUU_2_SO_GIAY_TO: secondOwnerObj.SO_GIAY_TO,
      CHU_SO_HUU_2_NGAY_CAP: secondOwnerObj.NGAY_CAP,
      CHU_SO_HUU_2_NOI_CAP: secondOwnerObj.NOI_CAP,
      CHU_SO_HUU_2_DIA_CHI: secondOwnerObj.DIA_CHI,
      CHU_SO_HUU_2_NAM_SINH: secondOwnerObj.NAM_SINH,
      'CHU_SO_HUU_THU_HAI.HO_TEN': secondOwnerObj.HO_TEN,
      'CHU_SO_HUU_THU_HAI.HO_TEN_IN_HOA': secondOwnerUpper,
      'CHU_SO_HUU_THU_HAI.HO_TEN_VIET_HOA': secondOwnerUpper,
      'CHU_SO_HUU_THU_HAI.IN_HOA': secondOwnerUpper,
      'CHU_SO_HUU_THU_HAI.VIET_HOA': secondOwnerUpper,
      CHU_SO_HUU_THU_HAI: secondOwnerObj.HO_TEN,
      CHU_SO_HUU_THU_HAI_HO_TEN: secondOwnerObj.HO_TEN,
      CHU_SO_HUU_THU_HAI_HO_TEN_IN_HOA: secondOwnerUpper,
      CHU_SO_HUU_THU_HAI_HO_TEN_VIET_HOA: secondOwnerUpper,
      CHU_SO_HUU_THU_HAI_IN_HOA: secondOwnerUpper,
      CHU_SO_HUU_THU_HAI_VIET_HOA: secondOwnerUpper,
      'CHU_SO_HUU_THU_2.HO_TEN': secondOwnerObj.HO_TEN,
      'CHU_SO_HUU_THU_2.HO_TEN_IN_HOA': secondOwnerUpper,
      'CHU_SO_HUU_THU_2.HO_TEN_VIET_HOA': secondOwnerUpper,
      'CHU_SO_HUU_THU_2.IN_HOA': secondOwnerUpper,
      'CHU_SO_HUU_THU_2.VIET_HOA': secondOwnerUpper,
      CHU_SO_HUU_THU_2: secondOwnerObj.HO_TEN,
      CHU_SO_HUU_THU_2_HO_TEN: secondOwnerObj.HO_TEN,
      CHU_SO_HUU_THU_2_HO_TEN_IN_HOA: secondOwnerUpper,
      CHU_SO_HUU_THU_2_HO_TEN_VIET_HOA: secondOwnerUpper,
      'TAI_SAN.CHU_SO_HUU_2': secondOwnerObj.HO_TEN,
      'TAI_SAN.CHU_SO_HUU_2.HO_TEN': secondOwnerObj.HO_TEN,
      'TAI_SAN.CHU_SO_HUU_2.HO_TEN_IN_HOA': secondOwnerUpper,
      'TAI_SAN.CHU_SO_HUU_2.HO_TEN_VIET_HOA': secondOwnerUpper,
      'TAI_SAN.CHU_SO_HUU_2.IN_HOA': secondOwnerUpper,
      'TAI_SAN.CHU_SO_HUU_2.VIET_HOA': secondOwnerUpper,
      'TAI_SAN.CHU_SO_HUU_2.XUNG_HO': secondOwnerObj.XUNG_HO,
      'TAI_SAN.CHU_SO_HUU_2.DANH_XUNG': secondOwnerObj.DANH_XUNG,
      'TAI_SAN.CHU_SO_HUU_2.LOAI_GIAY_TO': secondOwnerObj.LOAI_GIAY_TO,
      'TAI_SAN.CHU_SO_HUU_2.SO_GIAY_TO': secondOwnerObj.SO_GIAY_TO,
      'TAI_SAN.CHU_SO_HUU_2.SO_CCCD': secondOwnerObj.SO_CCCD,
      'TAI_SAN.CHU_SO_HUU_2.NGAY_CAP': secondOwnerObj.NGAY_CAP,
      'TAI_SAN.CHU_SO_HUU_2.NOI_CAP': secondOwnerObj.NOI_CAP,
      'TAI_SAN.CHU_SO_HUU_2.DIA_CHI': secondOwnerObj.DIA_CHI,
      'TAI_SAN.CHU_SO_HUU_2.NAM_SINH': secondOwnerObj.NAM_SINH,
      'TAI_SAN.CHU_SO_HUU_2.QUAN_HE': secondOwnerObj.QUAN_HE,
      'TAI_SAN.CHU_SO_HUU_THU_HAI': secondOwnerObj.HO_TEN,
      'TAI_SAN.CHU_SO_HUU_THU_HAI.HO_TEN': secondOwnerObj.HO_TEN,
      'TAI_SAN.CHU_SO_HUU_THU_HAI.HO_TEN_IN_HOA': secondOwnerUpper,
      'TAI_SAN.CHU_SO_HUU_THU_HAI.HO_TEN_VIET_HOA': secondOwnerUpper,
      'TAI_SAN.CHU_SO_HUU_THU_2': secondOwnerObj.HO_TEN,
      'TAI_SAN.CHU_SO_HUU_THU_2.HO_TEN': secondOwnerObj.HO_TEN,
      'TAI_SAN.CHU_SO_HUU_THU_2.HO_TEN_IN_HOA': secondOwnerUpper,
      'TAI_SAN.CHU_SO_HUU_THU_2.HO_TEN_VIET_HOA': secondOwnerUpper,

      // Cờ boolean kiểm tra có chủ sở hữu thứ 2
      CO_CHU_SO_HUU_2: hasSecondOwner,
      CO_CHU_SO_HUU_THU_HAI: hasSecondOwner,
      'CHU_SO_HUU.CO_CHU_SO_HUU_2': hasSecondOwner,
      'CHU_SO_HUU.CO_CHU_SO_HUU_THU_HAI': hasSecondOwner,

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
      'TAI_SAN.IS_KHAC_DIA_CHI': isKhacDiaChi,
      'TAI_SAN.LA_KHAC_DIA_CHI': isKhacDiaChi,
      // Định giá khoản vay (KHOAN_VAY.* & cấp khoản vay)
      'KHOAN_VAY.SO_LUONG_DINH_GIA': valuationCount,
      'KHOAN_VAY.CO_DINH_GIA': hasValuations,
      'KHOAN_VAY.NGAY_DINH_GIA': loanValuationDate,
      'KHOAN_VAY.NGAY_DINH_GIA_NGAY': valuationDay,
      'KHOAN_VAY.NGAY_DINH_GIA_THANG': valuationMonth,
      'KHOAN_VAY.NGAY_DINH_GIA_NAM': valuationYear,
      'KHOAN_VAY.LOAI_DINH_GIA': loanValuationType,
      'KHOAN_VAY.TONG_GIA_TIEN_DINH_GIA': totalValuationPriceFormatted,
      'KHOAN_VAY.TONG_GIA_TRI_DINH_GIA': totalValuationPriceFormatted,
      'KHOAN_VAY.TONG_GIA_TRI_DINH_GIA_SO': totalValuationPriceFormatted,
      'KHOAN_VAY.TONG_GIA_TRI_DINH_GIA_RAW': totalValuationPrice,
      'KHOAN_VAY.TONG_GIA_TRI_DINH_GIA_CHU': totalValuationPriceWords,
      'KHOAN_VAY.TONG_GIA_TIEN_DINH_GIA_SO': totalValuationPriceFormatted,
      'KHOAN_VAY.TONG_GIA_TIEN_DINH_GIA_RAW': totalValuationPrice,
      'KHOAN_VAY.TONG_GIA_TIEN_DINH_GIA_CHU': totalValuationPriceWords,
      'KHOAN_VAY.CO_DINH_GIA_THEO_NGHI_DINH_QUY': hasValuationTheoNghiDinhQuy,
      'KHOAN_VAY.CO_DINH_GIA_THEO_NGHI_DINH_QUY_CU': hasValuationTheoNghiDinhQuyCu,
      'KHOAN_VAY.CO_DINH_GIA_THEO_GIA_THI_TRUONG': hasValuationTheoGiaThiTruong,
      'KHOAN_VAY.CO_DINH_GIA_THEO_GIA_THI_TRUONG_VA_NGHI_DINH_QUY': hasValuationTheoGiaThiTruongVaNghiDinhQuy,
      'KHOAN_VAY.DON_GIA_THI_TRUONG': donGiaThiTruongFormatted,
      'KHOAN_VAY,DON_GIA_THI_TRUONG': donGiaThiTruongFormatted,
      DON_GIA_THI_TRUONG: donGiaThiTruongFormatted,
      don_gia_thi_truong: donGiaThiTruongFormatted,
      'loan.DON_GIA_THI_TRUONG': donGiaThiTruongFormatted,
      'KHOAN_VAY.DON_GIA_GIA_THI_TRUONG': donGiaThiTruongFormatted,
      DON_GIA_GIA_THI_TRUONG: donGiaThiTruongFormatted,
      'KHOAN_VAY.DON_GIA_DINH_GIA': donGiaThiTruongFormatted,
      DON_GIA_DINH_GIA: donGiaThiTruongFormatted,
      don_gia_dinh_gia: donGiaThiTruongFormatted,
      'KHOAN_VAY.DON_GIA_THI_TRUONG_TEXT': donGiaThiTruongWithSpace,
      DON_GIA_THI_TRUONG_TEXT: donGiaThiTruongWithSpace,
      'KHOAN_VAY.DON_GIA_THI_TRUONG_KHONG_DON_VI': donGiaThiTruongNoUnit,
      DON_GIA_THI_TRUONG_KHONG_DON_VI: donGiaThiTruongNoUnit,
      'KHOAN_VAY.DON_GIA_THI_TRUONG_SO': marketPriceNum,
      DON_GIA_THI_TRUONG_SO: marketPriceNum,
      is_appraisal_thi_truong: hasValuationTheoGiaThiTruong,
      IS_APPRAISAL_THI_TRUONG: hasValuationTheoGiaThiTruong,
      is_appraisal_nghi_dinh_cu: hasValuationTheoNghiDinhQuyCu,
      IS_APPRAISAL_NGHI_DINH_CU: hasValuationTheoNghiDinhQuyCu,
      is_appraisal_thi_truong_va_nghi_dinh_quy: hasValuationTheoGiaThiTruongVaNghiDinhQuy,
      IS_APPRAISAL_THI_TRUONG_VA_NGHI_DINH_QUY: hasValuationTheoGiaThiTruongVaNghiDinhQuy,
      is_appraisal_nghi_dinh_quy: hasValuationTheoNghiDinhQuy,
      IS_APPRAISAL_NGHI_DINH_QUY: hasValuationTheoNghiDinhQuy,
      'KHOAN_VAY.DANH_SACH_DINH_GIA': valuationsList,
      'DANH_SACH_DINH_GIA': valuationsList,
      NGAY_DINH_GIA: loanValuationDate,
      NGAY_DINH_GIA_TSTC: loanValuationDate,
      NGAY_DINH_GIA_NGAY: valuationDay,
      NGAY_DINH_GIA_THANG: valuationMonth,
      NGAY_DINH_GIA_NAM: valuationYear,
      LOAI_DINH_GIA: loanValuationType,
      'loan.valuationDate': loanValuationDate,
      'loan.NGAY_DINH_GIA': loanValuationDate,
      'loan.valuationType': loanValuationType,
      'loan.LOAI_DINH_GIA': loanValuationType,
      'loan.totalValuationPrice': totalValuationPriceFormatted,
      'loan.totalValuationPriceWords': totalValuationPriceWords,
      'loan.hasValuations': hasValuations,
      'TAI_SAN.CO_KHAC_DIA_CHI': isKhacDiaChi,
      IS_KHAC_DIA_CHI: isKhacDiaChi,
      LA_KHAC_DIA_CHI: isKhacDiaChi,
      'KHOAN_VAY.DANH_XUNG': loanDanhXung,
      'loan.DANH_XUNG': loanDanhXung,
      DANH_XUNG_KHOAN_VAY: loanDanhXung,
      'KHOAN_VAY.SO_HOP_DONG_THE_CHAP': nested.mortgage.contractNumber,
      SO_HOP_DONG_THE_CHAP: nested.mortgage.contractNumber,
      'KHOAN_VAY.SO_HD_THE_CHAP': nested.mortgage.contractNumber,
      'loan.SO_HOP_DONG_THE_CHAP': nested.mortgage.contractNumber,
      'KHOAN_VAY.SO_KHE_UOC': nested.loan.contractNumber,
      'KHOAN_VAY,SO_KHE_UOC': nested.loan.contractNumber,
      'loan.SO_KHE_UOC': nested.loan.contractNumber,
      'KHOAN_VAY.SO_KHE_UOC_NAM': soKheUocNam,
      'KHOAN_VAY,SO_KHE_UOC_NAM': soKheUocNam,
      SO_KHE_UOC_NAM: soKheUocNam,
      'loan.SO_KHE_UOC_NAM': soKheUocNam,
      'KHOAN_VAY.SO_KHE_UOC_THANG': soKheUocThang,
      'KHOAN_VAY,SO_KHE_UOC_THANG': soKheUocThang,
      SO_KHE_UOC_THANG: soKheUocThang,
      'loan.SO_KHE_UOC_THANG': soKheUocThang,
      'KHOAN_VAY.SO_KHE_UOC_NGAY': soKheUocNgay,
      'KHOAN_VAY,SO_KHE_UOC_NGAY': soKheUocNgay,
      SO_KHE_UOC_NGAY: soKheUocNgay,
      'loan.SO_KHE_UOC_NGAY': soKheUocNgay,
      'KHOAN_VAY.SO_KHE_UOC_SO': soKheUocSo,
      'KHOAN_VAY,SO_KHE_UOC_SO': soKheUocSo,
      SO_KHE_UOC_SO: soKheUocSo,
      'loan.SO_KHE_UOC_SO': soKheUocSo,
      'KHOAN_VAY.SO_HOP_DONG_THE_CHAP_NAM': soHdTheChapNam,
      'KHOAN_VAY,SO_HOP_DONG_THE_CHAP_NAM': soHdTheChapNam,
      SO_HOP_DONG_THE_CHAP_NAM: soHdTheChapNam,
      'KHOAN_VAY.SO_HOP_DONG_THE_CHAP_THANG': soHdTheChapThang,
      'KHOAN_VAY,SO_HOP_DONG_THE_CHAP_THANG': soHdTheChapThang,
      SO_HOP_DONG_THE_CHAP_THANG: soHdTheChapThang,
      'KHOAN_VAY.SO_HOP_DONG_THE_CHAP_NGAY': soHdTheChapNgay,
      'KHOAN_VAY,SO_HOP_DONG_THE_CHAP_NGAY': soHdTheChapNgay,
      SO_HOP_DONG_THE_CHAP_NGAY: soHdTheChapNgay,
      'KHOAN_VAY.SO_HOP_DONG_THE_CHAP_SO': soHdTheChapSo,
      'KHOAN_VAY,SO_HOP_DONG_THE_CHAP_SO': soHdTheChapSo,
      SO_HOP_DONG_THE_CHAP_SO: soHdTheChapSo,
      'loan.SO_HOP_DONG_THE_CHAP_SO': soHdTheChapSo,
      // Ngày chứng thực ủy ban / UBND
      NGAY_CHUNG_THUC_UY_BAN_NGAY: committeeAuthDateDay,
      NGAY_CHUNG_THUC_UY_BAN_THANG: committeeAuthDateMonth,
      NGAY_CHUNG_THUC_UY_BAN_NAM: committeeAuthDateYear,
      'KHOAN_VAY.NGAY_CHUNG_THUC_UY_BAN_NGAY': committeeAuthDateDay,
      'KHOAN_VAY.NGAY_CHUNG_THUC_UY_BAN_THANG': committeeAuthDateMonth,
      'KHOAN_VAY.NGAY_CHUNG_THUC_UY_BAN_NAM': committeeAuthDateYear,
      'mortgage.committeeAuthDateDay': committeeAuthDateDay,
      'mortgage.committeeAuthDateMonth': committeeAuthDateMonth,
      'mortgage.committeeAuthDateYear': committeeAuthDateYear,
      'mortgage.NGAY_CHUNG_THUC_UY_BAN_NGAY': committeeAuthDateDay,
      'mortgage.NGAY_CHUNG_THUC_UY_BAN_THANG': committeeAuthDateMonth,
      'mortgage.NGAY_CHUNG_THUC_UY_BAN_NAM': committeeAuthDateYear,

      NGAY_CHUNG_THUC_UBND_NGAY: committeeAuthDateDay,
      NGAY_CHUNG_THUC_UBND_THANG: committeeAuthDateMonth,
      NGAY_CHUNG_THUC_UBND_NAM: committeeAuthDateYear,
      'KHOAN_VAY.NGAY_CHUNG_THUC_UBND_NGAY': committeeAuthDateDay,
      'KHOAN_VAY.NGAY_CHUNG_THUC_UBND_THANG': committeeAuthDateMonth,
      'KHOAN_VAY.NGAY_CHUNG_THUC_UBND_NAM': committeeAuthDateYear,
      'mortgage.NGAY_CHUNG_THUC_UBND_NGAY': committeeAuthDateDay,
      'mortgage.NGAY_CHUNG_THUC_UBND_THANG': committeeAuthDateMonth,
      'mortgage.NGAY_CHUNG_THUC_UBND_NAM': committeeAuthDateYear,

      NGAY_CHUNG_THUC_NGAY: committeeAuthDateDay,
      NGAY_CHUNG_THUC_THANG: committeeAuthDateMonth,
      NGAY_CHUNG_THUC_NAM: committeeAuthDateYear,
      'KHOAN_VAY.NGAY_CHUNG_THUC_NGAY': committeeAuthDateDay,
      'KHOAN_VAY.NGAY_CHUNG_THUC_THANG': committeeAuthDateMonth,
      'KHOAN_VAY.NGAY_CHUNG_THUC_NAM': committeeAuthDateYear,

      NGAY_CHUNG_THUC_UY_BAN: committeeAuthDateFormatted,
      NGAY_CHUNG_THUC_UBND: committeeAuthDateFormatted,
      NGAY_CHUNG_THUC: committeeAuthDateFormatted,
      'KHOAN_VAY.NGAY_CHUNG_THUC_UY_BAN': committeeAuthDateFormatted,
      'KHOAN_VAY.NGAY_CHUNG_THUC_UBND': committeeAuthDateFormatted,
      'KHOAN_VAY.NGAY_CHUNG_THUC': committeeAuthDateFormatted,
      'mortgage.committeeAuthDate': committeeAuthDateFormatted,
      'KHOAN_VAY.NGAY_CAP_KHE_UOC': nested.loan.contractDate,
      NGAY_CAP_KHE_UOC: nested.loan.contractDate,
      'loan.NGAY_CAP_KHE_UOC': nested.loan.contractDate,
      'KHOAN_VAY.IS_SO_KHE_UOC_GIONG_SO_HD_THE_CHAP': isSoKheUocGiongSoHdTheChap,
      'KHOAN_VAY.IS_SO_KHE_UOC_GIONG_SO_HOP_DONG_THE_CHAP': isSoKheUocGiongSoHdTheChap,
      'KHOAN_VAY.SO_KHE_UOC_GIONG_SO_HD_THE_CHAP': isSoKheUocGiongSoHdTheChap,
      'KHOAN_VAY.SO_KHE_UOC_GIONG_SO_HOP_DONG_THE_CHAP': isSoKheUocGiongSoHdTheChap,
      IS_SO_KHE_UOC_GIONG_SO_HD_THE_CHAP: isSoKheUocGiongSoHdTheChap,
      IS_SO_KHE_UOC_GIONG_SO_HOP_DONG_THE_CHAP: isSoKheUocGiongSoHdTheChap,
      SO_KHE_UOC_GIONG_SO_HD_THE_CHAP: isSoKheUocGiongSoHdTheChap,
      SO_KHE_UOC_GIONG_SO_HOP_DONG_THE_CHAP: isSoKheUocGiongSoHdTheChap,
      'loan.isSoKheUocGiongSoHdTheChap': isSoKheUocGiongSoHdTheChap,
      isSoKheUocGiongSoHdTheChap,
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
      NGAY: appDay,
      THANG: appMonth,
      NAM: appYear,
      NGAY_LAM_HO_SO: appDateFormatted,
      NGAY_LAP_HO_SO: appDateFormatted,
      NGAY_HIEN_TAI: nested.fund.currentDay,
      THANG_HIEN_TAI: nested.fund.currentMonth,
      NAM_HIEN_TAI: nested.fund.currentYear,
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
        NGAY: appDay,
        THANG: appMonth,
        NAM: appYear,
        NGAY_LAM_HO_SO: appDateFormatted,
        NGAY_LAP_HO_SO: appDateFormatted,
        NGAY_LAM_HO_SO_NGAY: appDay,
        NGAY_LAM_HO_SO_THANG: appMonth,
        NGAY_LAM_HO_SO_NAM: appYear,
        applicationDate: appDateFormatted,
        applicationDateDay: appDay,
        applicationDateMonth: appMonth,
        applicationDateYear: appYear,
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
        IS_TRUNG_HAN: loan.termType === 'TRUNG_HAN',
        LA_TRUNG_HAN: loan.termType === 'TRUNG_HAN',
        IS_NGAN_HAN: loan.termType === 'NGAN_HAN',
        LA_NGAN_HAN: loan.termType === 'NGAN_HAN',
        DANH_XUNG: loanDanhXung,
        SO_KHE_UOC: nested.loan.contractNumber,
        SO_KHE_UOC_NAM: soKheUocNam,
        SO_KHE_UOC_THANG: soKheUocThang,
        SO_KHE_UOC_NGAY: soKheUocNgay,
        SO_KHE_UOC_SO: soKheUocSo,
        NGAY_CAP_KHE_UOC: nested.loan.contractDate,
        SO_HOP_DONG_THE_CHAP: nested.mortgage.contractNumber,
        SO_HOP_DONG_THE_CHAP_NAM: soHdTheChapNam,
        SO_HOP_DONG_THE_CHAP_THANG: soHdTheChapThang,
        SO_HOP_DONG_THE_CHAP_NGAY: soHdTheChapNgay,
        SO_HOP_DONG_THE_CHAP_SO: soHdTheChapSo,
        NGAY_CHUNG_THUC_UY_BAN_NGAY: committeeAuthDateDay,
        NGAY_CHUNG_THUC_UY_BAN_THANG: committeeAuthDateMonth,
        NGAY_CHUNG_THUC_UY_BAN_NAM: committeeAuthDateYear,
        NGAY_CHUNG_THUC_UBND_NGAY: committeeAuthDateDay,
        NGAY_CHUNG_THUC_UBND_THANG: committeeAuthDateMonth,
        NGAY_CHUNG_THUC_UBND_NAM: committeeAuthDateYear,
        NGAY_CHUNG_THUC_NGAY: committeeAuthDateDay,
        NGAY_CHUNG_THUC_THANG: committeeAuthDateMonth,
        NGAY_CHUNG_THUC_NAM: committeeAuthDateYear,
        NGAY_CHUNG_THUC_UY_BAN: committeeAuthDateFormatted,
        NGAY_CHUNG_THUC_UBND: committeeAuthDateFormatted,
        NGAY_CHUNG_THUC: committeeAuthDateFormatted,
        isSoKheUocGiongSoHdTheChap,
        IS_SO_KHE_UOC_GIONG_SO_HD_THE_CHAP: isSoKheUocGiongSoHdTheChap,
        SO_KHE_UOC_GIONG_SO_HD_THE_CHAP: isSoKheUocGiongSoHdTheChap,
        SO_LUONG_DINH_GIA: valuationCount,
        CO_DINH_GIA: hasValuations,
        NGAY_DINH_GIA: loanValuationDate,
        valuationDate: loanValuationDate,
        NGAY_DINH_GIA_NGAY: valuationDay,
        NGAY_DINH_GIA_THANG: valuationMonth,
        NGAY_DINH_GIA_NAM: valuationYear,
        LOAI_DINH_GIA: loanValuationType,
        valuationType: loanValuationType,
        TONG_GIA_TIEN_DINH_GIA: totalValuationPriceFormatted,
        TONG_GIA_TIEN_DINH_GIA_SO: totalValuationPriceFormatted,
        TONG_GIA_TIEN_DINH_GIA_RAW: totalValuationPrice,
        TONG_GIA_TIEN_DINH_GIA_CHU: totalValuationPriceWords,
        TONG_DINH_GIA_70: valuation70Formatted,
        TONG_DINH_GIA_70_SO: valuation70NumberFormatted,
        TONG_DINH_GIA_70_RAW: valuation70Rounded,
        TONG_DINH_GIA_70_CHU: valuation70Words,
        TONG_GIA_TRI_DINH_GIA_70: valuation70Formatted,
        TONG_GIA_TRI_DINH_GIA_70_SO: valuation70NumberFormatted,
        TONG_GIA_TRI_DINH_GIA_70_CHU: valuation70Words,
        MUC_CHO_VAY_TOI_DA_70: valuation70Formatted,
        MUC_CHO_VAY_TOI_DA_70_CHU: valuation70Words,
        CO_DINH_GIA_THEO_NGHI_DINH_QUY: hasValuationTheoNghiDinhQuy,
        CO_DINH_GIA_THEO_NGHI_DINH_QUY_CU: hasValuationTheoNghiDinhQuyCu,
        CO_DINH_GIA_THEO_GIA_THI_TRUONG: hasValuationTheoGiaThiTruong,
        CO_DINH_GIA_THEO_GIA_THI_TRUONG_VA_NGHI_DINH_QUY: hasValuationTheoGiaThiTruongVaNghiDinhQuy,
        DON_GIA_THI_TRUONG: donGiaThiTruongFormatted,
        DON_GIA_THI_TRUONG_TEXT: donGiaThiTruongWithSpace,
        DON_GIA_THI_TRUONG_KHONG_DON_VI: donGiaThiTruongNoUnit,
        DON_GIA_THI_TRUONG_SO: marketPriceNum,
        DON_GIA_GIA_THI_TRUONG: donGiaThiTruongFormatted,
        don_gia_dinh_gia: donGiaThiTruongFormatted,
        DON_GIA_DINH_GIA: donGiaThiTruongFormatted,
        don_gia_thi_truong: donGiaThiTruongFormatted,
        MA_NHOM: firstMatchedLoanGroup?.code || '',
        TEN_NHOM: firstMatchedLoanGroup?.name || '',
        DANH_SACH_NHOM_GOP: allMatchedLoanGroups.map((g: any) => g.name).join('; '),
        ...loanGroupConditions,
        DANH_SACH_DINH_GIA: valuationsList,
        DANH_SACH_CHU_SO_HUU: uniqueOwnersList,
        DANH_SACH_NGUOI_SO_HUU: uniqueOwnersList,
        DANH_SACH_CHU_SO_HUU_VA_THUA_KE: extendedOwnersList,
        DANH_SACH_CHU_SO_HUU_KEM_THUA_KE: extendedOwnersList,
        DANH_SACH_CHU_SO_HUU_VA_NGUOI_THUA_KE: extendedOwnersList,
        DANH_SACH_NGUOI_SO_HUU_VA_THUA_KE: extendedOwnersList,
        DANH_SACH_NGUOI_SO_HUU_KEM_THUA_KE: extendedOwnersList,
        DANH_SACH_CHU_SO_HUU_MO_RONG: extendedOwnersList,
        DANH_SACH_NGUOI_SO_HUU_MO_RONG: extendedOwnersList,
        DANH_SACH_NGUOI_LIEN_QUAN: relatedPersonsList,
        nguoi_lien_quan: relatedPersonsList,
        NGUOI_LIEN_QUAN: relatedPersonsList,
        CO_NGUOI_THUA_KE: coNguoiThuaKe,
        CO_NGUO_THUA_KE: coNguoiThuaKe,
        hasHeir: coNguoiThuaKe,
        CO_THANH_VIEN_HO: hasHouseholdMembers,
        co_thanh_vien_ho: hasHouseholdMembers,
        DANH_SACH_THANH_VIEN_HO: householdMembersList,
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
      CHU_SO_HUU_1: firstOwnerObj,
      CHU_SO_HUU_2: secondOwnerObj,
      CHU_SO_HUU_THU_NHAT: firstOwnerObj,
      CHU_SO_HUU_THU_1: firstOwnerObj,
      CHU_SO_HUU_THU_HAI: secondOwnerObj,
      CHU_SO_HUU_THU_2: secondOwnerObj,
      CO_CHU_SO_HUU_2: hasSecondOwner,
      CO_CHU_SO_HUU_THU_HAI: hasSecondOwner,
      CO_NGUOI_THUA_KE: coNguoiThuaKe,
      CO_NGUO_THUA_KE: coNguoiThuaKe,
      hasHeir: coNguoiThuaKe,
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
      DANH_SACH_NGUOI_SO_HUU: uniqueOwnersList,
      DANH_SACH_CHU_SO_HUU_VA_THUA_KE: extendedOwnersList,
      DANH_SACH_CHU_SO_HUU_KEM_THUA_KE: extendedOwnersList,
      DANH_SACH_CHU_SO_HUU_VA_NGUOI_THUA_KE: extendedOwnersList,
      DANH_SACH_NGUOI_SO_HUU_VA_THUA_KE: extendedOwnersList,
      DANH_SACH_NGUOI_SO_HUU_KEM_THUA_KE: extendedOwnersList,
      DANH_SACH_CHU_SO_HUU_MO_RONG: extendedOwnersList,
      DANH_SACH_NGUOI_SO_HUU_MO_RONG: extendedOwnersList,
      DANH_SACH_TAI_SAN: collateralsList,
      DANH_SACH_DINH_GIA: valuationsList,
      DANH_SACH_NGUOI_LIEN_QUAN: relatedPersonsList,
      nguoi_lien_quan: relatedPersonsList,
      NGUOI_LIEN_QUAN: relatedPersonsList,
      DANH_SACH_NGUOI_THUA_KE: heirsList,
      THANH_VIEN_HO: nested.THANH_VIEN_HO,
      CO_THANH_VIEN_HO: hasHouseholdMembers,
      co_thanh_vien_ho: hasHouseholdMembers,
      DANH_SACH_THANH_VIEN_HO: householdMembersList,
      danh_sach_thanh_vien_ho: householdMembersList,
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
        valuations: valuationsList,
        DANH_SACH_DINH_GIA: valuationsList,
        thua_dat_dinh_gia: valuationsList,
        THUA_DAT_DINH_GIA: valuationsList,
        CO_NGUOI_THUA_KE: coNguoiThuaKe,
        CO_NGUO_THUA_KE: coNguoiThuaKe,
        hasHeir: coNguoiThuaKe,
        'KHOAN_VAY.DANH_SACH_DINH_GIA': valuationsList,
        uniqueOwners: uniqueOwnersList,
        DANH_SACH_CHU_SO_HUU: uniqueOwnersList,
        DANH_SACH_NGUOI_SO_HUU: uniqueOwnersList,
        'KHOAN_VAY.DANH_SACH_CHU_SO_HUU': uniqueOwnersList,
        'KHOAN_VAY.DANH_SACH_NGUOI_SO_HUU': uniqueOwnersList,
        extendedOwners: extendedOwnersList,
        DANH_SACH_CHU_SO_HUU_VA_THUA_KE: extendedOwnersList,
        DANH_SACH_CHU_SO_HUU_KEM_THUA_KE: extendedOwnersList,
        DANH_SACH_CHU_SO_HUU_VA_NGUOI_THUA_KE: extendedOwnersList,
        DANH_SACH_NGUOI_SO_HUU_VA_THUA_KE: extendedOwnersList,
        DANH_SACH_NGUOI_SO_HUU_KEM_THUA_KE: extendedOwnersList,
        DANH_SACH_CHU_SO_HUU_MO_RONG: extendedOwnersList,
        DANH_SACH_NGUOI_SO_HUU_MO_RONG: extendedOwnersList,
        'KHOAN_VAY.DANH_SACH_CHU_SO_HUU_VA_THUA_KE': extendedOwnersList,
        'KHOAN_VAY.DANH_SACH_CHU_SO_HUU_KEM_THUA_KE': extendedOwnersList,
        'KHOAN_VAY.DANH_SACH_CHU_SO_HUU_MO_RONG': extendedOwnersList,
        'KHOAN_VAY.DANH_SACH_NGUOI_SO_HUU_VA_THUA_KE': extendedOwnersList,
        relatedPersons: relatedPersonsList,
        DANH_SACH_NGUOI_LIEN_QUAN: relatedPersonsList,
        'KHOAN_VAY.DANH_SACH_NGUOI_LIEN_QUAN': relatedPersonsList,
        nguoi_lien_quan: relatedPersonsList,
        NGUOI_LIEN_QUAN: relatedPersonsList,
        heirs: heirsList,
        DANH_SACH_NGUOI_THUA_KE: heirsList,
        expenses: expensesList,
        DANH_SACH_CHI_PHI: expensesList,
        CHI_PHI: expensesList,
        DANH_SACH_CHI_PHI_PHUONG_AN: expensesList,
        'PHUONG_AN.DANH_SACH_CHI_PHI': expensesList,
        'PHUONG_AN.CHI_PHI': expensesList,
        revenues: revenuesList,
        DANH_SACH_NGUON_THU: revenuesList,
        NGUON_THU: revenuesList,
        DANH_SACH_NGUON_THU_PHUONG_AN: revenuesList,
        'PHUONG_AN.DANH_SACH_NGUON_THU': revenuesList,
        'PHUONG_AN.NGUON_THU': revenuesList,
        incomes: incomesList,
        DANH_SACH_THU_NHAP: incomesList,
        THU_NHAP: incomesList,
        DANH_SACH_THU_NHAP_PHUONG_AN: incomesList,
        'PHUONG_AN.DANH_SACH_THU_NHAP': incomesList,
        'PHUONG_AN.THU_NHAP': incomesList,
        householdMembers: householdMembersList,
        DANH_SACH_THANH_VIEN_HO: householdMembersList,
        danh_sach_thanh_vien_ho: householdMembersList,
        thanh_vien_ho: householdMembersList,
        THANH_VIEN_HO: householdMembersList,
        'KHOAN_VAY.DANH_SACH_THANH_VIEN_HO': householdMembersList,
        CO_THANH_VIEN_HO: hasHouseholdMembers,
        co_thanh_vien_ho: hasHouseholdMembers,
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
      case 'BOOLEAN':
        if (formatPattern && (formatPattern.toLowerCase().includes('có') || formatPattern.toLowerCase().includes('co'))) {
          return Boolean(value) ? 'Có' : 'Không';
        }
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
          const lower = value.trim().toLowerCase();
          if (lower === 'false' || lower === '0' || lower === 'null' || lower === 'undefined' || lower === 'no') return false;
          if (lower === 'true' || lower === '1' || lower === 'yes') return true;
        }
        return Boolean(value);
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
        if (typeof value === 'string' && /^\d{2}\/\d{2}\/\d{4}/.test(value)) {
          return value;
        }
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
        if (typeof value === 'boolean') {
          if (formatPattern && (formatPattern.toLowerCase().includes('có') || formatPattern.toLowerCase().includes('co'))) {
            return value ? 'Có' : 'Không';
          }
          return value;
        }
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
    if (type === 'CAN_CUOC') return 'Căn cước';
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

  /**
   * Định dạng cụm câu GCN gộp:
   * Nếu các tài sản có cùng Loại GCN (ví dụ đều là GCN) thì chỉ hiển thị tiền tố một lần:
   * Ví dụ: "Số vào sổ cấp GCN: CS04421; CS04418"
   * Chỉ lặp lại khi khác loại GCN.
   */
  public formatMergedCertificateClauses(items: any[]): string {
    if (!items || items.length === 0) return '...................';

    const groups = new Map<string, string[]>();

    for (const c of items) {
      const certType = this.formatCertificateType(c?.certificateType);
      const certNum = c?.certificateNumber ? String(c.certificateNumber).trim() : '...................';
      const lower = certType.toLowerCase().trim();
      const prefix = lower.startsWith('vào sổ cấp')
        ? `${certType}: `
        : `Số vào sổ cấp ${certType}: `;

      if (!groups.has(prefix)) {
        groups.set(prefix, []);
      }
      const nums = groups.get(prefix)!;
      if (!nums.includes(certNum)) {
        nums.push(certNum);
      }
    }

    if (groups.size === 0) return '...................';

    const clauses: string[] = [];
    for (const [prefix, nums] of groups.entries()) {
      clauses.push(`${prefix}${nums.join('; ')}`);
    }

    return clauses.join('; ');
  }

  /**
   * Gộp hình thức sử dụng của nhiều tài sản:
   * - Chỉ gộp diện tích khi các tài sản có nội dung cùng cấu trúc:
   *   Ví dụ: "riêng: 10m2; chung: không m2" với "riêng: 20m2; chung: không m2" -> "riêng: 30 m2; chung: không m2"
   *   (Giữ nguyên y hệt từ 'riêng' và 'chung', không tự ý đổi thành 'sử dụng riêng').
   *   Hoặc "sử dụng riêng: 10m2; sử dụng chung: Không m2" -> "sử dụng riêng: 30 m2; sử dụng chung: Không m2" (giữ nguyên 'sử dụng riêng').
   * - Nếu tài sản có nội dung khác cấu trúc, ví dụ 1 tài sản là chữ "Sử dụng riêng" (hoặc "sử dụng riêng") và 1 tài sản là "riêng: 10m2; chung: Không m2"
   *   thì KHÔNG tự gộp lại mà tách ra 2 cái như bình thường (nối dấu ;).
   */
  public formatMergedUsageForms(items: any[]): string {
    if (!items || items.length === 0) return '';
    const rawForms = items
      .map((c) => (typeof c === 'string' ? c : c?.usageForm))
      .filter((f) => Boolean(f && String(f).trim()));

    if (rawForms.length === 0) return '';
    if (rawForms.length === 1) return String(rawForms[0]).trim();

    // Helper parse số từ chuỗi tiếng Việt: "1.992,5" -> 1992.5, "500" -> 500
    const parseViNum = (s: string): number | null => {
      let clean = s.trim();
      if (clean.includes('.') && clean.includes(',')) {
        clean = clean.replace(/\./g, '').replace(',', '.');
      } else if (clean.includes(',')) {
        clean = clean.replace(',', '.');
      }
      const val = parseFloat(clean);
      return isNaN(val) ? null : val;
    };

    const riengRegex = /(sử\s*dụng\s*riêng|riêng)\s*[:\s-]\s*([\d.,]+)\s*(m²|m2)?/i;
    const chungRegex = /(sử\s*dụng\s*chung|chung)\s*[:\s-]\s*([\d.,]+|[kK]hông(?:\s+có)?)\s*(m²|m2)?/i;

    const parseItem = (textStr: string) => {
      const text = String(textStr).trim();
      const riengMatch = text.match(riengRegex);
      const chungMatch = text.match(chungRegex);

      const mentionsChung = /(?:sử\s*dụng\s*)?chung/i.test(text);

      let kind: 'RIENG_CHUNG' | 'RIENG_ONLY' | 'OTHER' = 'OTHER';
      if (riengMatch && chungMatch) {
        kind = 'RIENG_CHUNG';
      } else if (riengMatch && !mentionsChung) {
        kind = 'RIENG_ONLY';
      }

      let riengNum = 0;
      let prefixRieng = '';
      let riengUnit = 'm2';
      if (riengMatch) {
        prefixRieng = riengMatch[1].trim();
        riengNum = parseViNum(riengMatch[2]) ?? 0;
        riengUnit = riengMatch[3] || 'm2';
      }

      let chungNum = 0;
      let prefixChung = '';
      let chungText = '';
      let chungUnit = 'm2';
      if (chungMatch) {
        prefixChung = chungMatch[1].trim();
        const chungValStr = chungMatch[2].trim();
        const parsedChungNum = parseViNum(chungValStr);
        if (parsedChungNum !== null) {
          chungNum = parsedChungNum;
        }
        if (/^[kK]hông(?:\s+có)?$/i.test(chungValStr)) {
          chungText = chungValStr;
        }
        chungUnit = chungMatch[3] || 'm2';
      }

      return {
        raw: text,
        kind,
        prefixRieng,
        riengNum,
        riengUnit,
        prefixChung,
        chungNum,
        chungText,
        chungUnit,
      };
    };

    const parsed = rawForms.map(parseItem);
    const first = parsed[0];

    // Chỉ gộp khi tất cả các tài sản có cùng cấu trúc và không phải dạng OTHER (ví dụ: chỉ có chữ 'Sử dụng riêng')
    const canMerge =
      first.kind !== 'OTHER' &&
      parsed.every((p) => {
        if (p.kind !== first.kind) return false;
        // Kiểm tra phong cách chữ (riêng vs sử dụng riêng)
        const isFirstSuDungRieng = /sử\s*dụng/i.test(first.prefixRieng);
        const isItemSuDungRieng = /sử\s*dụng/i.test(p.prefixRieng);
        if (isFirstSuDungRieng !== isItemSuDungRieng) return false;

        if (first.kind === 'RIENG_CHUNG') {
          const isFirstSuDungChung = /sử\s*dụng/i.test(first.prefixChung);
          const isItemSuDungChung = /sử\s*dụng/i.test(p.prefixChung);
          if (isFirstSuDungChung !== isItemSuDungChung) return false;
        }
        return true;
      });

    if (!canMerge) {
      return mergeAssetValues(items, (c: any) => c?.usageForm);
    }

    const formatNum = (val: number): string => {
      return val.toLocaleString('vi-VN', { useGrouping: false, maximumFractionDigits: 2 });
    };

    const unit = parsed.some((p) => p.riengUnit === 'm²' || p.chungUnit === 'm²') ? 'm²' : 'm2';
    const totalRieng = parsed.reduce((sum, p) => sum + p.riengNum, 0);

    if (first.kind === 'RIENG_ONLY') {
      return `${first.prefixRieng}: ${formatNum(totalRieng)} ${unit}`;
    }

    if (first.kind === 'RIENG_CHUNG') {
      const totalChung = parsed.reduce((sum, p) => sum + p.chungNum, 0);
      let chungValDisplay = '';
      if (totalChung > 0) {
        chungValDisplay = `${formatNum(totalChung)} ${unit}`;
      } else {
        const hasCapKhong = parsed.some((p) => p.chungText && p.chungText.includes('Không'));
        const hasLowerKhong = parsed.some((p) => p.chungText && p.chungText.toLowerCase().includes('không'));
        if (hasCapKhong) {
          chungValDisplay = `Không ${unit}`;
        } else if (hasLowerKhong) {
          chungValDisplay = `không ${unit}`;
        } else {
          chungValDisplay = `0 ${unit}`;
        }
      }

      return `${first.prefixRieng}: ${formatNum(totalRieng)} ${unit}; ${first.prefixChung}: ${chungValDisplay}`;
    }

    return mergeAssetValues(items, (c: any) => c?.usageForm);
  }
}

/**
 * Hiển thị số diện tích không có dấu chấm phân cách hàng nghìn, giữ dấu phẩy thập phân (ví dụ: 1992,5 m2)
 */
export function formatAreaDisplay(val: number | string | null | undefined): string {
  if (val === null || val === undefined || val === '') return '';
  const num = Number(val);
  if (isNaN(num)) return String(val);
  return num.toLocaleString('vi-VN', { useGrouping: false });
}

export const wordTemplateDataDictionaryService = new WordTemplateDataDictionaryService();
