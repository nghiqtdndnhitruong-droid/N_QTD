export interface CreditCriterionOption {
  key: string;
  label: string;
  rawScore: number;
}

export interface CreditCriterionDefinition {
  id: string;
  number: number;
  group: 1 | 2;
  name: string;
  weight: number;
  weightPercentLabel: string;
  autoByAge?: boolean;
  options: CreditCriterionOption[];
}

export const CREDIT_SCORING_CRITERIA: CreditCriterionDefinition[] = [
  // ==================== NHÓM I (40% Tổng điểm) ====================
  {
    id: 'c1',
    number: 1,
    group: 1,
    name: 'Tuổi',
    weight: 0.1,
    weightPercentLabel: '10%',
    autoByAge: true,
    options: [
      { key: 'AGE_36_55', label: 'Từ 36 đến 55 tuổi', rawScore: 100 },
      { key: 'AGE_26_35', label: 'Từ 26 đến 35 tuổi', rawScore: 75 },
      { key: 'AGE_56_60', label: 'Từ 56 đến 60 tuổi', rawScore: 50 },
      { key: 'AGE_20_25', label: 'Từ 20 đến 25 tuổi', rawScore: 25 },
      { key: 'AGE_OVER_60', label: 'Trên 60 tuổi', rawScore: 0 },
      { key: 'AGE_18_20', label: 'Từ 18 đến dưới 20 tuổi', rawScore: 0 },
    ],
  },
  {
    id: 'c2',
    number: 2,
    group: 1,
    name: 'Trình độ',
    weight: 0.1,
    weightPercentLabel: '10%',
    options: [
      { key: 'EDU_UNI_COL', label: 'Đại học, cao đẳng', rawScore: 100 },
      { key: 'EDU_INTERMEDIATE', label: 'Trung cấp', rawScore: 75 },
      { key: 'EDU_HIGH_SCHOOL', label: 'Trung học phổ thông', rawScore: 50 },
      { key: 'EDU_SECONDARY', label: 'Trung học cơ sở', rawScore: 25 },
      { key: 'EDU_PRIMARY', label: 'Tiểu học', rawScore: 0 },
    ],
  },
  {
    id: 'c3',
    number: 3,
    group: 1,
    name: 'Tiền án, tiền sự',
    weight: 0.1,
    weightPercentLabel: '10%',
    options: [
      { key: 'CRIMINAL_NONE', label: 'Không', rawScore: 100 },
      { key: 'CRIMINAL_YES', label: 'Có', rawScore: 0 },
    ],
  },
  {
    id: 'c4',
    number: 4,
    group: 1,
    name: 'Sở hữu tài sản',
    weight: 0.1,
    weightPercentLabel: '10%',
    options: [
      { key: 'ASSET_INDIVIDUAL', label: 'Cá nhân', rawScore: 100 },
      { key: 'ASSET_HOUSEHOLD', label: 'Hộ gia đình', rawScore: 75 },
      { key: 'ASSET_OTHER', label: 'Khác', rawScore: 0 },
    ],
  },
  {
    id: 'c5',
    number: 5,
    group: 1,
    name: 'Số người ăn theo',
    weight: 0.1,
    weightPercentLabel: '10%',
    options: [
      { key: 'DEP_UNDER_3', label: 'Dưới 3 người', rawScore: 100 },
      { key: 'DEP_3', label: '3 người', rawScore: 75 },
      { key: 'DEP_4', label: '4 người', rawScore: 50 },
      { key: 'DEP_5', label: '5 người', rawScore: 25 },
      { key: 'DEP_OVER_5', label: 'Trên 5 người', rawScore: 0 },
    ],
  },
  {
    id: 'c6',
    number: 6,
    group: 1,
    name: 'Cơ cấu gia đình',
    weight: 0.1,
    weightPercentLabel: '10%',
    options: [
      { key: 'FAM_HEAD', label: 'Chủ hộ', rawScore: 100 },
      { key: 'FAM_PARENTS', label: 'Sống với cha mẹ', rawScore: 75 },
      { key: 'FAM_OTHER', label: 'Khác', rawScore: 50 },
    ],
  },
  {
    id: 'c7',
    number: 7,
    group: 1,
    name: 'Bảo hiểm',
    weight: 0.1,
    weightPercentLabel: '10%',
    options: [
      { key: 'INS_OVER_100M', label: 'Trên 100 triệu đồng', rawScore: 100 },
      { key: 'INS_50M_100M', label: 'Từ 50 đến 100 triệu đồng', rawScore: 75 },
      { key: 'INS_30M_50M', label: 'Từ 30 đến dưới 50 triệu đồng', rawScore: 50 },
      { key: 'INS_UNDER_30M', label: 'Dưới 30 triệu đồng', rawScore: 25 },
    ],
  },
  {
    id: 'c8',
    number: 8,
    group: 1,
    name: 'Tính chất công việc hiện tại',
    weight: 0.1,
    weightPercentLabel: '10%',
    options: [
      { key: 'JOB_MANAGER', label: 'Quản lý, điều hành', rawScore: 100 },
      { key: 'JOB_PROFESSIONAL', label: 'Chuyên môn, nghiệp vụ', rawScore: 75 },
      { key: 'JOB_SKILLED', label: 'Lao động được đào tạo nghề', rawScore: 50 },
      { key: 'JOB_SEASONAL', label: 'Lao động thời vụ', rawScore: 25 },
      { key: 'JOB_UNEMPLOYED', label: 'Thất nghiệp', rawScore: 0 },
    ],
  },
  {
    id: 'c9',
    number: 9,
    group: 1,
    name: 'Thời gian làm công việc hiện tại',
    weight: 0.1,
    weightPercentLabel: '10%',
    options: [
      { key: 'EXP_OVER_7Y', label: 'Trên 7 năm', rawScore: 100 },
      { key: 'EXP_5Y_7Y', label: 'Từ 5 đến 7 năm', rawScore: 75 },
      { key: 'EXP_3Y_5Y', label: 'Từ 3 đến dưới 5 năm', rawScore: 50 },
      { key: 'EXP_1Y_3Y', label: 'Từ 1 đến dưới 3 năm', rawScore: 25 },
      { key: 'EXP_UNDER_1Y', label: 'Dưới 1 năm', rawScore: 0 },
    ],
  },
  {
    id: 'c10',
    number: 10,
    group: 1,
    name: 'Rủi ro nghề nghiệp',
    weight: 0.1,
    weightPercentLabel: '10%',
    options: [
      { key: 'OCC_RISK_LOW', label: 'Thấp', rawScore: 100 },
      { key: 'OCC_RISK_MEDIUM', label: 'Trung bình', rawScore: 50 },
      { key: 'OCC_RISK_HIGH', label: 'Cao', rawScore: 0 },
    ],
  },

  // ==================== NHÓM II (60% Tổng điểm) ====================
  {
    id: 'c11',
    number: 11,
    group: 2,
    name: 'Thu nhập ròng ổn định hàng tháng',
    weight: 0.3,
    weightPercentLabel: '30%',
    options: [
      { key: 'INC_OVER_10M', label: 'Trên 10 triệu đồng', rawScore: 100 },
      { key: 'INC_5M_10M', label: 'Từ 5 đến 10 triệu đồng', rawScore: 75 },
      { key: 'INC_3M_5M', label: 'Từ 3 đến dưới 5 triệu đồng', rawScore: 50 },
      { key: 'INC_1M_3M', label: 'Từ 1 đến dưới 3 triệu đồng', rawScore: 25 },
      { key: 'INC_UNDER_1M', label: 'Dưới 1 triệu đồng', rawScore: 0 },
    ],
  },
  {
    id: 'c12',
    number: 12,
    group: 2,
    name: 'Tỷ lệ số tiền phải trả / thu nhập',
    weight: 0.3,
    weightPercentLabel: '30%',
    options: [
      { key: 'DTI_UNDER_30', label: 'Dưới 30%', rawScore: 100 },
      { key: 'DTI_30_45', label: 'Từ 30% đến 45%', rawScore: 75 },
      { key: 'DTI_45_60', label: 'Từ trên 45% đến 60%', rawScore: 50 },
      { key: 'DTI_60_75', label: 'Từ trên 60% đến 75%', rawScore: 25 },
      { key: 'DTI_OVER_75', label: 'Trên 75%', rawScore: 0 },
    ],
  },
  {
    id: 'c13',
    number: 13,
    group: 2,
    name: 'Tình hình trả nợ gốc và lãi',
    weight: 0.25,
    weightPercentLabel: '25%',
    options: [
      { key: 'REP_ONTIME', label: 'Luôn trả nợ đúng hạn', rawScore: 100 },
      { key: 'REP_EXTENDED_GOOD', label: 'Đã bị gia hạn nợ, hiện trả nợ tốt', rawScore: 75 },
      { key: 'REP_OVERDUE_OR_NEW', label: 'Đã có nợ quá hạn/khách hàng mới', rawScore: 50 },
      { key: 'REP_UNSTABLE', label: 'Đã có nợ quá hạn, khả năng trả nợ không ổn định', rawScore: 25 },
      { key: 'REP_CURRENT_OVERDUE', label: 'Hiện đang có nợ quá hạn', rawScore: 0 },
    ],
  },
  {
    id: 'c14',
    number: 14,
    group: 2,
    name: 'Các dịch vụ sử dụng',
    weight: 0.15,
    weightPercentLabel: '15%',
    options: [
      { key: 'SRV_DEPOSIT_AND_OTHER', label: 'Tiền gửi và các dịch vụ khác', rawScore: 100 },
      { key: 'SRV_PAYMENT_ONLY', label: 'Chỉ sử dụng dịch vụ thanh toán', rawScore: 75 },
      { key: 'SRV_NONE', label: 'Không sử dụng', rawScore: 0 },
    ],
  },
];

export const CREDIT_RANK_TABLE = [
  { rangeLabel: 'Từ 95 trở lên', rank: 'AAA', riskLevel: 'Rủi ro thấp', min: 95, max: 100.01 },
  { rangeLabel: '90 đến dưới 95', rank: 'AA', riskLevel: 'Rủi ro thấp', min: 90, max: 95 },
  { rangeLabel: '85 đến dưới 90', rank: 'A', riskLevel: 'Rủi ro thấp', min: 85, max: 90 },
  { rangeLabel: '80 đến dưới 85', rank: 'BBB', riskLevel: 'Rủi ro trung bình', min: 80, max: 85 },
  { rangeLabel: '70 đến dưới 80', rank: 'BB', riskLevel: 'Rủi ro trung bình', min: 70, max: 80 },
  { rangeLabel: '60 đến dưới 70', rank: 'B', riskLevel: 'Rủi ro trung bình', min: 60, max: 70 },
  { rangeLabel: '50 đến dưới 60', rank: 'CCC', riskLevel: 'Rủi ro cao', min: 50, max: 60 },
  { rangeLabel: '40 đến dưới 50', rank: 'CC', riskLevel: 'Rủi ro cao', min: 40, max: 50 },
  { rangeLabel: '35 đến dưới 40', rank: 'C', riskLevel: 'Rủi ro cao', min: 35, max: 40 },
  { rangeLabel: 'Dưới 35', rank: 'D', riskLevel: 'Rủi ro cao', min: -1, max: 35 },
] as const;

export function getAutoAgeOptionKey(yearOfBirth: number): string {
  const age = new Date().getFullYear() - yearOfBirth;
  if (age >= 36 && age <= 55) return 'AGE_36_55';
  if (age >= 26 && age <= 35) return 'AGE_26_35';
  if (age >= 56 && age <= 60) return 'AGE_56_60';
  if (age >= 20 && age <= 25) return 'AGE_20_25';
  if (age > 60) return 'AGE_OVER_60';
  return 'AGE_18_20';
}

export function buildDefaultCreditSelections(
  yearOfBirth: number,
  savedSelections?: Record<string, string> | null,
): Record<string, string> {
  const defaults: Record<string, string> = {};
  for (const c of CREDIT_SCORING_CRITERIA) {
    if (c.id === 'c1') {
      defaults[c.id] = savedSelections?.[c.id] || getAutoAgeOptionKey(yearOfBirth);
    } else {
      const savedKey = savedSelections?.[c.id];
      const hasValidSaved = c.options.some((o) => o.key === savedKey);
      defaults[c.id] = hasValidSaved && savedKey ? savedKey : (c.options[0]?.key ?? '');
    }
  }
  return defaults;
}

export function computeCreditScoringResult(selections: Record<string, string>) {
  const items = CREDIT_SCORING_CRITERIA.map((criterion) => {
    const selectedKey = selections[criterion.id];
    const matched =
      criterion.options.find((o) => o.key === selectedKey) ?? criterion.options[0]!;
    const weightedScore = Number((matched.rawScore * criterion.weight).toFixed(2));
    return {
      criterionId: criterion.id,
      number: criterion.number,
      group: criterion.group,
      name: criterion.name,
      optionKey: matched.key,
      optionLabel: matched.label,
      rawScore: matched.rawScore,
      weight: criterion.weight,
      weightedScore,
    };
  });

  const group1Score = Number(
    Math.min(
      100,
      items.filter((i) => i.group === 1).reduce((s, i) => s + i.weightedScore, 0),
    ).toFixed(2),
  );
  const group2Score = Number(
    Math.min(
      100,
      items.filter((i) => i.group === 2).reduce((s, i) => s + i.weightedScore, 0),
    ).toFixed(2),
  );
  const totalScore = Number((group1Score * 0.4 + group2Score * 0.6).toFixed(2));

  const matchedTier =
    CREDIT_RANK_TABLE.find((t) => totalScore >= t.min && totalScore < t.max) ??
    CREDIT_RANK_TABLE[CREDIT_RANK_TABLE.length - 1]!;

  return {
    items,
    group1Score,
    group2Score,
    group1Weighted: Number((group1Score * 0.4).toFixed(2)),
    group2Weighted: Number((group2Score * 0.6).toFixed(2)),
    totalScore,
    rank: matchedTier.rank,
    riskLevel: matchedTier.riskLevel,
  };
}

