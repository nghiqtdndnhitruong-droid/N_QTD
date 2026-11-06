import { describe, it, expect } from 'vitest';
import { wordTemplateDataDictionaryService } from '../word-template-data-dictionary.service';

describe('DANH_SACH_CHU_SO_HUU_VA_THUA_KE (Extended Owners Loop)', () => {
  const member = {
    fullName: 'Nguyễn Văn Người Vay',
    gender: 'NAM',
    idType: 'CAN_CUOC_CONG_DAN',
    idNumber: '084090001234',
    idIssueDate: '2021-05-15',
    idIssuePlace: 'Cục CSQLHC về TTXH',
    yearOfBirth: 1985,
    address: 'Ấp 1, Xã Nhị Trường',
  };

  const heir = {
    fullName: 'Trần Thị Người Thừa Kế',
    gender: 'NU',
    idType: 'CAN_CUOC_CONG_DAN',
    idNumber: '084192005678',
    idIssueDate: '2022-08-10',
    idIssuePlace: 'Cục CSQLHC về TTXH',
    yearOfBirth: 1990,
    address: 'Ấp 2, Xã Nhị Trường',
    relationship: 'Vợ',
  };

  it('Điều kiện 1: Nếu chủ sở hữu có Người vay thì tự thêm Người thừa kế vào cuối', () => {
    const loan = {
      member,
      heir,
      collaterals: [
        {
          ownerType: 'NGUOI_VAY_CA_NHAN',
          assetCode: 'TS-01',
          sheetNumber: '1',
          plotNumber: '10',
          area: 500,
        },
      ],
    };

    const { resolvedContext } = wordTemplateDataDictionaryService.resolveLoanData(loan, []);
    const extendedList = resolvedContext.DANH_SACH_CHU_SO_HUU_VA_THUA_KE;

    expect(extendedList).toBeDefined();
    expect(extendedList.length).toBe(2);
    // Người thứ 1: Người vay
    expect(extendedList[0].index).toBe(1);
    expect(extendedList[0].HO_TEN).toBe('Nguyễn Văn Người Vay');
    expect(extendedList[0].DANH_XUNG).toBe('Ông');
    expect(extendedList[0].QUAN_HE).toBe('Người vay');

    // Người thứ 2 tự thêm: Người thừa kế
    expect(extendedList[1].index).toBe(2);
    expect(extendedList[1].HO_TEN).toBe('Trần Thị Người Thừa Kế');
    expect(extendedList[1].DANH_XUNG).toBe('Bà');
    expect(extendedList[1].QUAN_HE).toBe('Vợ');
  });

  it('Điều kiện 1 (biến thể): Nếu chủ sở hữu có Người vay nhưng hồ sơ KHÔNG có Người thừa kế thì không thêm ai', () => {
    const loan = {
      member,
      heir: null,
      collaterals: [
        {
          ownerType: 'NGUOI_VAY_CA_NHAN',
          assetCode: 'TS-01',
          sheetNumber: '1',
          plotNumber: '10',
          area: 500,
        },
      ],
    };

    const { resolvedContext } = wordTemplateDataDictionaryService.resolveLoanData(loan, []);
    const extendedList = resolvedContext.DANH_SACH_CHU_SO_HUU_VA_THUA_KE;

    expect(extendedList).toBeDefined();
    expect(extendedList.length).toBe(1);
    expect(extendedList[0].HO_TEN).toBe('Nguyễn Văn Người Vay');
  });

  it('Điều kiện 3: Nếu chủ sở hữu có Người thừa kế thì tự thêm Người vay vào cuối', () => {
    const loan = {
      member,
      heir,
      collaterals: [
        {
          ownerType: 'NGUOI_THUA_KE_CA_NHAN',
          assetCode: 'TS-02',
          sheetNumber: '2',
          plotNumber: '20',
          area: 600,
        },
      ],
    };

    const { resolvedContext } = wordTemplateDataDictionaryService.resolveLoanData(loan, []);
    const extendedList = resolvedContext.DANH_SACH_CHU_SO_HUU_VA_THUA_KE;

    expect(extendedList).toBeDefined();
    expect(extendedList.length).toBe(2);
    // Người thứ 1: Người thừa kế (là chủ sở hữu đất)
    expect(extendedList[0].index).toBe(1);
    expect(extendedList[0].HO_TEN).toBe('Trần Thị Người Thừa Kế');
    expect(extendedList[0].DANH_XUNG).toBe('Bà');

    // Người thứ 2 tự thêm: Người vay
    expect(extendedList[1].index).toBe(2);
    expect(extendedList[1].HO_TEN).toBe('Nguyễn Văn Người Vay');
    expect(extendedList[1].DANH_XUNG).toBe('Ông');
    expect(extendedList[1].QUAN_HE).toBe('Người vay');
  });

  it('Điều kiện 2: Nếu trong chủ sở hữu đã có 2 người thì không thêm ai vào', () => {
    const loan = {
      member,
      heir,
      collaterals: [
        {
          ownerType: 'NGUOI_VAY_VA_NGUOI_THUA_KE',
          assetCode: 'TS-03',
          sheetNumber: '3',
          plotNumber: '30',
          area: 700,
        },
      ],
    };

    const { resolvedContext } = wordTemplateDataDictionaryService.resolveLoanData(loan, []);
    const extendedList = resolvedContext.DANH_SACH_CHU_SO_HUU_VA_THUA_KE;

    expect(extendedList).toBeDefined();
    // Đã có cả 2 người -> giữ nguyên 2 người
    expect(extendedList.length).toBe(2);
    expect(extendedList[0].HO_TEN).toBe('Nguyễn Văn Người Vay');
    expect(extendedList[1].HO_TEN).toBe('Trần Thị Người Thừa Kế');
  });

  it('Điều kiện đặc biệt (Bảo lãnh): Trường hợp có người bảo lãnh thì chỉ hiển thị duy nhất người bảo lãnh', () => {
    const loan = {
      member,
      heir,
      collaterals: [
        {
          ownerType: 'BAO_LANH',
          assetCode: 'TS-BL-01',
          sheetNumber: '5',
          plotNumber: '50',
          area: 800,
          thirdPartyInfo: {
            fullName: 'Lê Văn Bảo Lãnh',
            gender: 'NAM',
            idType: 'CAN_CUOC_CONG_DAN',
            idNumber: '084090888999',
            idIssueDate: '2020-01-01',
            idIssuePlace: 'Cục CSQLHC về TTXH',
            yearOfBirth: 1978,
            address: 'Ấp 3, Xã Nhị Trường',
          },
        },
      ],
    };

    const { resolvedContext } = wordTemplateDataDictionaryService.resolveLoanData(loan, []);
    const extendedList = resolvedContext.DANH_SACH_CHU_SO_HUU_VA_THUA_KE;

    expect(extendedList).toBeDefined();
    // Chỉ duy nhất người bảo lãnh, không thêm người vay hoặc người thừa kế
    expect(extendedList.length).toBe(1);
    expect(extendedList[0].index).toBe(1);
    expect(extendedList[0].HO_TEN).toBe('Lê Văn Bảo Lãnh');
    expect(extendedList[0].DANH_XUNG).toBe('Ông');
    expect(extendedList[0].SO_CCCD).toBe('084090888999');
    expect(extendedList[0].QUAN_HE).toBe('Bên thứ ba bảo lãnh');
  });

  it('Hỗ trợ đầy đủ các từ khóa bí danh (aliases)', () => {
    const loan = {
      member,
      heir,
      collaterals: [
        {
          ownerType: 'NGUOI_VAY_CA_NHAN',
          assetCode: 'TS-01',
          sheetNumber: '1',
          plotNumber: '10',
          area: 500,
        },
      ],
    };

    const { resolvedContext } = wordTemplateDataDictionaryService.resolveLoanData(loan, []);

    // Danh sách gốc chủ sở hữu
    expect(resolvedContext.DANH_SACH_CHU_SO_HUU.length).toBe(1);
    expect(resolvedContext.DANH_SACH_NGUOI_SO_HUU.length).toBe(1);

    // Danh sách mở rộng kèm thừa kế
    expect(resolvedContext.DANH_SACH_CHU_SO_HUU_VA_THUA_KE.length).toBe(2);
    expect(resolvedContext.DANH_SACH_NGUOI_SO_HUU_VA_THUA_KE.length).toBe(2);
    expect(resolvedContext.DANH_SACH_CHU_SO_HUU_MO_RONG.length).toBe(2);
    expect(resolvedContext.DANH_SACH_CHU_SO_HUU_KEM_THUA_KE.length).toBe(2);
    expect(resolvedContext['KHOAN_VAY.DANH_SACH_CHU_SO_HUU_VA_THUA_KE'].length).toBe(2);
    expect(resolvedContext.KHOAN_VAY.DANH_SACH_CHU_SO_HUU_VA_THUA_KE.length).toBe(2);
  });
});

