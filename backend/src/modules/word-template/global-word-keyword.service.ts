import { prisma } from '../../config/database';
import { AppError } from '../../shared/errors/app-error';
import { ErrorCode } from '../../shared/errors/error-codes';
import { backupService } from '../backup/backup.service';

export interface GlobalWordKeywordInput {
  keyword: string;
  displayName: string;
  category: string;
  dataPath: string;
  dataType?: string;
  formatPattern?: string | null;
  defaultValue?: string | null;
  isList?: boolean;
  itemProperties?: any;
  description?: string | null;
  isSystem?: boolean;
}

export class GlobalWordKeywordService {
  private static gopKeywordsInitialized = false;
  /**
   * Lấy danh sách từ khóa toàn cục kèm số lượng mẫu Word đang sử dụng
   */
  public async getCatalog(category?: string, search?: string) {
    const where: any = {};
    if (category) {
      where.category = category;
    }
    if (search) {
      where.OR = [
        { keyword: { contains: search, mode: 'insensitive' } },
        { displayName: { contains: search, mode: 'insensitive' } },
        { dataPath: { contains: search, mode: 'insensitive' } },
      ];
    }

    const keywords = await prisma.globalWordKeyword.findMany({
      where,
      orderBy: [{ category: 'asc' }, { keyword: 'asc' }],
    });

    // Thống kê số lượng template Word đang dùng keyword này
    const mappings = await prisma.wordTemplateMapping.findMany({
      select: { keyword: true, templateId: true },
    });

    const usageCountMap: Record<string, number> = {};
    for (const m of mappings) {
      usageCountMap[m.keyword] = (usageCountMap[m.keyword] || 0) + 1;
    }

    return keywords.map((kw) => ({
      ...kw,
      usageCount: usageCountMap[kw.keyword] || 0,
    }));
  }

  /**
   * Tạo từ khóa mới vào Thư viện toàn cục
   */
  public async createKeyword(input: GlobalWordKeywordInput) {
    const cleanKeyword = input.keyword.trim().toUpperCase();

    const existing = await prisma.globalWordKeyword.findUnique({
      where: { keyword: cleanKeyword },
    });
    if (existing) {
      throw AppError.conflict(
        `Từ khóa "${cleanKeyword}" đã tồn tại trong Thư viện từ khóa toàn cục`,
        ErrorCode.VALIDATION_ERROR,
        [{ field: 'keyword', message: `Từ khóa "${cleanKeyword}" đã tồn tại` }]
      );
    }

    return prisma.globalWordKeyword.create({
      data: {
        keyword: cleanKeyword,
        displayName: input.displayName.trim(),
        category: input.category,
        dataPath: input.dataPath.trim(),
        dataType: input.dataType || 'TEXT',
        formatPattern: input.formatPattern || null,
        defaultValue: input.defaultValue || '...................',
        isList: Boolean(input.isList),
        itemProperties: input.itemProperties || null,
        description: input.description || null,
        isSystem: Boolean(input.isSystem),
      },
    });
  }

  /**
   * Cập nhật từ khóa trong Thư viện
   * Cảnh báo nếu đang có các mẫu Word sử dụng từ khóa này
   */
  public async updateKeyword(id: string, input: Partial<GlobalWordKeywordInput>) {
    const existing = await prisma.globalWordKeyword.findUnique({ where: { id } });
    if (!existing) {
      throw AppError.notFound(`Không tìm thấy từ khóa ID "${id}" trong Thư viện`, ErrorCode.NOT_FOUND);
    }

    // Tìm các mẫu Word đang sử dụng
    const affectedTemplates = await prisma.wordTemplateMapping.findMany({
      where: { keyword: existing.keyword },
      include: {
        template: {
          select: { id: true, title: true, code: true },
        },
      },
    });

    const updated = await prisma.globalWordKeyword.update({
      where: { id },
      data: {
        displayName: input.displayName !== undefined ? input.displayName.trim() : undefined,
        category: input.category !== undefined ? input.category : undefined,
        dataPath: input.dataPath !== undefined ? input.dataPath.trim() : undefined,
        dataType: input.dataType !== undefined ? input.dataType : undefined,
        formatPattern: input.formatPattern !== undefined ? input.formatPattern : undefined,
        defaultValue: input.defaultValue !== undefined ? input.defaultValue : undefined,
        isList: input.isList !== undefined ? Boolean(input.isList) : undefined,
        itemProperties: input.itemProperties !== undefined ? input.itemProperties : undefined,
        description: input.description !== undefined ? input.description : undefined,
      },
    });

    // Đồng bộ cập nhật sang các bảng mapping của các template đang dùng
    if (input.dataPath !== undefined || input.dataType !== undefined || input.defaultValue !== undefined) {
      await prisma.wordTemplateMapping.updateMany({
        where: { keyword: existing.keyword },
        data: {
          dataPath: input.dataPath !== undefined ? input.dataPath.trim() : undefined,
          dataType: input.dataType !== undefined ? input.dataType : undefined,
          defaultValue: input.defaultValue !== undefined ? input.defaultValue : undefined,
        },
      });
    }

    return {
      keyword: updated,
      affectedTemplates: affectedTemplates.map((t) => t.template),
    };
  }

  /**
   * Xóa từ khóa khỏi Thư viện (xóa kèm cấu hình mapping trong các mẫu Word đang dùng nếu có)
   */
  public async deleteKeyword(id: string) {
    const existing = await prisma.globalWordKeyword.findUnique({ where: { id } });
    if (!existing) {
      throw AppError.notFound(`Không tìm thấy từ khóa ID "${id}"`, ErrorCode.NOT_FOUND);
    }

    // Xóa liên kết trong wordTemplateMapping nếu có để không để lại mồ côi
    await prisma.wordTemplateMapping.deleteMany({
      where: { keyword: existing.keyword },
    });

    await prisma.globalWordKeyword.delete({ where: { id } });
    return { success: true, message: `Đã xóa từ khóa "${existing.keyword}" thành công` };
  }

  /**
   * Seed khởi tạo các từ khóa chuẩn hệ thống nếu chưa có (đọc từ keywords.sql)
   */
  public async seedDefaultCatalog(force = false): Promise<void> {
    const count = await prisma.globalWordKeyword.count();
    if (count > 0 && !force) {
      return;
    }
    try {
      await backupService.restoreKeywordsFromSql(undefined, 'SYSTEM_INIT');
    } catch (err) {
      console.warn('[GlobalWordKeywordService] Không thể seed keywords từ keywords.sql:', err);
    }
  }
}

export const globalWordKeywordService = new GlobalWordKeywordService();
