import { describe, it, expect } from 'vitest';
import PizZip from 'pizzip';
import { wordTemplateDataDictionaryService } from '../word-template-data-dictionary.service';
import { wordTemplateGeneratorService } from '../word-template-generator.service';

const mockLoan = {
  id: 'loan-test-123',
  loanType: 'THE_CHAP',
  termType: 'NGAN_HAN',
  termMonths: 12,
  loanAmount: 100000000,
  interestRate: 10,
  contractNumber: '26.11.001',
  member: {
    fullName: 'Trần Văn Vay',
    idNumber: '084085001234',
  },
  collaterals: [],
};

const mockOfficerUser = {
  id: 'user-officer-01',
  username: 'officer_cuong',
  fullName: 'Nguyễn Văn Cường',
  title: 'Cán bộ tín dụng',
  role: 'CREDIT_OFFICER',
  profile: {
    fullName: 'Nguyễn Văn Cường',
    idType: 'CAN_CUOC_CONG_DAN',
    idNumber: '084090005678',
    idIssueDate: '2021-05-15',
    idIssuePlace: 'Cục Cảnh sát QLHC về TTXH',
    yearOfBirth: 1990,
    gender: 'NAM',
  },
};

const mockOfficerFemale = {
  id: 'user-officer-02',
  username: 'officer_lan',
  fullName: 'Phạm Thị Lan',
  title: 'Cán bộ tín dụng',
  role: 'CREDIT_OFFICER',
  profile: {
    fullName: 'Phạm Thị Lan',
    idType: 'CAN_CUOC',
    idNumber: '084192009876',
    idIssueDate: '2024-08-20',
    idIssuePlace: 'Bộ Công An',
    yearOfBirth: 1992,
    gender: 'NU',
  },
};

describe('CAN_BO Keywords - Cán bộ đang đăng nhập / lập hồ sơ', () => {
  it('1. resolveLoanData trích xuất chính xác trọn bộ CAN_BO.* cho cán bộ Nam với CCCD', () => {
    const { resolvedContext } = wordTemplateDataDictionaryService.resolveLoanData(
      mockLoan,
      [],
      [],
      mockOfficerUser,
    );

    // Họ tên
    expect(resolvedContext['CAN_BO.HO_TEN']).toBe('Nguyễn Văn Cường');
    expect(resolvedContext['CAN_BO.HO_TEN_IN_HOA']).toBe('NGUYỄN VĂN CƯỜNG');
    expect(resolvedContext['CAN_BO_HO_TEN']).toBe('Nguyễn Văn Cường');

    // Loại giấy tờ
    expect(resolvedContext['CAN_BO.LOAI_GIAY_TO']).toBe('Căn cước công dân');
    expect(resolvedContext['CAN_BO_LOAI_GIAY_TO']).toBe('Căn cước công dân');

    // Số giấy tờ / CCCD
    expect(resolvedContext['CAN_BO.SO_GIAY_TO']).toBe('084090005678');
    expect(resolvedContext['CAN_BO.SO_CCCD']).toBe('084090005678');
    expect(resolvedContext['CAN_BO_SO_GIAY_TO']).toBe('084090005678');
    expect(resolvedContext['CAN_BO_SO_CCCD']).toBe('084090005678');

    // Nơi cấp
    expect(resolvedContext['CAN_BO.NOI_CAP']).toBe('Cục Cảnh sát QLHC về TTXH');
    expect(resolvedContext['CAN_BO_NOI_CAP']).toBe('Cục Cảnh sát QLHC về TTXH');

    // Ngày cấp
    expect(resolvedContext['CAN_BO.NGAY_CAP']).toBe('15/05/2021');
    expect(resolvedContext['CAN_BO.NGAY_CAP_NGAY']).toBe('15');
    expect(resolvedContext['CAN_BO.NGAY_CAP_THANG']).toBe('05');
    expect(resolvedContext['CAN_BO.NGAY_CAP_NAM']).toBe('2021');

    // Giới tính, năm sinh, danh xưng
    expect(resolvedContext['CAN_BO.GIOI_TINH']).toBe('Nam');
    expect(resolvedContext['CAN_BO.NAM_SINH']).toBe('1990');
    expect(resolvedContext['CAN_BO.DANH_XUNG']).toBe('Ông');
    expect(resolvedContext['CAN_BO.XUNG_HO']).toBe('Ông');
    expect(resolvedContext['CAN_BO.CHUC_VU']).toBe('Cán bộ tín dụng');

    // Đối tượng lồng nhau CAN_BO
    expect(resolvedContext.CAN_BO).toBeDefined();
    expect(resolvedContext.CAN_BO.HO_TEN).toBe('Nguyễn Văn Cường');
    expect(resolvedContext.CAN_BO.SO_GIAY_TO).toBe('084090005678');
    expect(resolvedContext.CAN_BO.NOI_CAP).toBe('Cục Cảnh sát QLHC về TTXH');
  });

  it('2. resolveLoanData xuất đúng cho cán bộ Nữ với Căn cước mới', () => {
    const { resolvedContext } = wordTemplateDataDictionaryService.resolveLoanData(
      mockLoan,
      [],
      [],
      mockOfficerFemale,
    );

    expect(resolvedContext['CAN_BO.HO_TEN']).toBe('Phạm Thị Lan');
    expect(resolvedContext['CAN_BO.HO_TEN_IN_HOA']).toBe('PHẠM THỊ LAN');
    expect(resolvedContext['CAN_BO.LOAI_GIAY_TO']).toBe('Căn cước');
    expect(resolvedContext['CAN_BO.SO_GIAY_TO']).toBe('084192009876');
    expect(resolvedContext['CAN_BO.NOI_CAP']).toBe('Bộ Công An');
    expect(resolvedContext['CAN_BO.NGAY_CAP']).toBe('20/08/2024');
    expect(resolvedContext['CAN_BO.NGAY_CAP_NGAY']).toBe('20');
    expect(resolvedContext['CAN_BO.NGAY_CAP_THANG']).toBe('08');
    expect(resolvedContext['CAN_BO.NGAY_CAP_NAM']).toBe('2024');
    expect(resolvedContext['CAN_BO.GIOI_TINH']).toBe('Nữ');
    expect(resolvedContext['CAN_BO.NAM_SINH']).toBe('1992');
    expect(resolvedContext['CAN_BO.DANH_XUNG']).toBe('Bà');
  });

  it('3. Thử nghiệm sinh file DOCX hoàn chỉnh với các thẻ {{CAN_BO.*}}', () => {
    const zip = new PizZip();
    zip.file(
      '[Content_Types].xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
        <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
        <Default Extension="xml" ContentType="application/xml"/>
        <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
      </Types>`,
    );
    zip.file(
      '_rels/.rels',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
      </Relationships>`,
    );

    zip.file(
      'word/document.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:p><w:t>Cán bộ thực hiện: {{CAN_BO.DANH_XUNG}} {{CAN_BO.HO_TEN_IN_HOA}}</w:t></w:p>
          <w:p><w:t>{{CAN_BO.LOAI_GIAY_TO}} số: {{CAN_BO.SO_GIAY_TO}}, cấp ngày {{CAN_BO.NGAY_CAP}} tại {{CAN_BO.NOI_CAP}}</w:t></w:p>
          <w:p><w:t>Năm sinh: {{CAN_BO.NAM_SINH}}, Giới tính: {{CAN_BO.GIOI_TINH}}, Chức danh: {{CAN_BO.CHUC_VU}}</w:t></w:p>
        </w:body>
      </w:document>`,
    );

    const templateBuf = zip.generate({ type: 'nodebuffer' });
    const { resolvedContext } = wordTemplateDataDictionaryService.resolveLoanData(
      mockLoan,
      [],
      [],
      mockOfficerUser,
    );

    const outputBuf = wordTemplateGeneratorService.generateDocx(templateBuf, resolvedContext);
    const outZip = new PizZip(outputBuf);
    const outXml = outZip.file('word/document.xml')?.asText() || '';

    expect(outXml).toContain('Cán bộ thực hiện: Ông NGUYỄN VĂN CƯỜNG');
    expect(outXml).toContain('Căn cước công dân số: 084090005678, cấp ngày 15/05/2021 tại Cục Cảnh sát QLHC về TTXH');
    expect(outXml).toContain('Năm sinh: 1990, Giới tính: Nam, Chức danh: Cán bộ tín dụng');
  });

  it('4. DataDictionary chứa nhóm cán bộ đang đăng nhập với đầy đủ trường', () => {
    const dict = wordTemplateDataDictionaryService.getDataDictionary();
    const officerGroup = dict.find((g) => g.id === 'officer');

    expect(officerGroup).toBeDefined();
    expect(officerGroup?.fields.some((f) => f.path === 'CAN_BO.HO_TEN')).toBe(true);
    expect(officerGroup?.fields.some((f) => f.path === 'CAN_BO.LOAI_GIAY_TO')).toBe(true);
    expect(officerGroup?.fields.some((f) => f.path === 'CAN_BO.SO_GIAY_TO')).toBe(true);
    expect(officerGroup?.fields.some((f) => f.path === 'CAN_BO.NOI_CAP')).toBe(true);
    expect(officerGroup?.fields.some((f) => f.path === 'CAN_BO.NGAY_CAP')).toBe(true);
    expect(officerGroup?.fields.some((f) => f.path === 'CAN_BO.GIOI_TINH')).toBe(true);
    expect(officerGroup?.fields.some((f) => f.path === 'CAN_BO.NAM_SINH')).toBe(true);
  });

  it('5. Ưu tiên cán bộ tạo hồ sơ vay khi xuất dữ liệu', () => {
    const loanWithCreator = {
      ...mockLoan,
      createdBy: {
        id: 'creator-01',
        fullName: 'Lê Hoàng Long',
        role: 'CREDIT_OFFICER',
        profile: {
          fullName: 'Lê Hoàng Long',
          idType: 'CAN_CUOC_CONG_DAN',
          idNumber: '084095009999',
          idIssueDate: '2022-01-10',
          idIssuePlace: 'Bộ Công An',
          yearOfBirth: 1995,
          gender: 'NAM',
        },
      },
    };

    const { resolvedContext } = wordTemplateDataDictionaryService.resolveLoanData(
      loanWithCreator,
      [],
      [],
      loanWithCreator.createdBy,
    );

    expect(resolvedContext['CAN_BO.HO_TEN']).toBe('Lê Hoàng Long');
    expect(resolvedContext['CAN_BO.SO_GIAY_TO']).toBe('084095009999');
    expect(resolvedContext['CAN_BO.NOI_CAP']).toBe('Bộ Công An');
  });
});
