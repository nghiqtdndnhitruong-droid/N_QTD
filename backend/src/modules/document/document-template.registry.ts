import fs from 'fs';
import path from 'path';
import { LoanType } from '@prisma/client';
import { DocumentTemplateDefinition } from './document.types';

/**
 * Chuyển đổi chuỗi tiếng Việt có dấu thành dạng slug ASCII không dấu, ngăn cách bởi gạch dưới.
 */
function toAsciiSuffix(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Lấy đường dẫn thư mục gốc template_qtd
 */
export function getTemplateQtdPath(): string {
  const candidates = [
    path.resolve(process.cwd(), 'template_qtd'),
    path.resolve(process.cwd(), '..', 'template_qtd'),
    path.resolve(__dirname, '..', '..', '..', '..', 'template_qtd'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      return candidate;
    }
  }
  return path.resolve(process.cwd(), 'template_qtd');
}

/**
 * Phân loại loại vay dựa trên quy tắc tên file:
 * - Tên chứa "thế chấp" -> THE_CHAP
 * - Tên chứa "tín chấp" -> TIN_CHAP
 * - Không chứa cả 2 -> ALL (dùng chung)
 */
export function classifyLoanTypeFromFileName(fileName: string): LoanType | 'ALL' {
  const lower = fileName.toLowerCase().normalize('NFC');
  const isTheChap = lower.includes('thế chấp') || lower.includes('the chap');
  const isTinChap = lower.includes('tín chấp') || lower.includes('tin chap');

  if (isTheChap) return LoanType.THE_CHAP;
  if (isTinChap) return LoanType.TIN_CHAP;
  return 'ALL';
}

/**
 * Quét toàn bộ file biểu mẫu trong thư mục template_qtd.
 * Tự động phát hiện khi có file mới được thêm vào mà không cần cấu hình cứng.
 */
export function scanTemplateQtd(): DocumentTemplateDefinition[] {
  const rootDir = getTemplateQtdPath();
  if (!fs.existsSync(rootDir)) {
    return [];
  }

  const entries = fs.readdirSync(rootDir);
  const docxFiles = entries
    .filter((f) => f.endsWith('.docx') && !f.startsWith('~$'))
    .sort((a, b) => a.localeCompare(b, 'vi', { numeric: true }));

  const results: DocumentTemplateDefinition[] = [];

  for (const fileName of docxFiles) {
    const fullPath = path.join(rootDir, fileName);
    const title = fileName.replace(/\.docx$/i, '');
    const loanType = classifyLoanTypeFromFileName(fileName);
    const key = Buffer.from(fileName, 'utf8').toString('base64url');
    const code = toAsciiSuffix(title).toUpperCase();
    const outputSuffix = toAsciiSuffix(title);

    let description = '';
    if (loanType === LoanType.THE_CHAP) {
      description = `Biểu mẫu chuyên biệt cho hồ sơ vay vốn thế chấp.`;
    } else if (loanType === LoanType.TIN_CHAP) {
      description = `Biểu mẫu chuyên biệt cho hồ sơ vay vốn tín chấp.`;
    } else {
      description = `Biểu mẫu dùng chung cho cả khoản vay thế chấp và tín chấp.`;
    }

    results.push({
      key,
      code,
      title,
      description,
      loanType,
      fileName,
      outputSuffix,
      filePath: fullPath,
    });
  }

  return results;
}

/**
 * Lấy danh sách template phù hợp với loại vay:
 * - Vay thế chấp: Hiển thị các template có chữ "thế chấp" + template dùng chung
 * - Vay tín chấp: Hiển thị các template có chữ "tín chấp" + template dùng chung
 */
export function getTemplatesByLoanType(loanType: LoanType): DocumentTemplateDefinition[] {
  const allTemplates = scanTemplateQtd();
  return allTemplates.filter((t) => t.loanType === 'ALL' || t.loanType === loanType);
}

/**
 * Tìm định nghĩa biểu mẫu theo key (base64url) hoặc tên file gốc
 */
export function findTemplateByKey(keyOrFileName: string): DocumentTemplateDefinition | undefined {
  const allTemplates = scanTemplateQtd();
  return allTemplates.find(
    (t) =>
      t.key === keyOrFileName ||
      t.fileName === keyOrFileName ||
      t.code === keyOrFileName.toUpperCase()
  );
}
