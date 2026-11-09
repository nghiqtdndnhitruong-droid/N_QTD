import { describe, it } from 'vitest';
import PizZip from 'pizzip';
import { wordTemplateGeneratorService } from '../../word-template-generator.service';

export function testEndToEndDocxGeneration() {
  console.log('\n=== TESTING END-TO-END DOCX GENERATION ===');

  // Tạo một buffer docx tối thiểu với OpenXML cấu trúc chuẩn
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

  // XML chứa Table Row Repeater có cú pháp:
  // {{#FOR ts IN DANH_SACH_TAI_SAN}} ở ô đầu và {{/FOR}} ở ô cuối của <w:tr>
  const sampleDocXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:body>
        <w:p><w:t>Kính gửi: {{NGUOI_VAY.HO_TEN}}</w:t></w:p>
        <w:p><w:t>{{#IF CO_NGUOI_THUA_KE}}Có đăng ký người thừa kế{{#ELSE}}Không đăng ký người thừa kế{{/IF}}</w:t></w:p>
        <w:tbl>
          <w:tr>
            <w:tc><w:p><w:t>STT</w:t></w:p></w:tc>
            <w:tc><w:p><w:t>Mã TS</w:t></w:p></w:tc>
            <w:tc><w:p><w:t>Chủ sở hữu</w:t></w:p></w:tc>
          </w:tr>
          <w:tr>
            <w:tc><w:p><w:t>{{#FOR ts IN DANH_SACH_TAI_SAN}}{{@number}}</w:t></w:p></w:tc>
            <w:tc><w:p><w:t>{{ts.MA_TAI_SAN}}</w:t></w:p></w:tc>
            <w:tc><w:p><w:t>{{ts.CHU_SO_HUU}}{{/FOR}}</w:t></w:p></w:tc>
          </w:tr>
        </w:tbl>
        <w:p><w:t>Tài sản đầu tiên: {{DANH_SACH_TAI_SAN[0].MA_TAI_SAN}}</w:t></w:p>
      </w:body>
    </w:document>`;

  zip.file('word/document.xml', sampleDocXml);

  const templateBuffer = zip.generate({ type: 'nodebuffer' });

  const contextData = {
    NGUOI_VAY: { HO_TEN: 'Trần Văn Bình' },
    CO_NGUOI_THUA_KE: true,
    DANH_SACH_TAI_SAN: [
      { MA_TAI_SAN: 'TS-001', CHU_SO_HUU: 'Trần Văn Bình' },
      { MA_TAI_SAN: 'TS-002', CHU_SO_HUU: 'Lê Thị Cúc' },
      { MA_TAI_SAN: 'TS-003', CHU_SO_HUU: 'Nguyễn Văn Đạt' },
    ],
  };

  const outputBuffer = wordTemplateGeneratorService.generateDocx(templateBuffer, contextData);

  // Đọc lại outputBuffer để kiểm tra kết quả XML đã render
  const outZip = new PizZip(outputBuffer);
  const outXml = outZip.file('word/document.xml')?.asText() || '';

  const trCount = (outXml.match(/<w:tr[\s>]/g) || []).length;
  console.log(`  Rendered XML contains ${trCount} table rows (1 header + 3 data rows).`);

  if (trCount !== 4) {
    throw new Error(`Expected 4 table rows, but got ${trCount}`);
  }

  if (!outXml.includes('TS-001') || !outXml.includes('TS-002') || !outXml.includes('TS-003')) {
    throw new Error('Missing collateral asset codes in generated docx!');
  }

  if (!outXml.includes('Có đăng ký người thừa kế')) {
    throw new Error('IF condition did not evaluate to true branch!');
  }

  if (outXml.includes('Không đăng ký người thừa kế')) {
    throw new Error('ELSE branch should have been excluded!');
  }

  console.log('  ✓ Table row duplication (Table Repeater) works perfectly: 3 rows generated!');
  console.log('  ✓ Conditional branch rendering works: IF included, ELSE excluded!');
  console.log('  ✓ All 3 collateral items rendered with correct values!');
  console.log('  ✓ End-to-end DOCX Generation PASS 100%!\n');
}

describe('End-to-end DOCX Generation', () => {
  it('generates DOCX with Table Repeater and conditions', () => {
    testEndToEndDocxGeneration();
  });
});

if (typeof require !== 'undefined' && require.main === module) {
  testEndToEndDocxGeneration();
}
