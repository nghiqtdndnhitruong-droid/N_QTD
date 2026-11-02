import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { AppError } from '../../shared/errors';
import { DOCUMENT_TEMPLATES } from './document-template.registry';
import { documentPlaceholderService, LoanWithDocumentData } from './document-placeholder.service';
import { DocumentTemplateKey, GeneratedDocumentResult } from './document.types';

export class DocumentGeneratorService {
  /**
   * Đường dẫn gốc đến thư mục chứa template Word
   */
  private getTemplateRootPath(): string {
    const candidates = [
      path.resolve(process.cwd(), 'template'),
      path.resolve(process.cwd(), '..', 'template'),
      path.resolve(__dirname, '..', '..', '..', '..', 'template'),
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
    return path.resolve(process.cwd(), '..', 'template');
  }

  /**
   * Sinh file Word hoàn chỉnh từ template và dữ liệu khoản vay.
   */
  async generateDocument(
    loan: LoanWithDocumentData,
    templateKey: DocumentTemplateKey
  ): Promise<GeneratedDocumentResult> {
    const templateDef = DOCUMENT_TEMPLATES[templateKey];
    if (!templateDef) {
      throw AppError.notFound(`Không tìm thấy mẫu biểu tài liệu với mã: ${templateKey}`);
    }

    if (templateDef.loanType !== 'ALL' && loan.loanType !== templateDef.loanType) {
      throw AppError.badRequest(
        `Biểu mẫu "${templateDef.title}" chỉ áp dụng cho khoản vay hình thức ${templateDef.loanType}, nhưng khoản vay hiện tại là ${loan.loanType}.`
      );
    }

    // 1. Xác định đường dẫn file template gốc
    const templatePath = path.join(
      this.getTemplateRootPath(),
      templateDef.groupFolder,
      templateDef.fileName
    );

    if (!fs.existsSync(templatePath)) {
      throw AppError.internal(
        `Không tìm thấy file template Word tại đường dẫn: ${templatePath}. Vui lòng kiểm tra thư mục template.`
      );
    }

    // 2. Đọc file template gốc vào Buffer (chế độ Read-only)
    let templateContent: Buffer;
    try {
      templateContent = fs.readFileSync(templatePath);
    } catch (err: any) {
      throw AppError.internal(`Không thể đọc file template Word: ${err.message}`);
    }

    // 3. Sinh dữ liệu placeholder hoàn chỉnh
    const data = documentPlaceholderService.buildPlaceholders(loan, templateKey);

    // 4. Nạp template vào PizZip và Docxtemplater
    let doc: Docxtemplater;
    try {
      const zip = new PizZip(templateContent);
      doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: { start: '{{', end: '}}' },
        nullGetter: () => '',
      });
    } catch (err: any) {
      throw AppError.internal(`Lỗi khi khởi tạo Docxtemplater cho template ${templateDef.fileName}: ${err.message}`);
    }

    // 5. Render dữ liệu
    try {
      doc.render(data);
    } catch (err: any) {
      throw AppError.internal(`Lỗi khi điền dữ liệu vào biểu mẫu Word: ${err.message}`);
    }

    // 6. Xuất Buffer file Word hoàn chỉnh
    let generatedBuffer: Buffer;
    try {
      generatedBuffer = doc.getZip().generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
      });
    } catch (err: any) {
      throw AppError.internal(`Lỗi khi nén file Word sau khi điền dữ liệu: ${err.message}`);
    }

    // 7. Đặt tên file xuất ra có cấu trúc rõ ràng: [SoKheUoc]_[TenBieuMau].docx
    const safeContractNumber = (loan.contractNumber || `LOAN-${loan.id.slice(-6)}`)
      .replace(/[\/\\?%*:|"<>]/g, '-')
      .replace(/\s+/g, '_');

    const fileName = `${safeContractNumber}_${templateDef.outputSuffix}.docx`;

    return {
      fileName,
      buffer: generatedBuffer,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
  }
}

export const documentGeneratorService = new DocumentGeneratorService();
