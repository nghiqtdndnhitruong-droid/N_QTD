import dayjs from 'dayjs';
import {
  Loan,
  Member,
  Heir,
  Collateral,
  RelatedPerson,
  MortgageContract,
  LoanType,
  LoanTermType,
  CollateralOwnerType,
} from '@prisma/client';
import { formatDate } from '../../shared/utils/date.util';
import { vndToWords, areaToWords } from '../../shared/utils/number-to-words.util';
import { buildInterestExpenseItemName } from '../loan/loan-calculation.service';
import { DocumentValidationWarning } from './document.types';

export const EXTENDED_DOTS = '........................................................................';
export const DOTS = EXTENDED_DOTS;
export const LAND_EMPTY_DOTS = EXTENDED_DOTS;

export type LoanWithDocumentData = Loan & {
  member: Member;
  collaterals?: Collateral[];
  relatedPersons?: RelatedPerson[];
  mortgageContract?: MortgageContract | null;
};

/**
 * Trả về chuỗi an toàn: nếu null, undefined hoặc rỗng thì trả về fallback.
 */
export function val(v: any, fallback: string = DOTS): string {
  if (v === null || v === undefined) return fallback;
  const str = String(v).trim();
  return str.length > 0 ? str : fallback;
}

/**
 * Làm tròn xuống theo bội số 1.000.000đ (FLOOR(amount / 1.000.000) * 1.000.000)
 */
export function floorToMillion(amount: number | null | undefined): number {
  if (amount === null || amount === undefined || !Number.isFinite(amount) || amount <= 0) {
    return 0;
  }
  return Math.floor(amount / 1_000_000) * 1_000_000;
}

/**
 * Định dạng số tiền thành chuỗi phân cách hàng nghìn tiếng Việt với ký hiệu "đ".
 * Ví dụ: 150000000 -> "150.000.000đ", 0 -> "0đ"
 */
export function formatVndCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) {
    return DOTS;
  }
  const formatted = Math.round(amount).toLocaleString('vi-VN');
  return `${formatted}đ`;
}

/**
 * Chuẩn hóa danh xưng dựa trên giới tính và loại đối tượng:
 * 1. Người vay là cá nhân: "Ông" / "Bà"
 * 2. Người vay là hộ: "Hộ Ông" / "Hộ Bà"
 * 3. Người thừa kế: "Ông" / "Bà" (nếu là hộ: "Hộ Ông" / "Hộ Bà")
 * 4. Người bảo lãnh: "Ông" / "Bà" (không thêm Hộ)
 */
export function formatPersonAppellation(
  gender: string | null | undefined,
  isHousehold: boolean = false,
  fallback: string = '.........'
): string {
  if (!gender) return fallback;
  const base = gender === 'NU' ? 'Bà' : gender === 'NAM' ? 'Ông' : fallback;
  if (base === fallback) return fallback;
  return isHousehold ? `Hộ ${base}` : base;
}

/**
 * Chuẩn hóa họ tên kèm danh xưng (tránh lặp nếu họ tên đã có sẵn danh xưng).
 */
export function formatFullNameWithAppellation(
  fullName: string | null | undefined,
  gender: string | null | undefined,
  isHousehold: boolean = false,
  fallback: string = DOTS
): string {
  if (!fullName || !fullName.trim()) return fallback;
  const cleanName = fullName.trim();
  // Tránh lặp lại danh xưng nếu họ tên đã có sẵn "Ông", "Bà", "Hộ Ông", "Hộ Bà"
  if (/^(hộ\s+)?(ông|bà)\s+/i.test(cleanName)) {
    return cleanName;
  }
  const app = formatPersonAppellation(gender, isHousehold, '');
  return app ? `${app} ${cleanName}` : cleanName;
}

/**
 * Chuẩn hóa tên loại giấy chứng nhận quyền sử dụng đất.
 * Thêm tiền tố "Giấy chứng nhận" nếu chưa có, tránh lặp lại cụm từ.
 */
export function normalizeCertificateTypeName(rawName: string | null | undefined): string {
  if (!rawName) return DOTS;
  const trimmed = rawName.trim();
  if (/^giấy\s+chứng\s+nhận/i.test(trimmed)) {
    return trimmed;
  }
  return `Giấy chứng nhận ${trimmed}`;
}

/**
 * Xử lý thông tin hạn chế đất: nếu không có dữ liệu hoặc là "Không", "Không có" thì hiển thị ".........".
 */

/**
 * Định dạng ô Ghi chú theo Task B: nếu không có dữ liệu, để trống hoàn toàn (chuỗi rỗng),
 * không tự động điền dấu chấm, không ghi "Không", "Không có", null, undefined.
 */
export function formatCollateralNote(note: string | null | undefined): string {
  if (!note) return '';
  const trimmed = note.trim();
  if (trimmed.length === 0 || /^(không|không\s+có|k|k\s+có|null|undefined)$/i.test(trimmed)) {
    return '';
  }
  return trimmed;
}

/**
 * Lấy nhãn hiển thị Loại tài sản theo đúng 3 lựa chọn của Task F:
 * 1. Quyền sử dụng đất
 * 2. Quyền sử dụng đất quyền sở hữu nhà ở và tài sản khác gắn liền với đất
 * 3. Quyền sử dụng đất, quyền sở hữu tài sản gắn liền với đất
 */

/**
 * Tự động thêm tiền tố "Giấy chứng nhận" trước tên loại tài sản theo Task F:
 * - Nếu chưa có cụm "Giấy chứng nhận" ở đầu thì tự động thêm
 * - Nếu đã có thì giữ nguyên, không thêm trùng
 */
export function addCertificatePrefixToAssetType(assetTypeStr: string | null | undefined): string {
  if (!assetTypeStr) return DOTS;
  const trimmed = assetTypeStr.trim();
  if (/^giấy\s+chứng\s+nhận/i.test(trimmed)) {
    return trimmed;
  }
  return `Giấy chứng nhận ${trimmed}`;
}

/**
 * Xác định danh sách chủ thể đứng tên tài sản thế chấp cho Điều 6 Thỏa thuận vay vốn (Task G):
 * - Trường hợp 1: Một tài sản đứng tên một cá nhân -> "Ông/Bà + Họ tên"
 * - Trường hợp 2: Có hai tài sản đứng tên hai người khác nhau -> "Ông A và Bà B"
 * - Trường hợp 3: Tài sản đứng tên hộ -> "Hộ Ông/Bà + họ tên"
 * - Trường hợp 4: Tài sản thuộc trường hợp bảo lãnh -> "Ông/Bà + họ tên người bảo lãnh"
 * - Loại bỏ trùng lặp nếu nhiều tài sản cùng người đứng tên
 * - Nối các chủ thể khác nhau bằng " và "
 */
export function buildMortgageOwnersDisplay(
  collaterals: Collateral[],
  member: Member,
  heir?: Heir | null
): string {
  if (!collaterals || collaterals.length === 0) {
    const appellation = formatPersonAppellation(member.gender, false);
    return `${appellation} ${member.fullName || DOTS}`;
  }

  const ownerLabels: string[] = [];
  const seen = new Set<string>();

  for (const c of collaterals) {
    let label = '';
    if (c.ownerType === CollateralOwnerType.BAO_LANH && c.thirdPartyInfo?.fullName) {
      // Bên thứ 3 bảo lãnh: "Ông/Bà + Họ và tên người bảo lãnh", KHÔNG thêm Hộ
      const appellation = formatPersonAppellation(c.thirdPartyInfo.gender, false);
      label = `${appellation} ${c.thirdPartyInfo.fullName.trim()}`;
    } else if (
      (c.ownerType === CollateralOwnerType.NGUOI_THUA_KE_CA_NHAN ||
        c.ownerType === CollateralOwnerType.NGUOI_THUA_KE_HO) &&
      heir?.fullName
    ) {
      const isHousehold = c.ownerType === CollateralOwnerType.NGUOI_THUA_KE_HO;
      const appellation = formatPersonAppellation(heir.gender, isHousehold);
      label = `${appellation} ${heir.fullName.trim()}`;
    } else if (c.ownerType === CollateralOwnerType.NGUOI_VAY_HO) {
      const appellation = formatPersonAppellation(member.gender, true);
      label = `${appellation} ${member.fullName.trim()}`;
    } else {
      // Mặc định NGUOI_VAY_CA_NHAN
      const appellation = formatPersonAppellation(member.gender, false);
      label = `${appellation} ${member.fullName.trim()}`;
    }

    const key = label.toLowerCase().trim();
    if (!seen.has(key)) {
      seen.add(key);
      ownerLabels.push(label);
    }
  }

  return ownerLabels.join(' và ');
}

export function getCollateralAssetTypeLabel(assetType: string | null | undefined): string {
  switch (assetType) {
    case 'QUYEN_SU_DUNG_DAT_QUYEN_SO_HUU_NHA_O_VA_TAI_SAN_KHAC_GAN_LIEN_VOI_DAT':
    case 'QUYEN_SU_DUNG_DAT_VA_TAI_SAN_GAN_LIEN':
      return 'Quyền sử dụng đất quyền sở hữu nhà ở và tài sản khác gắn liền với đất';
    case 'QUYEN_SU_DUNG_DAT_QUYEN_SO_HUU_TAI_SAN_GAN_LIEN_VOI_DAT':
      return 'Quyền sử dụng đất, quyền sở hữu tài sản gắn liền với đất';
    case 'QUYEN_SU_DUNG_DAT':
    default:
      return 'Quyền sử dụng đất';
  }
}

/**
 * Lấy nhãn hiển thị Loại giấy chứng nhận theo đúng 4 lựa chọn của Task C:
 * 1. GCN
 * 2. Giấy chứng nhận
 * 3. Vào sổ cấp giấy chứng nhận quyền sử dụng đất
 * 4. Giấy chứng nhận quyền sử dụng đất
 */
export function getCollateralCertificateTypeLabel(certType: string | null | undefined): string {
  switch (certType) {
    case 'GIAY_CHUNG_NHAN':
      return 'Giấy chứng nhận';
    case 'VAO_SO_CAP_GIAY_CHUNG_NHAN_QUYEN_SU_DUNG_DAT':
      return 'Vào sổ cấp giấy chứng nhận quyền sử dụng đất';
    case 'GIAY_CHUNG_NHAN_QUYEN_SU_DUNG_DAT':
      return 'Giấy chứng nhận quyền sử dụng đất';
    case 'GCN':
    default:
      return 'GCN';
  }
}

/**
 * Sinh cụm nội dung số giấy chứng nhận theo 4 lựa chọn của Loại giấy chứng nhận (Task E):
 * 1. GCN -> "Số vào sổ cấp GCN: [Số]"
 * 2. Giấy chứng nhận -> "Số vào sổ cấp Giấy chứng nhận: [Số]"
 * 3. Vào sổ cấp giấy chứng nhận quyền sử dụng đất -> "Vào sổ cấp giấy chứng nhận quyền sử dụng đất số: [Số GCN]"
 * 4. Giấy chứng nhận quyền sử dụng đất -> "Giấy chứng nhận quyền sử dụng đất số: [Số GCN]"
 */
export function buildCertificateClause(
  certType: string | null | undefined,
  certNumber: string | null | undefined
): { prefix: string; typeName: string; number: string; fullClause: string } {
  const num = (certNumber || '').trim() || EXTENDED_DOTS;
  switch (certType) {
    case 'GIAY_CHUNG_NHAN':
      return {
        prefix: 'Số vào sổ cấp',
        typeName: 'Giấy chứng nhận',
        number: num,
        fullClause: `Số vào sổ cấp Giấy chứng nhận: ${num}`,
      };
    case 'VAO_SO_CAP_GIAY_CHUNG_NHAN_QUYEN_SU_DUNG_DAT':
      return {
        prefix: '',
        typeName: 'Vào sổ cấp giấy chứng nhận quyền sử dụng đất số',
        number: num,
        fullClause: `Vào sổ cấp giấy chứng nhận quyền sử dụng đất số: ${num}`,
      };
    case 'GIAY_CHUNG_NHAN_QUYEN_SU_DUNG_DAT':
      return {
        prefix: '',
        typeName: 'Giấy chứng nhận quyền sử dụng đất số',
        number: num,
        fullClause: `Giấy chứng nhận quyền sử dụng đất số: ${num}`,
      };
    case 'GCN':
    default:
      return {
        prefix: 'Số vào sổ cấp',
        typeName: 'GCN',
        number: num,
        fullClause: `Số vào sổ cấp GCN: ${num}`,
      };
  }
}

export function formatLandRestriction(restriction: string | null | undefined): string {
  if (!restriction) return LAND_EMPTY_DOTS;
  const trimmed = restriction.trim();
  if (trimmed.length === 0) return LAND_EMPTY_DOTS;
  if (/^(không|không\s+có|k|k\s+có)$/i.test(trimmed)) {
    return LAND_EMPTY_DOTS;
  }
  return trimmed;
}

/**
 * Chuẩn hóa số HĐTC hiển thị: chỉ hiển thị đúng số hợp đồng, không ghép tiền tố ngày tháng/năm.
 * Đảm bảo hậu tố /HĐTC nếu chưa có.
 */
export function formatMortgageContractDisplayNumber(
  contractNumber: string | null | undefined
): string {
  if (!contractNumber || !contractNumber.trim()) return DOTS;
  const trimmed = contractNumber.trim();
  // Loại bỏ tiền tố ngày tháng nếu bị ghép (VD: 2026/11/26.11.020/HĐTC -> 26.11.020/HĐTC)
  const cleaned = trimmed.replace(/^\d{4}\/\d{1,2}\//, '');
  if (/\/hđtc$/i.test(cleaned)) {
    return cleaned;
  }
  return `${cleaned}/HĐTC`;
}

/**
 * Thuật toán gộp thông tin của nhiều tài sản bảo đảm (merged_asset_*):
 * 1. Lấy giá trị của từng tài sản theo đúng thứ tự mảng tài sản trong khoản vay.
 * 2. Chuẩn hóa giá trị (trim khoảng trắng).
 * 3. Bỏ qua các giá trị null, undefined hoặc chuỗi rỗng.
 * 4. Loại bỏ các giá trị trùng lặp, giữ lại thứ tự xuất hiện đầu tiên.
 * 5. Nối các giá trị khác nhau bằng dấu chấm phẩy và khoảng trắng "; ".
 * 6. Tuyệt đối không thêm dấu ";" ở đầu hoặc cuối, không tạo ";;" liên tiếp.
 * 7. Nếu tất cả đều rỗng, trả về fallbackValue (mặc định DOTS).
 */
export function mergeAssetValues<T>(
  collaterals: Collateral[] | undefined,
  extractor: (c: Collateral) => string | number | null | undefined,
  fallbackValue: string = DOTS
): string {
  if (!collaterals || collaterals.length === 0) {
    return fallbackValue;
  }

  const values: string[] = [];
  const seen = new Set<string>();

  for (const c of collaterals) {
    const raw = extractor(c);
    if (raw === null || raw === undefined) continue;
    const str = String(raw).trim();
    if (str.length === 0) continue;

    // So sánh chuẩn hóa không phân biệt khoảng trắng kép
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

export class DocumentPlaceholderService {
  /**
   * Sinh toàn bộ biến dữ liệu và cờ điều kiện cho template Word từ dữ liệu khoản vay.
   */
  buildPlaceholders(loan: LoanWithDocumentData, _templateCode?: string): Record<string, any> {
    const member = loan.member;
    const heir = loan.heir as Heir | null;
    const collaterals = (loan.collaterals ?? []).filter((c) => !c.id.startsWith('mock_'));
    const relatedPersons = loan.relatedPersons ?? [];
    const mortgage = loan.mortgageContract as MortgageContract | null;

    // Xác định loại người vay là hộ hay cá nhân dựa trên tài sản
    const isBorrowerHousehold = collaterals.some(
      (c) => c.ownerType === CollateralOwnerType.NGUOI_VAY_HO
    );
    const isHeirHousehold = collaterals.some(
      (c) => c.ownerType === CollateralOwnerType.NGUOI_THUA_KE_HO
    );

    // 1. Nhóm thông tin khách hàng (Người vay)
    const has_member_id = Boolean(member.memberCode && member.memberCode.trim().length > 0);
    const member_id = has_member_id ? member.memberCode!.trim() : DOTS;

    const customer_name = val(member.fullName);
    const customer_birth_year = member.yearOfBirth ? String(member.yearOfBirth) : DOTS;
    const customer_address = val(member.address);
    const customer_doc_type = member.idType === 'CAN_CUOC' ? 'Căn cước' : 'Căn cước công dân';
    const customer_doc_no = val(member.idNumber);
    const customer_doc_date = member.idIssueDate ? formatDate(member.idIssueDate) : DOTS;
    const customer_doc_place = val(member.idIssuePlace);

    // Danh xưng người vay: Cá nhân -> "Ông/Bà", Hộ -> "Hộ Ông/Hộ Bà"
    const borrower_appellation = formatPersonAppellation(member.gender, isBorrowerHousehold);

    // 2. Nhóm thông tin người thừa kế
    const has_inheritor = Boolean(heir && heir.fullName && heir.fullName.trim().length > 0);
    const inheritor_name = has_inheritor ? heir!.fullName.trim() : DOTS;
    const inheritor_birth_year = has_inheritor && heir!.yearOfBirth ? String(heir!.yearOfBirth) : DOTS;
    const inheritor_relationship = has_inheritor ? val(heir!.relationship) : DOTS;
    const inheritor_address = has_inheritor ? val(heir!.address) : DOTS;
    const inheritor_doc_type = has_inheritor
      ? heir!.idType === 'CAN_CUOC'
        ? 'Căn cước'
        : 'Căn cước công dân'
      : 'Căn cước công dân';
    const inheritor_doc_no = has_inheritor ? val(heir!.idNumber) : DOTS;
    const inheritor_doc_date = has_inheritor && heir!.idIssueDate ? formatDate(heir!.idIssueDate) : DOTS;
    const inheritor_doc_place = has_inheritor ? val(heir!.idIssuePlace) : DOTS;
    const inheritor_appellation = formatPersonAppellation(heir?.gender, isHeirHousehold);

    // 3. Nhóm số tiền vay, khế ước & ngày tháng
    const loan_amount = formatVndCurrency(loan.loanAmount);
    const loan_amount_words = loan.loanAmount ? vndToWords(loan.loanAmount) : DOTS;

    const docDate = loan.contractDate || loan.createdAt || new Date();
    const created_day = dayjs(docDate).format('DD');
    const created_month = dayjs(docDate).format('MM');
    const created_year = dayjs(docDate).format('YYYY');

    const now = new Date();
    const current_day = dayjs(now).format('DD');
    const current_month = dayjs(now).format('MM');
    const current_year = dayjs(now).format('YYYY');

    const khe_uoc_no = val(loan.contractNumber);
    const khe_uoc_date = loan.contractDate ? formatDate(loan.contractDate) : DOTS;
    const khe_uoc_so = khe_uoc_no;
    const khe_uoc_thang = dayjs(docDate).format('MM');
    const khe_uoc_nam = dayjs(docDate).format('YYYY');

    const mortgage_contract_no = formatMortgageContractDisplayNumber(
      mortgage?.contractNumber || loan.contractNumber
    );

    const is_mortgage_eq_khe_uoc = Boolean(
      mortgage?.contractNumber &&
        loan.contractNumber &&
        mortgage.contractNumber.trim().toLowerCase() === loan.contractNumber.trim().toLowerCase()
    );

    // Ngày đăng ký thế chấp & thông tin HĐ thế chấp (Task D: không tự động lấy ngày hiện tại khi chưa có)
    const hasCommitteeAuthDate = Boolean(mortgage?.committeeAuthDate);
    const mortgageRegDate = mortgage?.committeeAuthDate;
    const mortgage_registration_day = hasCommitteeAuthDate ? dayjs(mortgageRegDate).format('DD') : DOTS;
    const mortgage_registration_month = hasCommitteeAuthDate ? dayjs(mortgageRegDate).format('MM') : DOTS;
    const mortgage_registration_year = hasCommitteeAuthDate ? dayjs(mortgageRegDate).format('YYYY') : DOTS;

    // Số HĐTC: Chuẩn hóa không gắn năm/tháng vào trước số hợp đồng
    const hd_the_chap_so = formatMortgageContractDisplayNumber(
      mortgage?.contractNumber || loan.contractNumber
    );
    const hd_the_chap_thang = dayjs(mortgageRegDate).format('MM');
    const hd_the_chap_nam = dayjs(mortgageRegDate).format('YYYY');

    // 4. Nhóm cán bộ tín dụng (Người đại diện Quỹ)
    const officer_name = 'Nguyễn Thị Bích Thủy';
    const officer_doc_type = 'Căn cước công dân';
    const officer_doc_no = '084185002931';
    const officer_doc_date = '10/05/2021';
    const officer_doc_place = 'Cục CSQLHC về TTXH';

    // 5. Nhóm tài sản bảo đảm & Chủ sở hữu
    let chu_so_huu_1_ten = customer_name;
    let chu_so_huu_1_xung_ho = borrower_appellation;
    let chu_so_huu_1_ngay_sinh = customer_birth_year;
    let chu_so_huu_1_loai_giay_to = customer_doc_type;
    let chu_so_huu_1_so_giay_to = customer_doc_no;
    let chu_so_huu_1_ngay_cap = customer_doc_date;
    let chu_so_huu_1_co_quan_cap = customer_doc_place;
    let chu_so_huu_1_dia_chi = customer_address;

    let chu_so_huu_2_ten = DOTS;
    let chu_so_huu_2_xung_ho = DOTS;
    let chu_so_huu_2_ngay_sinh = DOTS;
    let chu_so_huu_2_loai_giay_to = 'Căn cước công dân';
    let chu_so_huu_2_so_giay_to = DOTS;
    let chu_so_huu_2_ngay_cap = DOTS;
    let chu_so_huu_2_co_quan_cap = DOTS;
    let chu_so_huu_2_dia_chi = DOTS;

    let co_chu_so_huu_2 = false;

    if (collaterals.length > 0) {
      const firstCol = collaterals[0];
      if (firstCol.ownerType === CollateralOwnerType.BAO_LANH && firstCol.thirdPartyInfo?.fullName) {
        // Bên thứ 3 bảo lãnh: "Ông/Bà + Họ và tên người bảo lãnh", KHÔNG thêm Hộ
        chu_so_huu_1_ten = firstCol.thirdPartyInfo.fullName.trim();
        chu_so_huu_1_xung_ho = formatPersonAppellation(firstCol.thirdPartyInfo.gender, false);
        chu_so_huu_1_ngay_sinh = firstCol.thirdPartyInfo.yearOfBirth ? String(firstCol.thirdPartyInfo.yearOfBirth) : DOTS;
        chu_so_huu_1_loai_giay_to = firstCol.thirdPartyInfo.idType === 'CAN_CUOC' ? 'Căn cước' : 'Căn cước công dân';
        chu_so_huu_1_so_giay_to = val(firstCol.thirdPartyInfo.idNumber);
        chu_so_huu_1_ngay_cap = customer_doc_date;
        chu_so_huu_1_co_quan_cap = val(firstCol.thirdPartyInfo.idIssuePlace, customer_doc_place);
        chu_so_huu_1_dia_chi = val(firstCol.thirdPartyInfo.address, customer_address);
      } else if (
        (firstCol.ownerType === CollateralOwnerType.NGUOI_THUA_KE_CA_NHAN ||
          firstCol.ownerType === CollateralOwnerType.NGUOI_THUA_KE_HO) &&
        has_inheritor
      ) {
        const isOwnerHeirHousehold = firstCol.ownerType === CollateralOwnerType.NGUOI_THUA_KE_HO;
        chu_so_huu_1_ten = inheritor_name;
        chu_so_huu_1_xung_ho = formatPersonAppellation(heir?.gender, isOwnerHeirHousehold);
        chu_so_huu_1_ngay_sinh = inheritor_birth_year;
        chu_so_huu_1_loai_giay_to = inheritor_doc_type;
        chu_so_huu_1_so_giay_to = inheritor_doc_no;
        chu_so_huu_1_ngay_cap = inheritor_doc_date;
        chu_so_huu_1_co_quan_cap = inheritor_doc_place;
        chu_so_huu_1_dia_chi = inheritor_address;
      }
    }

    // Nếu có người thừa kế khác chủ sở hữu 1 hoặc có người liên quan thứ hai
    if (has_inheritor && inheritor_name !== chu_so_huu_1_ten && inheritor_name !== DOTS) {
      co_chu_so_huu_2 = true;
      chu_so_huu_2_ten = inheritor_name;
      chu_so_huu_2_xung_ho = inheritor_appellation;
      chu_so_huu_2_ngay_sinh = inheritor_birth_year;
      chu_so_huu_2_loai_giay_to = inheritor_doc_type;
      chu_so_huu_2_so_giay_to = inheritor_doc_no;
      chu_so_huu_2_ngay_cap = inheritor_doc_date;
      chu_so_huu_2_co_quan_cap = inheritor_doc_place;
      chu_so_huu_2_dia_chi = inheritor_address;
    } else if (relatedPersons.length > 0 && relatedPersons[0].fullName) {
      const rp = relatedPersons[0];
      co_chu_so_huu_2 = true;
      chu_so_huu_2_ten = rp.fullName.trim();
      chu_so_huu_2_xung_ho = formatPersonAppellation(rp.gender, false);
      chu_so_huu_2_ngay_sinh = rp.yearOfBirth ? String(rp.yearOfBirth) : DOTS;
      chu_so_huu_2_loai_giay_to = rp.idType === 'CAN_CUOC' ? 'Căn cước' : 'Căn cước công dân';
      chu_so_huu_2_so_giay_to = val(rp.idNumber);
      chu_so_huu_2_ngay_cap = rp.idIssueDate ? formatDate(rp.idIssueDate) : DOTS;
      chu_so_huu_2_co_quan_cap = val(rp.idIssuePlace);
      chu_so_huu_2_dia_chi = val(rp.address, customer_address);
    }

    const dieu_6_chu_so_huu = buildMortgageOwnersDisplay(collaterals, member, heir);
    const cung_so_huu = co_chu_so_huu_2;

    const chu_so_huu_1_ten_viet_hoa = chu_so_huu_1_ten.toUpperCase();
    const chu_so_huu_2_ten_viet_hoa = chu_so_huu_2_ten.toUpperCase();
    const chu_so_huu_1_xung_ho_chuan = chu_so_huu_1_xung_ho;
    const chu_so_huu_2_xung_ho_chuan = co_chu_so_huu_2 ? chu_so_huu_2_xung_ho : DOTS;

    // Kiểm tra tài sản nhà ở và tài sản gắn liền với đất
    // Luôn giữ is_tai_san_nha_o = false để khối hiển thị thông tin số giấy chứng nhận không bị ẩn
    const is_tai_san_nha_o = false;
    const co_tai_san_gan_lien_dat = is_tai_san_nha_o;

    // Tính tổng giá trị định giá và làm tròn xuống đơn vị triệu đồng (Task F)
    const totalValuationRaw = collaterals.reduce(
      (sum, c) => sum + (c.valuationAmount || 0),
      0
    );
    const totalValuationNumber = floorToMillion(totalValuationRaw);
    const total_valuation = totalValuationNumber > 0 ? formatVndCurrency(totalValuationNumber) : DOTS;
    const tong_gia_tri_tai_san_bang_chu = totalValuationNumber > 0 ? vndToWords(totalValuationNumber) : DOTS;

    // Giá trị thế chấp 70% làm tròn xuống đơn vị triệu đồng (Task F)
    const gia_tri_the_chap_70_num = floorToMillion(totalValuationRaw * 0.7);
    const gia_tri_the_chap_70 = gia_tri_the_chap_70_num > 0 ? formatVndCurrency(gia_tri_the_chap_70_num) : DOTS;
    const gia_tri_the_chap_70_bang_chu = gia_tri_the_chap_70_num > 0 ? vndToWords(gia_tri_the_chap_70_num) : DOTS;

    // Ngày định giá
    const latestValuationDate = collaterals.find((c) => c.updatedAt)?.updatedAt || docDate;
    const ngay_dinh_gia = formatDate(latestValuationDate);

    // Tính diện tích và đọc chữ
    const totalAreaNumber = collaterals.reduce(
      (sum, c) => sum + (c.actualArea || c.area || 0),
      0
    );
    const tong_dien_tich_bang_chu = totalAreaNumber > 0 ? areaToWords(totalAreaNumber) : DOTS;

    // 6. Thuật toán gộp tài sản merged_asset_* theo Task D & E & F
    const certClauses = collaterals.map((c) =>
      buildCertificateClause((c as any).certificateType, c.certificateNumber || c.assetCode)
    );
    const firstCertClause = certClauses[0] || buildCertificateClause('GCN', null);
    const cert_prefix = firstCertClause.prefix;
    const merged_asset_cert_clause = certClauses.length > 0
      ? certClauses.map((cl) => cl.fullClause).join('; ')
      : EXTENDED_DOTS;

    const merged_asset_book_nos = mergeAssetValues(
      collaterals,
      (c) => c.assetCode || c.certificateNumber
    );

    const merged_asset_types = mergeAssetValues(
      collaterals,
      (c) => addCertificatePrefixToAssetType(getCollateralAssetTypeLabel(c.assetType))
    );

    const merged_asset_cert_types = mergeAssetValues(
      collaterals,
      (c) => buildCertificateClause((c as any).certificateType, c.certificateNumber || c.assetCode).typeName
    );

    const merged_asset_cert_nos = mergeAssetValues(
      collaterals,
      (c) => c.certificateNumber || c.assetCode
    );

    const merged_asset_issuing_agencies = mergeAssetValues(
      collaterals,
      (c) => c.issuePlace || 'UBND huyện Trà Cú'
    );

    const merged_asset_issue_dates = mergeAssetValues(
      collaterals,
      (c) => (c.issueDate ? formatDate(c.issueDate) : null)
    );

    const merged_asset_plot_nos = mergeAssetValues(
      collaterals,
      (c) => c.plotNumber
    );

    const merged_asset_sheet_nos = mergeAssetValues(
      collaterals,
      (c) => c.sheetNumber
    );

    const merged_asset_addresses = mergeAssetValues(
      collaterals,
      (c) => c.address || member.address
    );

    // Hạn chế sử dụng đất: hiển thị "........." nếu không có dữ liệu (Task D)
    const merged_asset_restrictions = mergeAssetValues(
      collaterals,
      (c) => formatLandRestriction(c.useRestrictions),
      LAND_EMPTY_DOTS
    );

    const merged_asset_use_forms = mergeAssetValues(
      collaterals,
      () => 'Sử dụng riêng'
    );

    const merged_asset_use_purposes = mergeAssetValues(
      collaterals,
      (c) => c.usagePurpose || 'Đất ở tại nông thôn + Đất trồng cây lâu năm'
    );

    const merged_asset_use_terms = mergeAssetValues(
      collaterals,
      (c) => c.usageDuration || 'Lâu dài'
    );

    const merged_asset_use_origins = mergeAssetValues(
      collaterals,
      (c) => c.origin || 'Nhận chuyển nhượng quyền sử dụng đất'
    );

    const merged_asset_owners = mergeAssetValues(
      collaterals,
      (c) => {
        const name = c.thirdPartyInfo?.fullName || member.fullName;
        const gen = c.thirdPartyInfo?.gender || member.gender;
        const isH = c.ownerType === CollateralOwnerType.NGUOI_VAY_HO;
        return formatFullNameWithAppellation(name, gen, isH);
      }
    );

    const merged_asset_total_area =
      collaterals.length > 1
        ? mergeAssetValues(collaterals, (c) => {
            const a = c.actualArea || c.area;
            return a ? `${a.toLocaleString('vi-VN')} m²` : null;
          })
        : totalAreaNumber > 0
        ? `${totalAreaNumber.toLocaleString('vi-VN')} m²`
        : DOTS;

    const merged_asset_total_area_words = tong_dien_tich_bang_chu;
    const merged_asset_valuations_words = tong_gia_tri_tai_san_bang_chu;

    // Phân loại địa chỉ tài sản (cùng địa chỉ hay nhiều địa chỉ)
    const uniqueAddresses = new Set(
      collaterals.map((c) => (c.address || member.address || '').trim().toLowerCase()).filter(Boolean)
    );
    const is_cung_dia_chi = uniqueAddresses.size <= 1;
    const is_nhieu_dia_chi = uniqueAddresses.size > 1;

    // Phân loại quy mô hạn mức
    const is_the_chap_duoi_100tr = loan.loanAmount < 100_000_000;
    const is_the_chap_tu_100tr = loan.loanAmount >= 100_000_000;
    const is_tin_chap_duoi_100tr = loan.loanAmount < 100_000_000;
    const is_tin_chap_tu_100tr = loan.loanAmount >= 100_000_000;
    const so_luong_tai_san = collaterals.length > 0 ? String(collaterals.length).padStart(2, '0') : DOTS;

    // 7. Nhóm Phương án tài chính (PA, TC4, TIN4)
    const termFactor =
      loan.termType === LoanTermType.TRUNG_HAN || (loan.termMonths && loan.termMonths > 12) ? 2 : 1;
    const loan_purpose = val(loan.loanPlan?.purpose, 'Sửa chữa, cải tạo nhà ở gia đình');
    const plan_total_need = formatVndCurrency(loan.loanPlan?.loanAmount || loan.loanAmount);
    const plan_own_capital = formatVndCurrency(loan.loanPlan?.ownCapital || 0);
    const loan_term_months = `${loan.termMonths || 12} tháng`;
    const tong_chi_phi = formatVndCurrency(loan.loanPlan?.totalExpenses || 0);
    const tong_nguon_thu = formatVndCurrency(loan.loanPlan?.totalRevenues || 0);
    const rawProfit = (loan.loanPlan?.totalRevenues || 0) - (loan.loanPlan?.totalExpenses || 0);
    const loi_nhuan = formatVndCurrency(Math.max(0, rawProfit));

    const expenses = (loan.loanPlan?.expenses || []).map((exp) => {
      const isInterest = /Chi phí trả lãi|Trả lãi tiền vay/i.test(exp.name);
      const name = isInterest
        ? buildInterestExpenseItemName(loan.loanAmount, loan.interestRate, termFactor, exp.amount)
        : exp.name;
      return {
        name,
        amount: formatVndCurrency(exp.amount),
      };
    });

    const incomes = (loan.loanPlan?.revenues || []).map((rev) => ({
      name: rev.name,
      amount: formatVndCurrency(rev.amount),
    }));

    // 8. Nhóm Báo cáo tình hình thu nhập (BC_THU_NHAP)
    const is_trung_han =
      loan.termType === LoanTermType.TRUNG_HAN || (loan.termMonths && loan.termMonths > 12);
    const revenuesList = loan.loanPlan?.revenues || [];
    const livestockItem = revenuesList.find((r) => /chăn nuôi/i.test(r.name));
    const riceItem = revenuesList.find((r) => /lúa|nông nghiệp/i.test(r.name));
    const otherItem = revenuesList.find((r) => /khác/i.test(r.name));

    const nguon_thu_chan_nuoi = livestockItem ? formatVndCurrency(livestockItem.amount) : DOTS;
    const nguon_thu_lua = riceItem ? formatVndCurrency(riceItem.amount) : DOTS;
    const nguon_thu_khac = otherItem ? formatVndCurrency(otherItem.amount) : DOTS;

    // 9. Nhóm Kê khai người liên quan (TC7)
    // Nếu danh sách không có người liên quan, tạo 1 dòng mặc định với các dấu chấm theo Yêu cầu E.
    const nguoi_lien_quan =
      relatedPersons.length > 0
        ? relatedPersons.map((rp, idx) => ({
            index: idx + 1,
            ho_ten: val(rp.fullName),
            so_giay_to: val(rp.idNumber),
            ngay_cap: rp.idIssueDate ? formatDate(rp.idIssueDate) : DOTS,
            noi_cap: val(rp.idIssuePlace),
            quan_he: val(rp.relatedPersonRelationship || rp.relationship),
            von_vay: 'Không',
          }))
        : [
            {
              index: '1',
              ho_ten: DOTS,
              so_giay_to: DOTS,
              ngay_cap: DOTS,
              noi_cap: DOTS,
              quan_he: DOTS,
              von_vay: DOTS,
            },
          ];

    // 10. Nhóm Biên bản định giá (TC8)
    const thua_dat_dinh_gia =
      collaterals.length > 0
        ? collaterals.map((c, idx) => {
            const areaVal = c.actualArea || c.area || 0;
            const totalVal = floorToMillion(c.valuationAmount || 0);
            // Giữ nguyên đơn giá định giá gốc (Task B), tuyệt đối không tính ngược làm thay đổi đơn giá
            const pricePerM2 =
              c.pricePerSqMeter !== null && c.pricePerSqMeter !== undefined && c.pricePerSqMeter > 0
                ? c.pricePerSqMeter
                : (areaVal > 0 ? Math.round(totalVal / areaVal) : 0);
            return {
              index: idx + 1,
              plot_no: val(c.plotNumber),
              sheet_no: val(c.sheetNumber),
              area: areaVal > 0 ? areaVal.toLocaleString('vi-VN') : DOTS,
              price_per_m2: pricePerM2 > 0 ? `${pricePerM2.toLocaleString('vi-VN')}đ` : DOTS,
              total_value: totalVal > 0 ? formatVndCurrency(totalVal) : DOTS,
              note: formatCollateralNote(c.useRestrictions),
            };
          })
        : [
            {
              index: '1',
              plot_no: DOTS,
              sheet_no: DOTS,
              area: DOTS,
              price_per_m2: DOTS,
              total_value: DOTS,
              note: '',
            },
          ];

    // 11. Nhóm danh sách địa chỉ thửa đất chi tiết (Hợp đồng thế chấp, Đơn đăng ký, Đơn xóa)
    const danh_sach_dia_chi_thua =
      collaterals.length > 0
        ? collaterals.map((c, idx) => {
            const areaVal = c.actualArea || c.area || 0;
            return {
              stt: idx + 1,
              so_thua: val(c.plotNumber),
              to_ban_do: val(c.sheetNumber),
              dien_tich_m2: areaVal > 0 ? areaVal.toLocaleString('vi-VN') : DOTS,
              dien_tich_chu: areaVal > 0 ? areaToWords(areaVal) : DOTS,
              hinh_thuc_su_dung: 'Sử dụng riêng',
              muc_dich_su_dung: val(c.usagePurpose, 'Đất ở tại nông thôn + Đất trồng cây lâu năm'),
              thoi_han_su_dung: val(c.usageDuration, 'Lâu dài'),
              nguon_goc_su_dung: val(c.origin, 'Nhận chuyển nhượng quyền sử dụng đất'),
              dia_chi: val(c.address, member.address),
              han_che: formatCollateralNote(c.useRestrictions),
              loai_tai_san: addCertificatePrefixToAssetType(getCollateralAssetTypeLabel(c.assetType)),
              loai_gcn: getCollateralCertificateTypeLabel((c as any).certificateType),
              so_phat_hanh: val(c.certificateNumber),
              so_vao_so: val(c.assetCode, val(c.certificateNumber)),
              ngay_cap: c.issueDate ? formatDate(c.issueDate) : DOTS,
              co_quan_cap: val(c.issuePlace, 'UBND huyện Trà Cú'),
            };
          })
        : [
            {
              stt: '1',
              so_thua: DOTS,
              to_ban_do: DOTS,
              dien_tich_m2: DOTS,
              dien_tich_chu: DOTS,
              hinh_thuc_su_dung: DOTS,
              muc_dich_su_dung: DOTS,
              thoi_han_su_dung: DOTS,
              nguon_goc_su_dung: DOTS,
              dia_chi: DOTS,
              han_che: '',
              loai_tai_san: DOTS,
              loai_gcn: DOTS,
              so_phat_hanh: DOTS,
              so_vao_so: DOTS,
              ngay_cap: DOTS,
              co_quan_cap: DOTS,
            },
          ];

    const firstCol = collaterals[0];
    const firstColArea = firstCol ? firstCol.actualArea || firstCol.area || 0 : 0;
    const firstColVal = floorToMillion(firstCol?.valuationAmount || 0);
    const firstColPricePerM2 =
      firstCol?.pricePerSqMeter && firstCol.pricePerSqMeter > 0
        ? firstCol.pricePerSqMeter
        : (firstColArea > 0 ? Math.round(firstColVal / firstColArea) : 0);
    const don_gia_dinh_gia =
      firstColPricePerM2 > 0 ? `${firstColPricePerM2.toLocaleString('vi-VN')}đ` : DOTS;
    const area = firstColArea > 0 ? firstColArea.toLocaleString('vi-VN') : DOTS;
    const total_value = firstColVal > 0 ? formatVndCurrency(firstColVal) : DOTS;

    const is_appraisal_thi_truong = Boolean(firstCol?.valuationMethod === 'THI_TRUONG');
    const is_appraisal_quy_dinh = !is_appraisal_thi_truong;
    const is_appraisal_nghi_dinh_cu = false;
    const is_appraisal_thi_truong_va_nghi_dinh_quy = false;
    const is_dat_ho = Boolean(
      collaterals.some(
        (c) =>
          c.ownerType === CollateralOwnerType.NGUOI_VAY_HO ||
          c.ownerType === CollateralOwnerType.NGUOI_THUA_KE_HO
      )
    );
    const is_vay_bao_lanh = Boolean(
      collaterals.some((c) => c.ownerType === CollateralOwnerType.BAO_LANH)
    );
    const is_nhom_1 = true;

    const nguoi_con_lai_ten = inheritor_name !== DOTS ? inheritor_name : val(relatedPersons[0]?.fullName);
    const nguoi_con_lai_xung_ho = formatPersonAppellation(
      heir?.gender || relatedPersons[0]?.gender,
      isHeirHousehold
    );
    const nguoi_con_lai_nam_sinh = heir?.yearOfBirth ? String(heir.yearOfBirth) : DOTS;
    const nguoi_con_lai_loai_giay_to = heir?.idType === 'CAN_CUOC' ? 'Căn cước' : 'Căn cước công dân';
    const nguoi_con_lai_so_giay_to = val(heir?.idNumber);
    const nguoi_con_lai_ngay_cap = heir?.idIssueDate ? formatDate(heir.idIssueDate) : DOTS;
    const nguoi_con_lai_noi_cap = val(heir?.idIssuePlace);
    const nguoi_con_lai_dia_chi = val(heir?.address, customer_address);

    const xung_ho = chu_so_huu_1_xung_ho;

    // Task H: Kiểm tra số HĐTC khác số khế ước
    const rawMortgageNo = (mortgage?.contractNumber || '').trim();
    const rawLoanNo = (loan.contractNumber || '').trim();
    const cleanMortgage = rawMortgageNo.replace(/[\/\\].*$/, '').toLowerCase();
    const cleanLoan = rawLoanNo.replace(/[\/\\].*$/, '').toLowerCase();
    const has_diff_mortgage_clause = Boolean(
      cleanMortgage && cleanLoan && cleanMortgage !== cleanLoan
    );
    const khe_uoc_ngay_cap = loan.contractDate
      ? formatDate(loan.contractDate)
      : (loan.createdAt ? formatDate(loan.createdAt) : DOTS);

    return {
      // Khách hàng (Người vay)
      customer_name,
      customer_birth_year,
      customer_address,
      customer_doc_type,
      customer_doc_no,
      customer_doc_date,
      customer_doc_place,
      borrower_appellation,
      has_member_id,
      member_id,

      // Người thừa kế
      has_inheritor,
      inheritor_name,
      inheritor_birth_year,
      inheritor_relationship,
      inheritor_address,
      inheritor_doc_type,
      inheritor_doc_no,
      inheritor_doc_date,
      inheritor_doc_place,
      inheritor_appellation,

      // Số tiền vay, Khế ước & Ngày lập
      loan_amount,
      loan_amount_words,
      created_day,
      created_month,
      created_year,
      current_day,
      current_month,
      current_year,
      khe_uoc_no,
      khe_uoc_date,
      khe_uoc_so,
      khe_uoc_thang,
      khe_uoc_nam,
      mortgage_contract_no,
      is_mortgage_eq_khe_uoc,
      has_diff_mortgage_clause,
      khe_uoc_ngay_cap,
      dieu_6_chu_so_huu,
      hd_the_chap_so,
      hd_the_chap_thang,
      hd_the_chap_nam,
      mortgage_registration_day,
      mortgage_registration_month,
      mortgage_registration_year,

      // Cán bộ tín dụng
      officer_name,
      officer_doc_type,
      officer_doc_no,
      officer_doc_date,
      officer_doc_place,

      // Chủ sở hữu 1 & 2
      chu_so_huu_1_ten,
      chu_so_huu_1_ten_viet_hoa,
      chu_so_huu_1_xung_ho,
      chu_so_huu_1_xung_ho_chuan,
      chu_so_huu_1_ngay_sinh,
      chu_so_huu_1_loai_giay_to,
      chu_so_huu_1_so_giay_to,
      chu_so_huu_1_ngay_cap,
      chu_so_huu_1_co_quan_cap,
      chu_so_huu_1_noi_cap: chu_so_huu_1_co_quan_cap,
      chu_so_huu_1_dia_chi,

      chu_so_huu_2_ten,
      chu_so_huu_2_ten_viet_hoa,
      chu_so_huu_2_xung_ho,
      chu_so_huu_2_xung_ho_chuan,
      chu_so_huu_2_ngay_sinh,
      chu_so_huu_2_loai_giay_to,
      chu_so_huu_2_so_giay_to,
      chu_so_huu_2_ngay_cap,
      chu_so_huu_2_co_quan_cap,
      chu_so_huu_2_noi_cap: chu_so_huu_2_co_quan_cap,
      chu_so_huu_2_dia_chi,
      cung_so_huu,
      xung_ho,

      // Tài sản bảo đảm
      is_tai_san_nha_o,
      co_tai_san_gan_lien_dat,
      total_valuation,
      tong_gia_tri_tai_san_bang_chu,
      gia_tri_the_chap_70,
      gia_tri_the_chap_70_bang_chu,
      ngay_dinh_gia,
      tong_dien_tich_bang_chu,
      so_luong_tai_san,
      is_cung_dia_chi,
      is_nhieu_dia_chi,
      is_the_chap_duoi_100tr,
      is_the_chap_tu_100tr,
      is_tin_chap_duoi_100tr,
      is_tin_chap_tu_100tr,
      is_vay_bao_lanh,
      is_nhom_1,

      // Nhóm merged_asset_*
      merged_asset_book_nos,
      merged_asset_types,
      cert_prefix,
      merged_asset_cert_clause,
      merged_asset_cert_types,
      merged_asset_cert_nos,
      merged_asset_issuing_agencies,
      merged_asset_issue_dates,
      merged_asset_plot_nos,
      merged_asset_sheet_nos,
      merged_asset_addresses,
      merged_asset_restrictions,
      merged_asset_use_forms,
      merged_asset_use_purposes,
      merged_asset_use_terms,
      merged_asset_use_origins,
      merged_asset_owners,
      merged_asset_total_area,
      merged_asset_total_area_words,
      merged_asset_valuations_words,

      // Phương án vay vốn & Tài chính (PA, TC4, TIN4)
      loan_purpose,
      plan_total_need,
      plan_own_capital,
      loan_term_months,
      tong_chi_phi,
      tong_nguon_thu,
      loi_nhuan,
      expenses,
      incomes,

      // Báo cáo thu nhập (BC_THU_NHAP)
      is_trung_han,
      nguon_thu_chan_nuoi,
      nguon_thu_lua,
      nguon_thu_khac,

      // Kê khai người liên quan (TC7)
      nguoi_lien_quan,

      // Biên bản định giá (TC8)
      thua_dat_dinh_gia,
      don_gia_dinh_gia,
      area,
      total_value,
      is_appraisal_quy_dinh,
      is_appraisal_thi_truong,
      is_appraisal_nghi_dinh_cu,
      is_appraisal_thi_truong_va_nghi_dinh_quy,
      is_dat_ho,
      nguoi_con_lai_ten,
      nguoi_con_lai_xung_ho,
      nguoi_con_lai_nam_sinh,
      nguoi_con_lai_loai_giay_to,
      nguoi_con_lai_so_giay_to,
      nguoi_con_lai_ngay_cap,
      nguoi_con_lai_noi_cap,
      nguoi_con_lai_dia_chi,
      has_nguoi_trong_ho: false,
      nguoi_trong_ho: [],
      stt3: '3',

      // Danh sách thửa đất chi tiết (HĐ thế chấp, Đơn đăng ký, Đơn xóa)
      danh_sach_dia_chi_thua,
    };
  }

  /**
   * Kiểm tra thông tin khoản vay trước khi xuất tài liệu Word,
   * trả về danh sách cảnh báo nếu thiếu các trường quan trọng.
   */
  validateLoanForDocument(loan: LoanWithDocumentData, templateCode?: string): DocumentValidationWarning[] {
    const warnings: DocumentValidationWarning[] = [];

    if (!loan.member) {
      warnings.push({
        field: 'member',
        message: 'Khoản vay chưa có thông tin thành viên vay vốn.',
        isBlocking: true,
      });
    } else {
      if (!loan.member.idNumber) {
        warnings.push({
          field: 'member.idNumber',
          message: 'Thành viên chưa có số CCCD/Căn cước (sẽ hiển thị dấu chấm trong biểu mẫu).',
        });
      }
      if (!loan.member.address) {
        warnings.push({
          field: 'member.address',
          message: 'Thành viên chưa có địa chỉ cư trú đầy đủ (sẽ hiển thị dấu chấm trong biểu mẫu).',
        });
      }
    }

    if (loan.loanType === LoanType.THE_CHAP) {
      const collaterals = loan.collaterals ?? [];
      if (collaterals.length === 0) {
        warnings.push({
          field: 'collaterals',
          message: 'Khoản vay thế chấp chưa khai báo tài sản bảo đảm (sổ đỏ). Các bảng biểu tài sản sẽ điền dấu chấm.',
          isBlocking: false,
        });
      }
      if (!loan.contractNumber) {
        warnings.push({
          field: 'contractNumber',
          message: 'Khoản vay chưa được cấp số khế ước nhận nợ.',
        });
      }
    }

    return warnings;
  }
}

export const documentPlaceholderService = new DocumentPlaceholderService();
