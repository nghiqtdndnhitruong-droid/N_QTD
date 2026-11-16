import { describe, expect, it } from 'vitest';
import PizZip from 'pizzip';
import {
  calculateMemberCreditScore,
  generateMemberCreditRatingDocx,
  resolveAgeCriterionKey,
  resolveCreditRankAndRisk,
} from '../member-credit-rating.service';

describe('Member Credit Rating & Word Export Service', () => {
  it('1. Tự động chọn tiêu chí Tuổi theo năm sinh', () => {
    expect(resolveAgeCriterionKey(1985, 2026)).toBe('AGE_36_55'); // 41 tuổi -> 100đ
    expect(resolveAgeCriterionKey(1995, 2026)).toBe('AGE_26_35'); // 31 tuổi -> 75đ
    expect(resolveAgeCriterionKey(1968, 2026)).toBe('AGE_56_60'); // 58 tuổi -> 50đ
    expect(resolveAgeCriterionKey(2003, 2026)).toBe('AGE_20_25'); // 23 tuổi -> 25đ
    expect(resolveAgeCriterionKey(1960, 2026)).toBe('AGE_OVER_60'); // 66 tuổi -> 0đ
  });

  it('2. Tính chính xác tổng điểm và xếp hạng theo đúng mẫu Thạch Dương (77.75đ -> BB)', () => {
    const score = calculateMemberCreditScore(1960, {
      c1: 'AGE_OVER_60', // 0đ -> 0
      c2: 'EDU_SECONDARY', // 25đ -> 2.5
      c3: 'CRIMINAL_NONE', // 100đ -> 10
      c4: 'ASSET_INDIVIDUAL', // 100đ -> 10
      c5: 'DEP_UNDER_3', // 100đ -> 10
      c6: 'FAM_HEAD', // 100đ -> 10
      c7: 'INS_50M_100M', // 75đ -> 7.5
      c8: 'JOB_SEASONAL', // 25đ -> 2.5
      c9: 'EXP_OVER_7Y', // 100đ -> 10
      c10: 'OCC_RISK_LOW', // 100đ -> 10
      c11: 'INC_3M_5M', // 50đ * 30% -> 15
      c12: 'DTI_UNDER_30', // 100đ * 30% -> 30
      c13: 'REP_ONTIME', // 100đ * 25% -> 25
      c14: 'SRV_PAYMENT_ONLY', // 75đ * 15% -> 11.25
    });

    expect(score.group1Score).toBe(72.5);
    expect(score.group2Score).toBe(81.25);
    expect(score.totalScore).toBe(77.75);
    expect(score.rank).toBe('BB');
    expect(score.riskLevel).toBe('Rủi ro trung bình');
  });

  it('3. Đối chiếu đầy đủ 10 mốc xếp hạng tín nhiệm AAA -> D', () => {
    expect(resolveCreditRankAndRisk(96)).toEqual({ rank: 'AAA', riskLevel: 'Rủi ro thấp' });
    expect(resolveCreditRankAndRisk(92)).toEqual({ rank: 'AA', riskLevel: 'Rủi ro thấp' });
    expect(resolveCreditRankAndRisk(87)).toEqual({ rank: 'A', riskLevel: 'Rủi ro thấp' });
    expect(resolveCreditRankAndRisk(82)).toEqual({ rank: 'BBB', riskLevel: 'Rủi ro trung bình' });
    expect(resolveCreditRankAndRisk(75)).toEqual({ rank: 'BB', riskLevel: 'Rủi ro trung bình' });
    expect(resolveCreditRankAndRisk(65)).toEqual({ rank: 'B', riskLevel: 'Rủi ro trung bình' });
    expect(resolveCreditRankAndRisk(55)).toEqual({ rank: 'CCC', riskLevel: 'Rủi ro cao' });
    expect(resolveCreditRankAndRisk(45)).toEqual({ rank: 'CC', riskLevel: 'Rủi ro cao' });
    expect(resolveCreditRankAndRisk(37)).toEqual({ rank: 'C', riskLevel: 'Rủi ro cao' });
    expect(resolveCreditRankAndRisk(30)).toEqual({ rank: 'D', riskLevel: 'Rủi ro cao' });
  });

  it('4. Xuất file Word (.docx) từ template/rank điền đầy đủ thông tin khách hàng và điểm số', () => {
    const mockMember: any = {
      id: 'm1',
      fullName: 'Nguyễn Văn Kiểm Thử',
      yearOfBirth: 1985,
      idNumber: '084085009999',
      address: 'Ấp Cầu Mới, Xã Nhị Trường, Tỉnh Vĩnh Long',
    };

    const score = calculateMemberCreditScore(1985, {});
    const docxBuffer = generateMemberCreditRatingDocx(mockMember, score);

    expect(docxBuffer.length).toBeGreaterThan(1000);
    const zip = new PizZip(docxBuffer);
    const xml = zip.file('word/document.xml')!.asText();

    expect(xml).toContain('Nguyễn Văn Kiểm Thử');
    expect(xml).toContain('084085009999');
    expect(xml).toContain('Ấp Cầu Mới, Xã Nhị Trường, Tỉnh Vĩnh Long');
    expect(xml).toContain('AAA');
    expect(xml).toContain('rủi ro thấp');
    expect(xml).not.toContain('MERGEFIELD');
  });
});

