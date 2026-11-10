import { describe, it, expect } from 'vitest';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { normalizeTemplateBraces, wordXmlReconciler } from '../engine/xml-reconciler';
import { templateAstParser } from '../engine/template-ast-parser';
import { wordTemplateCompiler } from '../engine/word-template-compiler';
import { safeExpressionEvaluator } from '../engine/safe-evaluator';

function createMockDocxZip(documentXml: string): PizZip {
  const zip = new PizZip();
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
      <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
      <Default Extension="xml" ContentType="application/xml"/>
      <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
    </Types>`
  );
  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
    </Relationships>`
  );
  zip.file('word/document.xml', documentXml);
  return zip;
}

describe('Redundant and Broken Braces Handling in Word Templates', () => {
  describe('1. normalizeTemplateBraces helper function', () => {
    it('chuẩn hóa chính xác các trường hợp dư thừa 3 hoặc 4 dấu ngoặc nhọn', () => {
      // 4 dấu mở, 2 dấu đóng (trường hợp thực tế của người dùng)
      expect(normalizeTemplateBraces('{{{{#IF CO_TRONG_NHOM_2}}')).toBe('{{#IF CO_TRONG_NHOM_2}}');

      // 4 dấu mở, 4 dấu đóng
      expect(normalizeTemplateBraces('{{{{#IF CO_TRONG_NHOM_2}}}}')).toBe('{{#IF CO_TRONG_NHOM_2}}');

      // 3 dấu mở, 3 dấu đóng
      expect(normalizeTemplateBraces('{{{#IF CO_TRONG_NHOM_2}}}')).toBe('{{#IF CO_TRONG_NHOM_2}}');

      // 2 dấu mở, 4 dấu đóng
      expect(normalizeTemplateBraces('{{#IF CO_TRONG_NHOM_2}}}}')).toBe('{{#IF CO_TRONG_NHOM_2}}');

      // Đóng thẻ /IF với 4 dấu ngoặc
      expect(normalizeTemplateBraces('{{{{/IF}}}}')).toBe('{{/IF}}');
      expect(normalizeTemplateBraces('{{{{/IF}}')).toBe('{{/IF}}');

      // Biến thông thường
      expect(normalizeTemplateBraces('{{{{CAN_BO.HO_TEN}}}}')).toBe('{{CAN_BO.HO_TEN}}');
      expect(normalizeTemplateBraces('{{{{TAI_SAN.MA_TS}}')).toBe('{{TAI_SAN.MA_TS}}');
    });

    it('chuẩn hóa các dấu ngoặc bị gõ cách nhau bằng khoảng trắng', () => {
      expect(normalizeTemplateBraces('{ { #IF CO_TRONG_NHOM_2 } }')).toBe('{{#IF CO_TRONG_NHOM_2}}');
      expect(normalizeTemplateBraces('{{ { {#IF CO_TRONG_NHOM_2} } }}')).toBe('{{#IF CO_TRONG_NHOM_2}}');
      expect(normalizeTemplateBraces('{  {  CAN_BO.HO_TEN  }  }')).toBe('{{CAN_BO.HO_TEN}}');
    });

    it('giữ nguyên văn bản thông thường không có hoặc chỉ có một dấu ngoặc nhọn', () => {
      expect(normalizeTemplateBraces('Số tiền vay: 100.000.000 đồng')).toBe('Số tiền vay: 100.000.000 đồng');
      expect(normalizeTemplateBraces('Đơn vị: { VND }')).toBe('Đơn vị: { VND }');
    });
  });

  describe('2. TemplateAstParser parsing resilience', () => {
    it('không báo lỗi UNKNOWN_TAG_SYNTAX khi gặp {{{{#IF CO_TRONG_NHOM_2}}', () => {
      const templateText = 'Nội dung: {{{{#IF CO_TRONG_NHOM_2}}Đã vào nhóm 2{{/IF}}';
      const { ast, validation } = templateAstParser.parseAndValidate(templateText);

      expect(validation.isValid).toBe(true);
      expect(validation.diagnostics.filter((d) => d.severity === 'ERROR')).toHaveLength(0);
      expect(validation.detectedConditions).toContain('CO_TRONG_NHOM_2');
      expect(ast.body.some((n) => n.type === 'IF_BLOCK')).toBe(true);
    });

    it('xử lý hoàn hảo khối {{{{#IF CO_TRONG_NHOM_2}}}}...{{{{/IF}}}} lồng biến {{{{CAN_BO.HO_TEN}}}}', () => {
      const templateText =
        '{{{{#IF CO_TRONG_NHOM_2}}}}Cán bộ: {{{{CAN_BO.HO_TEN}}}}{{{{ELSE}}}}Không thuộc nhóm 2{{{{/IF}}}}';
      const { validation } = templateAstParser.parseAndValidate(templateText);

      expect(validation.isValid).toBe(true);
      expect(validation.diagnostics.filter((d) => d.severity === 'ERROR')).toHaveLength(0);
      expect(validation.detectedConditions).toContain('CO_TRONG_NHOM_2');
      expect(validation.detectedKeywords).toContain('CAN_BO.HO_TEN');
    });
  });

  describe('3. WordXmlReconciler XML run reconciliation', () => {
    it('tự động loại bỏ thẻ Track Changes / Revision deletion <w:del>', () => {
      const docxXml =
        '<w:p>' +
        '<w:del><w:r><w:delText>{{</w:delText></w:r></w:del>' +
        '<w:r><w:t>{{#IF CO_TRONG_NHOM_2}}</w:t></w:r>' +
        '<w:r><w:t>Nhóm 2</w:t></w:r>' +
        '<w:r><w:t>{{/IF}}</w:t></w:r>' +
        '</w:p>';

      const reconciled = wordXmlReconciler.reconcile(docxXml);
      expect(reconciled).not.toContain('<w:del>');
      expect(reconciled).not.toContain('<w:delText>');
      expect(reconciled).toContain('{{#IF CO_TRONG_NHOM_2}}');
    });

    it('hàn gắn tag bị xé lẻ giữa các <w:r> kèm dư thừa ngoặc', () => {
      const docxXml =
        '<w:p>' +
        '<w:r><w:t>{{{{#IF </w:t></w:r>' +
        '<w:r><w:t>CO_TRONG_NHOM_2}}}}</w:t></w:r>' +
        '<w:r><w:t>Hiển thị</w:t></w:r>' +
        '<w:r><w:t>{{{{/IF}}}}</w:t></w:r>' +
        '</w:p>';

      const reconciled = wordXmlReconciler.reconcile(docxXml);
      expect(reconciled).toContain('{{#IF CO_TRONG_NHOM_2}}');
      expect(reconciled).toContain('{{/IF}}');
      expect(reconciled).not.toContain('{{{{');
      expect(reconciled).not.toContain('}}}}');
    });
  });

  describe('4. WordTemplateCompiler & Docxtemplater end-to-end rendering', () => {
    it('biên dịch và sinh tài liệu DOCX mượt mà khi template gốc có {{{{...}}}}', () => {
      const rawXml =
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
        '<w:body>' +
        '<w:p><w:r><w:t>{{{{#IF CO_TRONG_NHOM_2}}}}ĐÂY LÀ NHÓM 2 CHO {{{{CAN_BO.HO_TEN}}}}{{{{ELSE}}}}KHÔNG PHẢI NHÓM 2{{{{/IF}}}}</w:t></w:r></w:p>' +
        '</w:body>' +
        '</w:document>';

      const sampleData = {
        CO_TRONG_NHOM_2: true,
        CAN_BO: {
          HO_TEN: 'NGUYỄN VĂN A',
        },
      };

      const compileResult = wordTemplateCompiler.compile(rawXml, sampleData);
      const zip = createMockDocxZip(compileResult.compiledXml);

      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: { start: '{{', end: '}}' },
        parser: (tag: string) => ({
          get: (scope: any, contextObj?: any) => {
            if (tag === '.') return scope;
            if (scope && tag in scope && scope[tag] !== undefined) return scope[tag];
            const val = safeExpressionEvaluator.resolveIdentifier(
              tag,
              compileResult.enrichedData,
              contextObj && contextObj.scopePathItem ? [scope] : []
            );
            return val !== undefined ? val : null;
          },
        }),
      });

      doc.render(compileResult.enrichedData);
      const renderedXml = doc.getZip().file('word/document.xml')?.asText() || '';

      expect(renderedXml).toContain('ĐÂY LÀ NHÓM 2 CHO NGUYỄN VĂN A');
      expect(renderedXml).not.toContain('KHÔNG PHẢI NHÓM 2');
    });
  });
});
