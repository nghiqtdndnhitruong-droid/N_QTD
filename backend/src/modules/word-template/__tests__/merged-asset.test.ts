import { describe, expect, it } from 'vitest';
import {
  mergeAssetValues,
  WordTemplateDataDictionaryService,
} from '../word-template-data-dictionary.service';

describe('Word Template Merged Asset Logic', () => {
  describe('mergeAssetValues algorithm', () => {
    it('Ghép các giá trị khác nhau: nối bằng dấu "; "', () => {
      const items = [{ code: 'TS-001' }, { code: 'TS-002' }, { code: 'TS-003' }];
      const result = mergeAssetValues(items, (i) => i.code);
      expect(result).toBe('TS-001; TS-002; TS-003');
    });

    it('Các giá trị giống nhau: chỉ giữ lại 1 giá trị duy nhất, không lặp lại và không có dấu "; "', () => {
      const items = [
        { purpose: 'Đất trồng lúa' },
        { purpose: 'Đất trồng lúa' },
        { purpose: 'Đất trồng lúa' },
      ];
      const result = mergeAssetValues(items, (i) => i.purpose);
      expect(result).toBe('Đất trồng lúa');
      expect(result).not.toContain(';');
    });

    it('Vừa có giá trị trùng vừa có giá trị khác: loại bỏ trùng và nối dấu "; "', () => {
      const items = [
        { sheet: '12' },
        { sheet: '12' },
        { sheet: '15' },
        { sheet: '15' },
        { sheet: '20' },
      ];
      const result = mergeAssetValues(items, (i) => i.sheet);
      expect(result).toBe('12; 15; 20');
    });

    it('Chuẩn hóa khoảng trắng thừa: " CS 001 " và "CS 001" được xem là cùng giá trị', () => {
      const items = [
        { cert: ' CS 001 ' },
        { cert: 'CS 001' },
        { cert: 'CS 002' },
      ];
      const result = mergeAssetValues(items, (i) => i.cert);
      expect(result).toBe('CS 001; CS 002');
    });

    it('Bỏ qua null, undefined, chuỗi rỗng và không tạo dấu chấm phẩy thừa', () => {
      const items = [
        { plot: '101' },
        { plot: null },
        { plot: '' },
        { plot: undefined },
        { plot: '   ' },
        { plot: '102' },
      ];
      const result = mergeAssetValues(items, (i) => i.plot);
      expect(result).toBe('101; 102');
    });

    it('Khi mảng rỗng hoặc toàn giá trị rỗng -> trả về fallbackValue', () => {
      expect(mergeAssetValues([], (i: any) => i.code)).toBe('');
      expect(mergeAssetValues(undefined, (i: any) => i.code)).toBe('');
      expect(mergeAssetValues([{ code: null }, { code: '' }], (i) => i.code, 'Không có')).toBe('Không có');
    });
  });

  describe('resolveLoanData with TAI_SAN.*_GOP and flat variables', () => {
    const service = new WordTemplateDataDictionaryService();

    it('Khoản vay có 2 tài sản: cùng địa chỉ, cùng chủ sở hữu, nhưng khác mã, số thửa, số GCN', () => {
      const mockLoan: any = {
        id: 'loan-1',
        loanType: 'THE_CHAP',
        member: {
          fullName: 'Nguyễn Văn A',
          memberCode: 'TV-001',
        },
        collaterals: [
          {
            assetCode: 'TS-001',
            certificateNumber: 'GCN-111',
            issueBookNumber: 'CH-001',
            plotNumber: '101',
            sheetNumber: '12',
            area: 1000,
            address: 'Ấp Nô Lựa, Xã Nhị Trường',
            ownerType: 'CHINH_CHU',
            assetType: 'DAT_O',
          },
          {
            assetCode: 'TS-002',
            certificateNumber: 'GCN-222',
            issueBookNumber: 'CH-002',
            plotNumber: '102',
            sheetNumber: '12', // Trùng tờ bản đồ
            area: 1500,
            address: 'Ấp Nô Lựa, Xã Nhị Trường', // Trùng địa chỉ
            ownerType: 'CHINH_CHU', // Trùng chủ sở hữu
            assetType: 'DAT_O', // Trùng loại tài sản
          },
        ],
      };

      const mappings = [
        { keyword: 'MA_TAI_SAN_GOP', dataPath: 'TAI_SAN.MA_TAI_SAN_GOP', dataType: 'TEXT' as const },
        { keyword: 'SO_THUA_GOP', dataPath: 'TAI_SAN.SO_THUA_GOP', dataType: 'TEXT' as const },
        { keyword: 'SO_TO_GOP', dataPath: 'TAI_SAN.SO_TO_GOP', dataType: 'TEXT' as const },
        { keyword: 'DIA_CHI_GOP', dataPath: 'TAI_SAN.DIA_CHI_GOP', dataType: 'TEXT' as const },
        { keyword: 'CHU_SO_HUU_GOP', dataPath: 'TAI_SAN.CHU_SO_HUU_GOP', dataType: 'TEXT' as const },
      ];

      const { resolvedContext } = service.resolveLoanData(mockLoan, mappings);

      // Mã tài sản và Số thửa khác nhau -> nối bằng "; "
      expect(resolvedContext.MA_TAI_SAN_GOP).toBe('TS-001; TS-002');
      expect(resolvedContext['TAI_SAN.MA_TAI_SAN_GOP']).toBe('TS-001; TS-002');
      expect(resolvedContext.SO_THUA_GOP).toBe('101; 102');

      // Tờ bản đồ, Địa chỉ, Chủ sở hữu giống nhau -> chỉ hiển thị 1 lần duy nhất, không lặp lại
      expect(resolvedContext.SO_TO_GOP).toBe('12');
      expect(resolvedContext.DIA_CHI_GOP).toBe('Ấp Nô Lựa, Xã Nhị Trường');
      expect(resolvedContext.CHU_SO_HUU_GOP).toBe('Nguyễn Văn A');

      // Truy cập lồng TAI_SAN trong context
      const taiSanObj = resolvedContext.TAI_SAN;
      expect(taiSanObj).toBeDefined();
      expect(taiSanObj.MA_TAI_SAN_GOP).toBe('TS-001; TS-002');
      expect(taiSanObj.SO_TO_GOP).toBe('12');
      expect(taiSanObj.DIA_CHI_GOP).toBe('Ấp Nô Lựa, Xã Nhị Trường');

      // Tổng diện tích tất cả tài sản: 1000 + 1500 = 2500 m²
      expect(resolvedContext.TONG_DIEN_TICH).toBe('2500 m²');
      expect(resolvedContext['TAI_SAN.TONG_DIEN_TICH']).toBe('2500 m²');
      expect(taiSanObj.TONG_DIEN_TICH).toBe('2500 m²');
      expect(resolvedContext.TONG_DIEN_TICH_CHU).toContain('mét vuông');
      expect(taiSanObj.TONG_DIEN_TICH_CHU).toContain('mét vuông');
    });
  });
});

