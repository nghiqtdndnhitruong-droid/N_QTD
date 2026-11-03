import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { AppError } from '../../shared/errors';
import type { ExportResultFile } from './word-template.types';
import { wordTemplateCompiler } from './engine/word-template-compiler';

export class WordTemplateGeneratorService {
  /**
   * Sinh một file Word (.docx Buffer) hoàn chỉnh từ template gốc và dữ liệu context
   * Sử dụng Template Engine v2.0 (AST Compiler, Safe Condition Evaluator, Run Reconciler)
   */
  public generateDocx(templateBuffer: Buffer, context: Record<string, any>): Buffer {
    let doc: Docxtemplater;
    let zip: PizZip;

    try {
      zip = new PizZip(templateBuffer);
    } catch (err: any) {
      throw AppError.internal(
        `Lỗi khi đọc cấu trúc tệp Word DOCX: ${err.message}`,
      );
    }

    let activeData = { ...context };

    // Tiền xử lý bằng WordTemplateCompiler cho tất cả các file XML chứa văn bản:
    // word/document.xml, word/header*.xml, word/footer*.xml
    try {
      const xmlFiles = Object.keys(zip.files).filter((fileName) =>
        /^word\/(document|header\d*|footer\d*)\.xml$/.test(fileName)
      );

      for (const xmlFile of xmlFiles) {
        const fileObj = zip.file(xmlFile);
        if (fileObj) {
          const rawXml = fileObj.asText();
          const { compiledXml, enrichedData } = wordTemplateCompiler.compile(rawXml, activeData);
          activeData = enrichedData;
          zip.file(xmlFile, compiledXml);
        }
      }
    } catch (err: any) {
      throw AppError.badRequest(
        `Lỗi khi tiền xử lý cú pháp template Word: ${err.message}`
      );
    }

    try {
      doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: { start: '{{', end: '}}' },
        nullGetter: () => '...................',
      });
    } catch (err: any) {
      throw AppError.internal(
        `Lỗi khi khởi tạo Docxtemplater: ${err.message}`,
      );
    }

    try {
      // Nạp dữ liệu đã được làm giàu vào biểu mẫu
      doc.render(activeData);
    } catch (err: any) {
      const explanation = err.properties?.errors
        ? err.properties.errors.map((e: any) => e.message).join('; ')
        : err.message;
      throw AppError.badRequest(
        `Không thể điền dữ liệu vào biểu mẫu Word do lỗi cú pháp template: ${explanation}`,
      );
    }

    // Xuất buffer
    try {
      return doc.getZip().generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
      });
    } catch (err: any) {
      throw AppError.internal(`Lỗi khi tạo file Word đầu ra: ${err.message}`);
    }
  }

  /**
   * Đóng gói nhiều file Word vào một file nén ZIP
   */
  public createZipArchive(files: { fileName: string; buffer: Buffer }[]): ExportResultFile {
    try {
      const zip = new PizZip();

      for (const f of files) {
        zip.file(f.fileName, f.buffer);
      }

      const zipBuffer = zip.generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
      });

      return {
        fileName: `Ho_so_vay_${Date.now()}.zip`,
        buffer: zipBuffer,
        mimeType: 'application/zip',
      };
    } catch (err: any) {
      throw AppError.internal(`Lỗi khi đóng gói tệp ZIP biểu mẫu: ${err.message}`);
    }
  }
}

export const wordTemplateGeneratorService = new WordTemplateGeneratorService();
