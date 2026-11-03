import { describe, expect, it } from 'vitest';
import dayjs from 'dayjs';
import PizZip from 'pizzip';
import { wordTemplateDataDictionaryService } from '../word-template-data-dictionary.service';
import { wordTemplateGeneratorService } from '../word-template-generator.service';

describe('Word Template Keywords: NGUOI_VAY.LOAI_GIAY_TO, NGAY, THANG, NAM', () => {
  const mockLoan = {
    id: 'loan-test-1',
    contractNumber: 'KU-2026-9999',
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

  it('1. resolveLoanData xuất đúng NGUOI_VAY.LOAI_GIAY_TO và LOAI_GIAY_TO', () => {
    const mappings = [
      { keyword: 'NGUOI_VAY.LOAI_GIAY_TO', dataPath: 'member.idType', displayName: 'Loại giấy tờ người vay' },
      { keyword: 'LOAI_GIAY_TO', dataPath: 'member.idType', displayName: 'Loại giấy tờ' },
      { keyword: 'NGAY', dataPath: 'fund.currentDay', displayName: 'Ngày hiện tại' },
      { keyword: 'THANG', dataPath: 'fund.currentMonth', displayName: 'Tháng hiện tại' },
      { keyword: 'NAM', dataPath: 'fund.currentYear', displayName: 'Năm hiện tại' },
    ];

    const { resolvedContext } = wordTemplateDataDictionaryService.resolveLoanData(mockLoan, mappings as any);

    expect(resolvedContext['NGUOI_VAY.LOAI_GIAY_TO']).toBe('Căn cước công dân');
    expect(resolvedContext['LOAI_GIAY_TO']).toBe('Căn cước công dân');
    expect(resolvedContext['NGUOI_VAY']?.LOAI_GIAY_TO).toBe('Căn cước công dân');

    const now = dayjs();
    expect(resolvedContext['NGAY']).toBe(now.format('DD'));
    expect(resolvedContext['THANG']).toBe(now.format('MM'));
    expect(resolvedContext['NAM']).toBe(now.format('YYYY'));
  });

  it('2. Format CAN_CUOC thành Thẻ căn cước', () => {
    const loanCanCuoc = {
      ...mockLoan,
      member: {
        ...mockLoan.member,
        idType: 'CAN_CUOC',
      },
    };

    const mappings = [
      { keyword: 'NGUOI_VAY.LOAI_GIAY_TO', dataPath: 'member.idType', displayName: 'Loại giấy tờ người vay' },
    ];

    const { resolvedContext } = wordTemplateDataDictionaryService.resolveLoanData(loanCanCuoc, mappings as any);
    expect(resolvedContext['NGUOI_VAY.LOAI_GIAY_TO']).toBe('Thẻ căn cước');
  });

  it('3. Sinh file docx với các biến {{NGUOI_VAY.LOAI_GIAY_TO}}, {{NGAY}}, {{THANG}}, {{NAM}}', () => {
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
          <w:p><w:t>Loại giấy tờ: {{NGUOI_VAY.LOAI_GIAY_TO}}</w:t></w:p>
          <w:p><w:t>Hôm nay ngày {{NGAY}} tháng {{THANG}} năm {{NAM}}</w:t></w:p>
        </w:body>
      </w:document>`;
    zip.file('word/document.xml', docXml);

    const templateBuf = zip.generate({ type: 'nodebuffer' });

    const mappings = [
      { keyword: 'NGUOI_VAY.LOAI_GIAY_TO', dataPath: 'member.idType', displayName: 'Loại giấy tờ' },
      { keyword: 'NGAY', dataPath: 'fund.currentDay', displayName: 'Ngày' },
      { keyword: 'THANG', dataPath: 'fund.currentMonth', displayName: 'Tháng' },
      { keyword: 'NAM', dataPath: 'fund.currentYear', displayName: 'Năm' },
    ];
    const { resolvedContext } = wordTemplateDataDictionaryService.resolveLoanData(mockLoan, mappings as any);

    const outputBuffer = wordTemplateGeneratorService.generateDocx(templateBuf, resolvedContext);
    const outZip = new PizZip(outputBuffer);
    const outXml = outZip.file('word/document.xml')?.asText() || '';

    const now = dayjs();
    expect(outXml).toContain('Loại giấy tờ: Căn cước công dân');
    expect(outXml).toContain(`Hôm nay ngày ${now.format('DD')} tháng ${now.format('MM')} năm ${now.format('YYYY')}`);
  });
});

