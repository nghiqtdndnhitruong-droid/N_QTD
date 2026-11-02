import { Request, Response } from 'express';
import { AppError } from '../../shared/errors';
import { LoanRepository } from '../loan/loan.repository';
import { getTemplatesByLoanType, DOCUMENT_TEMPLATES } from './document-template.registry';
import { documentPlaceholderService } from './document-placeholder.service';
import { documentGeneratorService } from './document-generator.service';
import { DocumentTemplateKey, GetLoanTemplatesResult } from './document.types';

const loanRepository = new LoanRepository();

export class DocumentController {
  /**
   * Lấy danh sách các biểu mẫu Word khả dụng cho khoản vay
   */
  async getTemplates(req: Request, res: Response) {
    const loanId = Array.isArray(req.params.loanId) ? req.params.loanId[0] : req.params.loanId;
    const loan = await loanRepository.findById(loanId);
    if (!loan) {
      throw AppError.notFound(`Không tìm thấy thông tin khoản vay với ID: ${loanId}`);
    }

    const templateDefs = getTemplatesByLoanType(loan.loanType);

    const safeContractNumber = (loan.contractNumber || `LOAN-${loan.id.slice(-6)}`)
      .replace(/[\/\\?%*:|"<>]/g, '-')
      .replace(/\s+/g, '_');

    const templateItems = templateDefs.map((t) => ({
      key: t.key,
      code: t.code,
      title: t.title,
      description: t.description,
      loanType: t.loanType,
      fileName: t.fileName,
      suggestedFileName: `${safeContractNumber}_${t.outputSuffix}.docx`,
    }));

    // Lấy danh sách cảnh báo thiếu trường (nếu có)
    const warnings = documentPlaceholderService.validateLoanForDocument(loan, templateDefs[0]?.key || 'TC1');

    const result: GetLoanTemplatesResult = {
      loanId: loan.id,
      loanType: loan.loanType,
      contractNumber: loan.contractNumber,
      templates: templateItems,
      warnings,
    };

    res.status(200).json({
      success: true,
      data: result,
    });
  }

  /**
   * Tạo và tải về file Word hoàn chỉnh từ template
   */
  async generate(req: Request, res: Response) {
    const loanId = Array.isArray(req.params.loanId) ? req.params.loanId[0] : req.params.loanId;
    const templateKey = (req.query.templateKey || req.params.templateKey) as DocumentTemplateKey;

    if (!templateKey || !DOCUMENT_TEMPLATES[templateKey]) {
      throw AppError.badRequest(
        `Mã biểu mẫu templateKey không hợp lệ hoặc bị thiếu. Các mã hợp lệ: ${Object.keys(DOCUMENT_TEMPLATES).join(', ')}`
      );
    }

    const loan = await loanRepository.findById(loanId);
    if (!loan) {
      throw AppError.notFound(`Không tìm thấy thông tin khoản vay với ID: ${loanId}`);
    }

    const { buffer, fileName, mimeType } = await documentGeneratorService.generateDocument(loan, templateKey);

    // Encode header Content-Disposition cho tiếng Việt và các ký tự đặc biệt
    const encodedFileName = encodeURIComponent(fileName);

    res.setHeader('Content-Type', mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${fileName}"; filename*=UTF-8''${encodedFileName}`
    );
    res.setHeader('Content-Length', buffer.length);

    res.send(buffer);
  }
}

export const documentController = new DocumentController();
