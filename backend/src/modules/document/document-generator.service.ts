import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { AppError } from '../../shared/errors';
import { findTemplateByKey, getTemplateQtdPath } from './document-template.registry';
import { documentPlaceholderService, LoanWithDocumentData, EXTENDED_DOTS } from './document-placeholder.service';
import { DocumentTemplateKey, GeneratedDocumentResult } from './document.types';

export class DocumentGeneratorService {
  /**
   * Sinh file Word hoàn chỉnh từ template và dữ liệu khoản vay.
   */
  async generateDocument(
    loan: LoanWithDocumentData,
    templateKey: DocumentTemplateKey
  ): Promise<GeneratedDocumentResult> {
    const templateDef = findTemplateByKey(templateKey);
    if (!templateDef) {
      throw AppError.notFound(`Không tìm thấy mẫu biểu tài liệu với mã/tên: ${templateKey}`);
    }

    // Kiểm tra loại vay có phù hợp với biểu mẫu hay không
    if (templateDef.loanType !== 'ALL' && loan.loanType !== templateDef.loanType) {
      throw AppError.badRequest(
        `Biểu mẫu "${templateDef.title}" chỉ áp dụng cho khoản vay hình thức ${templateDef.loanType}, nhưng khoản vay hiện tại là ${loan.loanType}.`
      );
    }

    // 1. Xác định đường dẫn file template gốc trong template_qtd
    const templatePath =
      templateDef.filePath && fs.existsSync(templateDef.filePath)
        ? templateDef.filePath
        : path.join(getTemplateQtdPath(), templateDef.fileName);

    // Chống path traversal: đảm bảo file nằm trong thư mục template_qtd
    const rootPath = path.resolve(getTemplateQtdPath());
    const resolvedTemplatePath = path.resolve(templatePath);
    if (!resolvedTemplatePath.startsWith(rootPath)) {
      throw AppError.forbidden('Đường dẫn biểu mẫu không hợp lệ.');
    }

    if (!fs.existsSync(resolvedTemplatePath)) {
      throw AppError.internal(
        `Không tìm thấy file template Word tại đường dẫn: ${resolvedTemplatePath}. Vui lòng kiểm tra thư mục template_qtd.`
      );
    }

    // 2. Đọc file template gốc vào Buffer (chế độ Read-only, tuyệt đối không chỉnh sửa file gốc)
    let templateContent: Buffer;
    try {
      templateContent = fs.readFileSync(resolvedTemplatePath);
    } catch (err: any) {
      throw AppError.internal(`Không thể đọc file template Word: ${err.message}`);
    }

    // 3. Sinh dữ liệu placeholder hoàn chỉnh
    const data = documentPlaceholderService.buildPlaceholders(loan, templateDef.code);

    // 4. Nạp template vào PizZip và Docxtemplater
    let doc: Docxtemplater;
    try {
      const zip = new PizZip(templateContent);

      // Tiền xử lý XML trong bộ nhớ đệm (in-memory, bảo toàn 100% file gốc trên ổ đĩa):
      // Chuẩn hóa định dạng số HĐTC ở đầu các biểu mẫu theo Task A:
      // {{hd_the_chap_nam}}/{{hd_the_chap_thang}}/{{hd_the_chap_so}}/HĐTC -> {{hd_the_chap_so}}
      // {{hd_the_chap_nam}}/{{hd_the_chap_thang}}/{{hd_the_chap_so}} -> {{hd_the_chap_so}}
      const docXmlFile = zip.file('word/document.xml');
      if (docXmlFile) {
        let xml = docXmlFile.asText();
        xml = xml.replace(
          /<w:t[^>]*>\{\{hd_the_chap_nam\}\}<\/w:t>[\s\S]*?<w:t[^>]*>\/HĐTC<\/w:t>/g,
          '<w:t>{{hd_the_chap_so}}</w:t>'
        );
        xml = xml.replace(
          /\{\{hd_the_chap_nam\}\}\/\{\{hd_the_chap_thang\}\}\/\{\{hd_the_chap_so\}\}/g,
          '{{hd_the_chap_so}}'
        );

        // Chuẩn hóa tiền tố "Số vào sổ cấp" thành biến động {{cert_prefix}}
        // phục vụ 4 lựa chọn của Loại giấy chứng nhận theo Task E
        xml = xml.replace(
          /(<w:t[^>]*>)Số vào sổ cấp(<\/w:t>)/gi,
          '$1{{cert_prefix}}$2'
        );
        xml = xml.replace(
          /(<w:t[^>]*>)Số vào sổ cấp\\s+(<\/w:t>)/gi,
          '$1{{cert_prefix}} $2'
        );

        // Task G: Điều 6 Thỏa thuận vay vốn - hiển thị đúng chủ sở hữu tài sản thế chấp
        xml = xml.replace(
          /<w:t[^>]*>\):\s*\{\{chu_so_huu_1_ten\}\}<\/w:t>/g,
          '<w:t>): {{dieu_6_chu_so_huu}}</w:t>'
        );

        // Task H: Đoạn văn trong Thỏa thuận cho vay khi số HĐTC khác số khế ước
        const mortgageClauseIdx = xml.indexOf('mortgage_contract_no');
        if (mortgageClauseIdx !== -1) {
          const pStart = xml.lastIndexOf('<w:p ', mortgageClauseIdx);
          const pEnd = xml.indexOf('</w:p>', mortgageClauseIdx) + 6;
          if (pStart !== -1 && pEnd > pStart) {
            const hasDiffClause = (data as any)?.has_diff_mortgage_clause;
            if (hasDiffClause) {
              const diffPara = '<w:p w14:paraId="1AE98293" w14:textId="6027018B" w:rsidR="00DF2991" w:rsidRDefault="00000000"><w:pPr><w:tabs><w:tab w:val="left" w:pos="360"/><w:tab w:val="left" w:pos="720"/></w:tabs><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:rPr><w:rFonts w:ascii="Times New Roman" w:eastAsia="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:eastAsia="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:tab/></w:r><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:eastAsia="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">Hợp đồng thế chấp số: {{hd_the_chap_so}} được các bên liên quan ký kết kèm theo Thỏa thuận cho vay và là một bộ phận không thể tách rời của Thỏa thuận cho vay số khế ước {{khe_uoc_so}} cấp ngày {{khe_uoc_ngay_cap}}.</w:t></w:r></w:p>';
              xml = xml.slice(0, pStart) + diffPara + xml.slice(pEnd);
            } else {
              // Hai số giống nhau: xóa hoàn toàn paragraph này theo Task H
              xml = xml.slice(0, pStart) + xml.slice(pEnd);
            }
          }
        }

        zip.file('word/document.xml', xml);
      }

      // Xử lý bộ lọc nullGetter: nếu bất kỳ biến nào bị thiếu hoặc null/undefined,
      // tự động điền dấu chấm "..................." theo đúng yêu cầu Mục E.
      doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: { start: '{{', end: '}}' },
        nullGetter: (_part) => EXTENDED_DOTS,
      });
    } catch (err: any) {
      throw AppError.internal(
        `Lỗi khi khởi tạo Docxtemplater cho template ${templateDef.fileName}: ${err.message}`
      );
    }

    // 5. Render dữ liệu vào biểu mẫu
    try {
      doc.render(data);
    } catch (err: any) {
      throw AppError.internal(
        `Lỗi khi điền dữ liệu vào biểu mẫu "${templateDef.fileName}": ${err.message}`
      );
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

  /**
   * Sinh danh sách file Word và đóng gói thành file ZIP
   */
  async generateDocumentsZip(
    loan: LoanWithDocumentData,
    templateKeys: DocumentTemplateKey[]
  ): Promise<GeneratedDocumentResult> {
    if (!templateKeys || templateKeys.length === 0) {
      throw AppError.badRequest('Vui lòng chọn ít nhất một biểu mẫu để xuất.');
    }

    const zipArchive = new PizZip();
    const usedFileNames = new Set<string>();

    for (const key of templateKeys) {
      const templateDef = findTemplateByKey(key);
      if (!templateDef) {
        throw AppError.notFound(`Không tìm thấy mẫu biểu tài liệu với mã: ${key}`);
      }

      if (templateDef.loanType !== 'ALL' && loan.loanType !== templateDef.loanType) {
        throw AppError.badRequest(
          `Biểu mẫu "${templateDef.title}" chỉ áp dụng cho khoản vay ${templateDef.loanType}, hồ sơ hiện tại là ${loan.loanType}.`
        );
      }

      let docResult: GeneratedDocumentResult;
      try {
        docResult = await this.generateDocument(loan, key);
      } catch (err: any) {
        throw AppError.badRequest(
          `Lỗi khi sinh biểu mẫu "${templateDef.title}": ${err.message || 'Lỗi không xác định'}`
        );
      }

      // Xử lý chống trùng tên file bên trong ZIP
      let entryFileName = docResult.fileName;
      if (usedFileNames.has(entryFileName)) {
        const ext = path.extname(entryFileName);
        const base = path.basename(entryFileName, ext);
        let counter = 1;
        while (usedFileNames.has(`${base}_${counter}${ext}`)) {
          counter++;
        }
        entryFileName = `${base}_${counter}${ext}`;
      }
      usedFileNames.add(entryFileName);

      zipArchive.file(entryFileName, docResult.buffer);
    }

    let zipBuffer: Buffer;
    try {
      zipBuffer = zipArchive.generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
      });
    } catch (err: any) {
      throw AppError.internal(`Lỗi khi tạo file nén ZIP: ${err.message}`);
    }

    const safeContractNumber = (loan.contractNumber || `LOAN-${loan.id.slice(-6)}`)
      .replace(/[\/\\?%*:|"<>]/g, '-')
      .replace(/\s+/g, '_');

    const zipFileName = `HoSoVay_${safeContractNumber}.zip`;

    return {
      fileName: zipFileName,
      buffer: zipBuffer,
      mimeType: 'application/zip',
    };
  }
}

export const documentGeneratorService = new DocumentGeneratorService();
