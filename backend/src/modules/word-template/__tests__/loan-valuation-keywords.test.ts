import { describe, it, expect } from 'vitest';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { wordTemplateDataDictionaryService } from '../word-template-data-dictionary.service';
import { wordTemplateCompiler } from '../engine/word-template-compiler';

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

  const sampleValuations = [
    {
      id: 'val-1',
      loanId: 'loan-1',
      valuationType: 'THEO_NGHI_DINH_QUY',
      valuationDate: new Date('2026-05-15T00:00:00.000Z'),
      sheetNumber: '01',
      plotNumber: '008',
      area: 500,
      actualArea: 480,
      pricePerSqMeter: 1200000,
      totalPrice: 576000000,
      notes: 'Thửa đất mặt tiền đường nhựa',
    },
    {
      id: 'val-2',
      loanId: 'loan-1',
      valuationType: 'THEO_GIA_THI_TRUONG',
      valuationDate: new Date('2026-05-15T00:00:00.000Z'),
      sheetNumber: '05',
      plotNumber: '025',
      area: 1200,
      actualArea: 1200,
      pricePerSqMeter: 800000,
      totalPrice: 960000000,
      notes: 'Đất trồng cây lâu năm',
    },
    {
      id: 'val-3',
      loanId: 'loan-1',
      valuationType: 'THEO_GIA_THI_TRUONG_VA_NGHI_DINH_QUY',
      valuationDate: new Date('2026-05-15T00:00:00.000Z'),
      sheetNumber: '09',
      plotNumber: '100',
      area: 350,
      actualArea: 350,
      pricePerSqMeter: 2000000,
      totalPrice: 700000000,
      notes: '',
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
    collaterals: [],
    valuations: sampleValuations,
  };

  it('1. resolveLoanData sinh ra mảng KHOAN_VAY.DANH_SACH_DINH_GIA với 3 bản ghi độc lập', () => {
    const { resolvedContext } = wordTemplateDataDictionaryService.resolveLoanData(mockLoan as any, []);

    const list = resolvedContext['KHOAN_VAY.DANH_SACH_DINH_GIA'];
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBe(3);

    // Dòng 1: THEO_NGHI_DINH_QUY
    const row1 = list[0];
    expect(row1.LOAI_DINH_GIA).toBe('Theo nghị định Quỹ');
    expect(row1.NGAY_DINH_GIA).toBe('15/05/2026');
    expect(row1.SO_TO).toBe('01'); // Bảo toàn số 0 ở đầu
    expect(row1.SO_THUA).toBe('008'); // Bảo toàn 2 số 0 ở đầu
    expect(row1.DIEN_TICH).toBe('500');
    expect(row1.DIEN_TICH_THUC_TE).toBe('480');
    expect(row1.DON_GIA).toBe('1.200.000');
    expect(row1.GIA_TIEN).toBe('576.000.000');
    expect(row1.GHI_CHU).toBe('Thửa đất mặt tiền đường nhựa');
    expect(row1.LA_NGHI_DINH_QUY).toBe(true);
    expect(row1.LA_GIA_THI_TRUONG).toBe(false);
    expect(row1.LA_NGHI_DINH_QUY_CU).toBe(false);
    expect(row1.LA_GIA_THI_TRUONG_VA_NGHI_DINH_QUY).toBe(false);

    // Dòng 2: THEO_GIA_THI_TRUONG
    const row2 = list[1];
    expect(row2.LOAI_DINH_GIA).toBe('Theo giá thị trường');
    expect(row2.SO_TO).toBe('05');
    expect(row2.SO_THUA).toBe('025');
    expect(row2.GIA_TIEN).toBe('960.000.000');
    expect(row2.LA_GIA_THI_TRUONG).toBe(true);
    expect(row2.LA_NGHI_DINH_QUY).toBe(false);

    // Dòng 3: THEO_GIA_THI_TRUONG_VA_NGHI_DINH_QUY
    const row3 = list[2];
    expect(row3.LOAI_DINH_GIA).toBe('Theo giá thị trường và theo nghị định Quỹ');
    expect(row3.SO_TO).toBe('09');
    expect(row3.SO_THUA).toBe('100');
    expect(row3.GIA_TIEN).toBe('700.000.000');
    expect(row3.LA_GIA_THI_TRUONG_VA_NGHI_DINH_QUY).toBe(true);
  });

  it('2. Kiểm tra các keyword tổng hợp cấp khoản vay KHOAN_VAY.*', () => {
    const { resolvedContext } = wordTemplateDataDictionaryService.resolveLoanData(mockLoan as any, []);

    expect(resolvedContext['KHOAN_VAY.SO_LUONG_DINH_GIA']).toBe(3);
    expect(resolvedContext['KHOAN_VAY.CO_DINH_GIA']).toBe(true);

    // Cả 3 bản ghi đều ngày 15/05/2026 -> trả về ngày duy nhất
    expect(resolvedContext['KHOAN_VAY.NGAY_DINH_GIA']).toBe('15/05/2026');

    // 3 bản ghi có loại khác nhau -> trả về chuỗi rỗng
    expect(resolvedContext['KHOAN_VAY.LOAI_DINH_GIA']).toBe('');

    // Tổng giá tiền: 576tr + 960tr + 700tr = 2.236.000.000
    expect(resolvedContext['KHOAN_VAY.TONG_GIA_TIEN_DINH_GIA']).toBe('2.236.000.000');
    expect(resolvedContext['KHOAN_VAY.TONG_GIA_TIEN_DINH_GIA_CHU']).toContain('tỷ');

    // Các cờ boolean cấp khoản vay
    expect(resolvedContext['KHOAN_VAY.CO_DINH_GIA_THEO_NGHI_DINH_QUY']).toBe(true);
    expect(resolvedContext['KHOAN_VAY.CO_DINH_GIA_THEO_GIA_THI_TRUONG']).toBe(true);
    expect(resolvedContext['KHOAN_VAY.CO_DINH_GIA_THEO_GIA_THI_TRUONG_VA_NGHI_DINH_QUY']).toBe(true);
    expect(resolvedContext['KHOAN_VAY.CO_DINH_GIA_THEO_NGHI_DINH_QUY_CU']).toBe(false);
  });

  it('3. Khi toàn bộ các dòng định giá cùng một loại, KHOAN_VAY.LOAI_DINH_GIA trả về tên loại đó', () => {
    const singleTypeLoan = {
      ...mockLoan,
      valuations: [
        { ...sampleValuations[0], valuationType: 'THEO_NGHI_DINH_QUY' },
        { ...sampleValuations[1], valuationType: 'THEO_NGHI_DINH_QUY' },
      ],
    };

    const { resolvedContext } = wordTemplateDataDictionaryService.resolveLoanData(singleTypeLoan as any, []);
    expect(resolvedContext['KHOAN_VAY.LOAI_DINH_GIA']).toBe('Theo nghị định Quỹ');
    expect(resolvedContext['KHOAN_VAY.CO_DINH_GIA_THEO_NGHI_DINH_QUY']).toBe(true);
    expect(resolvedContext['KHOAN_VAY.CO_DINH_GIA_THEO_GIA_THI_TRUONG']).toBe(false);
  });

  it('4. Khi các dòng định giá khác ngày nhau, KHOAN_VAY.NGAY_DINH_GIA trả về rỗng', () => {
    const multiDateLoan = {
      ...mockLoan,
      valuations: [
        { ...sampleValuations[0], valuationDate: new Date('2026-05-15') },
        { ...sampleValuations[1], valuationDate: new Date('2026-05-20') },
      ],
    };

    const { resolvedContext } = wordTemplateDataDictionaryService.resolveLoanData(multiDateLoan as any, []);
    expect(resolvedContext['KHOAN_VAY.NGAY_DINH_GIA']).toBe('');
  });

  it('5. Render thực tế file Word với vòng lặp FOR KHOAN_VAY.DANH_SACH_DINH_GIA và nhân bản dòng', () => {
    // Giả lập XML bảng biểu Word chứa {{#FOR dinh_gia IN KHOAN_VAY.DANH_SACH_DINH_GIA}}
    const rawWordXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:t>DANH SÁCH ĐỊNH GIÁ TÀI SẢN</w:t></w:p>
    <w:tbl>
      <w:tr>
        <w:tc><w:p><w:t>STT</w:t></w:p></w:tc>
        <w:tc><w:p><w:t>Loại</w:t></w:p></w:tc>
        <w:tc><w:p><w:t>Số tờ/thửa</w:t></w:p></w:tc>
        <w:tc><w:p><w:t>Giá tiền</w:t></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:p><w:t>{{#FOR dinh_gia IN KHOAN_VAY.DANH_SACH_DINH_GIA}}{{@number}}</w:t></w:p></w:tc>
        <w:tc><w:p><w:t>{{dinh_gia.LOAI_DINH_GIA}}</w:t></w:p></w:tc>
        <w:tc><w:p><w:t>Tờ {{dinh_gia.SO_TO}} Thửa {{dinh_gia.SO_THUA}}</w:t></w:p></w:tc>
        <w:tc><w:p><w:t>{{dinh_gia.GIA_TIEN}} đ{{/FOR}}</w:t></w:p></w:tc>
      </w:tr>
    </w:tbl>
  </w:body>
</w:document>`;

    const { resolvedContext } = wordTemplateDataDictionaryService.resolveLoanData(mockLoan as any, []);

    // Biên dịch qua wordTemplateCompiler
    const compileResult = wordTemplateCompiler.compile(rawWordXml, resolvedContext);

    // Tạo file zip docx hợp lệ
    const zip = createMockDocxZip(compileResult.compiledXml);

    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{{', end: '}}' },
    });

    doc.render(compileResult.enrichedData);

    const renderedXml = doc.getZip().file('word/document.xml')?.asText() || '';

    // Kiểm tra dòng bảng được lặp 3 lần với đúng dữ liệu từng dòng
    expect(renderedXml).toContain('Theo nghị định Quỹ');
    expect(renderedXml).toContain('Tờ 01 Thửa 008');
    expect(renderedXml).toContain('576.000.000 đ');

    expect(renderedXml).toContain('Theo giá thị trường');
    expect(renderedXml).toContain('Tờ 05 Thửa 025');
    expect(renderedXml).toContain('960.000.000 đ');

    expect(renderedXml).toContain('Theo giá thị trường và theo nghị định Quỹ');
    expect(renderedXml).toContain('Tờ 09 Thửa 100');
    expect(renderedXml).toContain('700.000.000 đ');
  });

  it('6. Khối IF trong vòng lặp FOR hoạt động chính xác theo 4 loại định giá', () => {
    const rawWordXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:t>{{#FOR dg IN KHOAN_VAY.DANH_SACH_DINH_GIA}}Dòng: {{dg.SO_TO}} - {{#IF dg.LA_NGHI_DINH_QUY}}ĐỊNH GIÁ QUỸ{{/IF}}{{#IF dg.LA_GIA_THI_TRUONG}}THỊ TRƯỜNG{{/IF}}{{#IF dg.LA_GIA_THI_TRUONG_VA_NGHI_DINH_QUY}}KẾT HỢP{{/IF}}{{/FOR}}</w:t></w:p>
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

    expect(renderedXml).toContain('Dòng: 01 - ĐỊNH GIÁ QUỸ');
    expect(renderedXml).toContain('Dòng: 05 - THỊ TRƯỜNG');
    expect(renderedXml).toContain('Dòng: 09 - KẾT HỢP');
  });
});
