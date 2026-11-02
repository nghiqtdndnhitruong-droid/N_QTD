import { Request, Response } from 'express';
import { AppError } from '../../shared/errors';
import { LoanRepository } from '../loan/loan.repository';
import { getTemplatesByLoanType, findTemplateByKey } from './document-template.registry';
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
    const warnings = documentPlaceholderService.validateLoanForDocument(loan, templateDefs[0]?.code);

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

    if (!templateKey) {
      throw AppError.badRequest('Mã biểu mẫu templateKey không được để trống.');
    }

    const templateDef = findTemplateByKey(templateKey);
    if (!templateDef) {
      throw AppError.notFound(`Không tìm thấy mẫu biểu tài liệu với mã: ${templateKey}`);
    }

    const loan = await loanRepository.findById(loanId);
    if (!loan) {
      throw AppError.notFound(`Không tìm thấy thông tin khoản vay với ID: ${loanId}`);
    }

    // Kiểm tra tính hợp lệ của template với loại vay
    if (templateDef.loanType !== 'ALL' && loan.loanType !== templateDef.loanType) {
      throw AppError.badRequest(
        `Biểu mẫu "${templateDef.title}" chỉ áp dụng cho khoản vay ${templateDef.loanType}, hồ sơ hiện tại là ${loan.loanType}.`
      );
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

  /**
   * Xuất tài liệu hàng loạt:
   * - 0 file: Lỗi yêu cầu chọn ít nhất 1 file
   * - 1 file: Trả về trực tiếp file .docx
   * - Từ 2 file trở lên: Trả về file .zip đóng gói tất cả các file .docx
   */
  async exportBatch(req: Request, res: Response) {
    const loanId = Array.isArray(req.params.loanId) ? req.params.loanId[0] : req.params.loanId;
    const { templateKeys } = req.body || {};

    if (!Array.isArray(templateKeys) || templateKeys.length === 0) {
      throw AppError.badRequest('Vui lòng chọn ít nhất một biểu mẫu để xuất tài liệu.');
    }

    const loan = await loanRepository.findById(loanId);
    if (!loan) {
      throw AppError.notFound(`Không tìm thấy thông tin khoản vay với ID: ${loanId}`);
    }

    let result;
    if (templateKeys.length === 1) {
      result = await documentGeneratorService.generateDocument(loan, templateKeys[0]);
    } else {
      result = await documentGeneratorService.generateDocumentsZip(loan, templateKeys);
    }

    const { buffer, fileName, mimeType } = result;
    const encodedFileName = encodeURIComponent(fileName);

    res.setHeader('Content-Type', mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${fileName}"; filename*=UTF-8''${encodedFileName}`
    );
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

    res.send(buffer);
  }
}

export const documentController = new DocumentController();
