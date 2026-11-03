import { prisma } from '../../config/database';
import { AppError } from '../../shared/errors/app-error';
import { ErrorCode } from '../../shared/errors/error-codes';

export interface GlobalWordKeywordInput {
  keyword: string;
  displayName: string;
  category: string;
  dataPath: string;
  dataType?: string;
  formatPattern?: string | null;
  defaultValue?: string | null;
  isList?: boolean;
  itemProperties?: any;
  description?: string | null;
  isSystem?: boolean;
}

export class GlobalWordKeywordService {
  private static gopKeywordsInitialized = false;
  /**
   * Lấy danh sách từ khóa toàn cục kèm số lượng mẫu Word đang sử dụng
   */
  public async getCatalog(category?: string, search?: string) {
    const where: any = {};
    if (category) {
      where.category = category;
    }
    if (search) {
      where.OR = [
        { keyword: { contains: search, mode: 'insensitive' } },
        { displayName: { contains: search, mode: 'insensitive' } },
        { dataPath: { contains: search, mode: 'insensitive' } },
      ];
    }

    const keywords = await prisma.globalWordKeyword.findMany({
      where,
      orderBy: [{ category: 'asc' }, { keyword: 'asc' }],
    });

    // Thống kê số lượng template Word đang dùng keyword này
    const mappings = await prisma.wordTemplateMapping.findMany({
      select: { keyword: true, templateId: true },
    });

    const usageCountMap: Record<string, number> = {};
    for (const m of mappings) {
      usageCountMap[m.keyword] = (usageCountMap[m.keyword] || 0) + 1;
    }

    return keywords.map((kw) => ({
      ...kw,
      usageCount: usageCountMap[kw.keyword] || 0,
    }));
  }

  /**
   * Tạo từ khóa mới vào Thư viện toàn cục
   */
  public async createKeyword(input: GlobalWordKeywordInput) {
    const cleanKeyword = input.keyword.trim().toUpperCase();

    const existing = await prisma.globalWordKeyword.findUnique({
      where: { keyword: cleanKeyword },
    });
    if (existing) {
      throw AppError.conflict(
        `Từ khóa "${cleanKeyword}" đã tồn tại trong Thư viện từ khóa toàn cục`,
        ErrorCode.VALIDATION_ERROR,
        [{ field: 'keyword', message: `Từ khóa "${cleanKeyword}" đã tồn tại` }]
      );
    }

    return prisma.globalWordKeyword.create({
      data: {
        keyword: cleanKeyword,
        displayName: input.displayName.trim(),
        category: input.category,
        dataPath: input.dataPath.trim(),
        dataType: input.dataType || 'TEXT',
        formatPattern: input.formatPattern || null,
        defaultValue: input.defaultValue || '...................',
        isList: Boolean(input.isList),
        itemProperties: input.itemProperties || null,
        description: input.description || null,
        isSystem: Boolean(input.isSystem),
      },
    });
  }

  /**
   * Cập nhật từ khóa trong Thư viện
   * Cảnh báo nếu đang có các mẫu Word sử dụng từ khóa này
   */
  public async updateKeyword(id: string, input: Partial<GlobalWordKeywordInput>) {
    const existing = await prisma.globalWordKeyword.findUnique({ where: { id } });
    if (!existing) {
      throw AppError.notFound(`Không tìm thấy từ khóa ID "${id}" trong Thư viện`, ErrorCode.NOT_FOUND);
    }

    // Tìm các mẫu Word đang sử dụng
    const affectedTemplates = await prisma.wordTemplateMapping.findMany({
      where: { keyword: existing.keyword },
      include: {
        template: {
          select: { id: true, title: true, code: true },
        },
      },
    });

    const updated = await prisma.globalWordKeyword.update({
      where: { id },
      data: {
        displayName: input.displayName !== undefined ? input.displayName.trim() : undefined,
        category: input.category !== undefined ? input.category : undefined,
        dataPath: input.dataPath !== undefined ? input.dataPath.trim() : undefined,
        dataType: input.dataType !== undefined ? input.dataType : undefined,
        formatPattern: input.formatPattern !== undefined ? input.formatPattern : undefined,
        defaultValue: input.defaultValue !== undefined ? input.defaultValue : undefined,
        isList: input.isList !== undefined ? Boolean(input.isList) : undefined,
        itemProperties: input.itemProperties !== undefined ? input.itemProperties : undefined,
        description: input.description !== undefined ? input.description : undefined,
      },
    });

    // Đồng bộ cập nhật sang các bảng mapping của các template đang dùng
    if (input.dataPath !== undefined || input.dataType !== undefined || input.defaultValue !== undefined) {
      await prisma.wordTemplateMapping.updateMany({
        where: { keyword: existing.keyword },
        data: {
          dataPath: input.dataPath !== undefined ? input.dataPath.trim() : undefined,
          dataType: input.dataType !== undefined ? input.dataType : undefined,
          defaultValue: input.defaultValue !== undefined ? input.defaultValue : undefined,
        },
      });
    }

    return {
      keyword: updated,
      affectedTemplates: affectedTemplates.map((t) => t.template),
    };
  }

  /**
   * Xóa từ khóa khỏi Thư viện (xóa kèm cấu hình mapping trong các mẫu Word đang dùng nếu có)
   */
  public async deleteKeyword(id: string) {
    const existing = await prisma.globalWordKeyword.findUnique({ where: { id } });
    if (!existing) {
      throw AppError.notFound(`Không tìm thấy từ khóa ID "${id}"`, ErrorCode.NOT_FOUND);
    }

    // Xóa liên kết trong wordTemplateMapping nếu có để không để lại mồ côi
    await prisma.wordTemplateMapping.deleteMany({
      where: { keyword: existing.keyword },
    });

    await prisma.globalWordKeyword.delete({ where: { id } });
    return { success: true, message: `Đã xóa từ khóa "${existing.keyword}" thành công` };
  }

  /**
   * Seed khởi tạo các từ khóa chuẩn hệ thống nếu chưa có
   */
  public async seedDefaultCatalog(force = false): Promise<void> {
    const defaultKeywords: GlobalWordKeywordInput[] = [
      // 1. Người vay / Thành viên
      {
        keyword: 'HO_TEN_NGUOI_VAY',
        displayName: 'Họ và tên người vay',
        category: 'NGUOI_VAY',
        dataPath: 'member.fullName',
        dataType: 'TEXT',
      },
      {
        keyword: 'NGUOI_VAY.HO_TEN',
        displayName: 'Họ và tên người vay (Đối tượng)',
        category: 'NGUOI_VAY',
        dataPath: 'member.fullName',
        dataType: 'TEXT',
      },
      {
        keyword: 'DANH_XUNG',
        displayName: 'Danh xưng người vay (Ông/Bà)',
        category: 'NGUOI_VAY',
        dataPath: 'member.genderTitle',
        dataType: 'GENDER_TITLE',
      },
      {
        keyword: 'NGUOI_VAY.DANH_XUNG',
        displayName: 'Danh xưng người vay (Ông/Bà)',
        category: 'NGUOI_VAY',
        dataPath: 'member.genderTitle',
        dataType: 'GENDER_TITLE',
      },
      {
        keyword: 'GIOI_TINH',
        displayName: 'Giới tính (Nam/Nữ)',
        category: 'NGUOI_VAY',
        dataPath: 'member.gender',
        dataType: 'TEXT',
      },
      {
        keyword: 'NGUOI_VAY.GIOI_TINH',
        displayName: 'Giới tính (Nam/Nữ)',
        category: 'NGUOI_VAY',
        dataPath: 'member.gender',
        dataType: 'TEXT',
      },
      {
        keyword: 'NAM_SINH',
        displayName: 'Năm sinh người vay',
        category: 'NGUOI_VAY',
        dataPath: 'member.yearOfBirth',
        dataType: 'TEXT',
      },
      {
        keyword: 'NGUOI_VAY.NAM_SINH',
        displayName: 'Năm sinh người vay',
        category: 'NGUOI_VAY',
        dataPath: 'member.yearOfBirth',
        dataType: 'TEXT',
      },
      {
        keyword: 'SO_CCCD',
        displayName: 'Số CCCD/Căn cước người vay',
        category: 'NGUOI_VAY',
        dataPath: 'member.idNumber',
        dataType: 'TEXT',
      },
      {
        keyword: 'NGUOI_VAY.SO_CCCD',
        displayName: 'Số CCCD/Căn cước người vay',
        category: 'NGUOI_VAY',
        dataPath: 'member.idNumber',
        dataType: 'TEXT',
      },
      {
        keyword: 'NGAY_CAP_CCCD',
        displayName: 'Ngày cấp CCCD (dd/mm/yyyy)',
        category: 'NGUOI_VAY',
        dataPath: 'member.idIssueDate',
        dataType: 'DATE',
      },
      {
        keyword: 'NGUOI_VAY.NGAY_CAP_CCCD',
        displayName: 'Ngày cấp CCCD (dd/mm/yyyy)',
        category: 'NGUOI_VAY',
        dataPath: 'member.idIssueDate',
        dataType: 'DATE',
      },
      {
        keyword: 'NOI_CAP_CCCD',
        displayName: 'Nơi cấp CCCD',
        category: 'NGUOI_VAY',
        dataPath: 'member.idIssuePlace',
        dataType: 'TEXT',
      },
      {
        keyword: 'NGUOI_VAY.NOI_CAP_CCCD',
        displayName: 'Nơi cấp CCCD',
        category: 'NGUOI_VAY',
        dataPath: 'member.idIssuePlace',
        dataType: 'TEXT',
      },
      {
        keyword: 'SO_DIEN_THOAI',
        displayName: 'Số điện thoại người vay',
        category: 'NGUOI_VAY',
        dataPath: 'member.phoneNumber',
        dataType: 'TEXT',
      },
      {
        keyword: 'NGUOI_VAY.SO_DIEN_THOAI',
        displayName: 'Số điện thoại người vay',
        category: 'NGUOI_VAY',
        dataPath: 'member.phoneNumber',
        dataType: 'TEXT',
      },
      {
        keyword: 'DIA_CHI',
        displayName: 'Địa chỉ thường trú đầy đủ',
        category: 'NGUOI_VAY',
        dataPath: 'member.address',
        dataType: 'TEXT',
      },
      {
        keyword: 'NGUOI_VAY.DIA_CHI',
        displayName: 'Địa chỉ thường trú đầy đủ',
        category: 'NGUOI_VAY',
        dataPath: 'member.address',
        dataType: 'TEXT',
      },
      {
        keyword: 'MA_THANH_VIEN',
        displayName: 'Mã thành viên Quỹ',
        category: 'NGUOI_VAY',
        dataPath: 'member.memberCode',
        dataType: 'TEXT',
      },
      {
        keyword: 'CO_MA_THANH_VIEN',
        displayName: 'Kiểm tra thành viên đã có mã hay chưa (True/False)',
        category: 'NGUOI_VAY',
        dataPath: 'CO_MA_THANH_VIEN',
        dataType: 'BOOLEAN',
      },

      // 2. Khoản vay & Khế ước
      {
        keyword: 'SO_HOP_DONG',
        displayName: 'Số khế ước / hợp đồng vay',
        category: 'KHOAN_VAY',
        dataPath: 'loan.contractNumber',
        dataType: 'TEXT',
      },
      {
        keyword: 'KHOAN_VAY.SO_HOP_DONG',
        displayName: 'Số khế ước / hợp đồng vay',
        category: 'KHOAN_VAY',
        dataPath: 'loan.contractNumber',
        dataType: 'TEXT',
      },
      {
        keyword: 'NGAY_HOP_DONG',
        displayName: 'Ngày lập hợp đồng vay (dd/mm/yyyy)',
        category: 'KHOAN_VAY',
        dataPath: 'loan.contractDate',
        dataType: 'DATE',
      },
      {
        keyword: 'KHOAN_VAY.NGAY_HOP_DONG_NGAY',
        displayName: 'Ngày lập hợp đồng (Chỉ số ngày)',
        category: 'KHOAN_VAY',
        dataPath: 'loan.contractDateDay',
        dataType: 'TEXT',
      },
      {
        keyword: 'KHOAN_VAY.NGAY_HOP_DONG_THANG',
        displayName: 'Tháng lập hợp đồng (Chỉ số tháng)',
        category: 'KHOAN_VAY',
        dataPath: 'loan.contractDateMonth',
        dataType: 'TEXT',
      },
      {
        keyword: 'KHOAN_VAY.NGAY_HOP_DONG_NAM',
        displayName: 'Năm lập hợp đồng (Chỉ số năm)',
        category: 'KHOAN_VAY',
        dataPath: 'loan.contractDateYear',
        dataType: 'TEXT',
      },
      {
        keyword: 'LOAI_VAY',
        displayName: 'Hình thức vay (Thế chấp / Tín chấp)',
        category: 'KHOAN_VAY',
        dataPath: 'loan.loanType',
        dataType: 'TEXT',
      },
      {
        keyword: 'KHOAN_VAY.LOAI_VAY',
        displayName: 'Mã hình thức vay (THE_CHAP / TIN_CHAP)',
        category: 'KHOAN_VAY',
        dataPath: 'loan.loanTypeRaw',
        dataType: 'TEXT',
      },
      {
        keyword: 'SO_TIEN_SO',
        displayName: 'Số tiền vay bằng số (VND)',
        category: 'KHOAN_VAY',
        dataPath: 'loan.loanAmount',
        dataType: 'CURRENCY',
      },
      {
        keyword: 'KHOAN_VAY.SO_TIEN_SO',
        displayName: 'Số tiền vay bằng số (VND)',
        category: 'KHOAN_VAY',
        dataPath: 'loan.loanAmount',
        dataType: 'CURRENCY',
      },
      {
        keyword: 'SO_TIEN_CHU',
        displayName: 'Số tiền vay bằng chữ',
        category: 'KHOAN_VAY',
        dataPath: 'loan.loanAmountWords',
        dataType: 'CURRENCY_WORDS',
      },
      {
        keyword: 'KHOAN_VAY.SO_TIEN_CHU',
        displayName: 'Số tiền vay bằng chữ',
        category: 'KHOAN_VAY',
        dataPath: 'loan.loanAmountWords',
        dataType: 'CURRENCY_WORDS',
      },
      {
        keyword: 'THOI_HAN_THANG',
        displayName: 'Thời hạn vay (tháng)',
        category: 'KHOAN_VAY',
        dataPath: 'loan.termMonths',
        dataType: 'NUMBER',
      },
      {
        keyword: 'KHOAN_VAY.THOI_HAN_THANG',
        displayName: 'Thời hạn vay (tháng)',
        category: 'KHOAN_VAY',
        dataPath: 'loan.termMonths',
        dataType: 'NUMBER',
      },
      {
        keyword: 'LAI_SUAT_NAM',
        displayName: 'Lãi suất (%/năm)',
        category: 'KHOAN_VAY',
        dataPath: 'loan.interestRate',
        dataType: 'NUMBER',
      },
      {
        keyword: 'KHOAN_VAY.LAI_SUAT_NAM',
        displayName: 'Lãi suất (%/năm)',
        category: 'KHOAN_VAY',
        dataPath: 'loan.interestRate',
        dataType: 'NUMBER',
      },
      {
        keyword: 'MUC_DICH_VAY',
        displayName: 'Mục đích vay vốn',
        category: 'KHOAN_VAY',
        dataPath: 'loan.purpose',
        dataType: 'TEXT',
      },

      // 3. Tổng hợp Tài sản thế chấp
      {
        keyword: 'CO_TAI_SAN',
        displayName: 'Hồ sơ có tài sản thế chấp hay không',
        category: 'TAI_SAN',
        dataPath: 'collaterals_summary.hasCollaterals',
        dataType: 'BOOLEAN',
      },
      {
        keyword: 'TONG_SO_TAI_SAN',
        displayName: 'Tổng số lượng tài sản',
        category: 'TAI_SAN',
        dataPath: 'collaterals_summary.totalCount',
        dataType: 'NUMBER',
      },
      {
        keyword: 'TONG_DIEN_TICH',
        displayName: 'Tổng diện tích đất của tất cả tài sản (m²)',
        category: 'TAI_SAN',
        dataPath: 'collaterals_summary.totalArea',
        dataType: 'TEXT',
      },
      {
        keyword: 'TONG_DIEN_TICH_CHU',
        displayName: 'Tổng diện tích đất của tất cả tài sản bằng chữ',
        category: 'TAI_SAN',
        dataPath: 'collaterals_summary.totalAreaWords',
        dataType: 'TEXT',
      },
      {
        keyword: 'TAI_SAN.TONG_DIEN_TICH',
        displayName: 'Tổng diện tích tất cả tài sản (TAI_SAN.TONG_DIEN_TICH)',
        category: 'TAI_SAN',
        dataPath: 'collaterals_summary.totalArea',
        dataType: 'TEXT',
      },
      {
        keyword: 'TAI_SAN.TONG_DIEN_TICH_CHU',
        displayName: 'Tổng diện tích tất cả tài sản bằng chữ (TAI_SAN.TONG_DIEN_TICH_CHU)',
        category: 'TAI_SAN',
        dataPath: 'collaterals_summary.totalAreaWords',
        dataType: 'TEXT',
      },
      {
        keyword: 'KHOAN_VAY.TONG_GIA_TRI_TAI_SAN_SO',
        displayName: 'Tổng giá trị định giá tài sản sau làm tròn (VND)',
        category: 'TAI_SAN',
        dataPath: 'collaterals_summary.totalValuationAmountRounded',
        dataType: 'CURRENCY',
      },
      {
        keyword: 'KHOAN_VAY.TONG_GIA_TRI_TAI_SAN_CHU',
        displayName: 'Tổng giá trị định giá tài sản sau làm tròn bằng chữ',
        category: 'TAI_SAN',
        dataPath: 'collaterals_summary.totalValuationAmountWords',
        dataType: 'CURRENCY_WORDS',
      },

      // 4. Danh sách tài sản (Dùng cho vòng lặp FOR)
      {
        keyword: 'DANH_SACH_TAI_SAN',
        displayName: 'Danh sách tài sản thế chấp (Khối lặp FOR)',
        category: 'TAI_SAN',
        dataPath: 'collaterals',
        dataType: 'LIST',
        isList: true,
        itemProperties: {
          MA_TAI_SAN: 'assetCode',
          TEN_TAI_SAN: 'assetName',
          LOAI_TAI_SAN: 'assetType',
          SO_GCN: 'certificateNumber',
          SO_PHAT_HANH_GCN: 'certificateNumber',
          NGAY_CAP_GCN: 'issueDate',
          NOI_CAP_GCN: 'issuePlace',
          SO_THUA: 'landLotNumber',
          TO_BAN_DO: 'mapSheetNumber',
          DIEN_TICH: 'landArea',
          GIA_TRI_DINH_GIA: 'appraisedValue',
          CHU_SO_HUU: 'ownerName',
          DANH_SACH_CHU_SO_HUU: 'owners',
        },
      },

      // 4b. Từ khóa Tài sản gộp (nguyên tắc: nối dấu ; khi khác nhau, giữ nguyên 1 giá trị nếu giống nhau)
      {
        keyword: 'TAI_SAN.MA_TAI_SAN_GOP',
        displayName: 'Mã tài sản gộp (nối dấu ;)',
        category: 'TAI_SAN',
        dataPath: 'TAI_SAN.MA_TAI_SAN_GOP',
        dataType: 'TEXT',
      },
      {
        keyword: 'MA_TAI_SAN_GOP',
        displayName: 'Mã tài sản gộp (phẳng, nối dấu ;)',
        category: 'TAI_SAN',
        dataPath: 'TAI_SAN.MA_TAI_SAN_GOP',
        dataType: 'TEXT',
      },
      {
        keyword: 'TAI_SAN.SO_GCN_GOP',
        displayName: 'Số phát hành Giấy chứng nhận gộp (nối dấu ;)',
        category: 'TAI_SAN',
        dataPath: 'TAI_SAN.SO_GCN_GOP',
        dataType: 'TEXT',
      },
      {
        keyword: 'SO_GCN_GOP',
        displayName: 'Số phát hành GCN gộp (phẳng, nối dấu ;)',
        category: 'TAI_SAN',
        dataPath: 'TAI_SAN.SO_GCN_GOP',
        dataType: 'TEXT',
      },
      {
        keyword: 'TAI_SAN.SO_VAO_SO_GOP',
        displayName: 'Số vào sổ cấp GCN gộp (nối dấu ;)',
        category: 'TAI_SAN',
        dataPath: 'TAI_SAN.SO_VAO_SO_GOP',
        dataType: 'TEXT',
      },
      {
        keyword: 'TAI_SAN.SO_THUA_GOP',
        displayName: 'Số thửa đất gộp (nối dấu ;)',
        category: 'TAI_SAN',
        dataPath: 'TAI_SAN.SO_THUA_GOP',
        dataType: 'TEXT',
      },
      {
        keyword: 'SO_THUA_GOP',
        displayName: 'Số thửa đất gộp (phẳng, nối dấu ;)',
        category: 'TAI_SAN',
        dataPath: 'TAI_SAN.SO_THUA_GOP',
        dataType: 'TEXT',
      },
      {
        keyword: 'TAI_SAN.SO_TO_GOP',
        displayName: 'Số tờ bản đồ gộp (nối dấu ;)',
        category: 'TAI_SAN',
        dataPath: 'TAI_SAN.SO_TO_GOP',
        dataType: 'TEXT',
      },
      {
        keyword: 'SO_TO_GOP',
        displayName: 'Số tờ bản đồ gộp (phẳng, nối dấu ;)',
        category: 'TAI_SAN',
        dataPath: 'TAI_SAN.SO_TO_GOP',
        dataType: 'TEXT',
      },
      {
        keyword: 'TAI_SAN.DIEN_TICH_GOP',
        displayName: 'Diện tích đất gộp (nối dấu ;)',
        category: 'TAI_SAN',
        dataPath: 'TAI_SAN.DIEN_TICH_GOP',
        dataType: 'TEXT',
      },
      {
        keyword: 'DIEN_TICH_GOP',
        displayName: 'Diện tích đất gộp (phẳng, nối dấu ;)',
        category: 'TAI_SAN',
        dataPath: 'TAI_SAN.DIEN_TICH_GOP',
        dataType: 'TEXT',
      },
      {
        keyword: 'TAI_SAN.DIA_CHI_GOP',
        displayName: 'Địa chỉ tài sản gộp (nối dấu ;)',
        category: 'TAI_SAN',
        dataPath: 'TAI_SAN.DIA_CHI_GOP',
        dataType: 'TEXT',
      },
      {
        keyword: 'DIA_CHI_TAI_SAN_GOP',
        displayName: 'Địa chỉ tài sản gộp (phẳng, nối dấu ;)',
        category: 'TAI_SAN',
        dataPath: 'TAI_SAN.DIA_CHI_GOP',
        dataType: 'TEXT',
      },
      {
        keyword: 'TAI_SAN.CHU_SO_HUU_GOP',
        displayName: 'Chủ sở hữu gộp (nối dấu ;)',
        category: 'TAI_SAN',
        dataPath: 'TAI_SAN.CHU_SO_HUU_GOP',
        dataType: 'TEXT',
      },
      {
        keyword: 'CHU_SO_HUU_GOP',
        displayName: 'Chủ sở hữu gộp (phẳng, nối dấu ;)',
        category: 'TAI_SAN',
        dataPath: 'TAI_SAN.CHU_SO_HUU_GOP',
        dataType: 'TEXT',
      },
      {
        keyword: 'TAI_SAN.NGAY_CAP_GOP',
        displayName: 'Ngày cấp GCN gộp (dd/mm/yyyy, nối dấu ;)',
        category: 'TAI_SAN',
        dataPath: 'TAI_SAN.NGAY_CAP_GOP',
        dataType: 'TEXT',
      },
      {
        keyword: 'TAI_SAN.NOI_CAP_GOP',
        displayName: 'Nơi cấp GCN gộp (nối dấu ;)',
        category: 'TAI_SAN',
        dataPath: 'TAI_SAN.NOI_CAP_GOP',
        dataType: 'TEXT',
      },
      {
        keyword: 'TAI_SAN.MUC_DICH_SU_DUNG_GOP',
        displayName: 'Mục đích sử dụng đất gộp (nối dấu ;)',
        category: 'TAI_SAN',
        dataPath: 'TAI_SAN.MUC_DICH_SU_DUNG_GOP',
        dataType: 'TEXT',
      },
      {
        keyword: 'TAI_SAN.THOI_HAN_SU_DUNG_GOP',
        displayName: 'Thời hạn sử dụng đất gộp (nối dấu ;)',
        category: 'TAI_SAN',
        dataPath: 'TAI_SAN.THOI_HAN_SU_DUNG_GOP',
        dataType: 'TEXT',
      },
      {
        keyword: 'TAI_SAN.LOAI_TAI_SAN_GOP',
        displayName: 'Loại tài sản gộp (nối dấu ;)',
        category: 'TAI_SAN',
        dataPath: 'TAI_SAN.LOAI_TAI_SAN_GOP',
        dataType: 'TEXT',
      },
      {
        keyword: 'TAI_SAN.NGUON_GOC_GOP',
        displayName: 'Nguồn gốc đất gộp (nối dấu ;)',
        category: 'TAI_SAN',
        dataPath: 'TAI_SAN.NGUON_GOC_GOP',
        dataType: 'TEXT',
      },
      {
        keyword: 'TAI_SAN.GIA_TRI_DINH_GIA_GOP',
        displayName: 'Giá trị định giá gộp (nối dấu ;)',
        category: 'TAI_SAN',
        dataPath: 'TAI_SAN.GIA_TRI_DINH_GIA_GOP',
        dataType: 'TEXT',
      },
      {
        keyword: 'TAI_SAN.DON_GIA_GOP',
        displayName: 'Đơn giá định giá gộp (nối dấu ;)',
        category: 'TAI_SAN',
        dataPath: 'TAI_SAN.DON_GIA_GOP',
        dataType: 'TEXT',
      },

      // 5. Người thừa kế
      {
        keyword: 'CO_NGUOI_THUA_KE',
        displayName: 'Hồ sơ có người thừa kế hay không (True/False)',
        category: 'NGUOI_THUA_KE',
        dataPath: 'CO_NGUOI_THUA_KE',
        dataType: 'BOOLEAN',
      },
      {
        keyword: 'LOAI_GIAY_TO_NGUOI_THUA_KE',
        displayName: 'Loại giấy tờ người thừa kế (Căn cước / CCCD / CMND)',
        category: 'NGUOI_THUA_KE',
        dataPath: 'heir.idType',
        dataType: 'TEXT',
      },
      {
        keyword: 'NGUOI_THUA_KE.LOAI_GIAY_TO',
        displayName: 'Loại giấy tờ người thừa kế (Đối tượng)',
        category: 'NGUOI_THUA_KE',
        dataPath: 'heir.idType',
        dataType: 'TEXT',
      },
      {
        keyword: 'HO_TEN_NGUOI_THUA_KE',
        displayName: 'Họ và tên người thừa kế',
        category: 'NGUOI_THUA_KE',
        dataPath: 'heir.fullName',
        dataType: 'TEXT',
      },
      {
        keyword: 'NGUOI_THUA_KE.HO_TEN',
        displayName: 'Họ và tên người thừa kế (Đối tượng)',
        category: 'NGUOI_THUA_KE',
        dataPath: 'heir.fullName',
        dataType: 'TEXT',
      },
      {
        keyword: 'SO_CCCD_NGUOI_THUA_KE',
        displayName: 'Số CCCD/Căn cước người thừa kế',
        category: 'NGUOI_THUA_KE',
        dataPath: 'heir.idNumber',
        dataType: 'TEXT',
      },
      {
        keyword: 'NGUOI_THUA_KE.SO_CCCD',
        displayName: 'Số CCCD/Căn cước người thừa kế (Đối tượng)',
        category: 'NGUOI_THUA_KE',
        dataPath: 'heir.idNumber',
        dataType: 'TEXT',
      },
      {
        keyword: 'NGAY_CAP_CCCD_NGUOI_THUA_KE',
        displayName: 'Ngày cấp CCCD người thừa kế',
        category: 'NGUOI_THUA_KE',
        dataPath: 'heir.idIssueDate',
        dataType: 'DATE',
      },
      {
        keyword: 'NOI_CAP_CCCD_NGUOI_THUA_KE',
        displayName: 'Nơi cấp CCCD người thừa kế',
        category: 'NGUOI_THUA_KE',
        dataPath: 'heir.idIssuePlace',
        dataType: 'TEXT',
      },
      {
        keyword: 'QUAN_HE_NGUOI_THUA_KE',
        displayName: 'Quan hệ người thừa kế với người vay',
        category: 'NGUOI_THUA_KE',
        dataPath: 'heir.relationship',
        dataType: 'TEXT',
      },
      {
        keyword: 'NAM_SINH_NGUOI_THUA_KE',
        displayName: 'Năm sinh người thừa kế',
        category: 'NGUOI_THUA_KE',
        dataPath: 'heir.yearOfBirth',
        dataType: 'TEXT',
      },
      {
        keyword: 'DIA_CHI_NGUOI_THUA_KE',
        displayName: 'Địa chỉ người thừa kế',
        category: 'NGUOI_THUA_KE',
        dataPath: 'heir.address',
        dataType: 'TEXT',
      },
      {
        keyword: 'SO_DIEN_THOAI_NGUOI_THUA_KE',
        displayName: 'Số điện thoại người thừa kế',
        category: 'NGUOI_THUA_KE',
        dataPath: 'heir.phoneNumber',
        dataType: 'TEXT',
      },
      {
        keyword: 'DANH_SACH_NGUOI_THUA_KE',
        displayName: 'Danh sách người thừa kế (Khối lặp FOR)',
        category: 'NGUOI_THUA_KE',
        dataPath: 'heirs',
        dataType: 'LIST',
        isList: true,
        itemProperties: {
          HO_TEN: 'fullName',
          QUAN_HE: 'relationship',
          NAM_SINH: 'yearOfBirth',
          LOAI_GIAY_TO: 'idType',
          SO_CCCD: 'idNumber',
          NGAY_CAP_CCCD: 'idIssueDate',
          NOI_CAP_CCCD: 'idIssuePlace',
          SO_DIEN_THOAI: 'phoneNumber',
          DIA_CHI: 'address',
        },
      },

      // 6. Người liên quan
      {
        keyword: 'DANH_SACH_NGUOI_LIEN_QUAN',
        displayName: 'Danh sách người liên quan (Khối lặp FOR)',
        category: 'NGUOI_LIEN_QUAN',
        dataPath: 'relatedPersons',
        dataType: 'LIST',
        isList: true,
        itemProperties: {
          HO_TEN: 'fullName',
          QUAN_HE_NGUOI_VAY: 'relationWithBorrower',
          QUAN_HE_NGUOI_LIEN_QUAN: 'relationWithRelated',
          SO_CCCD: 'idNumber',
          NAM_SINH: 'yearOfBirth',
        },
      },

      // 7. Quỹ tín dụng nhân dân
      {
        keyword: 'QUY_TIN_DUNG.TEN_QUY',
        displayName: 'Tên Quỹ tín dụng nhân dân',
        category: 'QUY_TIN_DUNG',
        dataPath: 'fund.name',
        dataType: 'TEXT',
      },
      {
        keyword: 'QUY_TIN_DUNG.NGUOI_DAI_DIEN',
        displayName: 'Họ tên người đại diện pháp luật',
        category: 'QUY_TIN_DUNG',
        dataPath: 'fund.representative',
        dataType: 'TEXT',
      },
      {
        keyword: 'QUY_TIN_DUNG.CHUC_VU',
        displayName: 'Chức vụ người đại diện',
        category: 'QUY_TIN_DUNG',
        dataPath: 'fund.title',
        dataType: 'TEXT',
      },
    ];

    const count = await prisma.globalWordKeyword.count();
    if (count > 0 && !force) {
      // Nếu đã có dữ liệu, chỉ bổ sung các từ khóa mới (GOP, TONG_DIEN_TICH) một lần duy nhất khi chạy hệ thống
      if (!GlobalWordKeywordService.gopKeywordsInitialized) {
        GlobalWordKeywordService.gopKeywordsInitialized = true;
        const newKeywords = defaultKeywords.filter(
          (k) => k.keyword.includes('_GOP') || k.keyword.includes('TONG_DIEN_TICH')
        );
        for (const kw of newKeywords) {
          const existed = await prisma.globalWordKeyword.findUnique({
            where: { keyword: kw.keyword },
          });
          if (!existed) {
            await prisma.globalWordKeyword.create({
              data: {
                keyword: kw.keyword,
                displayName: kw.displayName,
                category: kw.category,
                dataPath: kw.dataPath,
                dataType: kw.dataType || 'TEXT',
                defaultValue: kw.defaultValue || '...................',
                isList: Boolean(kw.isList),
                itemProperties: kw.itemProperties || null,
                isSystem: true,
              },
            });
          }
        }
      }
      return;
    }

    GlobalWordKeywordService.gopKeywordsInitialized = true;
    for (const kw of defaultKeywords) {
      await prisma.globalWordKeyword.upsert({
        where: { keyword: kw.keyword },
        update: {},
        create: {
          keyword: kw.keyword,
          displayName: kw.displayName,
          category: kw.category,
          dataPath: kw.dataPath,
          dataType: kw.dataType || 'TEXT',
          defaultValue: kw.defaultValue || '...................',
          isList: Boolean(kw.isList),
          itemProperties: kw.itemProperties || null,
          isSystem: true,
        },
      });
    }
  }
}

export const globalWordKeywordService = new GlobalWordKeywordService();
