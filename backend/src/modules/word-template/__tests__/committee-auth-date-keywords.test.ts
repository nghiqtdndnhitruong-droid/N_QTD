import { describe, expect, it } from 'vitest';
import PizZip from 'pizzip';
import { wordTemplateDataDictionaryService } from '../word-template-data-dictionary.service';
import { wordTemplateGeneratorService } from '../word-template-generator.service';

describe('Word Template Keywords: NGAY_CHUNG_THUC_UY_BAN_NGAY, NGAY_CHUNG_THUC_UY_BAN_THANG, NGAY_CHUNG_THUC_UY_BAN_NAM', () => {
  const baseMockLoan = {
    id: 'loan-test-committee-1',
    contractNumber: '26.11.020',
    contractDate: new Date('2026-11-03'),
    loanType: 'THE_CHAP',
    loanAmount: 200000000,
    member: {
      id: 'm1',
      fullName: 'Nguyễn Văn A',
      gender: 'NAM',
      idType: 'CAN_CUOC_CONG_DAN',
      idNumber: '084174001111',
      yearOfBirth: 1988,
      address: 'Xã Nhị Trường, Tỉnh Vĩnh Long',
    },
    collaterals: [],
    relatedPersons: [],
  };

  it('1. resolveLoanData xuất đúng khi committeeAuthDate là Date object', () => {
    const mockLoan = {
      ...baseMockLoan,
      mortgageContract: {
        contractNumber: '01/2026/HĐTC',
        contractExpiryDate: new Date('2030-05-20'),
        committeeAuthDate: new Date('2026-05-20T00:00:00.000Z'),
      },
    };

    const mappings = [
      { keyword: 'NGAY_CHUNG_THUC_UY_BAN_NGAY', dataPath: 'mortgage.committeeAuthDateDay', displayName: 'Ngày chứng thực ủy ban ngày' },
      { keyword: 'NGAY_CHUNG_THUC_UY_BAN_THANG', dataPath: 'mortgage.committeeAuthDateMonth', displayName: 'Ngày chứng thực ủy ban tháng' },
      { keyword: 'NGAY_CHUNG_THUC_UY_BAN_NAM', dataPath: 'mortgage.committeeAuthDateYear', displayName: 'Ngày chứng thực ủy ban năm' },
    ];

    const { resolvedContext } = wordTemplateDataDictionaryService.resolveLoanData(mockLoan, mappings as any);

    expect(resolvedContext['NGAY_CHUNG_THUC_UY_BAN_NGAY']).toBe('20');
    expect(resolvedContext['NGAY_CHUNG_THUC_UY_BAN_THANG']).toBe('05');
    expect(resolvedContext['NGAY_CHUNG_THUC_UY_BAN_NAM']).toBe('2026');

    // Kiểm tra nested
    expect(resolvedContext['mortgage']?.NGAY_CHUNG_THUC_UY_BAN_NGAY).toBe('20');
    expect(resolvedContext['mortgage']?.NGAY_CHUNG_THUC_UY_BAN_THANG).toBe('05');
    expect(resolvedContext['mortgage']?.NGAY_CHUNG_THUC_UY_BAN_NAM).toBe('2026');

    // Kiểm tra alias UBND
    expect(resolvedContext['NGAY_CHUNG_THUC_UBND_NGAY']).toBe('20');
    expect(resolvedContext['NGAY_CHUNG_THUC_UBND_THANG']).toBe('05');
    expect(resolvedContext['NGAY_CHUNG_THUC_UBND_NAM']).toBe('2026');

    // Kiểm tra KHOAN_VAY prefix
    expect(resolvedContext['KHOAN_VAY.NGAY_CHUNG_THUC_UY_BAN_NGAY']).toBe('20');
    expect(resolvedContext['KHOAN_VAY.NGAY_CHUNG_THUC_UY_BAN_THANG']).toBe('05');
    expect(resolvedContext['KHOAN_VAY.NGAY_CHUNG_THUC_UY_BAN_NAM']).toBe('2026');
  });

  it('2. resolveLoanData trích xuất đúng khi committeeAuthDate là chuỗi DD/MM/YYYY', () => {
    const mockLoan = {
      ...baseMockLoan,
      mortgageContract: {
        contractNumber: '01/2026/HĐTC',
        committeeAuthDate: '15/08/2026',
      },
    };

    const { resolvedContext } = wordTemplateDataDictionaryService.resolveLoanData(mockLoan, []);

    expect(resolvedContext['NGAY_CHUNG_THUC_UY_BAN_NGAY']).toBe('15');
    expect(resolvedContext['NGAY_CHUNG_THUC_UY_BAN_THANG']).toBe('08');
    expect(resolvedContext['NGAY_CHUNG_THUC_UY_BAN_NAM']).toBe('2026');
  });

  it('3. resolveLoanData trả về rỗng khi không có committeeAuthDate hoặc không có hợp đồng thế chấp', () => {
    const mockLoan = {
      ...baseMockLoan,
      mortgageContract: null,
    };

    const { resolvedContext } = wordTemplateDataDictionaryService.resolveLoanData(mockLoan, []);

    expect(resolvedContext['NGAY_CHUNG_THUC_UY_BAN_NGAY']).toBe('');
    expect(resolvedContext['NGAY_CHUNG_THUC_UY_BAN_THANG']).toBe('');
    expect(resolvedContext['NGAY_CHUNG_THUC_UY_BAN_NAM']).toBe('');
  });

  it('4. Sinh file docx với các biến {{NGAY_CHUNG_THUC_UY_BAN_NGAY}}, {{NGAY_CHUNG_THUC_UY_BAN_THANG}}, {{NGAY_CHUNG_THUC_UY_BAN_NAM}}', () => {
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

    const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:p><w:t>Chứng thực ngày {{NGAY_CHUNG_THUC_UY_BAN_NGAY}} tháng {{NGAY_CHUNG_THUC_UY_BAN_THANG}} năm {{NGAY_CHUNG_THUC_UY_BAN_NAM}}</w:t></w:p>
        </w:body>
      </w:document>`;
    zip.file('word/document.xml', docXml);

    const templateBuf = zip.generate({ type: 'nodebuffer' });

    const mockLoan = {
      ...baseMockLoan,
      mortgageContract: {
        contractNumber: '01/2026/HĐTC',
        committeeAuthDate: new Date('2026-09-25T00:00:00.000Z'),
      },
    };

    const { resolvedContext } = wordTemplateDataDictionaryService.resolveLoanData(mockLoan, []);
    const outBuf = wordTemplateGeneratorService.generateDocx(templateBuf, resolvedContext);
    const resultZip = new PizZip(outBuf);
    const resultXml = resultZip.file('word/document.xml')?.asText() || '';

    expect(resultXml).toContain('Chứng thực ngày 25 tháng 09 năm 2026');
  });
});
