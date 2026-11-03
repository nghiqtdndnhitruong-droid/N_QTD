import { Request, Response, NextFunction } from 'express';
import { wordTemplateService } from './word-template.service';
import { wordTemplateDataDictionaryService } from './word-template-data-dictionary.service';
import {
  createWordTemplateSchema,
  updateWordTemplateSchema,
  saveMappingsSchema,
  previewTemplateSchema,
  exportLoanDocumentsSchema,
} from './word-template.validator';
import { AppError } from '../../shared/errors';

function getParamId(req: Request): string {
  const raw = req.params.id;
  return Array.isArray(raw) ? raw[0] : String(raw);
}

export class WordTemplateController {
  public async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { category, loanTypeScope, isActive, search } = req.query;
      const templates = await wordTemplateService.getTemplates({
        category: category ? String(category) : undefined,
        loanTypeScope: loanTypeScope ? String(loanTypeScope) : undefined,
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
        search: search ? String(search) : undefined,
      });

      res.json({
        success: true,
        data: templates,
      });
    } catch (err) {
      next(err);
    }
  }

  public async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParamId(req);
      const template = await wordTemplateService.getTemplateById(id);
      res.json({
        success: true,
        data: template,
      });
    } catch (err) {
      next(err);
    }
  }

  public async getDataSources(_req: Request, res: Response, next: NextFunction) {
    try {
      const dictionary = wordTemplateDataDictionaryService.getDataDictionary();
      res.json({
        success: true,
        data: dictionary,
      });
    } catch (err) {
      next(err);
    }
  }

  public async uploadNew(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        throw AppError.badRequest('Vui lòng chọn file biểu mẫu định dạng .docx');
      }

      const validatedBody = createWordTemplateSchema.parse(req.body);
      const created = await wordTemplateService.createTemplateWithFile(
        validatedBody,
        req.file,
      );

      res.status(201).json({
        success: true,
        message: `Đã tải lên và khởi tạo biểu mẫu "${created?.title}" thành công.`,
        data: created,
      });
    } catch (err) {
      next(err);
    }
  }

  public async uploadVersion(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParamId(req);
      if (!req.file) {
        throw AppError.badRequest('Vui lòng chọn file biểu mẫu phiên bản mới (.docx)');
      }

      const changeNote = req.body.changeNote ? String(req.body.changeNote).trim() : undefined;
      const updated = await wordTemplateService.uploadNewVersion(id, req.file, changeNote);

      res.json({
        success: true,
        message: `Đã cập nhật phiên bản v${updated?.currentVersion} thành công.`,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  public async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParamId(req);
      const validatedBody = updateWordTemplateSchema.parse(req.body);
      const updated = await wordTemplateService.updateTemplate(id, validatedBody);

      res.json({
        success: true,
        message: 'Cập nhật thông tin biểu mẫu thành công.',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  public async saveMappings(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParamId(req);
      const { mappings } = saveMappingsSchema.parse(req.body);
      const saved = await wordTemplateService.saveMappings(id, mappings);

      res.json({
        success: true,
        message: `Đã lưu cấu hình ánh xạ cho ${saved.length} từ khóa.`,
        data: saved,
      });
    } catch (err) {
      next(err);
    }
  }

  public async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParamId(req);
      await wordTemplateService.deleteTemplate(id);
      res.json({
        success: true,
        message: 'Đã xóa biểu mẫu thành công.',
      });
    } catch (err) {
      next(err);
    }
  }

  public async downloadOriginal(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParamId(req);
      const { buffer, fileName } = await wordTemplateService.getTemplateFileBuffer(id);

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      );
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
      res.send(buffer);
    } catch (err) {
      next(err);
    }
  }

  public async preview(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParamId(req);
      const { loanId } = previewTemplateSchema.parse(req.body);
      const previewResult = await wordTemplateService.previewTemplate(id, loanId);

      res.json({
        success: true,
        data: previewResult,
      });
    } catch (err) {
      next(err);
    }
  }

  public async exportLoan(req: Request, res: Response, next: NextFunction) {
    try {
      const { loanId, templateIds } = exportLoanDocumentsSchema.parse(req.body);
      const exportFile = await wordTemplateService.exportLoanDocuments(loanId, templateIds);

      res.setHeader('Content-Type', exportFile.mimeType);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(exportFile.fileName)}"`,
      );
      res.send(exportFile.buffer);
    } catch (err) {
      next(err);
    }
  }

  public async getExportHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const { loanId, templateId } = req.query;
      const logs = await wordTemplateService.getExportHistory({
        loanId: loanId ? String(loanId) : undefined,
        templateId: templateId ? String(templateId) : undefined,
      });

      res.json({
        success: true,
        data: logs,
      });
    } catch (err) {
      next(err);
    }
  }

  public async validateSyntax(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParamId(req);
      const result = await wordTemplateService.validateTemplateSyntax(id);
      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  public async getCatalog(req: Request, res: Response, next: NextFunction) {
    try {
      const { category, search } = req.query;
      const keywords = await wordTemplateService.getCatalog(
        category ? String(category) : undefined,
        search ? String(search) : undefined,
      );
      res.json({
        success: true,
        data: keywords,
      });
    } catch (err) {
      next(err);
    }
  }

  public async createCatalogKeyword(req: Request, res: Response, next: NextFunction) {
    try {
      const created = await wordTemplateService.createCatalogKeyword(req.body);
      res.status(201).json({
        success: true,
        data: created,
        message: 'Đã thêm từ khóa vào Thư viện toàn cục',
      });
    } catch (err) {
      next(err);
    }
  }

  public async updateCatalogKeyword(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParamId(req);
      const result = await wordTemplateService.updateCatalogKeyword(id, req.body);
      res.json({
        success: true,
        data: result.keyword,
        affectedTemplates: result.affectedTemplates,
        message: 'Đã cập nhật từ khóa',
      });
    } catch (err) {
      next(err);
    }
  }

  public async deleteCatalogKeyword(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParamId(req);
      const result = await wordTemplateService.deleteCatalogKeyword(id);
      res.json({
        success: true,
        message: result.message,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const wordTemplateController = new WordTemplateController();
