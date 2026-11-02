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
import { DocumentTemplateKey, DocumentValidationWarning } from './document.types';

export type LoanWithDocumentData = Loan & {
  member: Member;
  collaterals?: Collateral[];
  relatedPersons?: RelatedPerson[];
};

/**
 * Định dạng số tiền thành chuỗi phân cách hàng nghìn tiếng Việt.
 * Ví dụ: 150000000 -> "150.000.000 đồng"
 */
export function formatVndCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) {
    return '0 đồng';
  }
  const formatted = Math.round(amount).toLocaleString('vi-VN');
  return `${formatted} đồng`;
}

/**
 * Thuật toán gộp thông tin của nhiều tài sản bảo đảm (merged_asset_*):
 * 1. Lấy giá trị của từng tài sản theo đúng thứ tự mảng tài sản trong khoản vay.
 * 2. Chuẩn hóa giá trị (trim khoảng trắng).
 * 3. Bỏ qua các giá trị null, undefined hoặc chuỗi rỗng.
 * 4. Loại bỏ các giá trị trùng lặp, giữ lại thứ tự xuất hiện đầu tiên.
 * 5. Nối các giá trị khác nhau bằng dấu chấm phẩy và khoảng trắng "; ".
 * 6. Tuyệt đối không thêm dấu ";" ở đầu hoặc cuối, không tạo ";;" liên tiếp.
 * 7. Nếu tất cả đều rỗng, trả về fallbackValue (mặc định "").
 */
export function mergeAssetValues<T>(
  collaterals: Collateral[] | undefined,
  extractor: (c: Collateral) => string | number | null | undefined,
  fallbackValue: string = '……'
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
  buildPlaceholders(loan: LoanWithDocumentData, _templateKey: DocumentTemplateKey): Record<string, any> {
    const member = loan.member;
    const heir = loan.heir as Heir | null;
    const collaterals = (loan.collaterals ?? []).filter((c) => !c.id.startsWith('mock_'));
    const relatedPersons = loan.relatedPersons ?? [];
    const mortgage = loan.mortgageContract as MortgageContract | null;

    // 1. Nhóm thông tin khách hàng (Người vay)
    const has_member_id = Boolean(member.memberCode && member.memberCode.trim().length > 0);
    const member_id = has_member_id ? member.memberCode.trim() : '';

    const customer_name = member.fullName ? member.fullName.trim() : '';
    const customer_birth_year = member.yearOfBirth ? String(member.yearOfBirth) : '';
    const customer_address = member.address ? member.address.trim() : '';
    const customer_doc_type = member.idType === 'CAN_CUOC' ? 'Căn cước' : 'Căn cước công dân';
    const customer_doc_no = member.idNumber ? member.idNumber.trim() : '';
    const customer_doc_date = member.idIssueDate ? formatDate(member.idIssueDate) : '';
    const customer_doc_place = member.idIssuePlace ? member.idIssuePlace.trim() : '';
    const borrower_appellation = member.gender === 'NU' ? 'Bà' : 'Ông';

    // 2. Nhóm thông tin người thừa kế
    const has_inheritor = Boolean(heir && heir.fullName && heir.fullName.trim().length > 0);
    const inheritor_name = has_inheritor ? heir!.fullName.trim() : '';
    const inheritor_birth_year = has_inheritor && heir!.yearOfBirth ? String(heir!.yearOfBirth) : '';
    const inheritor_relationship = has_inheritor ? (heir!.relationship?.trim() || '') : '';
    const inheritor_address = has_inheritor ? (heir!.address?.trim() || '') : '';
    const inheritor_doc_type = has_inheritor
      ? heir!.idType === 'CAN_CUOC'
        ? 'Căn cước'
        : 'Căn cước công dân'
      : '';
    const inheritor_doc_no = has_inheritor ? (heir!.idNumber?.trim() || '') : '';
    const inheritor_doc_date = has_inheritor && heir!.idIssueDate ? formatDate(heir!.idIssueDate) : '';
    const inheritor_doc_place = has_inheritor ? (heir!.idIssuePlace?.trim() || '') : '';
    const inheritor_appellation = heir?.gender === 'NU' ? 'Bà' : 'Ông';

    // 3. Nhóm số tiền vay, khế ước & ngày tháng
    const loan_amount = formatVndCurrency(loan.loanAmount);
    const loan_amount_words = vndToWords(loan.loanAmount);

    const docDate = loan.contractDate || loan.createdAt || new Date();
    const created_day = dayjs(docDate).format('DD');
    const created_month = dayjs(docDate).format('MM');
    const created_year = dayjs(docDate).format('YYYY');

    const khe_uoc_no = loan.contractNumber ? loan.contractNumber.trim() : '……';
    const khe_uoc_date = loan.contractDate ? formatDate(loan.contractDate) : '……';
    const khe_uoc_so = khe_uoc_no;
    const khe_uoc_thang = dayjs(docDate).format('MM');
    const khe_uoc_nam = dayjs(docDate).format('YYYY');

    const mortgage_contract_no = mortgage?.contractNumber
      ? mortgage.contractNumber.trim()
      : khe_uoc_no;

    const is_mortgage_eq_khe_uoc = Boolean(
      mortgage?.contractNumber &&
      loan.contractNumber &&
      mortgage.contractNumber.trim().toLowerCase() === loan.contractNumber.trim().toLowerCase()
    );

    // 4. Nhóm cán bộ tín dụng (Người đại diện Quỹ)
    const officer_name = 'Nguyễn Thị Bích Thủy';
    const officer_doc_type = 'Căn cước công dân';
    const officer_doc_no = '084185002931';
    const officer_doc_date = '10/05/2021';
    const officer_doc_place = 'Cục Cảnh Sát QLHC về TTXH';

    // 5. Nhóm tài sản bảo đảm & Chủ sở hữu
    let chu_so_huu_1_ten = customer_name;
    let chu_so_huu_1_xung_ho = borrower_appellation;
    let chu_so_huu_1_ngay_sinh = customer_birth_year;
    let chu_so_huu_1_loai_giay_to = customer_doc_type;
    let chu_so_huu_1_so_giay_to = customer_doc_no;
    let chu_so_huu_1_ngay_cap = customer_doc_date;
    let chu_so_huu_1_co_quan_cap = customer_doc_place;
    let chu_so_huu_1_dia_chi = customer_address;

    let chu_so_huu_2_ten = '';
    let chu_so_huu_2_xung_ho = '';
    let chu_so_huu_2_ngay_sinh = '';
    let chu_so_huu_2_loai_giay_to = '';
    let chu_so_huu_2_so_giay_to = '';
    let chu_so_huu_2_ngay_cap = '';
    let chu_so_huu_2_co_quan_cap = '';
    let chu_so_huu_2_dia_chi = '';

    if (collaterals.length > 0) {
      const firstCol = collaterals[0];
      if (firstCol.ownerType === CollateralOwnerType.BAO_LANH && firstCol.thirdPartyInfo?.fullName) {
        chu_so_huu_1_ten = firstCol.thirdPartyInfo.fullName.trim();
        chu_so_huu_1_xung_ho = firstCol.thirdPartyInfo.gender === 'NU' ? 'Bà' : 'Ông';
        chu_so_huu_1_ngay_sinh = firstCol.thirdPartyInfo.yearOfBirth ? String(firstCol.thirdPartyInfo.yearOfBirth) : '';
        chu_so_huu_1_loai_giay_to = firstCol.thirdPartyInfo.idType === 'CAN_CUOC' ? 'Căn cước' : 'Căn cước công dân';
        chu_so_huu_1_so_giay_to = firstCol.thirdPartyInfo.idNumber ? firstCol.thirdPartyInfo.idNumber.trim() : '';
        chu_so_huu_1_ngay_cap = customer_doc_date;
        chu_so_huu_1_co_quan_cap = firstCol.thirdPartyInfo.idIssuePlace || customer_doc_place;
        chu_so_huu_1_dia_chi = firstCol.thirdPartyInfo.address || customer_address;
      } else if (
        (firstCol.ownerType === CollateralOwnerType.NGUOI_THUA_KE_CA_NHAN ||
          firstCol.ownerType === CollateralOwnerType.NGUOI_THUA_KE_HO) &&
        inheritor_name
      ) {
        chu_so_huu_1_ten = inheritor_name;
        chu_so_huu_1_xung_ho = inheritor_appellation;
        chu_so_huu_1_ngay_sinh = inheritor_birth_year;
        chu_so_huu_1_loai_giay_to = inheritor_doc_type;
        chu_so_huu_1_so_giay_to = inheritor_doc_no;
        chu_so_huu_1_ngay_cap = inheritor_doc_date;
        chu_so_huu_1_co_quan_cap = inheritor_doc_place;
        chu_so_huu_1_dia_chi = inheritor_address;
      }
    }

    // Nếu có người thừa kế khác chủ sở hữu 1 hoặc có người liên quan thứ hai
    if (has_inheritor && inheritor_name && inheritor_name !== chu_so_huu_1_ten) {
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
      chu_so_huu_2_ten = rp.fullName.trim();
      chu_so_huu_2_xung_ho = rp.gender === 'NU' ? 'Bà' : 'Ông';
      chu_so_huu_2_ngay_sinh = rp.yearOfBirth ? String(rp.yearOfBirth) : '';
      chu_so_huu_2_loai_giay_to = rp.idType === 'CAN_CUOC' ? 'Căn cước' : 'Căn cước công dân';
      chu_so_huu_2_so_giay_to = rp.idNumber ? rp.idNumber.trim() : '';
      chu_so_huu_2_ngay_cap = rp.idIssueDate ? formatDate(rp.idIssueDate) : '';
      chu_so_huu_2_co_quan_cap = rp.idIssuePlace || '';
      chu_so_huu_2_dia_chi = rp.address || customer_address;
    }

    const cung_so_huu = Boolean(chu_so_huu_2_ten && chu_so_huu_2_ten.length > 0);

    // Kiểm tra tài sản nhà ở và tài sản gắn liền với đất
    const is_tai_san_nha_o = collaterals.some(
      (c) => c.assetType === 'QUYEN_SU_DUNG_DAT_VA_TAI_SAN_GAN_LIEN'
    );
    const co_tai_san_gan_lien_dat = is_tai_san_nha_o;

    // Tính tổng giá trị định giá
    const totalValuationNumber = collaterals.reduce(
      (sum, c) => sum + (c.valuationAmount || 0),
      0
    );
    const total_valuation = formatVndCurrency(totalValuationNumber);
    const tong_gia_tri_tai_san_bang_chu = totalValuationNumber > 0 ? vndToWords(totalValuationNumber) : '……';

    // Ngày định giá
    const latestValuationDate = collaterals.find((c) => c.updatedAt)?.updatedAt || docDate;
    const ngay_dinh_gia = formatDate(latestValuationDate);

    // Tính diện tích và đọc chữ
    const totalAreaNumber = collaterals.reduce(
      (sum, c) => sum + (c.actualArea || c.area || 0),
      0
    );
    const tong_dien_tich_bang_chu = totalAreaNumber > 0 ? areaToWords(totalAreaNumber) : '……';

    // 6. Thuật toán gộp tài sản merged_asset_*
    const merged_asset_book_nos = mergeAssetValues(
      collaterals,
      (c) => c.certificateNumber || c.assetCode
    );

    const merged_asset_types = mergeAssetValues(
      collaterals,
      (c) =>
        c.assetType === 'QUYEN_SU_DUNG_DAT_VA_TAI_SAN_GAN_LIEN'
          ? 'Quyền sử dụng đất và tài sản gắn liền với đất'
          : 'Quyền sử dụng đất'
    );

    const merged_asset_cert_types = mergeAssetValues(
      collaterals,
      () => 'GCN QSDĐ'
    );

    const merged_asset_cert_nos = mergeAssetValues(
      collaterals,
      (c) => c.certificateNumber
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

    const merged_asset_restrictions = mergeAssetValues(
      collaterals,
      (c) => c.useRestrictions || 'Không có'
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
      (c) => c.thirdPartyInfo?.fullName || member.fullName
    );

    const merged_asset_total_area =
      collaterals.length > 1
        ? mergeAssetValues(collaterals, (c) => {
            const a = c.actualArea || c.area;
            return a ? `${a.toLocaleString('vi-VN')} m²` : null;
          })
        : totalAreaNumber > 0
        ? `${totalAreaNumber.toLocaleString('vi-VN')} m²`
        : '……';

    // 7. Nhóm Phương án tài chính (PA, TC4, TIN4)
    const termFactor = loan.termType === LoanTermType.TRUNG_HAN || (loan.termMonths && loan.termMonths > 12) ? 2 : 1;
    const loan_purpose = loan.loanPlan?.purpose?.trim() || 'Sửa chữa, cải tạo nhà ở gia đình';
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
    const is_trung_han = loan.termType === LoanTermType.TRUNG_HAN || (loan.termMonths && loan.termMonths > 12);
    const revenuesList = loan.loanPlan?.revenues || [];
    const livestockItem = revenuesList.find((r) => /chăn nuôi/i.test(r.name));
    const riceItem = revenuesList.find((r) => /lúa|nông nghiệp/i.test(r.name));
    const otherItem = revenuesList.find((r) => /khác/i.test(r.name));

    const nguon_thu_chan_nuoi = livestockItem ? formatVndCurrency(livestockItem.amount) : '……';
    const nguon_thu_lua = riceItem ? formatVndCurrency(riceItem.amount) : '……';
    const nguon_thu_khac = otherItem ? formatVndCurrency(otherItem.amount) : '……';

    // 9. Nhóm Kê khai người liên quan (TC7)
    const nguoi_lien_quan = relatedPersons.map((rp, idx) => ({
      index: idx + 1,
      ho_ten: rp.fullName ? rp.fullName.trim() : '……',
      so_giay_to: rp.idNumber ? rp.idNumber.trim() : '……',
      ngay_cap: rp.idIssueDate ? formatDate(rp.idIssueDate) : '……',
      noi_cap: rp.idIssuePlace ? rp.idIssuePlace.trim() : '……',
      quan_he: rp.relationship ? rp.relationship.trim() : '……',
      von_vay: 'Không',
    }));

    // 10. Nhóm Biên bản định giá (TC8)
    const thua_dat_dinh_gia = collaterals.map((c, idx) => {
      const areaVal = c.actualArea || c.area || 0;
      const totalVal = c.valuationAmount || 0;
      const pricePerM2 = areaVal > 0 ? Math.round(totalVal / areaVal) : 0;
      return {
        index: idx + 1,
        plot_no: c.plotNumber ? c.plotNumber.trim() : '……',
        sheet_no: c.sheetNumber ? c.sheetNumber.trim() : '……',
        area: areaVal > 0 ? areaVal.toLocaleString('vi-VN') : '……',
        price_per_m2: pricePerM2 > 0 ? pricePerM2.toLocaleString('vi-VN') : '……',
        total_value: totalVal > 0 ? totalVal.toLocaleString('vi-VN') : '……',
        note: c.useRestrictions ? c.useRestrictions.trim() : '',
      };
    });

    const firstCol = collaterals[0];
    const firstColArea = firstCol ? firstCol.actualArea || firstCol.area || 0 : 0;
    const firstColVal = firstCol?.valuationAmount || 0;
    const firstColPricePerM2 = firstColArea > 0 ? Math.round(firstColVal / firstColArea) : 0;
    const don_gia_dinh_gia = firstColPricePerM2 > 0 ? `${firstColPricePerM2.toLocaleString('vi-VN')} đồng` : '……';
    const area = firstColArea > 0 ? firstColArea.toLocaleString('vi-VN') : '……';
    const total_value = formatVndCurrency(firstColVal);

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

    const nguoi_con_lai_ten = inheritor_name || (relatedPersons[0]?.fullName ?? '');
    const nguoi_con_lai_xung_ho = heir?.gender === 'NU' ? 'Bà' : 'Ông';
    const nguoi_con_lai_nam_sinh = heir?.yearOfBirth ? String(heir.yearOfBirth) : '';
    const nguoi_con_lai_loai_giay_to = heir?.idType === 'CAN_CUOC' ? 'Căn cước' : 'Căn cước công dân';
    const nguoi_con_lai_so_giay_to = heir?.idNumber || '';
    const nguoi_con_lai_ngay_cap = heir?.idIssueDate ? formatDate(heir.idIssueDate) : '';
    const nguoi_con_lai_noi_cap = heir?.idIssuePlace || '';
    const nguoi_con_lai_dia_chi = heir?.address || customer_address;

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
      khe_uoc_no,
      khe_uoc_date,
      khe_uoc_so,
      khe_uoc_thang,
      khe_uoc_nam,
      mortgage_contract_no,
      is_mortgage_eq_khe_uoc,

      // Cán bộ tín dụng
      officer_name,
      officer_doc_type,
      officer_doc_no,
      officer_doc_date,
      officer_doc_place,

      // Chủ sở hữu 1 & 2
      chu_so_huu_1_ten,
      chu_so_huu_1_xung_ho,
      chu_so_huu_1_xung_ho_chuan: chu_so_huu_1_xung_ho,
      chu_so_huu_1_ngay_sinh,
      chu_so_huu_1_loai_giay_to,
      chu_so_huu_1_so_giay_to,
      chu_so_huu_1_ngay_cap,
      chu_so_huu_1_co_quan_cap,
      chu_so_huu_1_noi_cap: chu_so_huu_1_co_quan_cap,
      chu_so_huu_1_dia_chi,

      chu_so_huu_2_ten,
      chu_so_huu_2_xung_ho,
      chu_so_huu_2_ngay_sinh,
      chu_so_huu_2_loai_giay_to,
      chu_so_huu_2_so_giay_to,
      chu_so_huu_2_ngay_cap,
      chu_so_huu_2_co_quan_cap,
      chu_so_huu_2_noi_cap: chu_so_huu_2_co_quan_cap,
      chu_so_huu_2_dia_chi,
      cung_so_huu,

      // Tài sản bảo đảm
      is_tai_san_nha_o,
      co_tai_san_gan_lien_dat,
      total_valuation,
      tong_gia_tri_tai_san_bang_chu,
      ngay_dinh_gia,
      tong_dien_tich_bang_chu,

      // Nhóm merged_asset_*
      merged_asset_book_nos,
      merged_asset_types,
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
    };
  }

  /**
   * Kiểm tra thông tin khoản vay trước khi xuất tài liệu Word,
   * trả về danh sách cảnh báo nếu thiếu các trường quan trọng.
   */
  validateLoanForDocument(loan: LoanWithDocumentData, templateKey: DocumentTemplateKey): DocumentValidationWarning[] {
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
          message: 'Thành viên chưa có số CCCD/Căn cước.',
        });
      }
      if (!loan.member.address) {
        warnings.push({
          field: 'member.address',
          message: 'Thành viên chưa có địa chỉ cư trú đầy đủ.',
        });
      }
    }

    if (loan.loanType === LoanType.THE_CHAP) {
      const collaterals = loan.collaterals ?? [];
      if (collaterals.length === 0) {
        warnings.push({
          field: 'collaterals',
          message: 'Khoản vay thế chấp chưa khai báo tài sản bảo đảm (sổ đỏ).',
          isBlocking:
            templateKey === 'TC1' ||
            templateKey === 'TC2' ||
            templateKey === 'TC3' ||
            templateKey === 'TC8',
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
