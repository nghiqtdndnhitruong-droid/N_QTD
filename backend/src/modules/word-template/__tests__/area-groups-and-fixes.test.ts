import { describe, it, expect } from 'vitest';
import { wordTemplateDataDictionaryService, formatAreaDisplay } from '../word-template-data-dictionary.service';
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

describe('Fix 1: Area formatting without thousand separators (e.g. 1992,5 m²)', () => {
  it('formats area number with comma for decimals and no thousand separator', () => {
    expect(formatAreaDisplay(1992.5)).toBe('1992,5');
    expect(formatAreaDisplay(500)).toBe('500');
    expect(formatAreaDisplay(12000.75)).toBe('12000,75');
    expect(formatAreaDisplay('1992.5')).toBe('1992,5');
    expect(formatAreaDisplay(null)).toBe('');
  });

  it('outputs area in loan and collaterals without thousand separator', () => {
    const mockLoan = {
      id: 'loan-area-1',
      contractNumber: 'KV-01',
      member: { fullName: 'Nguyễn Văn A', address: 'Ấp 1, Xã Nhị Trường' },
      collaterals: [
        {
          id: 'c-1',
          assetCode: 'TS-01',
          certificateNumber: 'CS01',
          area: 1992.5,
          address: 'Xã Nhị Trường',
        },
        {
          id: 'c-2',
          assetCode: 'TS-02',
          certificateNumber: 'CS02',
          area: 2500,
          address: 'Xã Nhị Trường',
        },
      ],
    };

    const raw = wordTemplateDataDictionaryService.buildRawLoanData(mockLoan);

    // Flat variables
    expect(raw.flatVariables['TAI_SAN.DIEN_TICH_GOP']).toContain('1992,5 m²');
    expect(raw.flatVariables['TAI_SAN.DIEN_TICH_GOP']).toContain('2500 m²');
    expect(raw.flatVariables['TAI_SAN.DIEN_TICH_GOP']).not.toContain('1.992,5');

    // Total area
    expect(raw.flatVariables['TONG_DIEN_TICH']).toBe('4492,5 m²');
    expect(raw.flatVariables['TONG_DIEN_TICH_SO']).toBe('4492,5');
  });
});

describe('Fix 2: TAI_SAN.LOAI_VA_SO_GCN_GOP single prefix for same certType', () => {
  it('combines certificate numbers with semicolon when both are GCN', () => {
    const mockLoan = {
      id: 'loan-cert-1',
      collaterals: [
        {
          id: 'c-1',
          certificateType: 'GCN',
          certificateNumber: 'CS04421',
          address: 'Xã Nhị Trường',
        },
        {
          id: 'c-2',
          certificateType: 'GCN',
          certificateNumber: 'CS04418',
          address: 'Xã Nhị Trường',
        },
      ],
    };

    const raw = wordTemplateDataDictionaryService.buildRawLoanData(mockLoan);

    // Must be "Số vào sổ cấp GCN: CS04421; CS04418" and NOT repeat "Số vào sổ cấp GCN:"
    expect(raw.flatVariables['TAI_SAN.LOAI_VA_SO_GCN_GOP']).toBe('Số vào sổ cấp GCN: CS04421; CS04418');
    expect(raw.flatVariables['LOAI_VA_SO_GCN_GOP']).toBe('Số vào sổ cấp GCN: CS04421; CS04418');
    expect(raw.nested.TAI_SAN.LOAI_VA_SO_GCN_GOP).toBe('Số vào sổ cấp GCN: CS04421; CS04418');
  });

  it('keeps both prefixes when certificate types are different', () => {
    const mockLoan = {
      id: 'loan-cert-2',
      collaterals: [
        {
          id: 'c-1',
          certificateType: 'GCN',
          certificateNumber: 'CS04421',
          address: 'Xã Nhị Trường',
        },
        {
          id: 'c-2',
          certificateType: 'VÀO SỔ CẤP GIẤY CHỨNG NHẬN QUYỀN SỬ DỤNG ĐẤT SỐ',
          certificateNumber: 'CS04418',
          address: 'Xã Nhị Trường',
        },
      ],
    };

    const raw = wordTemplateDataDictionaryService.buildRawLoanData(mockLoan);

    expect(raw.flatVariables['TAI_SAN.LOAI_VA_SO_GCN_GOP']).toBe(
      'Số vào sổ cấp GCN: CS04421; Vào sổ cấp giấy chứng nhận quyền sử dụng đất Số: CS04418'
    );
  });
});

describe('Feature: Area Groups and CO_TRONG_NHOM_* Conditions', () => {
  const customGroups = [
    {
      id: 'grp-1',
      code: 'NHOM_1',
      name: 'Nhóm 1',
      communeIds: ['commune-nhi-truong'],
      communes: [{ id: 'commune-nhi-truong', name: 'Xã Nhị Trường', code: 'NHI_TRUONG' }],
    },
    {
      id: 'grp-2',
      code: 'NHOM_2',
      name: 'Nhóm 2',
      communeIds: ['commune-tap-son'],
      communes: [{ id: 'commune-tap-son', name: 'Xã Tập Sơn', code: 'TAP_SON' }],
    },
  ];

  it('evaluates CO_TRONG_NHOM_1 as true and CO_TRONG_NHOM_2 as false when asset is in Nhị Trường', () => {
    const mockLoan = {
      id: 'loan-grp-1',
      collaterals: [
        {
          id: 'c-1',
          communeId: 'commune-nhi-truong',
          communeName: 'Xã Nhị Trường',
          address: 'Ấp Nô Lựa, Xã Nhị Trường',
        },
      ],
    };

    const raw = wordTemplateDataDictionaryService.buildRawLoanData(mockLoan, customGroups);

    expect(raw.flatVariables['CO_TRONG_NHOM_1']).toBe(true);
    expect(raw.flatVariables['CO_TRONG_NHOM_2']).toBe(false);
    expect(raw.flatVariables['CO_TAI_SAN_NHOM_1']).toBe(true);
    expect(raw.flatVariables['TAI_SAN.CO_TRONG_NHOM_1']).toBe(true);
    expect(raw.flatVariables['TAI_SAN.MA_NHOM']).toBe('NHOM_1');
    expect(raw.flatVariables['TAI_SAN.TEN_NHOM']).toBe('Nhóm 1');
  });

  it('evaluates both true when loan has multiple assets in different groups', () => {
    const mockLoan = {
      id: 'loan-grp-2',
      collaterals: [
        {
          id: 'c-1',
          communeId: 'commune-nhi-truong',
          address: 'Xã Nhị Trường',
        },
        {
          id: 'c-2',
          communeId: 'commune-tap-son',
          address: 'Xã Tập Sơn',
        },
      ],
    };

    const raw = wordTemplateDataDictionaryService.buildRawLoanData(mockLoan, customGroups);

    expect(raw.flatVariables['CO_TRONG_NHOM_1']).toBe(true);
    expect(raw.flatVariables['CO_TRONG_NHOM_2']).toBe(true);
    expect(raw.flatVariables['TAI_SAN.DANH_SACH_NHOM_GOP']).toContain('Nhóm 1');
    expect(raw.flatVariables['TAI_SAN.DANH_SACH_NHOM_GOP']).toContain('Nhóm 2');
  });

  it('renders correctly inside Word Template condition blocks', () => {
    const mockLoan = {
      id: 'loan-grp-3',
      collaterals: [
        {
          id: 'c-1',
          communeId: 'commune-nhi-truong',
          address: 'Xã Nhị Trường',
        },
      ],
    };

    const rawData = wordTemplateDataDictionaryService.buildRawLoanData(mockLoan, customGroups);

    const docxXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:p><w:r><w:t>{{#IF CO_TRONG_NHOM_1}}XUAT_HIEN_NHOM_1{{/IF}}</w:t></w:r></w:p>
          <w:p><w:r><w:t>{{#IF CO_TRONG_NHOM_2}}XUAT_HIEN_NHOM_2{{/IF}}</w:t></w:r></w:p>
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

    expect(outputXml).toContain('XUAT_HIEN_NHOM_1');
    expect(outputXml).not.toContain('XUAT_HIEN_NHOM_2');
  });
});

