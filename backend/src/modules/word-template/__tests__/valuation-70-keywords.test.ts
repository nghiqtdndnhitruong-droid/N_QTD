import { describe, it, expect } from 'vitest';
import { wordTemplateDataDictionaryService } from '../word-template-data-dictionary.service';
import { wordTemplateCompiler } from '../engine/word-template-compiler';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

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

describe('70% Total Valuation Keywords (Rounded Down)', () => {
  const mockMember = {
    id: 'm-001',
    fullName: 'Nguyễn Văn A',
    gender: 'NAM',
    yearOfBirth: 1985,
    idType: 'CAN_CUOC_CONG_DAN',
    idNumber: '084085001234',
    idIssueDate: new Date('2021-01-01'),
    idIssuePlace: 'BCA',
    phoneNumber: '0909999999',
    address: 'Xã Long Đức, TP Trà Vinh',
  };

  it('calculates 70% rounded down to millions for exact valuation 500,000,000 VND', () => {
    const mockLoan = {
      id: 'l-001',
      loanCode: 'KV-001',
      amount: 200000000,
      termMonths: 12,
      interestRate: 10,
      loanPurpose: 'Kinh doanh',
      status: 'APPROVED',
      borrower: mockMember,
      loanValuation: {
        id: 'lv-001',
        totalValuationPrice: 500000000,
        valuationLandPrice: 500000000,
        valuationTreePrice: 0,
        valuationOtherPrice: 0,
      },
      collaterals: [],
    };

    const raw = wordTemplateDataDictionaryService.buildRawLoanData(mockLoan);

    // Flat variables
    expect(raw.flatVariables['TAI_SAN.TONG_DINH_GIA_70']).toBe('350.000.000 đ');
    expect(raw.flatVariables['TAI_SAN.TONG_DINH_GIA_70_SO']).toBe('350.000.000');
    expect(raw.flatVariables['TAI_SAN.TONG_DINH_GIA_70_CHU']).toMatch(/Ba trăm năm mươi triệu đồng/i);
    expect(raw.flatVariables['TONG_DINH_GIA_70']).toBe('350.000.000 đ');
    expect(raw.flatVariables['TONG_DINH_GIA_70_SO']).toBe('350.000.000');
    expect(raw.flatVariables['TONG_DINH_GIA_70_CHU']).toMatch(/Ba trăm năm mươi triệu đồng/i);

    // Nested variables
    expect(raw.nested.TAI_SAN.TONG_DINH_GIA_70).toBe('350.000.000 đ');
    expect(raw.nested.TAI_SAN.TONG_DINH_GIA_70_SO).toBe('350.000.000');
    expect(raw.nested.TAI_SAN.TONG_DINH_GIA_70_CHU).toMatch(/Ba trăm năm mươi triệu đồng/i);
    expect(raw.nested.KHOAN_VAY.TONG_DINH_GIA_70).toBe('350.000.000 đ');
    expect(raw.nested.KHOAN_VAY.TONG_DINH_GIA_70_SO).toBe('350.000.000');
    expect(raw.nested.KHOAN_VAY.TONG_DINH_GIA_70_CHU).toMatch(/Ba trăm năm mươi triệu đồng/i);
  });

  it('rounds down to the nearest million when 70% results in fractional millions', () => {
    // 105,500,000 * 0.7 = 73,850,000 -> Math.floor(73850000 / 1000000) * 1000000 = 73,000,000
    const mockLoan = {
      id: 'l-002',
      loanCode: 'KV-002',
      amount: 50000000,
      termMonths: 6,
      interestRate: 9,
      loanPurpose: 'Tiêu dùng',
      status: 'APPROVED',
      borrower: mockMember,
      loanValuation: {
        id: 'lv-002',
        totalValuationPrice: 105500000,
        valuationLandPrice: 105500000,
      },
      collaterals: [],
    };

    const raw = wordTemplateDataDictionaryService.buildRawLoanData(mockLoan);

    expect(raw.flatVariables['TAI_SAN.TONG_DINH_GIA_70']).toBe('73.000.000 đ');
    expect(raw.flatVariables['TAI_SAN.TONG_DINH_GIA_70_SO']).toBe('73.000.000');
    expect(raw.flatVariables['TAI_SAN.TONG_DINH_GIA_70_CHU']).toMatch(/Bảy mươi ba triệu đồng/i);
  });

  it('renders correctly inside docx compiler template', () => {
    const mockLoan = {
      id: 'l-003',
      loanCode: 'KV-003',
      amount: 100000000,
      borrower: mockMember,
      loanValuation: {
        id: 'lv-003',
        totalValuationPrice: 600000000, // 70% is 420,000,000
      },
      collaterals: [],
    };

    const rawData = wordTemplateDataDictionaryService.buildRawLoanData(mockLoan);

    const docxXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:p><w:r><w:t>Số: {{TAI_SAN.TONG_DINH_GIA_70_SO}}</w:t></w:r></w:p>
          <w:p><w:r><w:t>Tiền: {{TAI_SAN.TONG_DINH_GIA_70}}</w:t></w:r></w:p>
          <w:p><w:r><w:t>Chữ: {{TAI_SAN.TONG_DINH_GIA_70_CHU}}</w:t></w:r></w:p>
          <w:p><w:r><w:t>Số phẳng: {{TONG_DINH_GIA_70_SO}}</w:t></w:r></w:p>
          <w:p><w:r><w:t>Chữ phẳng: {{TONG_DINH_GIA_70_CHU}}</w:t></w:r></w:p>
        </w:body>
      </w:document>
    `;

    const compileResult = wordTemplateCompiler.compile(docxXml, rawData.flatVariables);
    const zip = createMockDocxZip(compileResult.compiledXml);

    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{{', end: '}}' },
    });
    doc.render(compileResult.enrichedData);
    const outputXml = doc.getZip().file('word/document.xml')?.asText() || '';

    expect(outputXml).toContain('420.000.000');
    expect(outputXml).toContain('420.000.000 đ');
    expect(outputXml).toContain('Bốn trăm hai mươi triệu đồng');
  });
});
