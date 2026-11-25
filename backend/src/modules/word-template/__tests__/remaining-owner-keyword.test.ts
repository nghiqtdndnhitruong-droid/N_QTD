import { describe, it, expect } from 'vitest';
import { wordTemplateDataDictionaryService } from '../word-template-data-dictionary.service';

describe('Remaining Owner Keyword (CHU_SO_HUU_CON_LAI)', () => {
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
    fullName: 'Nguyễn Thị Thừa Kế',
    gender: 'NU',
    idType: 'CAN_CUOC_CONG_DAN',
    idNumber: '084190002222',
    idIssueDate: '2022-08-10',
    idIssuePlace: 'Cục CSQLHC về TTXH',
    yearOfBirth: 1990,
    address: 'Ấp Nô Lựa, Xã Nhị Trường',
    relationship: 'Vợ',
  };

  const baseCollateral = {
    assetCode: 'TS-01',
    certificateNumber: 'CS12345',
    sheetNumber: '1',
    plotNumber: '10',
    area: 500,
    address: 'Ấp Nô Lựa, Xã Nhị Trường',
  };

  it('1. Tài sản của Người thừa kế (cá nhân) & có Người thừa kế -> Trả về họ tên Người vay', () => {
    const { resolvedContext } = wordTemplateDataDictionaryService.resolveLoanData(
      {
        member,
        heir,
        collaterals: [{ ...baseCollateral, ownerType: 'NGUOI_THUA_KE_CA_NHAN' }],
      },
      [],
    );

    expect(resolvedContext.CO_NGUOI_THUA_KE).toBe(true);
    expect(resolvedContext.CHU_SO_HUU_CON_LAI).toBe('Lê Văn Người Vay');
    expect(resolvedContext['CHU_SO_HUU_CON_LAI.HO_TEN']).toBe('Lê Văn Người Vay');
    expect(resolvedContext['CHU_SO_HUU_CON_LAI.HO_TEN_IN_HOA']).toBe('LÊ VĂN NGƯỜI VAY');
    expect(resolvedContext['TAI_SAN.CHU_SO_HUU_CON_LAI']).toBe('Lê Văn Người Vay');
    expect(resolvedContext.CO_CHU_SO_HUU_CON_LAI).toBe(true);
  });

  it('2. Tài sản của Người thừa kế (hộ) & có Người thừa kế -> Trả về họ tên Người vay', () => {
    const { resolvedContext } = wordTemplateDataDictionaryService.resolveLoanData(
      {
        member,
        heir,
        collaterals: [{ ...baseCollateral, ownerType: 'NGUOI_THUA_KE_HO' }],
      },
      [],
    );

    expect(resolvedContext.CO_NGUOI_THUA_KE).toBe(true);
    expect(resolvedContext.CHU_SO_HUU_CON_LAI).toBe('Lê Văn Người Vay');
    expect(resolvedContext.CO_CHU_SO_HUU_CON_LAI).toBe(true);
  });

  it('3. Tài sản của Người vay (cá nhân) & có Người thừa kế -> Trả về họ tên Người thừa kế', () => {
    const { resolvedContext } = wordTemplateDataDictionaryService.resolveLoanData(
      {
        member,
        heir,
        collaterals: [{ ...baseCollateral, ownerType: 'NGUOI_VAY_CA_NHAN' }],
      },
      [],
    );

    expect(resolvedContext.CO_NGUOI_THUA_KE).toBe(true);
    expect(resolvedContext.CHU_SO_HUU_CON_LAI).toBe('Nguyễn Thị Thừa Kế');
    expect(resolvedContext['CHU_SO_HUU_CON_LAI.HO_TEN']).toBe('Nguyễn Thị Thừa Kế');
    expect(resolvedContext['CHU_SO_HUU_CON_LAI.HO_TEN_IN_HOA']).toBe('NGUYỄN THỊ THỪA KẾ');
    expect(resolvedContext['TAI_SAN.CHU_SO_HUU_CON_LAI']).toBe('Nguyễn Thị Thừa Kế');
    expect(resolvedContext.CO_CHU_SO_HUU_CON_LAI).toBe(true);
  });

  it('4. Tài sản của Người vay (hộ) & có Người thừa kế -> Trả về họ tên Người thừa kế', () => {
    const { resolvedContext } = wordTemplateDataDictionaryService.resolveLoanData(
      {
        member,
        heir,
        collaterals: [{ ...baseCollateral, ownerType: 'NGUOI_VAY_HO' }],
      },
      [],
    );

    expect(resolvedContext.CO_NGUOI_THUA_KE).toBe(true);
    expect(resolvedContext.CHU_SO_HUU_CON_LAI).toBe('Nguyễn Thị Thừa Kế');
    expect(resolvedContext.CO_CHU_SO_HUU_CON_LAI).toBe(true);
  });

  it('5. Không có Người thừa kế (CO_NGUOI_THUA_KE = false) -> Chuỗi rỗng & CO_CHU_SO_HUU_CON_LAI = false', () => {
    const { resolvedContext } = wordTemplateDataDictionaryService.resolveLoanData(
      {
        member,
        heir: null,
        collaterals: [{ ...baseCollateral, ownerType: 'NGUOI_VAY_HO' }],
      },
      [],
    );

    expect(resolvedContext.CO_NGUOI_THUA_KE).toBe(false);
    expect(resolvedContext.CHU_SO_HUU_CON_LAI).toBe('');
    expect(resolvedContext['CHU_SO_HUU_CON_LAI.HO_TEN']).toBe('');
    expect(resolvedContext.CO_CHU_SO_HUU_CON_LAI).toBe(false);
  });

  it('6. Nhiều tài sản trong danh sách lặp (DANH_SACH_TAI_SAN) giải riêng theo từng tài sản', () => {
    const { resolvedContext } = wordTemplateDataDictionaryService.resolveLoanData(
      {
        member,
        heir,
        collaterals: [
          { ...baseCollateral, assetCode: 'TS-01', address: 'Ấp Nô Lựa, Xã Nhị Trường', ownerType: 'NGUOI_VAY_HO' },
          { ...baseCollateral, assetCode: 'TS-02', address: 'Ấp Bông Ven, Xã Nhị Trường', ownerType: 'NGUOI_THUA_KE_HO' },
        ],
      },
      [],
    );

    const list = resolvedContext.DANH_SACH_TAI_SAN as any[];
    expect(list[0].CHU_SO_HUU_CON_LAI).toBe('Nguyễn Thị Thừa Kế');
    expect(list[1].CHU_SO_HUU_CON_LAI).toBe('Lê Văn Người Vay');
  });
});
