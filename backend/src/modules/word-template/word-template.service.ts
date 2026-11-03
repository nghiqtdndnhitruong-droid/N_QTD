import fs from 'fs';
import path from 'path';
import { AppError } from '../../shared/errors';
import { loanRepository } from '../loan/loan.repository';
import { wordTemplateRepository } from './word-template.repository';
import { wordTemplateParserService } from './word-template-parser.service';
import { wordTemplateDataDictionaryService } from './word-template-data-dictionary.service';
import { wordTemplateGeneratorService } from './word-template-generator.service';
import { globalWordKeywordService, GlobalWordKeywordInput } from './global-word-keyword.service';
import { prisma } from '../../config/database';
import type {
  CreateWordTemplateDto,
  UpdateWordTemplateDto,
  WordTemplateMappingDto,
  TemplatePreviewResult,
  ExportResultFile,
} from './word-template.types';

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads/templates');

// Đảm bảo thư mục lưu file upload tồn tại
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export class WordTemplateService {
  public async getTemplates(params: {
    category?: string;
    loanTypeScope?: string;
    isActive?: boolean;
    search?: string;
  }) {
    return wordTemplateRepository.findMany(params);
  }

  public async getTemplateById(id: string) {
    const template = await wordTemplateRepository.findById(id);
    if (!template) {
      throw AppError.notFound(`Không tìm thấy biểu mẫu Word với ID: ${id}`);
    }
    return template;
  }

  public async createTemplateWithFile(
    dto: CreateWordTemplateDto,
    file: Express.Multer.File,
  ) {
    if (!file) {
      throw AppError.badRequest('Vui lòng tải lên file biểu mẫu định dạng .docx');
    }

    // Kiểm tra mã trùng
    const existing = await wordTemplateRepository.findByCode(dto.code);
    if (existing) {
      throw AppError.conflict(`Mã biểu mẫu "${dto.code}" đã tồn tại trên hệ thống`);
    }

    // 1. Phân tích trích xuất từ khóa ngay từ file Word được upload
    const parsedKeywords = wordTemplateParserService.parseDocxBuffer(file.buffer);

    // 2. Lưu file vào thư mục an toàn
    const safeCode = dto.code.replace(/[^A-Za-z0-9_-]/g, '_');
    const fileName = `${safeCode}_v1_${Date.now()}.docx`;
    const targetPath = path.join(UPLOAD_DIR, fileName);

    fs.writeFileSync(targetPath, file.buffer);

    // 3. Tạo record WordTemplate trong DB
    const template = await wordTemplateRepository.create({
      code: dto.code,
      title: dto.title,
      category: dto.category,
      loanTypeScope: dto.loanTypeScope || 'ALL',
      description: dto.description,
      currentFilePath: targetPath,
      originalFileName: file.originalname,
      fileSize: file.size,
    });

    // 4. Đối chiếu với Thư viện Từ khóa Toàn cục (Global Catalog)
    await globalWordKeywordService.seedDefaultCatalog();
    const globalKeywords = await prisma.globalWordKeyword.findMany();
    const globalKeywordMap = new Map(globalKeywords.map((g) => [g.keyword, g]));

    const initialMappings: WordTemplateMappingDto[] = parsedKeywords.map((pk) => {
      const globalMatch = globalKeywordMap.get(pk.keyword);
      const autoMatch = this.guessDataPathForKeyword(pk.keyword, pk.isLoop);
      return {
        keyword: pk.keyword,
        displayName: globalMatch?.displayName || this.formatKeywordDisplayName(pk.keyword),
        isLoop: pk.isLoop || Boolean(globalMatch?.isList),
        loopContext: pk.loopContext || (globalMatch?.isList ? pk.keyword : null),
        dataPath: globalMatch?.dataPath || autoMatch?.path || null,
        dataType: (globalMatch?.dataType as any) || autoMatch?.dataType || 'TEXT',
        isRequired: false,
        defaultValue: globalMatch?.defaultValue || '...................',
      };
    });

    if (initialMappings.length > 0) {
      await wordTemplateRepository.replaceMappings(template.id, initialMappings);
    }

    return this.getTemplateById(template.id);
  }

  public async uploadNewVersion(
    templateId: string,
    file: Express.Multer.File,
    changeNote?: string,
  ) {
    const template = await this.getTemplateById(templateId);
    if (!file) {
      throw AppError.badRequest('Vui lòng chọn file .docx phiên bản mới');
    }

    // Phân tích file mới
    const parsedKeywords = wordTemplateParserService.parseDocxBuffer(file.buffer);

    const nextVersion = template.currentVersion + 1;
    const safeCode = template.code.replace(/[^A-Za-z0-9_-]/g, '_');
    const fileName = `${safeCode}_v${nextVersion}_${Date.now()}.docx`;
    const targetPath = path.join(UPLOAD_DIR, fileName);

    fs.writeFileSync(targetPath, file.buffer);

    // Snapshot các mapping hiện tại
    const existingMappings = template.mappings || [];

    // Lưu version mới
    await wordTemplateRepository.createNewVersion(templateId, {
      version: nextVersion,
      filePath: targetPath,
      fileName: file.originalname,
      fileSize: file.size,
      changeNote: changeNote || `Cập nhật phiên bản v${nextVersion}`,
      mappingsSnapshot: existingMappings as any,
    });

    // Bổ sung các từ khóa mới xuất hiện trong file mới nếu chưa có trong mappings
    const currentKeywordSet = new Set(existingMappings.map((m) => m.keyword));
    const mergedMappings: WordTemplateMappingDto[] = existingMappings.map((m) => ({
      ...m,
      dataType: m.dataType as any,
    }));

    const globalKeywords = await prisma.globalWordKeyword.findMany();
    const globalKeywordMap = new Map(globalKeywords.map((g) => [g.keyword, g]));

    for (const pk of parsedKeywords) {
      if (!currentKeywordSet.has(pk.keyword)) {
        const globalMatch = globalKeywordMap.get(pk.keyword);
        const autoMatch = this.guessDataPathForKeyword(pk.keyword, pk.isLoop);
        mergedMappings.push({
          keyword: pk.keyword,
          displayName: globalMatch?.displayName || this.formatKeywordDisplayName(pk.keyword),
          isLoop: pk.isLoop || Boolean(globalMatch?.isList),
          loopContext: pk.loopContext || (globalMatch?.isList ? pk.keyword : null),
          dataPath: globalMatch?.dataPath || autoMatch?.path || null,
          dataType: (globalMatch?.dataType as any) || autoMatch?.dataType || 'TEXT',
          isRequired: false,
          defaultValue: globalMatch?.defaultValue || '...................',
        });
      }
    }

    if (mergedMappings.length > existingMappings.length) {
      await wordTemplateRepository.replaceMappings(templateId, mergedMappings);
    }

    return this.getTemplateById(templateId);
  }

  public async updateTemplate(id: string, dto: UpdateWordTemplateDto) {
    await this.getTemplateById(id);
    return wordTemplateRepository.update(id, dto);
  }

  public async saveMappings(templateId: string, mappings: WordTemplateMappingDto[]) {
    await this.getTemplateById(templateId);
    return wordTemplateRepository.replaceMappings(templateId, mappings);
  }

  public async deleteTemplate(id: string) {
    const template = await this.getTemplateById(id);

    // 1. Dọn dẹp tất cả các file vật lý của các phiên bản trên máy chủ
    if (template.versions && Array.isArray(template.versions)) {
      for (const v of template.versions) {
        if (v.filePath && fs.existsSync(v.filePath)) {
          try {
            fs.unlinkSync(v.filePath);
          } catch {
            // Bỏ qua lỗi xóa file nếu file đang được sử dụng hoặc đã bị xóa
          }
        }
      }
    }

    // 2. Xóa file hiện tại nếu có và khác đường dẫn các version
    if (template.currentFilePath && fs.existsSync(template.currentFilePath)) {
      try {
        fs.unlinkSync(template.currentFilePath);
      } catch {
        // ignore error deleting physical file
      }
    }

    // 3. Xóa dữ liệu trong cơ sở dữ liệu
    return wordTemplateRepository.delete(id);
  }

  public async getTemplateFileBuffer(id: string): Promise<{ buffer: Buffer; fileName: string }> {
    const template = await this.getTemplateById(id);
    if (!fs.existsSync(template.currentFilePath)) {
      throw AppError.notFound(`Không tìm thấy file mẫu trên máy chủ: ${template.currentFilePath}`);
    }
    const buffer = fs.readFileSync(template.currentFilePath);
    return {
      buffer,
      fileName: template.originalFileName || `${template.code}.docx`,
    };
  }

  /**
   * Thử nghiệm điền dữ liệu với một hồ sơ khoản vay cụ thể (Preview & Test)
   */
  public async previewTemplate(
    templateId: string,
    loanId: string,
  ): Promise<TemplatePreviewResult> {
    const template = await this.getTemplateById(templateId);
    const loan = await loanRepository.findById(loanId);
    if (!loan) {
      throw AppError.notFound(`Không tìm thấy hồ sơ khoản vay ID: ${loanId}`);
    }

    const { resolvedContext, warnings } =
      wordTemplateDataDictionaryService.resolveLoanData(loan, template.mappings as any);

    return {
      templateId: template.id,
      templateTitle: template.title,
      loanId: loan.id,
      resolvedData: resolvedContext,
      warnings,
    };
  }

  /**
   * Xuất tài liệu Word hoàn chỉnh cho hồ sơ khoản vay (Đơn lẻ hoặc gói ZIP)
   */
  public async exportLoanDocuments(
    loanId: string,
    templateIds: string[],
    exportedBy = 'Cán bộ tín dụng',
  ): Promise<ExportResultFile> {
    const loan = await loanRepository.findById(loanId);
    if (!loan) {
      throw AppError.notFound(`Không tìm thấy hồ sơ khoản vay ID: ${loanId}`);
    }

    const generatedFiles: { fileName: string; buffer: Buffer }[] = [];

    for (const templateId of templateIds) {
      const template = await this.getTemplateById(templateId);

      // Kiểm tra trạng thái hoạt động
      if (!template.isActive) {
        throw AppError.badRequest(
          `Biểu mẫu "${template.title}" đang ở trạng thái ngừng sử dụng, không thể xuất.`,
        );
      }

      // Kiểm tra loại vay áp dụng
      if (template.loanTypeScope !== 'ALL' && loan.loanType !== template.loanTypeScope) {
        throw AppError.badRequest(
          `Biểu mẫu "${template.title}" chỉ áp dụng cho hình thức ${template.loanTypeScope}, nhưng hồ sơ vay này là ${loan.loanType}.`,
        );
      }

      // Đọc file template
      if (!fs.existsSync(template.currentFilePath)) {
        throw AppError.internal(
          `Không tìm thấy file mẫu trên máy chủ: ${template.currentFilePath}`,
        );
      }
      const templateBuffer = fs.readFileSync(template.currentFilePath);

      // Ánh xạ dữ liệu
      const { resolvedContext, warnings } =
        wordTemplateDataDictionaryService.resolveLoanData(loan, template.mappings as any);

      // Render docx
      const outputBuffer = wordTemplateGeneratorService.generateDocx(
        templateBuffer,
        resolvedContext,
      );

      // Tạo tên file xuất dễ nhận biết
      const sanitizedTitle = template.title
        .replace(/[^A-Za-z0-9_À-ỹ]/g, '_')
        .replace(/_+/g, '_');
      const contractNo = loan.contractNumber || loan.id.slice(-6);
      const outFileName = `${sanitizedTitle}_${contractNo}.docx`;

      generatedFiles.push({
        fileName: outFileName,
        buffer: outputBuffer,
      });

      // Ghi nhật ký xuất
      await wordTemplateRepository.createExportLog({
        templateId: template.id,
        templateVersion: template.currentVersion,
        loanId: loan.id,
        exportedBy,
        outputFileName: outFileName,
        outputFileSize: outputBuffer.length,
        status: warnings.length > 0 ? 'WARNING' : 'SUCCESS',
        warnings: warnings.length > 0 ? warnings : null,
      });
    }

    // Nếu chỉ xuất 1 file, trả về file Word trực tiếp
    if (generatedFiles.length === 1) {
      return {
        fileName: generatedFiles[0].fileName,
        buffer: generatedFiles[0].buffer,
        mimeType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      };
    }

    // Nếu xuất từ 2 file trở lên, đóng gói vào file ZIP
    return wordTemplateGeneratorService.createZipArchive(generatedFiles);
  }

  public async getExportHistory(params: { loanId?: string; templateId?: string }) {
    return wordTemplateRepository.getExportLogs(params);
  }

  /**
   * Tự động gợi ý trường dữ liệu tương ứng dựa trên tên từ khóa
   */
  private guessDataPathForKeyword(keyword: string, isLoop: boolean): { path: string; dataType: any } | null {
    const k = keyword.toUpperCase();

    if (isLoop) {
      if (k.includes('TAI_SAN') || k.includes('COLLATERAL')) return { path: 'collaterals', dataType: 'LIST' };
      if (k.includes('LIEN_QUAN') || k.includes('RELATED')) return { path: 'relatedPersons', dataType: 'LIST' };
      if (k.includes('CHI_PHI') || k.includes('EXPENSE')) return { path: 'DANH_SACH_CHI_PHI', dataType: 'LIST' };
      if (k.includes('NGUON_THU') || k.includes('REVENUE')) return { path: 'DANH_SACH_NGUON_THU', dataType: 'LIST' };
      return null;
    }

    // Phương án vay vốn
    if (k.startsWith('PHUONG_AN.') || k.startsWith('PHUONG_AN_')) {
      if (k.includes('MUC_DICH')) return { path: 'PHUONG_AN.MUC_DICH', dataType: 'TEXT' };
      if (k.includes('THOI_HAN_VAY') || k.includes('THOI_HAN')) return { path: 'PHUONG_AN.THOI_HAN_VAY', dataType: 'TEXT' };
      if (k.includes('TONG_NHU_CAU_VON') || k.includes('NHU_CAU_VON')) {
        if (k.includes('CHU')) return { path: 'PHUONG_AN.TONG_NHU_CAU_VON_CHU', dataType: 'CURRENCY_WORDS' };
        return { path: 'PHUONG_AN.TONG_NHU_CAU_VON', dataType: 'CURRENCY' };
      }
      if (k.includes('VON_TU_CO')) {
        if (k.includes('CHU')) return { path: 'PHUONG_AN.VON_TU_CO_CHU', dataType: 'CURRENCY_WORDS' };
        return { path: 'PHUONG_AN.VON_TU_CO', dataType: 'CURRENCY' };
      }
      if (k.includes('VON_VAY_QTD') || k.includes('VON_VAY')) {
        if (k.includes('CHU')) return { path: 'PHUONG_AN.VON_VAY_QTD_CHU', dataType: 'CURRENCY_WORDS' };
        return { path: 'PHUONG_AN.VON_VAY_QTD', dataType: 'CURRENCY' };
      }
      if (k.includes('CHI_PHI')) {
        if (k.includes('GOP')) return { path: 'PHUONG_AN.CHI_PHI_GOP', dataType: 'TEXT' };
        if (k.includes('DANH_SACH')) return { path: 'DANH_SACH_CHI_PHI', dataType: 'LIST' };
        if (k.includes('CHU')) return { path: 'PHUONG_AN.TONG_CHI_PHI_CHU', dataType: 'CURRENCY_WORDS' };
        return { path: 'PHUONG_AN.TONG_CHI_PHI', dataType: 'CURRENCY' };
      }
      if (k.includes('THU_NHAP') || k.includes('NGUON_THU')) {
        if (k.includes('GOP')) return { path: 'PHUONG_AN.NGUON_THU_GOP', dataType: 'TEXT' };
        if (k.includes('DANH_SACH')) return { path: 'DANH_SACH_NGUON_THU', dataType: 'LIST' };
        if (k.includes('CHU')) return { path: 'PHUONG_AN.TONG_THU_NHAP_CHU', dataType: 'CURRENCY_WORDS' };
        return { path: 'PHUONG_AN.TONG_THU_NHAP', dataType: 'CURRENCY' };
      }
      if (k.includes('LOI_NHUAN')) {
        if (k.includes('CHU')) return { path: 'PHUONG_AN.LOI_NHUAN_CHU', dataType: 'CURRENCY_WORDS' };
        return { path: 'PHUONG_AN.LOI_NHUAN', dataType: 'CURRENCY' };
      }
    }

    // Người thừa kế
    if (k.includes('THUA_KE') || k.includes('HEIR')) {
      if (k.includes('LOAI_GIAY_TO') || k.includes('ID_TYPE'))
        return { path: 'heir.idType', dataType: 'TEXT' };
      if (k.includes('HO_TEN') || k.includes('FULL_NAME'))
        return { path: 'heir.fullName', dataType: 'TEXT' };
      if (k.includes('SO_CCCD') || k.includes('ID_NUMBER'))
        return { path: 'heir.idNumber', dataType: 'TEXT' };
      if (k.includes('NGAY_CAP') || k.includes('ID_ISSUE_DATE'))
        return { path: 'heir.idIssueDate', dataType: 'DATE' };
      if (k.includes('NOI_CAP') || k.includes('ID_ISSUE_PLACE'))
        return { path: 'heir.idIssuePlace', dataType: 'TEXT' };
      if (k.includes('QUAN_HE') || k.includes('RELATIONSHIP'))
        return { path: 'heir.relationship', dataType: 'TEXT' };
      if (k.includes('NAM_SINH') || k.includes('YEAR_OF_BIRTH'))
        return { path: 'heir.yearOfBirth', dataType: 'TEXT' };
      if (k.includes('GIOI_TINH') || k.includes('GENDER'))
        return { path: 'heir.gender', dataType: 'TEXT' };
      if (k.includes('SO_DIEN_THOAI') || k.includes('PHONE'))
        return { path: 'heir.phoneNumber', dataType: 'TEXT' };
      if (k.includes('DIA_CHI') || k.includes('ADDRESS'))
        return { path: 'heir.address', dataType: 'TEXT' };
    }

    // Tổng diện tích tất cả tài sản
    if (k.includes('TONG_DIEN_TICH') || k.includes('TOTAL_AREA')) {
      if (k.includes('CHU') || k.includes('WORDS')) {
        return { path: 'collaterals_summary.totalAreaWords', dataType: 'TEXT' };
      }
      return { path: 'collaterals_summary.totalArea', dataType: 'TEXT' };
    }

    // Tài sản gộp (nguyên tắc: nối dấu ; khi khác nhau, giữ nguyên 1 giá trị nếu giống nhau)
    if (k.startsWith('TAI_SAN.') || k.includes('_GOP')) {
      if (k.includes('MA_TAI_SAN') || k.includes('ASSET_CODE'))
        return { path: 'TAI_SAN.MA_TAI_SAN_GOP', dataType: 'TEXT' };
      if (k.includes('SO_GCN') || k.includes('SO_PHAT_HANH_GCN') || k.includes('CERTIFICATE_NUMBER'))
        return { path: 'TAI_SAN.SO_GCN_GOP', dataType: 'TEXT' };
      if (k.includes('SO_VAO_SO_CAP') || k.includes('CAU_SO_VAO_SO') || k.includes('LOAI_VA_SO_GCN'))
        return { path: 'TAI_SAN.SO_VAO_SO_CAP_GCN_GOP', dataType: 'TEXT' };
      if (k.includes('SO_VAO_SO') || k.includes('ISSUE_BOOK'))
        return { path: 'TAI_SAN.SO_VAO_SO_GOP', dataType: 'TEXT' };
      if (k.includes('SO_THUA') || k.includes('PLOT'))
        return { path: 'TAI_SAN.SO_THUA_GOP', dataType: 'TEXT' };
      if (k.includes('SO_TO') || k.includes('TO_BAN_DO') || k.includes('SHEET'))
        return { path: 'TAI_SAN.SO_TO_GOP', dataType: 'TEXT' };
      if (k.includes('DIEN_TICH') || k.includes('AREA'))
        return { path: 'TAI_SAN.DIEN_TICH_GOP', dataType: 'TEXT' };
      if (k.includes('DIA_CHI') || k.includes('ADDRESS'))
        return { path: 'TAI_SAN.DIA_CHI_GOP', dataType: 'TEXT' };
      if (k.includes('CHU_SO_HUU') || k.includes('OWNER'))
        return { path: 'TAI_SAN.CHU_SO_HUU_GOP', dataType: 'TEXT' };
      if (k.includes('NGAY_CAP') || k.includes('ISSUE_DATE'))
        return { path: 'TAI_SAN.NGAY_CAP_GOP', dataType: 'TEXT' };
      if (k.includes('NOI_CAP') || k.includes('ISSUE_PLACE'))
        return { path: 'TAI_SAN.NOI_CAP_GOP', dataType: 'TEXT' };
      if (k.includes('LOAI_GIAY_CHUNG_NHAN') || k.includes('CERTIFICATE_TYPE'))
        return { path: 'TAI_SAN.LOAI_GIAY_CHUNG_NHAN_GOP', dataType: 'TEXT' };
      if (k.includes('HINH_THUC') || k.includes('USAGE_FORM'))
        return { path: 'TAI_SAN.HINH_THUC_SU_DUNG_GOP', dataType: 'TEXT' };
      if (k.includes('HAN_CHE') || k.includes('USE_RESTRICTIONS'))
        return { path: 'TAI_SAN.HAN_CHE_SU_DUNG_GOP', dataType: 'TEXT' };
      if (k.includes('MUC_DICH') || k.includes('PURPOSE'))
        return { path: 'TAI_SAN.MUC_DICH_SU_DUNG_GOP', dataType: 'TEXT' };
      if (k.includes('THOI_HAN') || k.includes('DURATION'))
        return { path: 'TAI_SAN.THOI_HAN_SU_DUNG_GOP', dataType: 'TEXT' };
      if (k.includes('LOAI_TAI_SAN') || k.includes('TEN_TAI_SAN'))
        return { path: 'TAI_SAN.LOAI_TAI_SAN_GOP', dataType: 'TEXT' };
      if (k.includes('NGUON_GOC') || k.includes('ORIGIN'))
        return { path: 'TAI_SAN.NGUON_GOC_GOP', dataType: 'TEXT' };
      if (k.includes('GIA_TRI_DINH_GIA') || k.includes('VALUATION'))
        return { path: 'TAI_SAN.GIA_TRI_DINH_GIA_GOP', dataType: 'TEXT' };
      if (k.includes('DON_GIA') || k.includes('PRICE'))
        return { path: 'TAI_SAN.DON_GIA_GOP', dataType: 'TEXT' };
    }

    // Thành viên
    if (k.includes('LOAI_GIAY_TO') || k.includes('ID_TYPE'))
      return { path: 'member.idType', dataType: 'TEXT' };
    if (k.includes('HO_TEN_NGUOI_VAY') || k.includes('TEN_THANH_VIEN') || k === 'FULL_NAME')
      return { path: 'member.fullName', dataType: 'TEXT' };
    if (k.includes('MA_THANH_VIEN') || k === 'MEMBER_CODE')
      return { path: 'member.memberCode', dataType: 'TEXT' };
    if (k.includes('SO_CCCD') || k.includes('ID_NUMBER'))
      return { path: 'member.idNumber', dataType: 'TEXT' };
    if (k.includes('NGAY_CAP_CCCD') || k.includes('ID_ISSUE_DATE'))
      return { path: 'member.idIssueDate', dataType: 'DATE' };
    if (k.includes('NOI_CAP_CCCD') || k.includes('ID_ISSUE_PLACE'))
      return { path: 'member.idIssuePlace', dataType: 'TEXT' };
    if (k.includes('DIA_CHI_NGUOI_VAY') || k.includes('DIA_CHI_THANH_VIEN'))
      return { path: 'member.address', dataType: 'TEXT' };
    if (k.includes('SO_DIEN_THOAI') || k.includes('PHONE'))
      return { path: 'member.phoneNumber', dataType: 'TEXT' };
    if (k.includes('GIOI_TINH') || k === 'GENDER')
      return { path: 'member.gender', dataType: 'TEXT' };
    if (k.includes('DANH_XUNG') || k === 'ONG_BA')
      return { path: 'member.genderTitle', dataType: 'GENDER_TITLE' };
    if (k.includes('NAM_SINH') || k === 'YEAR_OF_BIRTH')
      return { path: 'member.yearOfBirth', dataType: 'TEXT' };

    // Khoản vay
    if (k.includes('SO_KHE_UOC') || k.includes('CONTRACT_NUMBER'))
      return { path: 'loan.contractNumber', dataType: 'TEXT' };
    if (k.includes('SO_TIEN_VAY_CHU') || k.includes('LOAN_AMOUNT_WORDS'))
      return { path: 'loan.loanAmountWords', dataType: 'CURRENCY_WORDS' };
    if (k.includes('SO_TIEN_VAY') || k.includes('LOAN_AMOUNT'))
      return { path: 'loan.loanAmount', dataType: 'CURRENCY' };
    if (k.includes('LAI_SUAT') || k.includes('INTEREST_RATE'))
      return { path: 'loan.interestRate', dataType: 'NUMBER' };
    if (k.includes('THOI_HAN_VAY') || k.includes('TERM_MONTHS'))
      return { path: 'loan.termMonths', dataType: 'NUMBER' };
    if (k.includes('MUC_DICH_VAY') || k.includes('PURPOSE'))
      return { path: 'loan.purpose', dataType: 'TEXT' };
    if (k.includes('NGAY_KY') || k.includes('NGAY_CAP_KHE_UOC'))
      return { path: 'loan.contractDate', dataType: 'DATE' };
    if (k.includes('NGAY_DAO_HAN') || k.includes('MATURITY_DATE'))
      return { path: 'loan.maturityDate', dataType: 'DATE' };

    // HĐ thế chấp
    if (k.includes('HD_THE_CHAP') || k.includes('MORTGAGE_CONTRACT'))
      return { path: 'mortgage.contractNumber', dataType: 'TEXT' };

    // Định giá tài sản
    if (k.includes('TONG_GIA_TRI_DINH_GIA_CHU'))
      return { path: 'collaterals_summary.totalValuationAmountWords', dataType: 'CURRENCY_WORDS' };
    if (k.includes('TONG_GIA_TRI_DINH_GIA') || k.includes('VALUATION_AMOUNT'))
      return { path: 'collaterals_summary.totalValuationAmountRounded', dataType: 'CURRENCY' };
    if (k.includes('TONG_DIEN_TICH'))
      return { path: 'collaterals_summary.totalArea', dataType: 'NUMBER' };

    // Ngày tháng
    if (k === 'NGAY' || k === 'NGAY_HIEN_TAI' || k === 'DAY') return { path: 'fund.currentDay', dataType: 'TEXT' };
    if (k === 'THANG' || k === 'THANG_HIEN_TAI' || k === 'MONTH') return { path: 'fund.currentMonth', dataType: 'TEXT' };
    if (k === 'NAM' || k === 'NAM_HIEN_TAI' || k === 'YEAR') return { path: 'fund.currentYear', dataType: 'TEXT' };

    return null;
  }

  public async validateTemplateSyntax(templateId: string) {
    const template = await this.getTemplateById(templateId);
    if (!fs.existsSync(template.currentFilePath)) {
      throw AppError.notFound('Không tìm thấy file Word vật lý trên máy chủ');
    }
    const buffer = fs.readFileSync(template.currentFilePath);
    return wordTemplateParserService.validateDocxBuffer(buffer);
  }

  public async getCatalog(category?: string, search?: string) {
    await globalWordKeywordService.seedDefaultCatalog();
    return globalWordKeywordService.getCatalog(category, search);
  }

  public async createCatalogKeyword(input: GlobalWordKeywordInput) {
    return globalWordKeywordService.createKeyword(input);
  }

  public async updateCatalogKeyword(id: string, input: Partial<GlobalWordKeywordInput>) {
    return globalWordKeywordService.updateKeyword(id, input);
  }

  public async deleteCatalogKeyword(id: string) {
    return globalWordKeywordService.deleteKeyword(id);
  }

  private formatKeywordDisplayName(keyword: string): string {
    return keyword
      .replace(/^[#^/]/, '')
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/(^\w|\s\w)/g, (m) => m.toUpperCase());
  }
}

export const wordTemplateService = new WordTemplateService();
