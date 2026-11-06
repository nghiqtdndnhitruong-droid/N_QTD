import { describe, it, expect } from 'vitest';
import assert from 'node:assert';
import {
  resolveIncomeTitle,
  wordTemplateDataDictionaryService,
} from '../word-template-data-dictionary.service';

describe('income-and-term-keywords', () => {
  it('resolves income title correctly', () => {
    assert.strictEqual(
      resolveIncomeTitle('Trả bằng nguồn thu sản xuất lúa', 0).withoutColon,
      'Thu nhập từ sản xuất nông nghiệp',
    );
    assert.strictEqual(
      resolveIncomeTitle('Trả bằng nguồn thu sản xuất lúa', 0).title,
      'Thu nhập từ sản xuất nông nghiệp',
    );
    assert.strictEqual(
      resolveIncomeTitle('Sản xuất lúa vụ hè thu', 0).withoutColon,
      'Thu nhập từ sản xuất nông nghiệp',
    );
    assert.strictEqual(
      resolveIncomeTitle('Nông nghiệp', 0).withoutColon,
      'Thu nhập từ sản xuất nông nghiệp',
    );
    assert.strictEqual(
      resolveIncomeTitle('Trả bằng nguồn chăn nuôi', 1).withoutColon,
      'Thu nhập từ chăn nuôi',
    );
    assert.strictEqual(
      resolveIncomeTitle('Nuôi bò vỗ béo', 1).withoutColon,
      'Thu nhập từ chăn nuôi',
    );
    assert.strictEqual(
      resolveIncomeTitle('Trả bằng nguồn thu khác', 2).withoutColon,
      'Thu nhập khác',
    );
    assert.strictEqual(
      resolveIncomeTitle('Nguồn thu khác', 2).withoutColon,
      'Thu nhập khác',
    );
    assert.strictEqual(
      resolveIncomeTitle('Tiền làm công', 2).withoutColon,
      'Tiền làm công',
    );
  });

  it('resolves loan data for CHAN_NUOI with TRUNG_HAN', () => {
    const mockLoanChanNuoi: any = {
      id: 'loan-1',
      loanCode: 'HD001',
      termType: 'TRUNG_HAN',
      termMonths: 24,
      loanAmount: 100000000,
      interestRate: 12,
      loanPlan: {
        templateType: 'CHAN_NUOI',
        purpose: 'Nuôi bò sinh sản',
        termMonths: 24,
        totalCapital: 150000000,
        ownCapital: 50000000,
        loanCapital: 100000000,
        totalCost: 100000000,
        totalRevenue: 180000000,
        netProfit: 80000000,
        revenues: [
          { name: 'Trả bằng nguồn thu sản xuất lúa', amount: 80000000 },
          { name: 'Trả bằng nguồn chăn nuôi', amount: 60000000 },
          { name: 'Trả bằng nguồn thu khác', amount: 40000000 },
        ],
        expenses: [
          { name: 'Chi phí mua con giống', amount: 60000000 },
          { name: 'Chi phí thức ăn', amount: 40000000 },
        ],
      },
      member: {
        fullName: 'Nguyễn Văn A',
        memberCode: 'TV001',
      },
      collaterals: [
        {
          assetCode: 'TS01',
          certificateNumber: 'CS123',
          landArea: 1000,
          valuationAmount: 120000000,
        },
        {
          assetCode: 'TS02',
          certificateNumber: 'CS456',
          landArea: 500,
          valuationAmount: 80000000,
        },
      ],
      relatedPersons: [],
    };

    const { resolvedContext: resolvedData1 } = wordTemplateDataDictionaryService.resolveLoanData(mockLoanChanNuoi, []);

    // Check isTrungHan
    assert.strictEqual(resolvedData1.isTrungHan, true);
    assert.strictEqual(resolvedData1.IS_TRUNG_HAN, true);
    assert.strictEqual(resolvedData1.LA_TRUNG_HAN, true);
    assert.strictEqual(resolvedData1.isNganHan, false);
    assert.strictEqual(resolvedData1.PHUONG_AN.IS_TRUNG_HAN, true);

    // Check DANH_SACH_THU_NHAP
    assert(Array.isArray(resolvedData1.DANH_SACH_THU_NHAP));
    assert.strictEqual(resolvedData1.DANH_SACH_THU_NHAP.length, 3);
    assert.strictEqual(resolvedData1.DANH_SACH_THU_NHAP[0].TEN_THU_NHAP, 'Thu nhập từ sản xuất nông nghiệp');
    assert.strictEqual(resolvedData1.DANH_SACH_THU_NHAP[0].TEN_THU_NHAP_KHONG_DAU_HAI_CHAM, 'Thu nhập từ sản xuất nông nghiệp');
    assert.strictEqual(resolvedData1.DANH_SACH_THU_NHAP[0].SO_TIEN_RAW, 80000000);
    assert.strictEqual(resolvedData1.DANH_SACH_THU_NHAP[1].TEN_THU_NHAP, 'Thu nhập từ chăn nuôi');
    assert.strictEqual(resolvedData1.DANH_SACH_THU_NHAP[1].SO_TIEN_RAW, 60000000);
    assert.strictEqual(resolvedData1.DANH_SACH_THU_NHAP[2].TEN_THU_NHAP, 'Thu nhập khác');
    assert.strictEqual(resolvedData1.DANH_SACH_THU_NHAP[2].SO_TIEN_RAW, 40000000);

    // Check TAI_SAN.SO_LUONG_TAI_SAN
    assert.strictEqual(resolvedData1.TAI_SAN.SO_LUONG_TAI_SAN, 2);
    assert.strictEqual(resolvedData1['TAI_SAN.SO_LUONG_TAI_SAN'], 2);
    assert.strictEqual(resolvedData1.SO_LUONG_TAI_SAN, 2);
    assert.strictEqual(resolvedData1.TONG_SO_TAI_SAN, 2);

    // Check TAI_SAN.TONG_DINH_GIA
    assert.strictEqual(resolvedData1.TAI_SAN.TONG_DINH_GIA, '200.000.000 đ');
    assert.strictEqual(resolvedData1['TAI_SAN.TONG_DINH_GIA'], '200.000.000 đ');
    assert.strictEqual(resolvedData1.TONG_DINH_GIA, '200.000.000 đ');
    assert.strictEqual(resolvedData1.TAI_SAN.TONG_DINH_GIA_CHU, 'Hai trăm triệu đồng');
    assert.strictEqual(resolvedData1['TAI_SAN.TONG_DINH_GIA_CHU'], 'Hai trăm triệu đồng');

    // Check PHUONG_AN.DANH_SACH_THU_NHAP
    assert.strictEqual(resolvedData1.PHUONG_AN.DANH_SACH_THU_NHAP.length, 3);
    assert.strictEqual(resolvedData1.PHUONG_AN.DANH_SACH_THU_NHAP[1].TEN_THU_NHAP, 'Thu nhập từ chăn nuôi');
  });

  it('resolves loan data for SUA_NHA with NGAN_HAN', () => {
    const mockLoanSuaNha: any = {
      id: 'loan-2',
      loanCode: 'HD002',
      termType: 'NGAN_HAN',
      termMonths: 12,
      loanAmount: 50000000,
      interestRate: 10,
      loanPlan: {
        templateType: 'SUA_NHA',
        purpose: 'Sửa chữa mái nhà và lát nền',
        termMonths: 12,
        totalCapital: 80000000,
        ownCapital: 30000000,
        loanCapital: 50000000,
        totalCost: 50000000,
        totalRevenue: 90000000,
        netProfit: 40000000,
        revenues: [
          { name: 'Trả bằng nguồn thu sản xuất lúa', amount: 60000000 },
          { name: 'Trả bằng nguồn thu khác', amount: 30000000 },
        ],
        expenses: [
          { name: 'Mua vật liệu xây dựng', amount: 50000000 },
        ],
      },
      member: {
        fullName: 'Trần Thị B',
        memberCode: 'TV002',
      },
      collaterals: [],
      relatedPersons: [],
    };

    const { resolvedContext: resolvedData2 } = wordTemplateDataDictionaryService.resolveLoanData(mockLoanSuaNha, []);
    assert.strictEqual(resolvedData2.isTrungHan, false);
    assert.strictEqual(resolvedData2.IS_TRUNG_HAN, false);
    assert.strictEqual(resolvedData2.LA_TRUNG_HAN, false);
    assert.strictEqual(resolvedData2.isNganHan, true);
    assert.strictEqual(resolvedData2.PHUONG_AN.IS_TRUNG_HAN, false);

    assert(Array.isArray(resolvedData2.DANH_SACH_THU_NHAP));
    assert.strictEqual(resolvedData2.DANH_SACH_THU_NHAP.length, 2);
    assert.strictEqual(resolvedData2.DANH_SACH_THU_NHAP[0].TEN_THU_NHAP, 'Thu nhập từ sản xuất nông nghiệp');
    assert.strictEqual(resolvedData2.DANH_SACH_THU_NHAP[0].SO_TIEN_RAW, 60000000);
    assert.strictEqual(resolvedData2.DANH_SACH_THU_NHAP[1].TEN_THU_NHAP, 'Thu nhập khác');
    assert.strictEqual(resolvedData2.DANH_SACH_THU_NHAP[1].SO_TIEN_RAW, 30000000);
  });
});
