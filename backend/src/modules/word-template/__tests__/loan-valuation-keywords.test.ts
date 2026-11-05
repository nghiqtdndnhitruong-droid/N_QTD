import { describe, it, expect } from 'vitest';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { wordTemplateDataDictionaryService } from '../word-template-data-dictionary.service';
import { wordTemplateCompiler } from '../engine/word-template-compiler';
import { wordTemplateGeneratorService } from '../word-template-generator.service';

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

describe('Loan Valuation Engine & Word Template Keywords', () => {
  const mockMember = {
    id: 'm1',
    fullName: 'Lê Văn Cường',
    gender: 'NAM',
    yearOfBirth: 1980,
    idType: 'CAN_CUOC_CONG_DAN',
    idNumber: '084080001234',
    idIssueDate: new Date('2021-05-10'),
    idIssuePlace: 'Cục Cảnh sát QLHC về TTXH',
    phoneNumber: '0901234567',
    address: 'Ấp 1, Xã Nhị Trường, Cầu Ngang, Trà Vinh',
  };

  const sampleCollaterals = [
    {
      id: 'c-1',
      assetCode: 'TS-001',
      certificateNumber: 'GCN-001',
      sheetNumber: '12',
      plotNumber: '100',
      area: 100,
      actualArea: null,
      address: 'Xã Nhị Trường',
      ownerName: 'Lê Văn Cường',
    },
    {
      id: 'c-2',
      assetCode: 'TS-002',
      certificateNumber: 'GCN-002',
      sheetNumber: '12',
      plotNumber: '101',
      area: 150,
      actualArea: null,
      address: 'Xã Nhị Trường',
      ownerName: 'Lê Văn Cường',
    },
    {
      id: 'c-3',
      assetCode: 'TS-003',
      certificateNumber: 'GCN-003',
      sheetNumber: '13',
      plotNumber: '200',
      area: 200,
      actualArea: 200,
      address: 'Xã Nhị Trường',
      ownerName: 'Lê Văn Cường',
    },
  ];

  const sampleValuations = [
    {
      id: 'val-group-1',
      loanId: 'loan-1',
      collateralIds: ['c-1', 'c-2', 'c-3'],
      collaterals: sampleCollaterals,
      valuationType: 'THEO_NGHI_DINH_QUY',
      valuationDate: new Date('2026-05-15T00:00:00.000Z'),
      sheetNumber: '12, 13',
      plotNumber: '100, 101, 200',
      area: 450,
      actualArea: 200,
      pricePerSqMeter: 1000000,
      totalPriceBeforeRound: 450000000,
      totalPrice: 450000000,
      notes: 'Gộp 3 tài sản cùng mức giá 1 triệu',
    },
    {
      id: 'val-group-2',
      loanId: 'loan-1',
      collateralIds: ['c-3'],
      collaterals: [sampleCollaterals[2]],
      valuationType: 'THEO_GIA_THI_TRUONG',
      valuationDate: new Date('2026-05-15T00:00:00.000Z'),
      sheetNumber: '13',
      plotNumber: '200',
      area: 200,
      actualArea: 200,
      pricePerSqMeter: 1250500,
      totalPriceBeforeRound: 250100000, // 200 * 1.250.500 = 250.100.000
      totalPrice: 250000000,            // Làm tròn xuống 250.000.000
      notes: 'Định giá thị trường cho TS-003',
    },
  ];

  const mockLoan = {
    id: 'loan-1',
    contractNumber: 'KU-2026-099',
    contractDate: new Date('2026-05-15'),
    loanType: 'THE_CHAP',
    termType: 'TRUNG_HAN',
    termMonths: 24,
    loanAmount: 800000000,
    interestRate: 10.5,
    member: mockMember,
    collaterals: sampleCollaterals,
    valuations: sampleValuations,
  };

  it('1. resolveLoanData sinh ra mảng KHOAN_VAY.DANH_SACH_DINH_GIA theo nhóm tài sản với quy tắc làm tròn FLOOR', () => {
    const { resolvedContext } = wordTemplateDataDictionaryService.resolveLoanData(mockLoan as any, []);

    const list = resolvedContext['KHOAN_VAY.DANH_SACH_DINH_GIA'];
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBe(2);

    // Nhóm 1: Gộp 3 tài sản
    const g1 = list[0];
    expect(g1.LOAI_DINH_GIA).toBe('Theo nghị định Quỹ');
    expect(g1.NGAY_DINH_GIA).toBe('15/05/2026');
    expect(g1.SO_TO).toBe('12, 13'); // Deduplicate
    expect(g1.SO_THUA).toBe('100, 101, 200'); // Preserve order
    expect(g1.DIEN_TICH).toBe('450');
    expect(g1.DON_GIA).toBe('1.000.000');
    expect(g1.GIA_TIEN).toBe('450.000.000');
    expect(g1.SO_LUONG_TAI_SAN).toBe(3);
    expect(Array.isArray(g1.DANH_SACH_TAI_SAN)).toBe(true);
    expect(g1.DANH_SACH_TAI_SAN.length).toBe(3);
    expect(g1.DANH_SACH_TAI_SAN[0].MA_TAI_SAN).toBe('TS-001');
    expect(g1.DANH_SACH_TAI_SAN[1].MA_TAI_SAN).toBe('TS-002');
    expect(g1.DANH_SACH_TAI_SAN[2].MA_TAI_SAN).toBe('TS-003');

    // Nhóm 2: TS lẻ có làm tròn xuống hàng triệu
    const g2 = list[1];
    expect(g2.LOAI_DINH_GIA).toBe('Theo giá thị trường');
    expect(g2.GIA_TIEN_TRUOC_LAM_TRON).toBe('250.100.000');
    expect(g2.GIA_TIEN).toBe('250.000.000'); // Đã làm tròn xuống từ 250.100.000
    expect(g2.SO_LUONG_TAI_SAN).toBe(1);
    expect(g2.LA_GIA_THI_TRUONG).toBe(true);
  });

  it('2. Kiểm tra các keyword tổng hợp cấp khoản vay KHOAN_VAY.* và TAI_SAN.*', () => {
    const { resolvedContext } = wordTemplateDataDictionaryService.resolveLoanData(mockLoan as any, []);

    expect(resolvedContext['KHOAN_VAY.SO_LUONG_DINH_GIA']).toBe(2);
    expect(resolvedContext['KHOAN_VAY.CO_DINH_GIA']).toBe(true);
    expect(resolvedContext['KHOAN_VAY.NGAY_DINH_GIA']).toBe('15/05/2026');

    // Tổng tiền 450tr + 250tr = 700.000.000
    expect(resolvedContext['KHOAN_VAY.TONG_GIA_TRI_DINH_GIA']).toBe('700.000.000');
    expect(resolvedContext['TAI_SAN.TONG_GIA_TRI_DINH_GIA']).toBe('700.000.000');
    expect(resolvedContext['KHOAN_VAY.CO_DINH_GIA_THEO_NGHI_DINH_QUY']).toBe(true);
    expect(resolvedContext['KHOAN_VAY.CO_DINH_GIA_THEO_GIA_THI_TRUONG']).toBe(true);
  });

  it('3. Render file Word với vòng lặp ngoài KHOAN_VAY.DANH_SACH_DINH_GIA', () => {
    const rawWordXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:t>DANH SÁCH NHÓM ĐỊNH GIÁ</w:t></w:p>
    <w:tbl>
      <w:tr>
        <w:tc><w:p><w:t>Nhóm</w:t></w:p></w:tc>
        <w:tc><w:p><w:t>Số tờ gộp</w:t></w:p></w:tc>
        <w:tc><w:p><w:t>Số thửa gộp</w:t></w:p></w:tc>
        <w:tc><w:p><w:t>Tổng tiền</w:t></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:p><w:t>{{#FOR dg IN KHOAN_VAY.DANH_SACH_DINH_GIA}}Nhóm {{@number}}</w:t></w:p></w:tc>
        <w:tc><w:p><w:t>{{dg.SO_TO}}</w:t></w:p></w:tc>
        <w:tc><w:p><w:t>{{dg.SO_THUA}}</w:t></w:p></w:tc>
        <w:tc><w:p><w:t>{{dg.GIA_TIEN}} đ{{/FOR}}</w:t></w:p></w:tc>
      </w:tr>
    </w:tbl>
  </w:body>
</w:document>`;

    const { resolvedContext } = wordTemplateDataDictionaryService.resolveLoanData(mockLoan as any, []);
    const compileResult = wordTemplateCompiler.compile(rawWordXml, resolvedContext);
    const zip = createMockDocxZip(compileResult.compiledXml);

    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{{', end: '}}' },
    });

    doc.render(compileResult.enrichedData);
    const renderedXml = doc.getZip().file('word/document.xml')?.asText() || '';

    expect(renderedXml).toContain('12, 13');
    expect(renderedXml).toContain('100, 101, 200');
    expect(renderedXml).toContain('450.000.000 đ');
    expect(renderedXml).toContain('250.000.000 đ');
  });

  it('4. Render file Word với vòng lặp lồng nhau: FOR dinh_gia lồng FOR tai_san IN dinh_gia.DANH_SACH_TAI_SAN', () => {
    const rawWordXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:t>{{#FOR dg IN KHOAN_VAY.DANH_SACH_DINH_GIA}}NHÓM [{{dg.SO_TO}}]: {{#FOR ts IN dg.DANH_SACH_TAI_SAN}}({{@number}}.{{ts.MA_TAI_SAN}}-{{ts.SO_THUA}}){{/FOR}} - TIỀN: {{dg.GIA_TIEN}} / {{/FOR}}</w:t></w:p>
  </w:body>
</w:document>`;

    const { resolvedContext } = wordTemplateDataDictionaryService.resolveLoanData(mockLoan as any, []);
    const compileResult = wordTemplateCompiler.compile(rawWordXml, resolvedContext);
    const zip = createMockDocxZip(compileResult.compiledXml);

    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{{', end: '}}' },
    });

    doc.render(compileResult.enrichedData);
    const renderedXml = doc.getZip().file('word/document.xml')?.asText() || '';

    // Nhóm 1 có 3 tài sản
    expect(renderedXml).toContain('NHÓM [12, 13]:');
    expect(renderedXml).toContain('(1.TS-001-100)');
    expect(renderedXml).toContain('(2.TS-002-101)');
    expect(renderedXml).toContain('(3.TS-003-200)');
    expect(renderedXml).toContain('TIỀN: 450.000.000');

    // Nhóm 2 có 1 tài sản
    expect(renderedXml).toContain('NHÓM [13]:');
    expect(renderedXml).toContain('(1.TS-003-200)');
    expect(renderedXml).toContain('TIỀN: 250.000.000');
  });

  it('5. Khối IF trong vòng lặp lồng nhau hoạt động chính xác', () => {
    const rawWordXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:t>{{#FOR dg IN KHOAN_VAY.DANH_SACH_DINH_GIA}}{{#IF dg.LA_NGHI_DINH_QUY}}LOAI_QUY{{/IF}}{{#IF dg.LA_GIA_THI_TRUONG}}LOAI_THI_TRUONG{{/IF}} - {{/FOR}}</w:t></w:p>
  </w:body>
</w:document>`;

    const { resolvedContext } = wordTemplateDataDictionaryService.resolveLoanData(mockLoan as any, []);
    const compileResult = wordTemplateCompiler.compile(rawWordXml, resolvedContext);
    const zip = createMockDocxZip(compileResult.compiledXml);

    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{{', end: '}}' },
    });

    doc.render(compileResult.enrichedData);
    const renderedXml = doc.getZip().file('word/document.xml')?.asText() || '';

    expect(renderedXml).toContain('LOAI_QUY');
    expect(renderedXml).toContain('LOAI_THI_TRUONG');
  });
});
