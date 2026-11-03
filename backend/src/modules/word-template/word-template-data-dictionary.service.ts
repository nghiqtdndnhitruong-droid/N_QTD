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

    // Context cuối cùng truyền cho docxtemplater
    const resolvedContext: Record<string, any> = {};

    // 1. Gán sẵn các biến hệ thống mặc định để luôn có sẵn
    Object.assign(resolvedContext, rawData.flatVariables);

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

    // 3. Đưa cả các danh sách chuẩn và đối tượng nghiệp vụ vào context
    Object.assign(resolvedContext, rawData.lists);
    Object.assign(resolvedContext, rawData.nested);

    return { resolvedContext, warnings };
  }

  /**
   * Xây dựng dữ liệu gốc đầy đủ của khoản vay
   */
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
    const mergedOwners = mergeAssetValues(collaterals, (c: any) =>
      c.ownerType === 'BAO_LANH' && c.thirdPartyInfo?.fullName
        ? c.thirdPartyInfo.fullName
        : member.fullName
    );
    const mergedIssueDates = mergeAssetValues(collaterals, (c: any) =>
      c.issueDate ? dayjs(c.issueDate).format('DD/MM/YYYY') : ''
    );
    const mergedIssuePlaces = mergeAssetValues(collaterals, (c: any) => c.issuePlace);
    const mergedUsagePurposes = mergeAssetValues(collaterals, (c: any) => c.usagePurpose);
    const mergedUsageDurations = mergeAssetValues(collaterals, (c: any) => c.usageDuration);
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
      const ownerName =
        c.ownerType === 'BAO_LANH' && c.thirdPartyInfo?.fullName
          ? c.thirdPartyInfo.fullName
          : member.fullName;

      return {
        index: idx + 1,
        assetCode: c.assetCode || '',
        assetType: this.formatAssetType(c.assetType),
        certificateType: c.certificateType || 'GCN',
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
        issuePlace: c.issuePlace || '',
        issueDate: c.issueDate ? dayjs(c.issueDate).format('DD/MM/YYYY') : '',
        address: c.address || '',
        ownerName,
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

    const nested = {
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
        CHU_SO_HUU:
          firstCollateral?.ownerType === 'BAO_LANH' && firstCollateral?.thirdPartyInfo?.fullName
            ? firstCollateral.thirdPartyInfo.fullName
            : member.fullName || '',
        NGAY_CAP: firstCollateral?.issueDate ? dayjs(firstCollateral.issueDate).format('DD/MM/YYYY') : '',
        NOI_CAP: firstCollateral?.issuePlace || '',
        MUC_DICH_SU_DUNG: firstCollateral?.usagePurpose || '',
        THOI_HAN_SU_DUNG: firstCollateral?.usageDuration || '',
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
            yearOfBirth: heir.yearOfBirth ? String(heir.yearOfBirth) : '',
            idType: this.formatIdType(heir.idType),
            idNumber: heir.idNumber || '',
            idIssueDate: heir.idIssueDate ? dayjs(heir.idIssueDate).format('DD/MM/YYYY') : '',
            idIssuePlace: heir.idIssuePlace || '',
            relationship: heir.relationship || '',
            phoneNumber: heir.phoneNumber || '',
            address: heir.address || '',
          },
        ]
      : [];

    // Tạo phẳng một số biến tiện dụng
    const flatVariables: Record<string, any> = {
      HO_TEN_NGUOI_VAY: nested.member.fullName,
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
      // Người thừa kế (phẳng)
      LOAI_GIAY_TO_NGUOI_THUA_KE: nested.heir?.idType || '',
      HO_TEN_NGUOI_THUA_KE: nested.heir?.fullName || '',
      SO_CCCD_NGUOI_THUA_KE: nested.heir?.idNumber || '',
      NGAY_CAP_CCCD_NGUOI_THUA_KE: nested.heir?.idIssueDate || '',
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
      'TAI_SAN.CHU_SO_HUU_GOP': mergedOwners,
      CHU_SO_HUU_GOP: mergedOwners,
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
      'TAI_SAN.LOAI_TAI_SAN_GOP': mergedAssetTypes,
      LOAI_TAI_SAN_GOP: mergedAssetTypes,
      TEN_TAI_SAN_GOP: mergedAssetTypes,
      'TAI_SAN.NGUON_GOC_GOP': mergedOrigins,
      NGUON_GOC_GOP: mergedOrigins,
      'TAI_SAN.GIA_TRI_DINH_GIA_GOP': mergedValuations,
      GIA_TRI_DINH_GIA_GOP: mergedValuations,
      'TAI_SAN.DON_GIA_GOP': mergedPrices,
      DON_GIA_GOP: mergedPrices,
    };

    // Tạo alias cho đối tượng hoa (NGUOI_VAY, KHOAN_VAY, QUY_TIN_DUNG...)
    const fullNested: Record<string, any> = {
      ...nested,
      NGUOI_VAY: {
        HO_TEN: nested.member.fullName,
        DANH_XUNG: nested.member.genderTitle,
        GIOI_TINH: nested.member.gender,
        NAM_SINH: nested.member.yearOfBirth,
        SO_CCCD: nested.member.idNumber,
        NGAY_CAP_CCCD: nested.member.idIssueDate,
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
            GIOI_TINH: nested.heir.gender,
            NAM_SINH: nested.heir.yearOfBirth,
            LOAI_GIAY_TO: nested.heir.idType,
            SO_CCCD: nested.heir.idNumber,
            NGAY_CAP_CCCD: nested.heir.idIssueDate,
            NOI_CAP_CCCD: nested.heir.idIssuePlace,
            QUAN_HE: nested.heir.relationship,
            SO_DIEN_THOAI: nested.heir.phoneNumber,
            DIA_CHI: nested.heir.address,
          }
        : {
            HO_TEN: '',
            GIOI_TINH: '',
            NAM_SINH: '',
            LOAI_GIAY_TO: '',
            SO_CCCD: '',
            NGAY_CAP_CCCD: '',
            NOI_CAP_CCCD: '',
            QUAN_HE: '',
            SO_DIEN_THOAI: '',
            DIA_CHI: '',
          },
      DANH_SACH_TAI_SAN: collateralsList,
      DANH_SACH_NGUOI_LIEN_QUAN: relatedPersonsList,
      DANH_SACH_NGUOI_THUA_KE: heirsList,
    };

    return {
      nested: fullNested,
      flatVariables,
      lists: {
        collaterals: collateralsList,
        DANH_SACH_TAI_SAN: collateralsList,
        relatedPersons: relatedPersonsList,
        DANH_SACH_NGUOI_LIEN_QUAN: relatedPersonsList,
        heirs: heirsList,
        DANH_SACH_NGUOI_THUA_KE: heirsList,
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

  private formatAssetType(type: string): string {
    switch (type) {
      case 'QUYEN_SU_DUNG_DAT':
        return 'Quyền sử dụng đất';
      case 'QUYEN_SU_DUNG_DAT_QUYEN_SO_HUU_NHA_O_VA_TAI_SAN_KHAC_GAN_LIEN_VOI_DAT':
        return 'Quyền sử dụng đất quyền sở hữu nhà ở và tài sản khác gắn liền với đất';
      case 'QUYEN_SU_DUNG_DAT_QUYEN_SO_HUU_TAI_SAN_GAN_LIEN_VOI_DAT':
        return 'Quyền sử dụng đất, quyền sở hữu tài sản gắn liền với đất';
      default:
        return 'Quyền sử dụng đất và tài sản gắn liền';
    }
  }

  private formatIdType(type?: string | null): string {
    if (type === 'CAN_CUOC') return 'Thẻ căn cước';
    if (type === 'CHUNG_MINH_NHAN_DAN') return 'Chứng minh nhân dân';
    return 'Căn cước công dân';
  }
}

export const wordTemplateDataDictionaryService = new WordTemplateDataDictionaryService();
