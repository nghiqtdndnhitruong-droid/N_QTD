import PizZip from 'pizzip';
import { AppError } from '../../shared/errors';
import type { ParsedKeywordInfo } from './word-template.types';
import { wordXmlReconciler, normalizeTemplateBraces } from './engine/xml-reconciler';
import { templateAstParser } from './engine/template-ast-parser';
import type { TemplateValidationResult } from './engine/template-engine.types';

export class WordTemplateParserService {
  /**
   * Phân tích file Word (.docx Buffer) và trích xuất toàn bộ từ khóa {{...}}
   * Tương thích cú pháp mở rộng: IF-ELSE, FOR lặp bảng, biến vị trí, truy cập mảng
   */
  public parseDocxBuffer(buffer: Buffer): ParsedKeywordInfo[] {
    const { validation } = this.validateDocxBuffer(buffer);

    const result: ParsedKeywordInfo[] = [];

    // Danh sách từ khóa thông thường
    for (const kw of validation.detectedKeywords) {
      const isLoop = validation.detectedLoops.some((l) => l.collection === kw);
      result.push({
        keyword: kw,
        isLoop,
        loopContext: isLoop ? kw : undefined,
        occurrences: 1,
      });
    }

    return result;
  }

  /**
   * Kiểm tra toàn diện cú pháp AST và báo lỗi chi tiết trước khi xuất
   */
  public validateDocxBuffer(buffer: Buffer): {
    validation: TemplateValidationResult;
    fullPlainText: string;
  } {
    let zip: PizZip;
    try {
      zip = new PizZip(buffer);
    } catch (err: any) {
      throw AppError.badRequest(`Không thể đọc cấu trúc file Word .docx: ${err.message}`);
    }

    const xmlFiles: string[] = [];
    Object.keys(zip.files).forEach((filename) => {
      if (
        filename === 'word/document.xml' ||
        /^word\/header\d+\.xml$/.test(filename) ||
        /^word\/footer\d+\.xml$/.test(filename)
      ) {
        xmlFiles.push(filename);
      }
    });

    if (xmlFiles.length === 0) {
      throw AppError.badRequest('File Word không chứa thành phần word/document.xml hợp lệ.');
    }

    const combinedTexts: string[] = [];

    for (const xmlPath of xmlFiles) {
      const file = zip.file(xmlPath);
      if (!file) continue;

      const rawXml = file.asText();
      // Hàn gắn các run bị phân mảnh
      const reconciled = wordXmlReconciler.reconcile(rawXml);
      const text = this.extractTextFromXml(reconciled);
      combinedTexts.push(text);
    }

    const fullPlainText = combinedTexts.join('\n');
    const { validation } = templateAstParser.parseAndValidate(fullPlainText);

    return {
      validation,
      fullPlainText,
    };
  }

  /**
   * Ghép các thẻ <w:t>...</w:t> liền kề thành đoạn văn bản hoàn chỉnh
   * Đồng thời loại bỏ các dấu vết Track Changes và chuẩn hóa ngoặc nhọn
   */
  private extractTextFromXml(xml: string): string {
    // Loại bỏ track changes / deletions trong Word
    let cleaned = xml
      .replace(/<w:del(?:\s[^>]*)?>[\s\S]*?<\/w:del>/g, '')
      .replace(/<w:delText(?:\s[^>]*)?>[\s\S]*?<\/w:delText>/g, '');

    let text = cleaned.replace(/<w:p[^>]*>/g, '\n');
    text = text.replace(/<w:tab[^>]*\/>/g, '\t');
    text = text.replace(/<w:br[^>]*\/>/g, '\n');

    const matches = text.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g);
    let raw: string;
    if (!matches) {
      raw = text.replace(/<[^>]+>/g, '');
    } else {
      raw = matches
        .map((t) => t.replace(/<w:t[^>]*>/, '').replace(/<\/w:t>/, ''))
        .join('');
    }

    const decoded = raw
      .replace(/&amp;lt;/g, '<')
      .replace(/&lt;/g, '<')
      .replace(/&amp;gt;/g, '>')
      .replace(/&gt;/g, '>')
      .replace(/&amp;quot;/g, '"')
      .replace(/&quot;/g, '"')
      .replace(/&amp;apos;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&amp;amp;/g, '&')
      .replace(/&amp;/g, '&');

    return normalizeTemplateBraces(decoded);
  }
}

export const wordTemplateParserService = new WordTemplateParserService();
