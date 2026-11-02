import { LoanType } from '@prisma/client';
import { DocumentTemplateDefinition, DocumentTemplateKey } from './document.types';

export const DOCUMENT_TEMPLATES: Record<DocumentTemplateKey, DocumentTemplateDefinition> = {
  // === MẪU KHOẢN VAY THẾ CHẤP ===
  TC1: {
    key: 'TC1',
    code: 'GIAY_DE_NGHI_THE_CHAP',
    title: '1. Giấy đề nghị vay vốn thế chấp',
    description: 'Biểu mẫu Giấy đề nghị vay vốn cho khoản vay thế chấp (Thông tin khách hàng, số tiền vay, tài sản bảo đảm, giá trị định giá).',
    loanType: LoanType.THE_CHAP,
    groupFolder: 'thế chấp',
    fileName: '1. Giấy đề nghị vay vốn thế chấp.docx',
    outputSuffix: 'Giay_de_nghi_vay_von_the_chap',
  },
  TC2: {
    key: 'TC2',
    code: 'THOA_THUAN_CHO_VAY_THE_CHAP',
    title: '2. Thỏa thuận vay vốn thế chấp',
    description: 'Biểu mẫu Thỏa thuận cho vay kiêm Hợp đồng tín dụng thế chấp (Hồ sơ pháp lý, tài sản thế chấp, khế ước nhận nợ, hợp đồng thế chấp).',
    loanType: LoanType.THE_CHAP,
    groupFolder: 'thế chấp',
    fileName: '2. Thỏa thuận vay vốn thế chấp.docx',
    outputSuffix: 'Thoa_thuan_vay_von_the_chap',
  },
  TC3: {
    key: 'TC3',
    code: 'BAN_GIAO_QSDD_THE_CHAP',
    title: '3. Bàn giao QSDĐ thế chấp',
    description: 'Biên bản bàn giao chứng nhận quyền sử dụng đất và tài sản gắn liền với đất cho khoản vay thế chấp.',
    loanType: LoanType.THE_CHAP,
    groupFolder: 'thế chấp',
    fileName: '3. Bàn giao QSDĐ thế chấp.docx',
    outputSuffix: 'Ban_giao_QSDD_the_chap',
  },
  TC4: {
    key: 'TC4',
    code: 'TO_TRINH_THAM_DINH_THE_CHAP',
    title: '4. Tờ trình thẩm định thế chấp',
    description: 'Tờ trình thẩm định cho vay thế chấp (Thông tin khách hàng, phương án vay vốn, thẩm định tài sản thế chấp).',
    loanType: LoanType.THE_CHAP,
    groupFolder: 'thế chấp',
    fileName: '4. Tờ trình thẩm định thế chấp.docx',
    outputSuffix: 'To_trinh_tham_dinh_the_chap',
  },
  TC7: {
    key: 'TC7',
    code: 'KE_KHAI_NGUOI_LIEN_QUAN',
    title: '7. Kê khai người liên quan',
    description: 'Giấy kê khai người liên quan cho khoản vay thế chấp từ 140 triệu đồng trở lên.',
    loanType: LoanType.THE_CHAP,
    groupFolder: 'thế chấp',
    fileName: '7. Kê khai người liên quan.docx',
    outputSuffix: 'Ke_khai_nguoi_lien_quan',
  },
  TC8: {
    key: 'TC8',
    code: 'BIEN_BAN_DINH_GIA',
    title: '8. Biên bản định giá',
    description: 'Biên bản xác định giá trị tài sản bảo đảm (Quyền sử dụng đất và tài sản gắn liền với đất).',
    loanType: LoanType.THE_CHAP,
    groupFolder: 'thế chấp',
    fileName: '8. Biên bản định giá.docx',
    outputSuffix: 'Bien_ban_dinh_gia',
  },

  // === MẪU KHOẢN VAY TÍN CHẤP ===
  TIN1: {
    key: 'TIN1',
    code: 'GIAY_DE_NGHI_TIN_CHAP',
    title: '1. Giấy đề nghị vay vốn tín chấp',
    description: 'Biểu mẫu Giấy đề nghị vay vốn cho khoản vay tín chấp.',
    loanType: LoanType.TIN_CHAP,
    groupFolder: 'tín chấp',
    fileName: '1. Giấy đề nghị vay vốn tín chấp.docx',
    outputSuffix: 'Giay_de_nghi_vay_von_tin_chap',
  },
  TIN2: {
    key: 'TIN2',
    code: 'THOA_THUAN_CHO_VAY_TIN_CHAP',
    title: '2. Thỏa thuận vay vốn tín chấp',
    description: 'Biểu mẫu Thỏa thuận cho vay tín chấp (kiêm QSDĐ kê khai nếu có).',
    loanType: LoanType.TIN_CHAP,
    groupFolder: 'tín chấp',
    fileName: '2. Thỏa thuận vay vốn tín chấp.docx',
    outputSuffix: 'Thoa_thuan_vay_von_tin_chap',
  },
  TIN3: {
    key: 'TIN3',
    code: 'BAN_GIAO_QSDD_TIN_CHAP',
    title: '3. Bàn giao QSDĐ tín chấp',
    description: 'Biên bản bàn giao chứng nhận quyền sử dụng đất cho khoản vay tín chấp.',
    loanType: LoanType.TIN_CHAP,
    groupFolder: 'tín chấp',
    fileName: '3. Bàn giao QSDĐ tín chấp.docx',
    outputSuffix: 'Ban_giao_QSDD_tin_chap',
  },
  TIN4: {
    key: 'TIN4',
    code: 'TO_TRINH_THAM_DINH_TIN_CHAP',
    title: '4. Tờ trình thẩm định tín chấp',
    description: 'Tờ trình thẩm định cho vay tín chấp (Thông tin khách hàng, phương án vay vốn và thu nhập).',
    loanType: LoanType.TIN_CHAP,
    groupFolder: 'tín chấp',
    fileName: '4. Tờ trình thẩm định tín chấp.docx',
    outputSuffix: 'To_trinh_tham_dinh_tin_chap',
  },

  // === MẪU BIỂU DÙNG CHUNG CẢ HAI HÌNH THỨC ===
  BC_THU_NHAP: {
    key: 'BC_THU_NHAP',
    code: 'BAO_CAO_TINH_HINH_THU_NHAP',
    title: '5. Báo cáo tình hình thu nhập',
    description: 'Báo cáo tình hình thu nhập của cá nhân/hộ gia đình vay vốn (lúa, chăn nuôi, hoạt động khác).',
    loanType: 'ALL',
    groupFolder: 'chung',
    fileName: '5. Báo cáo tình hình thu nhập.docx',
    outputSuffix: 'Bao_cao_tinh_hinh_thu_nhap',
  },
  PA: {
    key: 'PA',
    code: 'PHUONG_AN_SU_DUNG_VON',
    title: '6. Phương án vay vốn',
    description: 'Phương án sử dụng vốn vay và nguồn trả nợ (Khoản mục chi phí kèm công thức trả lãi thực tế, nguồn thu, tài sản bảo đảm).',
    loanType: 'ALL',
    groupFolder: 'chung',
    fileName: '6. Phương án.docx',
    outputSuffix: 'Phuong_an_su_dung_von',
  },
};

export function getTemplatesByLoanType(loanType: LoanType): DocumentTemplateDefinition[] {
  return Object.values(DOCUMENT_TEMPLATES).filter(
    (t) => t.loanType === 'ALL' || t.loanType === loanType
  );
}

