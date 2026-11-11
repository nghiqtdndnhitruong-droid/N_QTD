import { prisma } from '../../config/database';
import type {
  CreateWordTemplateDto,
  UpdateWordTemplateDto,
  WordTemplateMappingDto,
} from './word-template.types';

export class WordTemplateRepository {
  public async findMany(params: {
    category?: string;
    loanTypeScope?: string;
    isActive?: boolean;
    search?: string;
  }) {
    const where: any = {};

    if (params.category) {
      where.category = params.category;
    }
    if (params.loanTypeScope && params.loanTypeScope !== 'ALL') {
      where.OR = [{ loanTypeScope: 'ALL' }, { loanTypeScope: params.loanTypeScope }];
    }
    if (params.isActive !== undefined) {
      where.isActive = params.isActive;
    }
    if (params.search) {
      where.OR = [
        { title: { contains: params.search, mode: 'insensitive' } },
        { code: { contains: params.search, mode: 'insensitive' } },
        { category: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    return prisma.wordTemplate.findMany({
      where,
      include: {
        _count: {
          select: { mappings: true, versions: true },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { category: 'asc' }, { createdAt: 'desc' }],
    });
  }

  public async reorderTemplates(items: { id: string; sortOrder: number; loanTypeScope?: any }[]) {
    const updates = items.map((item) =>
      prisma.wordTemplate.update({
        where: { id: item.id },
        data: {
          sortOrder: item.sortOrder,
          ...(item.loanTypeScope ? { loanTypeScope: item.loanTypeScope } : {}),
        },
      })
    );
    return prisma.$transaction(updates);
  }

  public async findById(id: string) {
    return prisma.wordTemplate.findUnique({
      where: { id },
      include: {
        mappings: {
          orderBy: [{ isLoop: 'desc' }, { keyword: 'asc' }],
        },
        versions: {
          orderBy: { version: 'desc' },
        },
      },
    });
  }

  public async findByCode(code: string) {
    return prisma.wordTemplate.findUnique({
      where: { code },
    });
  }

  public async create(
    data: CreateWordTemplateDto & {
      currentFilePath: string;
      originalFileName: string;
      fileSize: number;
    },
  ) {
    return prisma.wordTemplate.create({
      data: {
        code: data.code,
        title: data.title,
        category: data.category,
        loanTypeScope: data.loanTypeScope || 'ALL',
        description: data.description,
        currentFilePath: data.currentFilePath,
        originalFileName: data.originalFileName,
        fileSize: data.fileSize,
        currentVersion: 1,
        versions: {
          create: {
            version: 1,
            filePath: data.currentFilePath,
            fileName: data.originalFileName,
            fileSize: data.fileSize,
            changeNote: 'Tải lên phiên bản khởi tạo',
          },
        },
      },
    });
  }

  public async update(id: string, data: UpdateWordTemplateDto) {
    return prisma.wordTemplate.update({
      where: { id },
      data,
    });
  }

  public async createNewVersion(
    templateId: string,
    versionData: {
      version: number;
      filePath: string;
      fileName: string;
      fileSize: number;
      changeNote?: string;
      createdBy?: string;
      mappingsSnapshot?: any;
    },
  ) {
    return prisma.$transaction(async (tx) => {
      const v = await tx.wordTemplateVersion.create({
        data: {
          templateId,
          version: versionData.version,
          filePath: versionData.filePath,
          fileName: versionData.fileName,
          fileSize: versionData.fileSize,
          changeNote: versionData.changeNote,
          createdBy: versionData.createdBy || 'SYSTEM',
          mappingsSnapshot: versionData.mappingsSnapshot,
        },
      });

      const updatedTemplate = await tx.wordTemplate.update({
        where: { id: templateId },
        data: {
          currentVersion: versionData.version,
          currentFilePath: versionData.filePath,
          originalFileName: versionData.fileName,
          fileSize: versionData.fileSize,
        },
      });

      return { version: v, template: updatedTemplate };
    });
  }

  public async replaceMappings(templateId: string, mappings: WordTemplateMappingDto[]) {
    return prisma.$transaction(async (tx) => {
      // 1. Xóa các mappings cũ của template
      await tx.wordTemplateMapping.deleteMany({
        where: { templateId },
      });

      // 2. Chèn danh sách mappings mới
      if (mappings.length > 0) {
        await tx.wordTemplateMapping.createMany({
          data: mappings.map((m) => ({
            templateId,
            keyword: m.keyword,
            displayName: m.displayName,
            isLoop: Boolean(m.isLoop),
            loopContext: m.loopContext || null,
            dataPath: m.dataPath || null,
            dataType: m.dataType || 'TEXT',
            formatPattern: m.formatPattern || null,
            defaultValue: m.defaultValue || null,
            isRequired: Boolean(m.isRequired),
            description: m.description || null,
            condition: m.condition || null,
          })),
        });
      }

      // 3. Trả về danh sách mappings vừa lưu
      return tx.wordTemplateMapping.findMany({
        where: { templateId },
        orderBy: [{ isLoop: 'desc' }, { keyword: 'asc' }],
      });
    });
  }

  public async delete(id: string) {
    return prisma.$transaction(async (tx) => {
      // 1. Xóa lịch sử xuất biểu mẫu liên quan
      await tx.wordExportLog.deleteMany({
        where: { templateId: id },
      });

      // 2. Xóa các ánh xạ từ khóa của biểu mẫu
      await tx.wordTemplateMapping.deleteMany({
        where: { templateId: id },
      });

      // 3. Xóa các phiên bản biểu mẫu
      await tx.wordTemplateVersion.deleteMany({
        where: { templateId: id },
      });

      // 4. Xóa bản ghi biểu mẫu chính
      return tx.wordTemplate.delete({
        where: { id },
      });
    });
  }

  public async createExportLog(data: {
    templateId: string;
    templateVersion: number;
    loanId: string;
    exportedBy?: string;
    outputFileName: string;
    outputFileSize: number;
    status: string;
    warnings?: any;
    errorMessage?: string;
  }) {
    return prisma.wordExportLog.create({
      data: {
        templateId: data.templateId,
        templateVersion: data.templateVersion,
        loanId: data.loanId,
        exportedBy: data.exportedBy || 'SYSTEM',
        outputFileName: data.outputFileName,
        outputFileSize: data.outputFileSize,
        status: data.status,
        warnings: data.warnings || null,
        errorMessage: data.errorMessage || null,
      },
    });
  }

  public async getExportLogs(params: { loanId?: string; templateId?: string; limit?: number }) {
    const where: any = {};
    if (params.loanId) where.loanId = params.loanId;
    if (params.templateId) where.templateId = params.templateId;

    return prisma.wordExportLog.findMany({
      where,
      orderBy: { exportedAt: 'desc' },
      take: params.limit || 50,
      include: {
        template: {
          select: { title: true, code: true, category: true },
        },
      },
    });
  }
}

export const wordTemplateRepository = new WordTemplateRepository();

