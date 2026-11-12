import { describe, it, expect } from 'vitest';
import { wordTemplateDataDictionaryService } from '../word-template-data-dictionary.service';

describe('Second Owner Keywords (CHU_SO_HUU_2 / CHU_SO_HUU_THU_HAI)', () => {
  const member = {
    fullName: 'Lê Văn Người Vay',
    gender: 'NAM',
    idType: 'CAN_CUOC_CONG_DAN',
    idNumber: '084085001111',
    idIssueDate: '2021-05-15',
    idIssuePlace: 'Cục CSQLHC về TTXH',
    yearOfBirth: 1985,
    address: 'Ấp Nô Lựa, Xã Nhị Trường',
  };

  const heir = {
    fullName: 'Nguyễn Thị Đồng Sở Hữu',
    gender: 'NU',
    idType: 'CAN_CUOC_CONG_DAN',
    idNumber: '084190002222',
    idIssueDate: '2022-08-10',
    idIssuePlace: 'Cục CSQLHC về TTXH',
    yearOfBirth: 1990,
    address: 'Ấp Nô Lựa, Xã Nhị Trường',
    relationship: 'Vợ',
  };

  it('Trường hợp 1: Tài sản đồng sở hữu (NGUOI_VAY_VA_NGUOI_THUA_KE) -> Lấy đúng Chủ sở hữu 1 và Chủ sở hữu 2', () => {
    const loan = {
      member,
      heir,
      collaterals: [
        {
          ownerType: 'NGUOI_VAY_VA_NGUOI_THUA_KE',
          assetCode: 'TS-01',
          certificateNumber: 'CS12345',
          sheetNumber: '1',
          plotNumber: '10',
          area: 500,
          address: 'Ấp Nô Lựa, Xã Nhị Trường',
        },
      ],
    };

    const { resolvedContext } = wordTemplateDataDictionaryService.resolveLoanData(loan, []);

    // Chủ sở hữu 1
    expect(resolvedContext['CHU_SO_HUU_1.HO_TEN']).toBe('Lê Văn Người Vay');
    expect(resolvedContext['CHU_SO_HUU_1.HO_TEN_IN_HOA']).toBe('LÊ VĂN NGƯỜI VAY');
    expect(resolvedContext['CHU_SO_HUU_1.HO_TEN_VIET_HOA']).toBe('LÊ VĂN NGƯỜI VAY');
    expect(resolvedContext['CHU_SO_HUU_1_HO_TEN_IN_HOA']).toBe('LÊ VĂN NGƯỜI VAY');
    expect(resolvedContext['CHU_SO_HUU_1']).toBe('Lê Văn Người Vay');
    expect(resolvedContext['CHU_SO_HUU_1_HO_TEN']).toBe('Lê Văn Người Vay');
    expect(resolvedContext['CHU_SO_HUU.HO_TEN']).toBe('Lê Văn Người Vay');
    expect(resolvedContext['CHU_SO_HUU.HO_TEN_IN_HOA']).toBe('LÊ VĂN NGƯỜI VAY');
    expect(resolvedContext['CHU_SO_HUU_1.DANH_XUNG']).toBe('Ông');
    expect(resolvedContext['CHU_SO_HUU_1.XUNG_HO']).toBe('Ông');
    expect(resolvedContext['CHU_SO_HUU_1.NAM_SINH']).toBe('1985');
    expect(resolvedContext['CHU_SO_HUU_1_NAM_SINH']).toBe('1985');
    expect(resolvedContext['CHU_SO_HUU_1.LOAI_GIAY_TO']).toBe('Căn cước công dân');
    expect(resolvedContext['CHU_SO_HUU_1.SO_GIAY_TO']).toBe('084085001111');
    expect(resolvedContext['CHU_SO_HUU_1.SO_CCCD']).toBe('084085001111');
    expect(resolvedContext['CHU_SO_HUU_1_SO_CCCD']).toBe('084085001111');
    expect(resolvedContext['CHU_SO_HUU_1.NGAY_CAP']).toBe('15/05/2021');
    expect(resolvedContext['CHU_SO_HUU_1.NOI_CAP']).toBe('Cục CSQLHC về TTXH');
    expect(resolvedContext['CHU_SO_HUU_1.DIA_CHI']).toBe('Ấp Nô Lựa, Xã Nhị Trường');
    expect(resolvedContext['CHU_SO_HUU_THU_NHAT.HO_TEN']).toBe('Lê Văn Người Vay');
    expect(resolvedContext['CHU_SO_HUU_THU_NHAT.HO_TEN_IN_HOA']).toBe('LÊ VĂN NGƯỜI VAY');
    expect(resolvedContext['CHU_SO_HUU_THU_NHAT.DANH_XUNG']).toBe('Ông');
    expect(resolvedContext['CHU_SO_HUU_THU_NHAT.NAM_SINH']).toBe('1985');
    expect(resolvedContext['CHU_SO_HUU_THU_NHAT.SO_CCCD']).toBe('084085001111');
    expect(resolvedContext['CHU_SO_HUU_THU_1.HO_TEN']).toBe('Lê Văn Người Vay');
    expect(resolvedContext['CHU_SO_HUU_THU_1.HO_TEN_IN_HOA']).toBe('LÊ VĂN NGƯỜI VAY');
    expect(resolvedContext['TAI_SAN.CHU_SO_HUU_1.NAM_SINH']).toBe('1985');
    expect(resolvedContext['TAI_SAN.CHU_SO_HUU_1.SO_CCCD']).toBe('084085001111');
    expect(resolvedContext['TAI_SAN.CHU_SO_HUU_1.HO_TEN_IN_HOA']).toBe('LÊ VĂN NGƯỜI VAY');

    // Chủ sở hữu 2
    expect(resolvedContext['CHU_SO_HUU_2.HO_TEN']).toBe('Nguyễn Thị Đồng Sở Hữu');
    expect(resolvedContext['CHU_SO_HUU_2.HO_TEN_IN_HOA']).toBe('NGUYỄN THỊ ĐỒNG SỞ HỮU');
    expect(resolvedContext['CHU_SO_HUU_2.HO_TEN_VIET_HOA']).toBe('NGUYỄN THỊ ĐỒNG SỞ HỮU');
    expect(resolvedContext['CHU_SO_HUU_2_HO_TEN_IN_HOA']).toBe('NGUYỄN THỊ ĐỒNG SỞ HỮU');
    expect(resolvedContext['CHU_SO_HUU_2']).toBe('Nguyễn Thị Đồng Sở Hữu');
    expect(resolvedContext['CHU_SO_HUU_2_HO_TEN']).toBe('Nguyễn Thị Đồng Sở Hữu');
    expect(resolvedContext['CHU_SO_HUU_THU_HAI.HO_TEN']).toBe('Nguyễn Thị Đồng Sở Hữu');
    expect(resolvedContext['CHU_SO_HUU_THU_HAI.HO_TEN_IN_HOA']).toBe('NGUYỄN THỊ ĐỒNG SỞ HỮU');
    expect(resolvedContext['CHU_SO_HUU_THU_HAI']).toBe('Nguyễn Thị Đồng Sở Hữu');
    expect(resolvedContext['CHU_SO_HUU_2.DANH_XUNG']).toBe('Bà');
    expect(resolvedContext['CHU_SO_HUU_2.SO_CCCD']).toBe('084190002222');
    expect(resolvedContext['CHU_SO_HUU_2.DIA_CHI']).toBe('Ấp Nô Lựa, Xã Nhị Trường');
    expect(resolvedContext['CHU_SO_HUU_2.NAM_SINH']).toBe('1990');
    expect(resolvedContext['TAI_SAN.CHU_SO_HUU_2.HO_TEN_IN_HOA']).toBe('NGUYỄN THỊ ĐỒNG SỞ HỮU');

    // Cờ boolean
    expect(resolvedContext.CO_CHU_SO_HUU_2).toBe(true);
    expect(resolvedContext.CO_CHU_SO_HUU_THU_HAI).toBe(true);

    // Cấp TAI_SAN
    expect(resolvedContext['TAI_SAN.CHU_SO_HUU_1']).toBe('Lê Văn Người Vay');
    expect(resolvedContext['TAI_SAN.CHU_SO_HUU_2']).toBe('Nguyễn Thị Đồng Sở Hữu');
    expect(resolvedContext['TAI_SAN.CHU_SO_HUU_THU_HAI']).toBe('Nguyễn Thị Đồng Sở Hữu');
  });

  it('Trường hợp 2: Khoản vay có 2 tài sản với 2 chủ sở hữu khác nhau', () => {
    const loan = {
      member,
      heir,
      collaterals: [
        {
          ownerType: 'NGUOI_VAY_CA_NHAN',
          assetCode: 'TS-01',
          certificateNumber: 'CS11111',
          sheetNumber: '1',
          plotNumber: '10',
          area: 500,
          address: 'Ấp Nô Lựa, Xã Nhị Trường',
        },
        {
          ownerType: 'NGUOI_THUA_KE_CA_NHAN',
          assetCode: 'TS-02',
          certificateNumber: 'CS22222',
          sheetNumber: '2',
          plotNumber: '20',
          area: 600,
          address: 'Ấp Nô Lựa, Xã Nhị Trường',
        },
      ],
    };

    const { resolvedContext } = wordTemplateDataDictionaryService.resolveLoanData(loan, []);

    expect(resolvedContext['CHU_SO_HUU_1.HO_TEN']).toBe('Lê Văn Người Vay');
    expect(resolvedContext['CHU_SO_HUU_2.HO_TEN']).toBe('Nguyễn Thị Đồng Sở Hữu');
    expect(resolvedContext['CHU_SO_HUU_2']).toBe('Nguyễn Thị Đồng Sở Hữu');
    expect(resolvedContext['CHU_SO_HUU_THU_HAI.HO_TEN']).toBe('Nguyễn Thị Đồng Sở Hữu');
    expect(resolvedContext.CO_CHU_SO_HUU_2).toBe(true);
  });

  it('Trường hợp 3: Khoản vay chỉ có 1 chủ sở hữu duy nhất và KHÔNG có người thừa kế', () => {
    const loan = {
      member,
      heir: null,
      collaterals: [
        {
          ownerType: 'NGUOI_VAY_CA_NHAN',
          assetCode: 'TS-01',
          certificateNumber: 'CS11111',
          sheetNumber: '1',
          plotNumber: '10',
          area: 500,
          address: 'Ấp Nô Lựa, Xã Nhị Trường',
        },
      ],
    };

    const { resolvedContext } = wordTemplateDataDictionaryService.resolveLoanData(loan, []);

    expect(resolvedContext['CHU_SO_HUU_1.HO_TEN']).toBe('Lê Văn Người Vay');
    expect(resolvedContext['CHU_SO_HUU_2.HO_TEN']).toBe('');
    expect(resolvedContext['CHU_SO_HUU_2']).toBe('');
    expect(resolvedContext['CHU_SO_HUU_THU_HAI']).toBe('');
    expect(resolvedContext.CO_CHU_SO_HUU_2).toBe(false);
    expect(resolvedContext.CO_CHU_SO_HUU_THU_HAI).toBe(false);
  });

  it('Trường hợp 4: Vòng lặp DANH_SACH_TAI_SAN cung cấp biến CHU_SO_HUU_1 và CHU_SO_HUU_2', () => {
    const loan = {
      member,
      heir,
      collaterals: [
        {
          ownerType: 'NGUOI_VAY_VA_NGUOI_THUA_KE',
          assetCode: 'TS-01',
          certificateNumber: 'CS12345',
          sheetNumber: '1',
          plotNumber: '10',
          area: 500,
          address: 'Ấp Nô Lựa, Xã Nhị Trường',
        },
      ],
    };

    const { resolvedContext } = wordTemplateDataDictionaryService.resolveLoanData(loan, []);
    const items = resolvedContext.DANH_SACH_TAI_SAN;

    expect(items).toBeDefined();
    expect(items.length).toBe(1);
    expect(items[0].CHU_SO_HUU_1).toBe('Lê Văn Người Vay');
    expect(items[0].CHU_SO_HUU_1_HO_TEN_IN_HOA).toBe('LÊ VĂN NGƯỜI VAY');
    expect(items[0].CHU_SO_HUU_2).toBe('Nguyễn Thị Đồng Sở Hữu');
    expect(items[0].CHU_SO_HUU_2_HO_TEN_IN_HOA).toBe('NGUYỄN THỊ ĐỒNG SỞ HỮU');
    expect(items[0].CHU_SO_HUU_THU_HAI).toBe('Nguyễn Thị Đồng Sở Hữu');
    expect(items[0].CO_CHU_SO_HUU_2).toBe(true);
  });

  it('Trường hợp 5: Khoản vay có 2 tài sản nhưng CẢ 2 TÀI SẢN ĐỀU DO NGƯỜI VAY ĐỨNG TÊN (dù hồ sơ có người thừa kế) -> CO_CHU_SO_HUU_2 phải là false', () => {
    const loan = {
      member,
      heir, // Có người thừa kế trong hồ sơ
      collaterals: [
        {
          ownerType: 'NGUOI_VAY_CA_NHAN',
          assetCode: 'TS-01',
          certificateNumber: 'CS11111',
          sheetNumber: '1',
          plotNumber: '10',
          area: 500,
          address: 'Ấp Nô Lựa, Xã Nhị Trường',
        },
        {
          ownerType: 'NGUOI_VAY_CA_NHAN',
          assetCode: 'TS-02',
          certificateNumber: 'CS22222',
          sheetNumber: '2',
          plotNumber: '20',
          area: 600,
          address: 'Ấp Nô Lựa, Xã Nhị Trường',
        },
      ],
    };

    const { resolvedContext } = wordTemplateDataDictionaryService.resolveLoanData(loan, []);

    // Cả 2 tài sản đều của Người Vay đứng tên -> không có chủ sở hữu thứ 2 đứng tên tài sản
    expect(resolvedContext['CHU_SO_HUU_1.HO_TEN']).toBe('Lê Văn Người Vay');
    expect(resolvedContext['CHU_SO_HUU_2.HO_TEN']).toBe('');
    expect(resolvedContext['CHU_SO_HUU_2']).toBe('');
    expect(resolvedContext['CHU_SO_HUU_THU_HAI']).toBe('');
    expect(resolvedContext.CO_CHU_SO_HUU_2).toBe(false);
    expect(resolvedContext.CO_CHU_SO_HUU_THU_HAI).toBe(false);
    expect(resolvedContext['CHU_SO_HUU.CO_CHU_SO_HUU_2']).toBe(false);
  });
});

