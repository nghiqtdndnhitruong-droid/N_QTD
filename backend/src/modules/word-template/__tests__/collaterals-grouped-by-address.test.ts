import { describe, it, expect } from 'vitest';
import { wordTemplateDataDictionaryService } from '../word-template-data-dictionary.service';

describe('DANH_SACH_TAI_SAN Grouped by Address', () => {
  const member = {
    fullName: 'Nguyễn Văn Người Vay',
    gender: 'NAM',
    idType: 'CAN_CUOC_CONG_DAN',
    idNumber: '084090001234',
    idIssueDate: '2021-05-15',
    idIssuePlace: 'Cục CSQLHC về TTXH',
    yearOfBirth: 1985,
    address: 'Ấp Nô Lựa, Xã Nhị Trường',
  };

  it('1. Trường hợp có 2 tài sản cùng địa chỉ: gộp vào 1 phần tử lặp duy nhất (index 0) với đầy đủ thông tin nối dấu ";"', () => {
    const loan = {
      member,
      collaterals: [
        {
          assetCode: 'TS-001',
          certificateNumber: 'GCN-111',
          issueBookNumber: 'CH-001',
          sheetNumber: '12',
          plotNumber: '101',
          area: 1000,
          valuationAmount: 100000000,
          pricePerSqMeter: 100000,
          usagePurpose: 'Đất ở tại nông thôn',
          usageForm: 'Sử dụng riêng',
          address: 'Ấp Nô Lựa, Xã Nhị Trường',
        },
        {
          assetCode: 'TS-002',
          certificateNumber: 'GCN-222',
          issueBookNumber: 'CH-002',
          sheetNumber: '12', // Trùng tờ bản đồ
          plotNumber: '102', // Khác thửa đất
          area: 1500,
          valuationAmount: 150000000,
          pricePerSqMeter: 100000,
          usagePurpose: 'Đất ở tại nông thôn', // Trùng mục đích
          usageForm: 'Sử dụng riêng',
          address: 'Ấp Nô Lựa, Xã Nhị Trường', // Cùng địa chỉ
        },
      ],
    };

    const { resolvedContext } = wordTemplateDataDictionaryService.resolveLoanData(loan, []);
    const tsList = resolvedContext.DANH_SACH_TAI_SAN;

    expect(tsList).toBeDefined();
    // 2 tài sản cùng địa chỉ -> gom thành 1 phần tử lặp
    expect(tsList.length).toBe(1);

    const ts0 = tsList[0];
    expect(ts0.index).toBe(1);
    expect(ts0.SO_LUONG_TAI_SAN).toBe(2);
    expect(ts0.MA_TAI_SAN).toBe('TS-001; TS-002');
    expect(ts0.SO_GCN).toBe('GCN-111; GCN-222');
    expect(ts0.SO_VAO_SO).toBe('CH-001; CH-002');
    expect(ts0.SO_TO).toBe('12'); // Trùng tờ bản đồ -> không lặp dấu ;
    expect(ts0.SO_THUA).toBe('101; 102'); // Khác thửa -> nối dấu ;
    expect(ts0.DIA_CHI).toBe('Ấp Nô Lựa, Xã Nhị Trường');
    expect(ts0.DIEN_TICH).toBe('1.000 m²; 1.500 m²');
    expect(ts0.MUC_DICH_SU_DUNG).toBe('Đất ở tại nông thôn');

    // Truy cập theo index ngoài vòng lặp
    expect(resolvedContext['DANH_SACH_TAI_SAN[0].SO_THUA'] || tsList[0].SO_THUA).toBe('101; 102');
  });

  it('2. Trường hợp chỉ có 1 tài sản: hiển thị thông tin bình thường', () => {
    const loan = {
      member,
      collaterals: [
        {
          assetCode: 'TS-001',
          certificateNumber: 'GCN-111',
          issueBookNumber: 'CH-001',
          sheetNumber: '15',
          plotNumber: '205',
          area: 800,
          address: 'Ấp Ba Se, Xã Lương Hòa',
        },
      ],
    };

    const { resolvedContext } = wordTemplateDataDictionaryService.resolveLoanData(loan, []);
    const tsList = resolvedContext.DANH_SACH_TAI_SAN;

    expect(tsList.length).toBe(1);
    expect(tsList[0].MA_TAI_SAN).toBe('TS-001');
    expect(tsList[0].SO_THUA).toBe('205');
    expect(tsList[0].SO_TO).toBe('15');
    expect(tsList[0].DIA_CHI).toBe('Ấp Ba Se, Xã Lương Hòa');
    expect(tsList[0].SO_LUONG_TAI_SAN).toBe(1);
  });

  it('3. Trường hợp nhiều tài sản với các địa chỉ khác nhau: các tài sản cùng địa chỉ được gộp chung vào 1 ô, khác địa chỉ thì nằm ở index kế tiếp', () => {
    const loan = {
      member,
      collaterals: [
        // Nhóm 1: Ấp Nô Lựa (TS 1 & 2)
        {
          assetCode: 'TS-001',
          certificateNumber: 'GCN-111',
          sheetNumber: '10',
          plotNumber: '101',
          area: 500,
          address: 'Ấp Nô Lựa, Xã Nhị Trường',
        },
        {
          assetCode: 'TS-002',
          certificateNumber: 'GCN-222',
          sheetNumber: '10',
          plotNumber: '102',
          area: 600,
          address: 'Ấp Nô Lựa, Xã Nhị Trường',
        },
        // Nhóm 2: Ấp Ba Se (TS 3 đơn lẻ)
        {
          assetCode: 'TS-003',
          certificateNumber: 'GCN-333',
          sheetNumber: '20',
          plotNumber: '201',
          area: 700,
          address: 'Ấp Ba Se, Xã Lương Hòa',
        },
        // Nhóm 3: Ấp Giồng Đình (TS 4 & 5)
        {
          assetCode: 'TS-004',
          certificateNumber: 'GCN-444',
          sheetNumber: '30',
          plotNumber: '301',
          area: 800,
          address: 'Ấp Giồng Đình, Xã Đại An',
        },
        {
          assetCode: 'TS-005',
          certificateNumber: 'GCN-555',
          sheetNumber: '35',
          plotNumber: '302',
          area: 900,
          address: 'Ấp Giồng Đình, Xã Đại An',
        },
      ],
    };

    const { resolvedContext } = wordTemplateDataDictionaryService.resolveLoanData(loan, []);
    const tsList = resolvedContext.DANH_SACH_TAI_SAN;

    // Tổng cộng 3 địa chỉ khác nhau -> 3 phần tử lặp
    expect(tsList.length).toBe(3);

    // Index 0: Gộp TS-001 và TS-002 (cùng Ấp Nô Lựa)
    expect(tsList[0].index).toBe(1);
    expect(tsList[0].SO_LUONG_TAI_SAN).toBe(2);
    expect(tsList[0].MA_TAI_SAN).toBe('TS-001; TS-002');
    expect(tsList[0].SO_THUA).toBe('101; 102');
    expect(tsList[0].SO_TO).toBe('10');
    expect(tsList[0].DIA_CHI).toBe('Ấp Nô Lựa, Xã Nhị Trường');

    // Index 1: TS-003 (Ấp Ba Se)
    expect(tsList[1].index).toBe(2);
    expect(tsList[1].SO_LUONG_TAI_SAN).toBe(1);
    expect(tsList[1].MA_TAI_SAN).toBe('TS-003');
    expect(tsList[1].SO_THUA).toBe('201');
    expect(tsList[1].SO_TO).toBe('20');
    expect(tsList[1].DIA_CHI).toBe('Ấp Ba Se, Xã Lương Hòa');

    // Index 2: Gộp TS-004 và TS-005 (cùng Ấp Giồng Đình)
    expect(tsList[2].index).toBe(3);
    expect(tsList[2].SO_LUONG_TAI_SAN).toBe(2);
    expect(tsList[2].MA_TAI_SAN).toBe('TS-004; TS-005');
    expect(tsList[2].SO_THUA).toBe('301; 302');
    expect(tsList[2].SO_TO).toBe('30; 35');
    expect(tsList[2].DIA_CHI).toBe('Ấp Giồng Đình, Xã Đại An');
  });
});

