import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import dayjs from 'dayjs';
import { Member } from '@prisma/client';
import { AppError } from '../../shared/errors/app-error';

export interface CriterionOption {
  key: string;
  label: string;
  wordLabel: string; // Nhãn điền vào file Word
  rawScore: number; // Điểm gốc: 100 | 75 | 50 | 25 | 0
}

export interface CriterionDefinition {
  id: string; // c1 .. c14
  number: number; // 1 .. 14
  group: 1 | 2;
  name: string;
  weight: number; // Trọng số trong nhóm (VD: 0.10, 0.30, 0.25, 0.15)
  mergeFieldLabel: string; // Tên MERGEFIELD nhãn trong file Word
  mergeFieldScore: string; // Tên MERGEFIELD điểm trong file Word (Đ1..Đ14)
  options: CriterionOption[];
}

export const CREDIT_RATING_CRITERIA: CriterionDefinition[] = [
  // ==================== NHÓM I (40% tổng điểm, mỗi tiêu chí 10%) ====================
  {
    id: 'c1',
    number: 1,
    group: 1,
    name: 'Tuổi',
    weight: 0.1,
    mergeFieldLabel: 'Tuổi',
    mergeFieldScore: 'Đ1',
    options: [
      { key: 'AGE_36_55', label: 'Từ 36 đến 55 tuổi', wordLabel: 'Từ 36 đến 55 tuổi', rawScore: 100 },
      { key: 'AGE_26_35', label: 'Từ 26 đến 35 tuổi', wordLabel: 'Từ 26 đến 35 tuổi', rawScore: 75 },
      { key: 'AGE_56_60', label: 'Từ 56 đến 60 tuổi', wordLabel: 'Từ 56 đến 60 tuổi', rawScore: 50 },
      { key: 'AGE_20_25', label: 'Từ 20 đến 25 tuổi', wordLabel: 'Từ 20 đến 25 tuổi', rawScore: 25 },
      {
        key: 'AGE_OVER_60',
        label: 'Trên 60 tuổi',
        wordLabel: 'Trên 60 tuổi',
        rawScore: 0,
      },
      {
        key: 'AGE_18_20',
        label: 'Từ 18 đến dưới 20 tuổi',
        wordLabel: 'Từ 18 đến dưới 20 tuổi',
        rawScore: 0,
      },
    ],
  },
  {
    id: 'c2',
    number: 2,
    group: 1,
    name: 'Trình độ',
    weight: 0.1,
    mergeFieldLabel: 'Trình__độ',
    mergeFieldScore: 'Đ2',
    options: [
      { key: 'EDU_UNI_COL', label: 'Đại học, cao đẳng', wordLabel: 'Đại học, cao đẳng', rawScore: 100 },
      { key: 'EDU_INTERMEDIATE', label: 'Trung cấp', wordLabel: 'Trung cấp', rawScore: 75 },
      { key: 'EDU_HIGH_SCHOOL', label: 'Trung học phổ thông', wordLabel: 'Trung học phổ thông', rawScore: 50 },
      { key: 'EDU_SECONDARY', label: 'Trung học cơ sở', wordLabel: 'Trung học cơ sở', rawScore: 25 },
      { key: 'EDU_PRIMARY', label: 'Tiểu học', wordLabel: 'Tiểu học', rawScore: 0 },
    ],
  },
  {
    id: 'c3',
    number: 3,
    group: 1,
    name: 'Tiền án, tiền sự',
    weight: 0.1,
    mergeFieldLabel: 'Tiền_án__tiền_Sự',
    mergeFieldScore: 'Đ3',
    options: [
      { key: 'CRIMINAL_NONE', label: 'Không', wordLabel: 'Không', rawScore: 100 },
      { key: 'CRIMINAL_YES', label: 'Có', wordLabel: 'Có', rawScore: 0 },
    ],
  },
  {
    id: 'c4',
    number: 4,
    group: 1,
    name: 'Sở hữu tài sản',
    weight: 0.1,
    mergeFieldLabel: 'Sở_hữu__tài_sản',
    mergeFieldScore: 'Đ4',
    options: [
      { key: 'ASSET_INDIVIDUAL', label: 'Cá nhân', wordLabel: 'Cá nhân', rawScore: 100 },
      { key: 'ASSET_HOUSEHOLD', label: 'Hộ gia đình', wordLabel: 'Hộ gia đình', rawScore: 75 },
      { key: 'ASSET_OTHER', label: 'Khác', wordLabel: 'Khác', rawScore: 0 },
    ],
  },
  {
    id: 'c5',
    number: 5,
    group: 1,
    name: 'Số người ăn theo',
    weight: 0.1,
    mergeFieldLabel: 'Sốngườiăn_theo',
    mergeFieldScore: 'Đ5',
    options: [
      { key: 'DEP_UNDER_3', label: 'Dưới 3 người', wordLabel: 'Dưới 3 người', rawScore: 100 },
      { key: 'DEP_3', label: '3 người', wordLabel: '3 người', rawScore: 75 },
      { key: 'DEP_4', label: '4 người', wordLabel: '4 người', rawScore: 50 },
      { key: 'DEP_5', label: '5 người', wordLabel: '5 người', rawScore: 25 },
      { key: 'DEP_OVER_5', label: 'Trên 5 người', wordLabel: 'Trên 5 người', rawScore: 0 },
    ],
  },
  {
    id: 'c6',
    number: 6,
    group: 1,
    name: 'Cơ cấu gia đình',
    weight: 0.1,
    mergeFieldLabel: 'Cơcấu_gia_đình',
    mergeFieldScore: 'Đ6',
    options: [
      { key: 'FAM_HEAD', label: 'Chủ hộ', wordLabel: 'Chủ hộ', rawScore: 100 },
      { key: 'FAM_PARENTS', label: 'Sống với cha mẹ', wordLabel: 'Sống với cha mẹ', rawScore: 75 },
      { key: 'FAM_OTHER', label: 'Khác', wordLabel: 'Khác', rawScore: 50 },
    ],
  },
  {
    id: 'c7',
    number: 7,
    group: 1,
    name: 'Bảo hiểm',
    weight: 0.1,
    mergeFieldLabel: 'Bảo_hiểm',
    mergeFieldScore: 'Đ7',
    options: [
      { key: 'INS_OVER_100M', label: 'Trên 100 triệu đồng', wordLabel: 'Trên 100 triệu đồng', rawScore: 100 },
      { key: 'INS_50M_100M', label: 'Từ 50 đến 100 triệu đồng', wordLabel: 'Từ 50 đến 100 triệu đồng', rawScore: 75 },
      { key: 'INS_30M_50M', label: 'Từ 30 đến dưới 50 triệu đồng', wordLabel: 'Từ 30 đến dưới 50 triệu đồng', rawScore: 50 },
      { key: 'INS_UNDER_30M', label: 'Dưới 30 triệu đồng', wordLabel: 'Dưới 30 triệu đồng', rawScore: 25 },
    ],
  },
  {
    id: 'c8',
    number: 8,
    group: 1,
    name: 'Tính chất công việc hiện tại',
    weight: 0.1,
    mergeFieldLabel: 'Tínhchất_công_việc_hiện_tại',
    mergeFieldScore: 'Đ8',
    options: [
      { key: 'JOB_MANAGER', label: 'Quản lý, điều hành', wordLabel: 'Quản lý, điều hành', rawScore: 100 },
      { key: 'JOB_PROFESSIONAL', label: 'Chuyên môn, nghiệp vụ', wordLabel: 'Chuyên môn, nghiệp vụ', rawScore: 75 },
      { key: 'JOB_SKILLED', label: 'Lao động được đào tạo nghề', wordLabel: 'Lao động được đào tạo nghề', rawScore: 50 },
      { key: 'JOB_SEASONAL', label: 'Lao động thời vụ', wordLabel: 'Lao động thời vụ', rawScore: 25 },
      { key: 'JOB_UNEMPLOYED', label: 'Thất nghiệp', wordLabel: 'Thất nghiệp', rawScore: 0 },
    ],
  },
  {
    id: 'c9',
    number: 9,
    group: 1,
    name: 'Thời gian làm công việc hiện tại',
    weight: 0.1,
    mergeFieldLabel: 'Thờigian_làm_công_việc_hiện_tại',
    mergeFieldScore: 'Đ9',
    options: [
      { key: 'EXP_OVER_7Y', label: 'Trên 7 năm', wordLabel: 'Trên 7 năm', rawScore: 100 },
      { key: 'EXP_5Y_7Y', label: 'Từ 5 đến 7 năm', wordLabel: 'Từ 5 đến 7 năm', rawScore: 75 },
      { key: 'EXP_3Y_5Y', label: 'Từ 3 đến dưới 5 năm', wordLabel: 'Từ 3 đến dưới 5 năm', rawScore: 50 },
      { key: 'EXP_1Y_3Y', label: 'Từ 1 đến dưới 3 năm', wordLabel: 'Từ 1 đến dưới 3 năm', rawScore: 25 },
      { key: 'EXP_UNDER_1Y', label: 'Dưới 1 năm', wordLabel: 'Dưới 1 năm', rawScore: 0 },
    ],
  },
  {
    id: 'c10',
    number: 10,
    group: 1,
    name: 'Rủi ro nghề nghiệp',
    weight: 0.1,
    mergeFieldLabel: 'Rủironghề_nghiệp',
    mergeFieldScore: 'Đ10',
    options: [
      { key: 'OCC_RISK_LOW', label: 'Thấp', wordLabel: 'Thấp', rawScore: 100 },
      { key: 'OCC_RISK_MEDIUM', label: 'Trung bình', wordLabel: 'Trung bình', rawScore: 50 },
      { key: 'OCC_RISK_HIGH', label: 'Cao', wordLabel: 'Cao', rawScore: 0 },
    ],
  },

  // ==================== NHÓM II (60% tổng điểm) ====================
  {
    id: 'c11',
    number: 11,
    group: 2,
    name: 'Thu nhập ròng ổn định hàng tháng',
    weight: 0.3,
    mergeFieldLabel: 'Thunhập_ròng_ổn_định_hàng_tháng',
    mergeFieldScore: 'Đ11',
    options: [
      { key: 'INC_OVER_10M', label: 'Trên 10 triệu đồng', wordLabel: 'Trên 10 triệu đồng', rawScore: 100 },
      { key: 'INC_5M_10M', label: 'Từ 5 đến 10 triệu đồng', wordLabel: 'Từ 5 đến 10 triệu đồng', rawScore: 75 },
      { key: 'INC_3M_5M', label: 'Từ 3 đến dưới 5 triệu đồng', wordLabel: 'Từ 3 đến dưới 5 triệu đồng', rawScore: 50 },
      { key: 'INC_1M_3M', label: 'Từ 1 đến dưới 3 triệu đồng', wordLabel: 'Từ 1 đến dưới 3 triệu đồng', rawScore: 25 },
      { key: 'INC_UNDER_1M', label: 'Dưới 1 triệu đồng', wordLabel: 'Dưới 1 triệu đồng', rawScore: 0 },
    ],
  },
  {
    id: 'c12',
    number: 12,
    group: 2,
    name: 'Tỷ lệ số tiền phải trả / thu nhập',
    weight: 0.3,
    mergeFieldLabel: 'Tỷlệsốtiền_phảitrảthu_nhập',
    mergeFieldScore: 'Đ12',
    options: [
      { key: 'DTI_UNDER_30', label: 'Dưới 30%', wordLabel: 'Dưới 30%', rawScore: 100 },
      { key: 'DTI_30_45', label: 'Từ 30% đến 45%', wordLabel: 'Từ 30% đến 45%', rawScore: 75 },
      { key: 'DTI_45_60', label: 'Từ trên 45% đến 60%', wordLabel: 'Từ trên 45% đến 60%', rawScore: 50 },
      { key: 'DTI_60_75', label: 'Từ trên 60% đến 75%', wordLabel: 'Từ trên 60% đến 75%', rawScore: 25 },
      { key: 'DTI_OVER_75', label: 'Trên 75%', wordLabel: 'Trên 75%', rawScore: 0 },
    ],
  },
  {
    id: 'c13',
    number: 13,
    group: 2,
    name: 'Tình hình trả nợ gốc và lãi',
    weight: 0.25,
    mergeFieldLabel: 'Tìnhhìnhtrả_nợgốcvàlãi',
    mergeFieldScore: 'Đ13',
    options: [
      { key: 'REP_ONTIME', label: 'Luôn trả nợ đúng hạn', wordLabel: 'Luôn trả nợ đúng hạn', rawScore: 100 },
      {
        key: 'REP_EXTENDED_GOOD',
        label: 'Đã bị gia hạn nợ, hiện trả nợ tốt',
        wordLabel: 'Đã bị gia hạn nợ, hiện trả nợ tốt',
        rawScore: 75,
      },
      {
        key: 'REP_OVERDUE_OR_NEW',
        label: 'Đã có nợ quá hạn/khách hàng mới',
        wordLabel: 'Đã có nợ quá hạn/khách hàng mới',
        rawScore: 50,
      },
      {
        key: 'REP_UNSTABLE',
        label: 'Đã có nợ quá hạn, khả năng trả nợ không ổn định',
        wordLabel: 'Đã có nợ quá hạn, khả năng trả nợ không ổn định',
        rawScore: 25,
      },
      { key: 'REP_CURRENT_OVERDUE', label: 'Hiện đang có nợ quá hạn', wordLabel: 'Hiện đang có nợ quá hạn', rawScore: 0 },
    ],
  },
  {
    id: 'c14',
    number: 14,
    group: 2,
    name: 'Các dịch vụ sử dụng',
    weight: 0.15,
    mergeFieldLabel: 'Cácdịchvụ_sử_dụng',
    mergeFieldScore: 'Đ14',
    options: [
      {
        key: 'SRV_DEPOSIT_AND_OTHER',
        label: 'Tiền gửi và các dịch vụ khác',
        wordLabel: 'Tiền gửi và các dịch vụ khác',
        rawScore: 100,
      },
      {
        key: 'SRV_PAYMENT_ONLY',
        label: 'Chỉ sử dụng dịch vụ thanh toán',
        wordLabel: 'Chỉ sử dụng dịch vụ thanh toán',
        rawScore: 75,
      },
      { key: 'SRV_NONE', label: 'Không sử dụng', wordLabel: 'Không sử dụng', rawScore: 0 },
    ],
  },
];

export function resolveAgeCriterionKey(yearOfBirth: number, currentYear = new Date().getFullYear()): string {
  const age = currentYear - yearOfBirth;
  if (age >= 36 && age <= 55) return 'AGE_36_55';
  if (age >= 26 && age <= 35) return 'AGE_26_35';
  if (age >= 56 && age <= 60) return 'AGE_56_60';
  if (age >= 20 && age <= 25) return 'AGE_20_25';
  if (age > 60) return 'AGE_OVER_60';
  return 'AGE_18_20';
}

export function resolveCreditRankAndRisk(totalScore: number): {
  rank: string;
  riskLevel: string;
} {
  if (totalScore >= 95) return { rank: 'AAA', riskLevel: 'Rủi ro thấp' };
  if (totalScore >= 90) return { rank: 'AA', riskLevel: 'Rủi ro thấp' };
  if (totalScore >= 85) return { rank: 'A', riskLevel: 'Rủi ro thấp' };
  if (totalScore >= 80) return { rank: 'BBB', riskLevel: 'Rủi ro trung bình' };
  if (totalScore >= 70) return { rank: 'BB', riskLevel: 'Rủi ro trung bình' };
  if (totalScore >= 60) return { rank: 'B', riskLevel: 'Rủi ro trung bình' };
  if (totalScore >= 50) return { rank: 'CCC', riskLevel: 'Rủi ro cao' };
  if (totalScore >= 40) return { rank: 'CC', riskLevel: 'Rủi ro cao' };
  if (totalScore >= 35) return { rank: 'C', riskLevel: 'Rủi ro cao' };
  return { rank: 'D', riskLevel: 'Rủi ro cao' };
}

export interface CalculatedCreditScore {
  selections: Record<string, string>;
  items: {
    id: string;
    number: number;
    group: 1 | 2;
    name: string;
    optionKey: string;
    optionLabel: string;
    wordLabel: string;
    rawScore: number;
    weight: number;
    weightedScore: number;
  }[];
  group1Score: number;
  group2Score: number;
  totalScore: number;
  rank: string;
  riskLevel: string;
}

export function calculateMemberCreditScore(
  yearOfBirth: number,
  inputSelections: Record<string, string>,
): CalculatedCreditScore {
  const autoAgeKey = resolveAgeCriterionKey(yearOfBirth);
  const normalizedSelections: Record<string, string> = {
    ...inputSelections,
    c1: inputSelections.c1 || autoAgeKey,
  };

  const items = CREDIT_RATING_CRITERIA.map((criterion) => {
    const selectedKey = normalizedSelections[criterion.id];
    const matchedOption =
      criterion.options.find((opt) => opt.key === selectedKey) ?? criterion.options[0]!;
    normalizedSelections[criterion.id] = matchedOption.key;

    const weightedScore = Number((matchedOption.rawScore * criterion.weight).toFixed(2));
    return {
      id: criterion.id,
      number: criterion.number,
      group: criterion.group,
      name: criterion.name,
      optionKey: matchedOption.key,
      optionLabel: matchedOption.label,
      wordLabel: matchedOption.wordLabel,
      rawScore: matchedOption.rawScore,
      weight: criterion.weight,
      weightedScore,
    };
  });

  const group1Score = Number(
    Math.min(
      100,
      items.filter((i) => i.group === 1).reduce((sum, i) => sum + i.weightedScore, 0),
    ).toFixed(2),
  );

  const group2Score = Number(
    Math.min(
      100,
      items.filter((i) => i.group === 2).reduce((sum, i) => sum + i.weightedScore, 0),
    ).toFixed(2),
  );

  const totalScore = Number((group1Score * 0.4 + group2Score * 0.6).toFixed(2));
  const { rank, riskLevel } = resolveCreditRankAndRisk(totalScore);

  return {
    selections: normalizedSelections,
    items,
    group1Score,
    group2Score,
    totalScore,
    rank,
    riskLevel,
  };
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatScoreNumber(num: number): string {
  return Number.isInteger(num) ? String(num) : String(Number(num.toFixed(2)));
}

/**
 * Tìm đường dẫn tới file mẫu Word trong thư mục template/rank
 */
function resolveRankTemplatePath(): string {
  const candidates = [
    path.resolve(process.cwd(), 'template/rank'),
    path.resolve(process.cwd(), '../template/rank'),
  ];

  for (const dir of candidates) {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.docx') && !f.startsWith('~$'));
      if (files.length > 0) {
        return path.join(dir, files[0]!);
      }
    }
  }

  throw AppError.notFound('Không tìm thấy file mẫu Word chấm điểm trong thư mục template/rank');
}

/**
 * Xuất file Word (.docx) Bảng chấm điểm xếp hạng tín dụng cho thành viên
 */
export function generateMemberCreditRatingDocx(
  member: Member,
  scoreResult: CalculatedCreditScore,
): Buffer {
  const templatePath = resolveRankTemplatePath();
  const templateBuffer = fs.readFileSync(templatePath);
  const zip = new PizZip(templateBuffer);
  const docFile = zip.file('word/document.xml');

  if (!docFile) {
    throw AppError.internal('File mẫu Word trong template/rank không hợp lệ (thiếu word/document.xml)');
  }

  let xml = docFile.asText();

  // Xây dựng bản đồ ánh xạ từ tên MERGEFIELD sang giá trị cần điền
  const mergeMap: Record<string, string> = {
    'Tên': member.fullName,
    'Địa__chỉ': member.address,
    'CC_CD': member.idNumber,
    'TỔNG': formatScoreNumber(scoreResult.totalScore),
    'Loại_': scoreResult.rank,
    'kết_luận': scoreResult.riskLevel.toLowerCase(),
  };

  for (const criterion of CREDIT_RATING_CRITERIA) {
    const item = scoreResult.items.find((i) => i.id === criterion.id);
    if (item) {
      mergeMap[criterion.mergeFieldLabel] = item.wordLabel;
      mergeMap[criterion.mergeFieldScore] = formatScoreNumber(item.weightedScore);
    }
  }

  // Thay thế toàn bộ khối MERGEFIELD (từ <w:fldChar w:fldCharType="begin"/> đến <w:fldChar w:fldCharType="end"/>)
  const fieldBlockRegex =
    /<w:r\b[^>]*>\s*(?:<w:rPr>[\s\S]*?<\/w:rPr>\s*)?<w:fldChar\s+w:fldCharType="begin"\s*\/>\s*<\/w:r>([\s\S]*?)<w:r\b[^>]*>\s*(?:<w:rPr>[\s\S]*?<\/w:rPr>\s*)?<w:fldChar\s+w:fldCharType="end"\s*\/>\s*<\/w:r>/g;

  xml = xml.replace(fieldBlockRegex, (fullMatch, innerXml: string) => {
    const instrText = [...innerXml.matchAll(/<w:instrText[^>]*>([\s\S]*?)<\/w:instrText>/g)]
      .map((m) => m[1])
      .join('')
      .trim();

    const fieldNameMatch = instrText.match(/MERGEFIELD\s+"?([^"\s]+)"?/i);
    const fieldName = fieldNameMatch?.[1]?.trim();

    if (fieldName && Object.prototype.hasOwnProperty.call(mergeMap, fieldName)) {
      const val = escapeXml(mergeMap[fieldName] ?? '');
      return `<w:r><w:rPr><w:noProof/></w:rPr><w:t xml:space="preserve">${val}</w:t></w:r>`;
    }

    return fullMatch;
  });

  // Điền ngày tháng năm hiện tại vào dòng "Nhị Trường, ngày…… tháng…. năm 2026"
  const now = dayjs();
  const dd = now.format('DD');
  const mm = now.format('MM');
  const yyyy = now.format('YYYY');

  xml = xml.replace(
    /<w:r><w:rPr><w:i\/><w:szCs w:val="28"\/><\/w:rPr><w:t>Nhị Trường, ngày<\/w:t><\/w:r>[\s\S]*?<w:r[^>]*><w:rPr><w:i\/><w:szCs w:val="28"\/><\/w:rPr><w:t>6<\/w:t><\/w:r>/,
    `<w:r><w:rPr><w:i/><w:szCs w:val="28"/></w:rPr><w:t>Nhị Trường, ngày ${dd} tháng ${mm} năm ${yyyy}</w:t></w:r>`,
  );

  zip.file('word/document.xml', xml);
  return zip.generate({ type: 'nodebuffer' });
}

