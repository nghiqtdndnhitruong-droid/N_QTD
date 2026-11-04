import { describe, expect, it } from 'vitest';
import PizZip from 'pizzip';
import { wordTemplateDataDictionaryService } from '../word-template-data-dictionary.service';
import { wordTemplateGeneratorService } from '../word-template-generator.service';

describe('Word Template Owner Enhancements (TAI_SAN.CHU_SO_HUU & DANH_SACH_CHU_SO_HUU)', () => {
  const baseMember = {
    id: 'm1',
    fullName: 'Nguyễn Văn An',
    gender: 'NAM',
    idType: 'CAN_CUOC_CONG_DAN',
    idNumber: '084174001111',
    idIssueDate: new Date('2021-04-15'),
    idIssuePlace: 'Cục Cảnh sát QLHC về TTXH',
    yearOfBirth: 1988,
    address: 'Ấp Nô Lựa, Xã Nhị Trường, Tỉnh Vĩnh Long',
  };

  const baseHeir = {
    fullName: 'Nguyễn Thị Bích',
    gender: 'NU',
    idType: 'CAN_CUOC',
    idNumber: '084190002222',
    idIssueDate: new Date('2022-05-10'),
    idIssuePlace: 'Công an tỉnh Vĩnh Long',
    yearOfBirth: 1992,
    address: 'Ấp Nô Lựa, Xã Nhị Trường',
    relationship: 'Vợ',
  };

  const guarantor = {
    fullName: 'Lê Văn Cường',
    gender: 'NAM',
    idType: 'CAN_CUOC_CONG_DAN',
    idNumber: '084180003333',
    idIssueDate: new Date('2020-01-20'),
    idIssuePlace: 'Cục Cảnh sát QLHC về TTXH',
    yearOfBirth: 1980,
    address: 'Xã Long Sơn, Huyện Cầu Ngang',
  };

  it('1. Trường hợp 1 tài sản: Người vay đứng tên cá nhân', () => {
    const loan = {
      loanType: 'THE_CHAP',
      member: baseMember,
      heir: baseHeir,
      collaterals: [
        {
          assetCode: 'TS-01',
          area: 1000,
          ownerType: 'NGUOI_VAY_CA_NHAN',
        },
      ],
    };

    const { resolvedContext } = wordTemplateDataDictionaryService.resolveLoanData(loan as any, []);

    expect(resolvedContext['TAI_SAN.CHU_SO_HUU']).toBe('Nguyễn Văn An');
    expect(resolvedContext['CHU_SO_HUU']).toBe('Nguyễn Văn An');
    expect(resolvedContext['CO_MOT_CHU_SO_HUU']).toBe(true);
    expect(resolvedContext['CO_NHIEU_CHU_SO_HUU']).toBe(false);
    expect(resolvedContext['CHU_SO_HUU_LA_NGUOI_VAY']).toBe(true);
    expect(resolvedContext['CHU_SO_HUU_LA_NGUOI_THUA_KE']).toBe(false);
    expect(resolvedContext['CHU_SO_HUU_LA_BAO_LANH']).toBe(false);

    // Kiểm tra thông tin chi tiết chủ sở hữu đầu tiên
    expect(resolvedContext['CHU_SO_HUU_XUNG_HO']).toBe('Ông');
    expect(resolvedContext['CHU_SO_HUU_LOAI_GIAY_TO']).toBe('Căn cước công dân');
    expect(resolvedContext['CHU_SO_HUU_SO_GIAY_TO']).toBe('084174001111');
    expect(resolvedContext['CHU_SO_HUU_DIA_CHI']).toBe('Ấp Nô Lựa, Xã Nhị Trường, Tỉnh Vĩnh Long');

    // Danh sách lặp DANH_SACH_CHU_SO_HUU
    const cshList = resolvedContext['DANH_SACH_CHU_SO_HUU'];
    expect(cshList).toHaveLength(1);
    expect(cshList[0].HO_TEN).toBe('Nguyễn Văn An');
    expect(cshList[0].XUNG_HO).toBe('Ông');
    expect(cshList[0].LOAI_GIAY_TO).toBe('Căn cước công dân');
    expect(cshList[0].SO_GIAY_TO).toBe('084174001111');
    expect(cshList[0].QUAN_HE).toBe('Người vay');
  });

  it('2. Trường hợp 1 tài sản: Người thừa kế đứng tên cá nhân', () => {
    const loan = {
      loanType: 'THE_CHAP',
      member: baseMember,
      heir: baseHeir,
      collaterals: [
        {
          assetCode: 'TS-02',
          area: 1500,
          ownerType: 'NGUOI_THUA_KE_CA_NHAN',
        },
      ],
    };

    const { resolvedContext } = wordTemplateDataDictionaryService.resolveLoanData(loan as any, []);

    expect(resolvedContext['TAI_SAN.CHU_SO_HUU']).toBe('Nguyễn Thị Bích');
    expect(resolvedContext['CHU_SO_HUU_XUNG_HO']).toBe('Bà');
    expect(resolvedContext['CHU_SO_HUU_LOAI_GIAY_TO']).toBe('Thẻ căn cước');
    expect(resolvedContext['CHU_SO_HUU_SO_GIAY_TO']).toBe('084190002222');
    expect(resolvedContext['CO_MOT_CHU_SO_HUU']).toBe(true);
    expect(resolvedContext['CHU_SO_HUU_LA_NGUOI_THUA_KE']).toBe(true);
    expect(resolvedContext['CHU_SO_HUU_LA_NGUOI_VAY']).toBe(false);
  });

  it('3. Trường hợp 1 tài sản: Người thứ ba bảo lãnh', () => {
    const loan = {
      loanType: 'THE_CHAP',
      member: baseMember,
      heir: baseHeir,
      collaterals: [
        {
          assetCode: 'TS-03',
          area: 2000,
          ownerType: 'BAO_LANH',
          thirdPartyInfo: guarantor,
        },
      ],
    };

    const { resolvedContext } = wordTemplateDataDictionaryService.resolveLoanData(loan as any, []);

    expect(resolvedContext['TAI_SAN.CHU_SO_HUU']).toBe('Lê Văn Cường');
    expect(resolvedContext['CHU_SO_HUU_XUNG_HO']).toBe('Ông');
    expect(resolvedContext['CHU_SO_HUU_SO_GIAY_TO']).toBe('084180003333');
    expect(resolvedContext['CHU_SO_HUU_DIA_CHI']).toBe('Xã Long Sơn, Huyện Cầu Ngang');
    expect(resolvedContext['CO_MOT_CHU_SO_HUU']).toBe(true);
    expect(resolvedContext['CHU_SO_HUU_LA_BAO_LANH']).toBe(true);
  });

  it('4. Trường hợp 2 tài sản với 2 chủ khác nhau (Người vay và Người bảo lãnh)', () => {
    const loan = {
      loanType: 'THE_CHAP',
      member: baseMember,
      heir: baseHeir,
      collaterals: [
        {
          assetCode: 'TS-01',
          area: 1000,
          ownerType: 'NGUOI_VAY_CA_NHAN',
        },
        {
          assetCode: 'TS-02',
          area: 2000,
          ownerType: 'BAO_LANH',
          thirdPartyInfo: guarantor,
        },
      ],
    };

    const { resolvedContext } = wordTemplateDataDictionaryService.resolveLoanData(loan as any, []);

    // Tài sản đầu tiên là người vay
    expect(resolvedContext['TAI_SAN.CHU_SO_HUU']).toBe('Nguyễn Văn An');

    // Tự động gộp 2 chủ sở hữu bằng chữ " và "
    expect(resolvedContext['TAI_SAN.CHU_SO_HUU_GOP']).toBe('Nguyễn Văn An và Lê Văn Cường');
    expect(resolvedContext['CHU_SO_HUU_GOP']).toBe('Nguyễn Văn An và Lê Văn Cường');

    // Cờ kiểm tra
    expect(resolvedContext['CO_MOT_CHU_SO_HUU']).toBe(false);
    expect(resolvedContext['CO_NHIEU_CHU_SO_HUU']).toBe(true);
    expect(resolvedContext['CHU_SO_HUU_LA_NGUOI_VAY']).toBe(true);
    expect(resolvedContext['CHU_SO_HUU_LA_BAO_LANH']).toBe(true);
    expect(resolvedContext['SO_LUONG_CHU_SO_HUU']).toBe(2);

    // Danh sách lặp DANH_SACH_CHU_SO_HUU có 2 người
    const cshList = resolvedContext['DANH_SACH_CHU_SO_HUU'];
    expect(cshList).toHaveLength(2);
    expect(cshList[0].HO_TEN).toBe('Nguyễn Văn An');
    expect(cshList[1].HO_TEN).toBe('Lê Văn Cường');
  });

  it('5. Trường hợp 2 tài sản nhưng CÙNG 1 người sở hữu: chỉ xuất 1 người, không lặp lại', () => {
    const loan = {
      loanType: 'THE_CHAP',
      member: baseMember,
      collaterals: [
        {
          assetCode: 'TS-01',
          area: 1000,
          ownerType: 'NGUOI_VAY_CA_NHAN',
        },
        {
          assetCode: 'TS-02',
          area: 2000,
          ownerType: 'NGUOI_VAY_CA_NHAN',
        },
      ],
    };

    const { resolvedContext } = wordTemplateDataDictionaryService.resolveLoanData(loan as any, []);

    expect(resolvedContext['TAI_SAN.CHU_SO_HUU']).toBe('Nguyễn Văn An');
    expect(resolvedContext['TAI_SAN.CHU_SO_HUU_GOP']).toBe('Nguyễn Văn An');
    expect(resolvedContext['CO_MOT_CHU_SO_HUU']).toBe(true);
    expect(resolvedContext['CO_NHIEU_CHU_SO_HUU']).toBe(false);
    expect(resolvedContext['DANH_SACH_CHU_SO_HUU']).toHaveLength(1);
  });

  it('6. Kiểm tra Render thực tế file Word với vòng lặp FOR DANH_SACH_CHU_SO_HUU và các key đầy đủ', () => {
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
          <w:p><w:t>Chủ sở hữu đầu tiên: {{TAI_SAN.CHU_SO_HUU}}</w:t></w:p>
          <w:p><w:t>Tất cả chủ sở hữu: {{TAI_SAN.CHU_SO_HUU_GOP}}</w:t></w:p>
          <w:tbl>
            <w:tr>
              <w:tc><w:p><w:t>STT</w:t></w:p></w:tc>
              <w:tc><w:p><w:t>Họ tên</w:t></w:p></w:tc>
              <w:tc><w:p><w:t>Xưng hô</w:t></w:p></w:tc>
              <w:tc><w:p><w:t>Loại giấy tờ</w:t></w:p></w:tc>
              <w:tc><w:p><w:t>Số giấy tờ</w:t></w:p></w:tc>
              <w:tc><w:p><w:t>Ngày cấp</w:t></w:p></w:tc>
              <w:tc><w:p><w:t>Nơi cấp</w:t></w:p></w:tc>
              <w:tc><w:p><w:t>Địa chỉ</w:t></w:p></w:tc>
              <w:tc><w:p><w:t>Quan hệ</w:t></w:p></w:tc>
            </w:tr>
            <w:tr>
              <w:tc><w:p><w:t>{{#FOR csh IN DANH_SACH_CHU_SO_HUU}}{{@number}}</w:t></w:p></w:tc>
              <w:tc><w:p><w:t>{{csh.HO_TEN}}</w:t></w:p></w:tc>
              <w:tc><w:p><w:t>{{csh.XUNG_HO}}</w:t></w:p></w:tc>
              <w:tc><w:p><w:t>{{csh.LOAI_GIAY_TO}}</w:t></w:p></w:tc>
              <w:tc><w:p><w:t>{{csh.SO_GIAY_TO}}</w:t></w:p></w:tc>
              <w:tc><w:p><w:t>{{csh.NGAY_CAP}}</w:t></w:p></w:tc>
              <w:tc><w:p><w:t>{{csh.NOI_CAP}}</w:t></w:p></w:tc>
              <w:tc><w:p><w:t>{{csh.DIA_CHI}}</w:t></w:p></w:tc>
              <w:tc><w:p><w:t>{{csh.QUAN_HE}}{{/FOR}}</w:t></w:p></w:tc>
            </w:tr>
          </w:tbl>
        </w:body>
      </w:document>`;
    zip.file('word/document.xml', docXml);

    const templateBuf = zip.generate({ type: 'nodebuffer' });

    const loan = {
      loanType: 'THE_CHAP',
      member: baseMember,
      heir: baseHeir,
      collaterals: [
        { assetCode: 'TS-01', area: 1000, ownerType: 'NGUOI_VAY_CA_NHAN' },
        { assetCode: 'TS-02', area: 2000, ownerType: 'BAO_LANH', thirdPartyInfo: guarantor },
      ],
    };

    const { resolvedContext } = wordTemplateDataDictionaryService.resolveLoanData(loan as any, []);
    const outputBuffer = wordTemplateGeneratorService.generateDocx(templateBuf, resolvedContext);

    const outZip = new PizZip(outputBuffer);
    const outXml = outZip.file('word/document.xml')?.asText() || '';

    expect(outXml).toContain('Chủ sở hữu đầu tiên: Nguyễn Văn An');
    expect(outXml).toContain('Tất cả chủ sở hữu: Nguyễn Văn An và Lê Văn Cường');

    // Bảng phải nhân bản thành 2 hàng dữ liệu
    expect(outXml).toContain('Nguyễn Văn An');
    expect(outXml).toContain('084174001111');
    expect(outXml).toContain('Lê Văn Cường');
    expect(outXml).toContain('084180003333');
    expect(outXml).toContain('Xã Long Sơn, Huyện Cầu Ngang');
    expect(outXml).toContain('Bên thứ ba bảo lãnh');
  });

  it('7. Trường hợp tài sản: Người vay và người thừa kế cùng đứng tên (NGUOI_VAY_VA_NGUOI_THUA_KE)', () => {
    const loan = {
      loanType: 'THE_CHAP',
      member: baseMember,
      heir: baseHeir,
      collaterals: [
        {
          assetCode: 'TS-01',
          area: 1200,
          ownerType: 'NGUOI_VAY_VA_NGUOI_THUA_KE',
        },
      ],
    };

    const { resolvedContext } = wordTemplateDataDictionaryService.resolveLoanData(loan as any, []);

    // Cờ boolean kiểm tra đồng sở hữu giữa người vay và người thừa kế
    expect(resolvedContext['CO_CA_NGUOI_VAY_VA_THUA_KE_SO_HUU']).toBe(true);
    expect(resolvedContext['DONG_SO_HUU_NGUOI_VAY_VA_THUA_KE']).toBe(true);
    expect(resolvedContext['isBorrowerAndHeirOwner']).toBe(true);
    expect(resolvedContext['CHU_SO_HUU_LA_NGUOI_VAY']).toBe(true);
    expect(resolvedContext['CHU_SO_HUU_LA_NGUOI_THUA_KE']).toBe(true);
    expect(resolvedContext['CO_NHIEU_CHU_SO_HUU']).toBe(true);

    // Chuỗi tên chủ sở hữu gộp
    expect(resolvedContext['CHU_SO_HUU_GOP']).toBe('Nguyễn Văn An và Nguyễn Thị Bích');

    // Danh sách DANH_SACH_CHU_SO_HUU phải chứa cả 2 người với đầy đủ thông tin cá nhân
    const cshList = resolvedContext['DANH_SACH_CHU_SO_HUU'];
    expect(cshList).toHaveLength(2);

    // Người 1: Người vay
    expect(cshList[0].HO_TEN).toBe('Nguyễn Văn An');
    expect(cshList[0].XUNG_HO).toBe('Ông');
    expect(cshList[0].LOAI_GIAY_TO).toBe('Căn cước công dân');
    expect(cshList[0].SO_GIAY_TO).toBe('084174001111');
    expect(cshList[0].NOI_CAP).toBe('Cục Cảnh sát QLHC về TTXH');
    expect(cshList[0].DIA_CHI).toBe('Ấp Nô Lựa, Xã Nhị Trường, Tỉnh Vĩnh Long');
    expect(cshList[0].QUAN_HE).toBe('Người vay');

    // Người 2: Người thừa kế
    expect(cshList[1].HO_TEN).toBe('Nguyễn Thị Bích');
    expect(cshList[1].XUNG_HO).toBe('Bà');
    expect(cshList[1].LOAI_GIAY_TO).toBe('Thẻ căn cước');
    expect(cshList[1].SO_GIAY_TO).toBe('084190002222');
    expect(cshList[1].NOI_CAP).toBe('Công an tỉnh Vĩnh Long');
    expect(cshList[1].DIA_CHI).toBe('Ấp Nô Lựa, Xã Nhị Trường');
    expect(cshList[1].QUAN_HE).toBe('Vợ');
  });

  it('8. Trường hợp 2 tài sản: 1 tài sản của Người vay và 1 tài sản của Người thừa kế', () => {
    const loan = {
      loanType: 'THE_CHAP',
      member: baseMember,
      heir: baseHeir,
      collaterals: [
        {
          assetCode: 'TS-01',
          area: 1000,
          ownerType: 'NGUOI_VAY_CA_NHAN',
        },
        {
          assetCode: 'TS-02',
          area: 1500,
          ownerType: 'NGUOI_THUA_KE_CA_NHAN',
        },
      ],
    };

    const { resolvedContext } = wordTemplateDataDictionaryService.resolveLoanData(loan as any, []);

    // Cả 2 đều sở hữu tài sản
    expect(resolvedContext['CO_CA_NGUOI_VAY_VA_THUA_KE_SO_HUU']).toBe(true);
    expect(resolvedContext['DONG_SO_HUU_NGUOI_VAY_VA_THUA_KE']).toBe(true);
    expect(resolvedContext['isBorrowerAndHeirOwner']).toBe(true);
    expect(resolvedContext['DANH_SACH_CHU_SO_HUU']).toHaveLength(2);
  });

  it('9. Kiểm tra đầy đủ các biến NGUOI_THUA_KE.* từ danh xưng tới số giấy tờ', () => {
    const loan = {
      loanType: 'THE_CHAP',
      member: baseMember,
      heir: baseHeir,
      collaterals: [
        {
          assetCode: 'TS-01',
          area: 1000,
          ownerType: 'NGUOI_VAY_CA_NHAN',
        },
      ],
    };

    const { resolvedContext } = wordTemplateDataDictionaryService.resolveLoanData(loan as any, []);

    // 1. Kiểm tra đối tượng nested NGUOI_THUA_KE
    expect(resolvedContext.NGUOI_THUA_KE).toBeDefined();
    expect(resolvedContext.NGUOI_THUA_KE.DANH_XUNG).toBe('Bà');
    expect(resolvedContext.NGUOI_THUA_KE.XUNG_HO).toBe('Bà');
    expect(resolvedContext.NGUOI_THUA_KE.GIOI_TINH).toBe('Nữ');
    expect(resolvedContext.NGUOI_THUA_KE.HO_TEN).toBe('Nguyễn Thị Bích');
    expect(resolvedContext.NGUOI_THUA_KE.NAM_SINH).toBe('1992');
    expect(resolvedContext.NGUOI_THUA_KE.LOAI_GIAY_TO).toBe('Thẻ căn cước');
    expect(resolvedContext.NGUOI_THUA_KE.SO_GIAY_TO).toBe('084190002222');
    expect(resolvedContext.NGUOI_THUA_KE.SO_CCCD).toBe('084190002222');
    expect(resolvedContext.NGUOI_THUA_KE.NGAY_CAP).toBe('10/05/2022');
    expect(resolvedContext.NGUOI_THUA_KE.NGAY_CAP_CCCD).toBe('10/05/2022');
    expect(resolvedContext.NGUOI_THUA_KE.NOI_CAP).toBe('Công an tỉnh Vĩnh Long');
    expect(resolvedContext.NGUOI_THUA_KE.NOI_CAP_CCCD).toBe('Công an tỉnh Vĩnh Long');
    expect(resolvedContext.NGUOI_THUA_KE.QUAN_HE).toBe('Vợ');
    expect(resolvedContext.NGUOI_THUA_KE.DIA_CHI).toBe('Ấp Nô Lựa, Xã Nhị Trường');

    // 2. Kiểm tra các biến phẳng tiền tố NGUOI_THUA_KE.*
    expect(resolvedContext['NGUOI_THUA_KE.DANH_XUNG']).toBe('Bà');
    expect(resolvedContext['NGUOI_THUA_KE.XUNG_HO']).toBe('Bà');
    expect(resolvedContext['NGUOI_THUA_KE.GIOI_TINH']).toBe('Nữ');
    expect(resolvedContext['NGUOI_THUA_KE.HO_TEN']).toBe('Nguyễn Thị Bích');
    expect(resolvedContext['NGUOI_THUA_KE.NAM_SINH']).toBe('1992');
    expect(resolvedContext['NGUOI_THUA_KE.LOAI_GIAY_TO']).toBe('Thẻ căn cước');
    expect(resolvedContext['NGUOI_THUA_KE.SO_GIAY_TO']).toBe('084190002222');
    expect(resolvedContext['NGUOI_THUA_KE.SO_CCCD']).toBe('084190002222');
    expect(resolvedContext['NGUOI_THUA_KE.NGAY_CAP']).toBe('10/05/2022');
    expect(resolvedContext['NGUOI_THUA_KE.NGAY_CAP_CCCD']).toBe('10/05/2022');
    expect(resolvedContext['NGUOI_THUA_KE.NOI_CAP']).toBe('Công an tỉnh Vĩnh Long');
    expect(resolvedContext['NGUOI_THUA_KE.NOI_CAP_CCCD']).toBe('Công an tỉnh Vĩnh Long');
    expect(resolvedContext['NGUOI_THUA_KE.QUAN_HE']).toBe('Vợ');
    expect(resolvedContext['NGUOI_THUA_KE.DIA_CHI']).toBe('Ấp Nô Lựa, Xã Nhị Trường');

    // 3. Kiểm tra các biến NGUOI_VAY.* tương ứng
    expect(resolvedContext['NGUOI_VAY.DANH_XUNG']).toBe('Ông');
    expect(resolvedContext['NGUOI_VAY.LOAI_GIAY_TO']).toBe('Căn cước công dân');
    expect(resolvedContext['NGUOI_VAY.SO_GIAY_TO']).toBe('084174001111');
    expect(resolvedContext['NGUOI_VAY.NGAY_CAP']).toBe('15/04/2021');
    expect(resolvedContext['NGUOI_VAY.NOI_CAP']).toBe('Cục Cảnh sát QLHC về TTXH');
  });

  it('10. Kiểm tra từ khóa Hình thức sử dụng (usageForm) và Hạn chế sử dụng (useRestrictions) đơn lẻ & gộp', () => {
    const loan = {
      loanType: 'THE_CHAP',
      member: baseMember,
      heir: baseHeir,
      collaterals: [
        {
          assetCode: 'TS-01',
          area: 1000,
          usageForm: 'Sử dụng riêng',
          useRestrictions: 'Không có',
          ownerType: 'NGUOI_VAY_CA_NHAN',
        },
        {
          assetCode: 'TS-02',
          area: 1500,
          usageForm: 'Sử dụng chung',
          useRestrictions: 'Hành lang an toàn lưới điện 20m2',
          ownerType: 'NGUOI_THUA_KE_CA_NHAN',
        },
      ],
    };

    const { resolvedContext } = wordTemplateDataDictionaryService.resolveLoanData(loan as any, []);

    // Kiểm tra tài sản đầu tiên (đơn lẻ)
    expect(resolvedContext['TAI_SAN.HINH_THUC_SU_DUNG']).toBe('Sử dụng riêng');
    expect(resolvedContext['HINH_THUC_SU_DUNG']).toBe('Sử dụng riêng');
    expect(resolvedContext['TAI_SAN.HAN_CHE_SU_DUNG']).toBe('Không có');
    expect(resolvedContext['HAN_CHE_SU_DUNG']).toBe('Không có');

    // Kiểm tra gộp (nối dấu ;)
    expect(resolvedContext['TAI_SAN.HINH_THUC_SU_DUNG_GOP']).toBe('Sử dụng riêng; Sử dụng chung');
    expect(resolvedContext['HINH_THUC_SU_DUNG_GOP']).toBe('Sử dụng riêng; Sử dụng chung');
    expect(resolvedContext['TAI_SAN.HAN_CHE_SU_DUNG_GOP']).toBe('Không có; Hành lang an toàn lưới điện 20m2');
    expect(resolvedContext['HAN_CHE_SU_DUNG_GOP']).toBe('Không có; Hành lang an toàn lưới điện 20m2');

    // Kiểm tra trong danh sách lặp collaterals / DANH_SACH_TAI_SAN
    const collList = resolvedContext['DANH_SACH_TAI_SAN'];
    expect(collList).toHaveLength(2);
    expect(collList[0].HINH_THUC_SU_DUNG).toBe('Sử dụng riêng');
    expect(collList[0].HAN_CHE_SU_DUNG).toBe('Không có');
    expect(collList[1].HINH_THUC_SU_DUNG).toBe('Sử dụng chung');
    expect(collList[1].HAN_CHE_SU_DUNG).toBe('Hành lang an toàn lưới điện 20m2');
  });

  it('11. Should fallback to dots when useRestrictions is empty and correctly resolve LOAI_GIAY_CHUNG_NHAN', () => {
    const loan = {
      customer: {
        fullName: 'Nguyễn Văn A',
        gender: 'MALE',
      },
      collaterals: [
        {
          assetCode: 'TS-01',
          certificateType: 'GIAY_CHUNG_NHAN',
          useRestrictions: '', // để trống
          ownerType: 'NGUOI_VAY_CA_NHAN',
        },
        {
          assetCode: 'TS-02',
          certificateType: 'GCN',
          useRestrictions: '   ', // chỉ có khoảng trắng
          ownerType: 'NGUOI_VAY_CA_NHAN',
        },
      ],
    };

    const { resolvedContext } = wordTemplateDataDictionaryService.resolveLoanData(loan as any, []);

    // 1. Kiểm tra hạn chế sử dụng bỏ trống tự động thành '...................'
    expect(resolvedContext['TAI_SAN.HAN_CHE_SU_DUNG']).toBe('...................');
    expect(resolvedContext['HAN_CHE_SU_DUNG']).toBe('...................');
    expect(resolvedContext['TAI_SAN.HAN_CHE_SU_DUNG_GOP']).toBe('...................');
    expect(resolvedContext['HAN_CHE_SU_DUNG_GOP']).toBe('...................');

    const collList = resolvedContext['DANH_SACH_TAI_SAN'];
    expect(collList[0].HAN_CHE_SU_DUNG).toBe('...................');
    expect(collList[1].HAN_CHE_SU_DUNG).toBe('...................');

    // 2. Kiểm tra loại giấy chứng nhận
    expect(resolvedContext['TAI_SAN.LOAI_GIAY_CHUNG_NHAN']).toBe('Giấy chứng nhận');
    expect(resolvedContext['LOAI_GIAY_CHUNG_NHAN']).toBe('Giấy chứng nhận');
    expect(resolvedContext['TAI_SAN.LOAI_GIAY_CHUNG_NHAN_GOP']).toBe('Giấy chứng nhận; GCN');
    expect(resolvedContext['LOAI_GIAY_CHUNG_NHAN_GOP']).toBe('Giấy chứng nhận; GCN');
    expect(collList[0].LOAI_GIAY_CHUNG_NHAN).toBe('Giấy chứng nhận');
    expect(collList[1].LOAI_GIAY_CHUNG_NHAN).toBe('GCN');
  });

  it('12. Should correctly resolve keywords starting with PHUONG_AN.* and financial lists', () => {
    const loan = {
      termMonths: 24,
      termType: 'TRUNG_HAN',
      loanAmount: 60000000,
      customer: {
        fullName: 'Nguyễn Văn A',
        gender: 'MALE',
      },
      loanPlan: {
        purpose: 'Chăn nuôi bò sinh sản và phát triển kinh tế hộ gia đình',
        loanAmount: 100000000,
        ownCapital: 40000000,
        borrowedCapital: 60000000,
        totalExpenses: 255840000,
        totalRevenues: 305840000,
        profit: 50000000,
        expenses: [
          { name: 'Tiền mua con giống', amount: 80000000 },
          { name: 'Tiền xây dựng chuồng trại', amount: 15000000 },
        ],
        revenues: [
          { name: 'Nguồn thu từ sản xuất lúa', amount: 91752000 },
          { name: 'Nguồn thu từ chăn nuôi', amount: 152920000 },
        ],
      },
    };

    const { resolvedContext } = wordTemplateDataDictionaryService.resolveLoanData(loan as any, []);

    // 1. Kiểm tra Mục đích & Thời hạn vay
    expect(resolvedContext['PHUONG_AN.MUC_DICH']).toBe(
      'Chăn nuôi bò sinh sản và phát triển kinh tế hộ gia đình'
    );
    expect(resolvedContext['PHUONG_AN_MUC_DICH']).toBe(
      'Chăn nuôi bò sinh sản và phát triển kinh tế hộ gia đình'
    );
    expect(resolvedContext['PHUONG_AN.THOI_HAN_VAY']).toBe('24 tháng');
    expect(resolvedContext['PHUONG_AN.THOI_HAN_THANG']).toBe(24);
    expect(resolvedContext['PHUONG_AN.LOAI_THOI_HAN']).toBe('Trung hạn');

    // 2. Kiểm tra Vốn tự có, Vốn vay QTD, Tổng nhu cầu vốn
    expect(resolvedContext['PHUONG_AN.TONG_NHU_CAU_VON']).toBe('100.000.000 đ');
    expect(resolvedContext['PHUONG_AN.TONG_NHU_CAU_VON_CHU']).toBe('Một trăm triệu đồng');
    expect(resolvedContext['PHUONG_AN.VON_TU_CO']).toBe('40.000.000 đ');
    expect(resolvedContext['PHUONG_AN.VON_TU_CO_CHU']).toBe('Bốn mươi triệu đồng');
    expect(resolvedContext['PHUONG_AN.VON_VAY_QTD']).toBe('60.000.000 đ');
    expect(resolvedContext['PHUONG_AN.VON_VAY_QTD_CHU']).toBe('Sáu mươi triệu đồng');

    // 3. Kiểm tra Tổng chi phí, Tổng thu nhập, Lợi nhuận
    expect(resolvedContext['PHUONG_AN.TONG_CHI_PHI']).toBe('255.840.000 đ');
    expect(resolvedContext['PHUONG_AN.TONG_THU_NHAP']).toBe('305.840.000 đ');
    expect(resolvedContext['PHUONG_AN.LOI_NHUAN']).toBe('50.000.000 đ');

    // 4. Kiểm tra object lồng nhau PHUONG_AN trong docxtemplater
    const pa = resolvedContext['PHUONG_AN'];
    expect(pa).toBeDefined();
    expect(pa.MUC_DICH).toBe('Chăn nuôi bò sinh sản và phát triển kinh tế hộ gia đình');
    expect(pa.THOI_HAN_VAY).toBe('24 tháng');
    expect(pa.TONG_NHU_CAU_VON).toBe('100.000.000 đ');
    expect(pa.VON_TU_CO).toBe('40.000.000 đ');
    expect(pa.VON_VAY_QTD).toBe('60.000.000 đ');

    // 5. Kiểm tra danh sách lặp chi phí & nguồn thu
    const expList = resolvedContext['DANH_SACH_CHI_PHI'];
    expect(expList).toHaveLength(2);
    expect(expList[0].TEN).toBe('Tiền mua con giống');
    expect(expList[0].SO_TIEN).toBe('80.000.000 đ');

    const revList = resolvedContext['DANH_SACH_NGUON_THU'];
    expect(revList).toHaveLength(2);
    expect(revList[0].TEN).toBe('Nguồn thu từ sản xuất lúa');
    expect(revList[0].SO_TIEN).toBe('91.752.000 đ');
  });

  it('13. TAI_SAN.LOAI_TAI_SAN_GOP tự động thêm Giấy chứng nhận và Cụm câu Loại + Số GCN gộp (SO_VAO_SO_CAP_GCN_GOP)', () => {
    const loan = {
      loanType: 'THE_CHAP',
      member: baseMember,
      heir: baseHeir,
      collaterals: [
        {
          assetCode: 'TS-01',
          assetType: 'QUYEN_SU_DUNG_DAT',
          certificateType: 'GCN',
          certificateNumber: 'CS123',
          ownerType: 'NGUOI_VAY_CA_NHAN',
        },
        {
          assetCode: 'TS-02',
          assetType: 'Quyền sử dụng đất',
          certificateType: 'GIAY_CHUNG_NHAN',
          certificateNumber: 'CS234',
          ownerType: 'NGUOI_VAY_CA_NHAN',
        },
        {
          assetCode: 'TS-03',
          assetType: 'Giấy chứng nhận Quyền sử dụng đất và tài sản gắn liền với đất',
          certificateType: 'VAO_SO_CAP_GIAY_CHUNG_NHAN_QUYEN_SU_DUNG_DAT',
          certificateNumber: 'CS312',
          ownerType: 'NGUOI_VAY_CA_NHAN',
        },
      ],
    };

    const { resolvedContext } = wordTemplateDataDictionaryService.resolveLoanData(loan as any, []);

    // 1. Kiểm tra LOAI_TAI_SAN_GOP tự động có tiền tố Giấy chứng nhận
    // TS-01 và TS-02 đều là "Giấy chứng nhận Quyền sử dụng đất"
    // TS-03 đã có tiền tố "Giấy chứng nhận "
    expect(resolvedContext['TAI_SAN.LOAI_TAI_SAN_GOP']).toBe(
      'Giấy chứng nhận Quyền sử dụng đất; Giấy chứng nhận Quyền sử dụng đất và tài sản gắn liền với đất'
    );

    // 2. Kiểm tra câu gộp kết hợp Loại GCN và Số GCN phân cách bởi dấu phẩy
    // GCN -> Số vào sổ cấp GCN: CS123
    // Giấy chứng nhận -> Số vào sổ cấp Giấy chứng nhận: CS234
    // Vào sổ cấp giấy chứng nhận quyền sử dụng đất Số -> Vào sổ cấp giấy chứng nhận quyền sử dụng đất Số: CS312
    const expectedCombinedClause =
      'Số vào sổ cấp GCN: CS123, Số vào sổ cấp Giấy chứng nhận: CS234, Vào sổ cấp giấy chứng nhận quyền sử dụng đất Số: CS312';

    expect(resolvedContext['TAI_SAN.SO_VAO_SO_CAP_GCN_GOP']).toBe(expectedCombinedClause);
    expect(resolvedContext['SO_VAO_SO_CAP_GCN_GOP']).toBe(expectedCombinedClause);
    expect(resolvedContext['TAI_SAN.CAU_SO_VAO_SO_GCN']).toBe(expectedCombinedClause);
    expect(resolvedContext['CAU_SO_VAO_SO_GCN']).toBe(expectedCombinedClause);
    expect(resolvedContext['TAI_SAN.LOAI_VA_SO_GCN_GOP']).toBe(expectedCombinedClause);

    // 3. Kiểm tra từng phần tử trong danh sách lặp DANH_SACH_TAI_SAN
    const tsList = resolvedContext['DANH_SACH_TAI_SAN'];
    expect(tsList).toHaveLength(3);
    expect(tsList[0].CAU_SO_VAO_SO_GCN).toBe('Số vào sổ cấp GCN: CS123');
    expect(tsList[1].CAU_SO_VAO_SO_GCN).toBe('Số vào sổ cấp Giấy chứng nhận: CS234');
    expect(tsList[2].CAU_SO_VAO_SO_GCN).toBe('Vào sổ cấp giấy chứng nhận quyền sử dụng đất Số: CS312');
  });

  it('14. Keyword lặp cho danh sách chi phí và nguồn thu phương án vay (PHUONG_AN.DANH_SACH_CHI_PHI & PHUONG_AN.DANH_SACH_NGUON_THU)', () => {
    const loan = {
      loanType: 'TIN_CHAP',
      member: baseMember,
      loanPlan: {
        purpose: 'Trồng trọt lúa chất lượng cao và chăn nuôi bò',
        totalExpenses: 95000000,
        totalRevenues: 244672000,
        expenses: [
          { name: 'Tiền mua con giống', amount: 80000000, note: 'Bò giống khỏe' },
          { name: 'Tiền xây dựng chuồng trại', amount: 15000000, note: 'Khung thép' },
        ],
        revenues: [
          { name: 'Nguồn thu từ sản xuất lúa', amount: 91752000, note: 'Vụ đông xuân' },
          { name: 'Nguồn thu từ chăn nuôi', amount: 152920000, note: 'Bán bê' },
        ],
      },
    };

    const { resolvedContext } = wordTemplateDataDictionaryService.resolveLoanData(loan as any, []);

    // 1. Kiểm tra các alias danh sách chi phí
    const expList1 = resolvedContext['DANH_SACH_CHI_PHI'];
    const expList2 = resolvedContext['PHUONG_AN.DANH_SACH_CHI_PHI'];
    const expList3 = resolvedContext['PHUONG_AN.CHI_PHI'];
    const expList4 = resolvedContext['CHI_PHI'];
    expect(expList1).toHaveLength(2);
    expect(expList2).toHaveLength(2);
    expect(expList3).toHaveLength(2);
    expect(expList4).toHaveLength(2);

    // Kiểm tra trường con chi phí
    expect(expList1[0].STT).toBe(1);
    expect(expList1[0].TEN).toBe('Tiền mua con giống');
    expect(expList1[0].TEN_CHI_PHI).toBe('Tiền mua con giống');
    expect(expList1[0].TEN_KHOAN_CHI).toBe('Tiền mua con giống');
    expect(expList1[0].KHOAN_CHI).toBe('Tiền mua con giống');
    expect(expList1[0].NOI_DUNG).toBe('Tiền mua con giống');
    expect(expList1[0].SO_TIEN).toBe('80.000.000 đ');
    expect(expList1[0].SO_TIEN_SO).toBe('80.000.000 đ');
    expect(expList1[0].SO_TIEN_CHU).toBe('Tám mươi triệu đồng');
    expect(expList1[0].SO_TIEN_RAW).toBe(80000000);
    expect(expList1[0].GHI_CHU).toBe('Bò giống khỏe');

    // 2. Kiểm tra các alias danh sách nguồn thu
    const revList1 = resolvedContext['DANH_SACH_NGUON_THU'];
    const revList2 = resolvedContext['PHUONG_AN.DANH_SACH_NGUON_THU'];
    const revList3 = resolvedContext['PHUONG_AN.NGUON_THU'];
    const revList4 = resolvedContext['NGUON_THU'];
    expect(revList1).toHaveLength(2);
    expect(revList2).toHaveLength(2);
    expect(revList3).toHaveLength(2);
    expect(revList4).toHaveLength(2);

    // Kiểm tra trường con nguồn thu
    expect(revList1[0].STT).toBe(1);
    expect(revList1[0].TEN).toBe('Nguồn thu từ sản xuất lúa');
    expect(revList1[0].TEN_NGUON_THU).toBe('Nguồn thu từ sản xuất lúa');
    expect(revList1[0].TEN_KHOAN_THU).toBe('Nguồn thu từ sản xuất lúa');
    expect(revList1[0].KHOAN_THU).toBe('Nguồn thu từ sản xuất lúa');
    expect(revList1[0].NGUON_THU).toBe('Nguồn thu từ sản xuất lúa');
    expect(revList1[0].NOI_DUNG).toBe('Nguồn thu từ sản xuất lúa');
    expect(revList1[0].SO_TIEN).toBe('91.752.000 đ');
    expect(revList1[0].SO_TIEN_SO).toBe('91.752.000 đ');
    expect(revList1[0].SO_TIEN_CHU).toBe('Chín mươi mốt triệu bảy trăm năm mươi hai nghìn đồng');
    expect(revList1[0].SO_TIEN_RAW).toBe(91752000);
    expect(revList1[0].GHI_CHU).toBe('Vụ đông xuân');

    // 3. Kiểm tra dạng gộp phân cách dấu chấm phẩy
    expect(resolvedContext['PHUONG_AN.CHI_PHI_GOP']).toBe(
      'Tiền mua con giống: 80.000.000 đ; Tiền xây dựng chuồng trại: 15.000.000 đ'
    );
    expect(resolvedContext['CHI_PHI_GOP']).toBe(
      'Tiền mua con giống: 80.000.000 đ; Tiền xây dựng chuồng trại: 15.000.000 đ'
    );

    expect(resolvedContext['PHUONG_AN.NGUON_THU_GOP']).toBe(
      'Nguồn thu từ sản xuất lúa: 91.752.000 đ; Nguồn thu từ chăn nuôi: 152.920.000 đ'
    );
    expect(resolvedContext['NGUON_THU_GOP']).toBe(
      'Nguồn thu từ sản xuất lúa: 91.752.000 đ; Nguồn thu từ chăn nuôi: 152.920.000 đ'
    );

    // 4. Kiểm tra object lồng nhau PHUONG_AN
    const pa = resolvedContext['PHUONG_AN'];
    expect(pa.DANH_SACH_CHI_PHI).toHaveLength(2);
    expect(pa.DANH_SACH_NGUON_THU).toHaveLength(2);
    expect(pa.CHI_PHI_GOP).toBe(
      'Tiền mua con giống: 80.000.000 đ; Tiền xây dựng chuồng trại: 15.000.000 đ'
    );
    expect(pa.NGUON_THU_GOP).toBe(
      'Nguồn thu từ sản xuất lúa: 91.752.000 đ; Nguồn thu từ chăn nuôi: 152.920.000 đ'
    );
  });
  it('15. Tự động khử trùng lặp và giữ danh xưng cá nhân khi có tài sản Hộ và Cá nhân cùng 1 người', () => {
    // Trường hợp 1: Tài sản 1 là NGUOI_VAY_HO, Tài sản 2 là NGUOI_VAY_CA_NHAN
    const loan1 = {
      loanType: 'THE_CHAP',
      member: baseMember,
      collaterals: [
        { assetCode: 'TS-01', area: 1000, ownerType: 'NGUOI_VAY_HO' },
        { assetCode: 'TS-02', area: 2000, ownerType: 'NGUOI_VAY_CA_NHAN' },
      ],
    };

    const res1 = wordTemplateDataDictionaryService.resolveLoanData(loan1 as any, []).resolvedContext;

    expect(res1['DANH_SACH_CHU_SO_HUU']).toHaveLength(1);
    expect(res1['DANH_SACH_CHU_SO_HUU'][0].HO_TEN).toBe('Nguyễn Văn An');
    expect(res1['DANH_SACH_CHU_SO_HUU'][0].DANH_XUNG).toBe('Ông');
    expect(res1['DANH_SACH_CHU_SO_HUU'][0].XUNG_HO).toBe('Ông');
    expect(res1['DANH_SACH_CHU_SO_HUU'][0].QUAN_HE).toBe('Người vay');
    expect(res1['TAI_SAN.CHU_SO_HUU']).toBe('Nguyễn Văn An');
    expect(res1['CHU_SO_HUU_DANH_XUNG']).toBe('Ông');
    expect(res1['CHU_SO_HUU_GOP']).toBe('Nguyễn Văn An');
    expect(res1['CO_MOT_CHU_SO_HUU']).toBe(true);
    expect(res1['CO_NHIEU_CHU_SO_HUU']).toBe(false);
    expect(res1['SO_LUONG_CHU_SO_HUU']).toBe(1);

    // Trường hợp 2: Thứ tự ngược lại - Tài sản 1 là Cá nhân, Tài sản 2 là Hộ
    const loan2 = {
      loanType: 'THE_CHAP',
      member: baseMember,
      collaterals: [
        { assetCode: 'TS-01', area: 1000, ownerType: 'NGUOI_VAY_CA_NHAN' },
        { assetCode: 'TS-02', area: 2000, ownerType: 'NGUOI_VAY_HO' },
      ],
    };

    const res2 = wordTemplateDataDictionaryService.resolveLoanData(loan2 as any, []).resolvedContext;

    expect(res2['DANH_SACH_CHU_SO_HUU']).toHaveLength(1);
    expect(res2['DANH_SACH_CHU_SO_HUU'][0].HO_TEN).toBe('Nguyễn Văn An');
    expect(res2['DANH_SACH_CHU_SO_HUU'][0].DANH_XUNG).toBe('Ông');
    expect(res2['DANH_SACH_CHU_SO_HUU'][0].XUNG_HO).toBe('Ông');

    // Trường hợp 3: Người thừa kế có 1 tài sản Hộ và 1 tài sản Cá nhân
    const loan3 = {
      loanType: 'THE_CHAP',
      member: baseMember,
      heir: baseHeir,
      collaterals: [
        { assetCode: 'TS-01', area: 1000, ownerType: 'NGUOI_THUA_KE_HO' },
        { assetCode: 'TS-02', area: 2000, ownerType: 'NGUOI_THUA_KE_CA_NHAN' },
      ],
    };

    const res3 = wordTemplateDataDictionaryService.resolveLoanData(loan3 as any, []).resolvedContext;

    expect(res3['DANH_SACH_CHU_SO_HUU']).toHaveLength(1);
    expect(res3['DANH_SACH_CHU_SO_HUU'][0].HO_TEN).toBe('Nguyễn Thị Bích');
    expect(res3['DANH_SACH_CHU_SO_HUU'][0].DANH_XUNG).toBe('Bà');
    expect(res3['DANH_SACH_CHU_SO_HUU'][0].XUNG_HO).toBe('Bà');

    // Trường hợp 4: Cả 2 tài sản đều là Hộ -> giữ nguyên Hộ
    const loan4 = {
      loanType: 'THE_CHAP',
      member: baseMember,
      collaterals: [
        { assetCode: 'TS-01', area: 1000, ownerType: 'NGUOI_VAY_HO' },
        { assetCode: 'TS-02', area: 2000, ownerType: 'NGUOI_VAY_HO' },
      ],
    };

    const res4 = wordTemplateDataDictionaryService.resolveLoanData(loan4 as any, []).resolvedContext;

    expect(res4['DANH_SACH_CHU_SO_HUU']).toHaveLength(1);
    expect(res4['DANH_SACH_CHU_SO_HUU'][0].HO_TEN).toBe('Hộ Nguyễn Văn An');
    expect(res4['DANH_SACH_CHU_SO_HUU'][0].DANH_XUNG).toBe('Hộ Ông');

    // Trường hợp 5: 3 tài sản gồm người vay (Hộ + Cá nhân) và bên thứ ba bảo lãnh
    const loan5 = {
      loanType: 'THE_CHAP',
      member: baseMember,
      collaterals: [
        { assetCode: 'TS-01', area: 1000, ownerType: 'NGUOI_VAY_HO' },
        { assetCode: 'TS-02', area: 2000, ownerType: 'NGUOI_VAY_CA_NHAN' },
        { assetCode: 'TS-03', area: 3000, ownerType: 'BAO_LANH', thirdPartyInfo: guarantor },
      ],
    };

    const res5 = wordTemplateDataDictionaryService.resolveLoanData(loan5 as any, []).resolvedContext;

    expect(res5['DANH_SACH_CHU_SO_HUU']).toHaveLength(2);
    expect(res5['DANH_SACH_CHU_SO_HUU'][0].HO_TEN).toBe('Nguyễn Văn An');
    expect(res5['DANH_SACH_CHU_SO_HUU'][0].DANH_XUNG).toBe('Ông');
    expect(res5['DANH_SACH_CHU_SO_HUU'][1].HO_TEN).toBe('Lê Văn Cường');
    expect(res5['DANH_SACH_CHU_SO_HUU'][1].DANH_XUNG).toBe('Ông');
    expect(res5['TAI_SAN.CHU_SO_HUU_GOP']).toBe('Nguyễn Văn An và Lê Văn Cường');
    expect(res5['CO_MOT_CHU_SO_HUU']).toBe(false);
    expect(res5['CO_NHIEU_CHU_SO_HUU']).toBe(true);
    expect(res5['SO_LUONG_CHU_SO_HUU']).toBe(2);
  });
  it('16. Kiểm tra keyword KHOAN_VAY.DANH_XUNG chuẩn hóa theo số lượng chủ sở hữu và giới tính / Hộ', () => {
    // Case 1: Tài sản là 1 người nam cá nhân -> "Ông: Lê Văn A"
    const loan1 = {
      loanType: 'THE_CHAP',
      member: baseMember,
      collaterals: [
        { assetCode: 'TS-01', area: 1000, ownerType: 'NGUOI_VAY_CA_NHAN' },
      ],
    };
    const res1 = wordTemplateDataDictionaryService.resolveLoanData(loan1 as any, []).resolvedContext;
    expect(res1['KHOAN_VAY.DANH_XUNG']).toBe('Ông: Nguyễn Văn An');
    expect(res1.KHOAN_VAY.DANH_XUNG).toBe('Ông: Nguyễn Văn An');
    expect(res1.loan.DANH_XUNG).toBe('Ông: Nguyễn Văn An');

    // Case 2: Tài sản là 1 người nữ cá nhân -> "Bà: Nguyễn Thị Bích"
    const loan2 = {
      loanType: 'THE_CHAP',
      member: baseMember,
      heir: baseHeir,
      collaterals: [
        { assetCode: 'TS-02', area: 1000, ownerType: 'NGUOI_THUA_KE_CA_NHAN' },
      ],
    };
    const res2 = wordTemplateDataDictionaryService.resolveLoanData(loan2 as any, []).resolvedContext;
    expect(res2['KHOAN_VAY.DANH_XUNG']).toBe('Bà: Nguyễn Thị Bích');

    // Case 3: Tài sản là 1 người nam theo Hộ -> "Hộ Ông: Nguyễn Văn An"
    const loan3 = {
      loanType: 'THE_CHAP',
      member: baseMember,
      collaterals: [
        { assetCode: 'TS-03', area: 1000, ownerType: 'NGUOI_VAY_HO' },
      ],
    };
    const res3 = wordTemplateDataDictionaryService.resolveLoanData(loan3 as any, []).resolvedContext;
    expect(res3['KHOAN_VAY.DANH_XUNG']).toBe('Hộ Ông: Nguyễn Văn An');

    // Case 4: Tài sản là 1 người nữ theo Hộ -> "Hộ Bà: Nguyễn Thị Bích"
    const loan4 = {
      loanType: 'THE_CHAP',
      member: baseMember,
      heir: baseHeir,
      collaterals: [
        { assetCode: 'TS-04', area: 1000, ownerType: 'NGUOI_THUA_KE_HO' },
      ],
    };
    const res4 = wordTemplateDataDictionaryService.resolveLoanData(loan4 as any, []).resolvedContext;
    expect(res4['KHOAN_VAY.DANH_XUNG']).toBe('Hộ Bà: Nguyễn Thị Bích');

    // Case 5: Tài sản là 2 người khác nhau (cá nhân) -> "Ông (Bà): Nguyễn A + Nguyễn Thị B"
    const loan5 = {
      loanType: 'THE_CHAP',
      member: baseMember,
      heir: baseHeir,
      collaterals: [
        { assetCode: 'TS-01', area: 1000, ownerType: 'NGUOI_VAY_CA_NHAN' },
        { assetCode: 'TS-02', area: 2000, ownerType: 'NGUOI_THUA_KE_CA_NHAN' },
      ],
    };
    const res5 = wordTemplateDataDictionaryService.resolveLoanData(loan5 as any, []).resolvedContext;
    expect(res5['KHOAN_VAY.DANH_XUNG']).toBe('Ông (Bà): Nguyễn Văn An + Nguyễn Thị Bích');

    // Case 6: Tài sản là 2 người khác nhau nhưng có Hộ -> "Hộ Ông (Bà): Nguyễn Văn An + Lê Văn Cường"
    const loan6 = {
      loanType: 'THE_CHAP',
      member: baseMember,
      collaterals: [
        { assetCode: 'TS-01', area: 1000, ownerType: 'NGUOI_VAY_HO' },
        { assetCode: 'TS-02', area: 2000, ownerType: 'BAO_LANH', thirdPartyInfo: guarantor },
      ],
    };
    const res6 = wordTemplateDataDictionaryService.resolveLoanData(loan6 as any, []).resolvedContext;
    expect(res6['KHOAN_VAY.DANH_XUNG']).toBe('Hộ Ông (Bà): Nguyễn Văn An + Lê Văn Cường');

    // Case 7: 2 tài sản nhưng cùng 1 người (1 Hộ + 1 Cá nhân) -> khử trùng lặp còn 1 cá nhân -> "Ông: Nguyễn Văn An"
    const loan7 = {
      loanType: 'THE_CHAP',
      member: baseMember,
      collaterals: [
        { assetCode: 'TS-01', area: 1000, ownerType: 'NGUOI_VAY_HO' },
        { assetCode: 'TS-02', area: 2000, ownerType: 'NGUOI_VAY_CA_NHAN' },
      ],
    };
    const res7 = wordTemplateDataDictionaryService.resolveLoanData(loan7 as any, []).resolvedContext;
    expect(res7['KHOAN_VAY.DANH_XUNG']).toBe('Ông: Nguyễn Văn An');

    // Case 8: Khoản vay tín chấp không có tài sản -> lấy theo người vay
    const loan8 = {
      loanType: 'TIN_CHAP',
      member: baseMember,
      collaterals: [],
    };
    const res8 = wordTemplateDataDictionaryService.resolveLoanData(loan8 as any, []).resolvedContext;
    expect(res8['KHOAN_VAY.DANH_XUNG']).toBe('Ông: Nguyễn Văn An');
  });

  it('17. Kiểm tra biến boolean TAI_SAN.IS_KHAC_DIA_CHI (phát hiện khác địa chỉ, kể cả 1 cái cấp Xã và 1 cái cấp Ấp)', () => {
    // Case 1: Chỉ có 1 tài sản -> không có nhiều tài sản khác địa chỉ -> false
    const loan1 = {
      loanType: 'THE_CHAP',
      member: baseMember,
      collaterals: [
        {
          assetCode: 'TS-01',
          address: 'Ấp Nô Lựa, Xã Nhị Trường, Tỉnh Vĩnh Long',
          hamletName: 'Ấp Nô Lựa',
          communeName: 'Xã Nhị Trường',
          provinceName: 'Tỉnh Vĩnh Long',
        },
      ],
    };
    const res1 = wordTemplateDataDictionaryService.resolveLoanData(loan1 as any, []).resolvedContext;
    expect(res1['TAI_SAN.IS_KHAC_DIA_CHI']).toBe(false);
    expect(res1.TAI_SAN.IS_KHAC_DIA_CHI).toBe(false);

    // Case 2: 2 tài sản CÙNG địa chỉ (cùng Ấp, Xã, Tỉnh) -> false
    const loan2 = {
      loanType: 'THE_CHAP',
      member: baseMember,
      collaterals: [
        {
          assetCode: 'TS-01',
          address: 'Ấp Nô Lựa, Xã Nhị Trường, Tỉnh Vĩnh Long',
          hamletName: 'Ấp Nô Lựa',
          communeName: 'Xã Nhị Trường',
          provinceName: 'Tỉnh Vĩnh Long',
        },
        {
          assetCode: 'TS-02',
          address: 'Ấp Nô Lựa, Xã Nhị Trường, Tỉnh Vĩnh Long',
          hamletName: 'Ấp Nô Lựa',
          communeName: 'Xã Nhị Trường',
          provinceName: 'Tỉnh Vĩnh Long',
        },
      ],
    };
    const res2 = wordTemplateDataDictionaryService.resolveLoanData(loan2 as any, []).resolvedContext;
    expect(res2['TAI_SAN.IS_KHAC_DIA_CHI']).toBe(false);
    expect(res2.TAI_SAN.IS_KHAC_DIA_CHI).toBe(false);

    // Case 3: 2 tài sản, 1 cái ở cấp Xã và 1 cái ở cấp Ấp -> true
    const loan3 = {
      loanType: 'THE_CHAP',
      member: baseMember,
      collaterals: [
        {
          assetCode: 'TS-01',
          address: 'Ấp Nô Lựa, Xã Nhị Trường, Tỉnh Vĩnh Long',
          hamletName: 'Ấp Nô Lựa',
          communeName: 'Xã Nhị Trường',
          provinceName: 'Tỉnh Vĩnh Long',
        },
        {
          assetCode: 'TS-02',
          address: 'Xã Nhị Trường, Tỉnh Vĩnh Long',
          hamletName: null,
          communeName: 'Xã Nhị Trường',
          provinceName: 'Tỉnh Vĩnh Long',
        },
      ],
    };
    const res3 = wordTemplateDataDictionaryService.resolveLoanData(loan3 as any, []).resolvedContext;
    expect(res3['TAI_SAN.IS_KHAC_DIA_CHI']).toBe(true);
    expect(res3.TAI_SAN.IS_KHAC_DIA_CHI).toBe(true);
    expect(res3.IS_KHAC_DIA_CHI).toBe(true);

    // Case 4: 2 tài sản ở 2 Ấp khác nhau trong cùng 1 Xã -> true
    const loan4 = {
      loanType: 'THE_CHAP',
      member: baseMember,
      collaterals: [
        {
          assetCode: 'TS-01',
          address: 'Ấp Nô Lựa, Xã Nhị Trường, Tỉnh Vĩnh Long',
          hamletName: 'Ấp Nô Lựa',
          communeName: 'Xã Nhị Trường',
        },
        {
          assetCode: 'TS-02',
          address: 'Ấp Bông Ven, Xã Nhị Trường, Tỉnh Vĩnh Long',
          hamletName: 'Ấp Bông Ven',
          communeName: 'Xã Nhị Trường',
        },
      ],
    };
    const res4 = wordTemplateDataDictionaryService.resolveLoanData(loan4 as any, []).resolvedContext;
    expect(res4['TAI_SAN.IS_KHAC_DIA_CHI']).toBe(true);

    // Case 5: 2 tài sản chỉ có chuỗi address text (1 cái có Ấp, 1 cái chỉ có Xã) -> true
    const loan5 = {
      loanType: 'THE_CHAP',
      member: baseMember,
      collaterals: [
        { assetCode: 'TS-01', address: 'Ấp Nô Lựa, Xã Nhị Trường' },
        { assetCode: 'TS-02', address: 'Xã Nhị Trường' },
      ],
    };
    const res5 = wordTemplateDataDictionaryService.resolveLoanData(loan5 as any, []).resolvedContext;
    expect(res5['TAI_SAN.IS_KHAC_DIA_CHI']).toBe(true);
  });
  it('18. Kiểm tra Render thực tế file Word với KHOAN_VAY.DANH_XUNG và điều kiện IF TAI_SAN.IS_KHAC_DIA_CHI', () => {
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
          <w:p><w:t>Danh xưng: {{KHOAN_VAY.DANH_XUNG}}</w:t></w:p>
          <w:p><w:t>{{#IF TAI_SAN.IS_KHAC_DIA_CHI}}Tài sản tại các địa bàn khác nhau{{/IF}}</w:t></w:p>
        </w:body>
      </w:document>`;
    zip.file('word/document.xml', docXml);

    const templateBuf = zip.generate({ type: 'nodebuffer' });

    // Loan có 2 tài sản khác địa chỉ (1 cái cấp Ấp, 1 cái cấp Xã)
    const loan = {
      loanType: 'THE_CHAP',
      member: baseMember,
      heir: baseHeir,
      collaterals: [
        { assetCode: 'TS-01', area: 1000, ownerType: 'NGUOI_VAY_CA_NHAN', address: 'Ấp Nô Lựa, Xã Nhị Trường' },
        { assetCode: 'TS-02', area: 2000, ownerType: 'NGUOI_THUA_KE_CA_NHAN', address: 'Xã Nhị Trường' },
      ],
    };

    const { resolvedContext } = wordTemplateDataDictionaryService.resolveLoanData(loan as any, []);
    const outputBuffer = wordTemplateGeneratorService.generateDocx(templateBuf, resolvedContext);

    const outZip = new PizZip(outputBuffer);
    const outXml = outZip.file('word/document.xml')?.asText() || '';

    expect(outXml).toContain('Danh xưng: Ông (Bà): Nguyễn Văn An + Nguyễn Thị Bích');
    expect(outXml).toContain('Tài sản tại các địa bàn khác nhau');
  });
  it('19. Kiểm tra các keyword KHOAN_VAY.SO_HOP_DONG_THE_CHAP, KHOAN_VAY.SO_KHE_UOC, KHOAN_VAY.NGAY_CAP_KHE_UOC và biến so sánh trùng khớp', () => {
    // Case 1: Số khế ước GIỐNG số HĐ thế chấp (cùng là "01/2026/HĐTC")
    const loan1 = {
      loanType: 'THE_CHAP',
      contractNumber: '01/2026/HĐTC',
      contractDate: new Date('2026-05-20'),
      mortgageContract: {
        contractNumber: '01/2026/HĐTC',
        contractExpiryDate: new Date('2028-05-20'),
      },
      member: baseMember,
      collaterals: [
        { assetCode: 'TS-01', area: 1000, ownerType: 'NGUOI_VAY_CA_NHAN' },
      ],
    };

    const res1 = wordTemplateDataDictionaryService.resolveLoanData(loan1 as any, []).resolvedContext;

    expect(res1['KHOAN_VAY.SO_KHE_UOC']).toBe('01/2026/HĐTC');
    expect(res1['KHOAN_VAY,SO_KHE_UOC']).toBe('01/2026/HĐTC');
    expect(res1['SO_KHE_UOC']).toBe('01/2026/HĐTC');
    expect(res1.KHOAN_VAY.SO_KHE_UOC).toBe('01/2026/HĐTC');

    expect(res1['KHOAN_VAY.NGAY_CAP_KHE_UOC']).toBe('20/05/2026');
    expect(res1['NGAY_CAP_KHE_UOC']).toBe('20/05/2026');
    expect(res1.KHOAN_VAY.NGAY_CAP_KHE_UOC).toBe('20/05/2026');

    expect(res1['KHOAN_VAY.SO_HOP_DONG_THE_CHAP']).toBe('01/2026/HĐTC');
    expect(res1['SO_HOP_DONG_THE_CHAP']).toBe('01/2026/HĐTC');
    expect(res1.KHOAN_VAY.SO_HOP_DONG_THE_CHAP).toBe('01/2026/HĐTC');

    // Biến check số khế ước có giống với số hợp đồng thế chấp không -> TRUE
    expect(res1['KHOAN_VAY.IS_SO_KHE_UOC_GIONG_SO_HD_THE_CHAP']).toBe(true);
    expect(res1['IS_SO_KHE_UOC_GIONG_SO_HD_THE_CHAP']).toBe(true);
    expect(res1.KHOAN_VAY.IS_SO_KHE_UOC_GIONG_SO_HD_THE_CHAP).toBe(true);
    expect(res1.isSoKheUocGiongSoHdTheChap).toBe(true);

    // Case 2: Số khế ước KHÁC số HĐ thế chấp
    const loan2 = {
      loanType: 'THE_CHAP',
      contractNumber: 'KU-999',
      contractDate: new Date('2026-05-20'),
      mortgageContract: {
        contractNumber: 'TC-888',
      },
      member: baseMember,
      collaterals: [
        { assetCode: 'TS-01', area: 1000, ownerType: 'NGUOI_VAY_CA_NHAN' },
      ],
    };

    const res2 = wordTemplateDataDictionaryService.resolveLoanData(loan2 as any, []).resolvedContext;

    expect(res2['KHOAN_VAY.SO_KHE_UOC']).toBe('KU-999');
    expect(res2['KHOAN_VAY.SO_HOP_DONG_THE_CHAP']).toBe('TC-888');
    expect(res2['KHOAN_VAY.IS_SO_KHE_UOC_GIONG_SO_HD_THE_CHAP']).toBe(false);
    expect(res2['IS_SO_KHE_UOC_GIONG_SO_HD_THE_CHAP']).toBe(false);

    // Case 3: Vay tín chấp (không có hợp đồng thế chấp) -> FALSE
    const loan3 = {
      loanType: 'TIN_CHAP',
      contractNumber: 'KU-123',
      contractDate: new Date('2026-05-20'),
      member: baseMember,
      collaterals: [],
    };

    const res3 = wordTemplateDataDictionaryService.resolveLoanData(loan3 as any, []).resolvedContext;

    expect(res3['KHOAN_VAY.SO_KHE_UOC']).toBe('KU-123');
    expect(res3['KHOAN_VAY.SO_HOP_DONG_THE_CHAP']).toBe('');
    expect(res3['KHOAN_VAY.IS_SO_KHE_UOC_GIONG_SO_HD_THE_CHAP']).toBe(false);
  });
});
