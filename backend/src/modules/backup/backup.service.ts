import fs from 'fs';
import path from 'path';
import dayjs from 'dayjs';
import { prisma } from '../../config/database';
import { AppError } from '../../shared/errors/app-error';
import { BackupMetadata, BackupPayload, RestoreResponse } from './backup.types';
import { logger } from '../../config';

/**
 * Hàm đệ quy chuyển đổi chuỗi định dạng ISO Date thành đối tượng Date của Javascript
 */
function recursivelyConvertDates(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/.test(obj)) {
      const d = new Date(obj);
      if (!isNaN(d.getTime())) return d;
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(recursivelyConvertDates);
  }
  if (typeof obj === 'object') {
    const res: any = {};
    for (const key of Object.keys(obj)) {
      res[key] = recursivelyConvertDates(obj[key]);
    }
    return res;
  }
  return obj;
}

export class BackupService {
  /**
   * Lấy số lượng bản ghi của tất cả các bảng trong hệ thống
   */
  public async getDatabaseStats(): Promise<Record<string, number>> {
    const [
      users,
      userProfiles,
      provinces,
      communes,
      hamlets,
      areaGroups,
      interestRateConfigs,
      assetPricingRules,
      globalWordKeywords,
      wordTemplates,
      wordTemplateVersions,
      wordTemplateMappings,
      wordExportLogs,
      members,
      loans,
      relatedPersons,
      collaterals,
      loanValuations,
      disbursements,
      repayments,
      auditLogs,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.userProfile.count(),
      prisma.province.count(),
      prisma.commune.count(),
      prisma.hamlet.count(),
      prisma.areaGroup.count(),
      prisma.interestRateConfig.count(),
      prisma.assetPricingRule.count(),
      prisma.globalWordKeyword.count(),
      prisma.wordTemplate.count(),
      prisma.wordTemplateVersion.count(),
      prisma.wordTemplateMapping.count(),
      prisma.wordExportLog.count(),
      prisma.member.count({ where: { isDeleted: { not: true } } }),
      prisma.loan.count({ where: { isDeleted: { not: true } } }),
      prisma.relatedPerson.count({ where: { isDeleted: { not: true } } }),
      prisma.collateral.count(),
      prisma.loanValuation.count(),
      prisma.disbursement.count(),
      prisma.repayment.count(),
      prisma.auditLog.count(),
    ]);

    return {
      users,
      userProfiles,
      provinces,
      communes,
      hamlets,
      areaGroups,
      interestRateConfigs,
      assetPricingRules,
      globalWordKeywords,
      wordTemplates,
      wordTemplateVersions,
      wordTemplateMappings,
      wordExportLogs,
      members,
      loans,
      relatedPersons,
      collaterals,
      loanValuations,
      disbursements,
      repayments,
      auditLogs,
    };
  }

  /**
   * Xuất toàn bộ cơ sở dữ liệu hệ thống ra file JSON
   */
  public async exportDatabase(): Promise<{ buffer: Buffer; filename: string; stats: Record<string, number> }> {
    logger.info('Bắt đầu quá trình sao lưu toàn bộ Cơ sở dữ liệu...');

    const [
      users,
      userProfiles,
      provinces,
      communes,
      hamlets,
      areaGroups,
      interestRateConfigs,
      assetPricingRules,
      globalWordKeywords,
      wordTemplates,
      wordTemplateVersions,
      wordTemplateMappings,
      wordExportLogs,
      members,
      loans,
      relatedPersons,
      collaterals,
      loanValuations,
      disbursements,
      repayments,
      auditLogs,
    ] = await Promise.all([
      prisma.user.findMany(),
      prisma.userProfile.findMany(),
      prisma.province.findMany(),
      prisma.commune.findMany(),
      prisma.hamlet.findMany(),
      prisma.areaGroup.findMany(),
      prisma.interestRateConfig.findMany(),
      prisma.assetPricingRule.findMany(),
      prisma.globalWordKeyword.findMany(),
      prisma.wordTemplate.findMany(),
      prisma.wordTemplateVersion.findMany(),
      prisma.wordTemplateMapping.findMany(),
      prisma.wordExportLog.findMany(),
      prisma.member.findMany(),
      prisma.loan.findMany(),
      prisma.relatedPerson.findMany(),
      prisma.collateral.findMany(),
      prisma.loanValuation.findMany(),
      prisma.disbursement.findMany(),
      prisma.repayment.findMany(),
      prisma.auditLog.findMany(),
    ]);

    const collectionCounts: Record<string, number> = {
      users: users.length,
      userProfiles: userProfiles.length,
      provinces: provinces.length,
      communes: communes.length,
      hamlets: hamlets.length,
      areaGroups: areaGroups.length,
      interestRateConfigs: interestRateConfigs.length,
      assetPricingRules: assetPricingRules.length,
      globalWordKeywords: globalWordKeywords.length,
      wordTemplates: wordTemplates.length,
      wordTemplateVersions: wordTemplateVersions.length,
      wordTemplateMappings: wordTemplateMappings.length,
      wordExportLogs: wordExportLogs.length,
      members: members.length,
      loans: loans.length,
      relatedPersons: relatedPersons.length,
      collaterals: collaterals.length,
      loanValuations: loanValuations.length,
      disbursements: disbursements.length,
      repayments: repayments.length,
      auditLogs: auditLogs.length,
    };

    const totalRecords = Object.values(collectionCounts).reduce((sum, c) => sum + c, 0);

    const metadata: BackupMetadata = {
      version: '3.9',
      system: 'N_QTD',
      exportDate: new Date().toISOString(),
      totalCollections: Object.keys(collectionCounts).length,
      totalRecords,
      collectionCounts,
    };

    const payload: BackupPayload = {
      version: '3.9',
      system: 'N_QTD',
      exportDate: metadata.exportDate,
      metadata,
      data: {
        users,
        userProfiles,
        provinces,
        communes,
        hamlets,
        areaGroups,
        interestRateConfigs,
        assetPricingRules,
        globalWordKeywords,
        wordTemplates,
        wordTemplateVersions,
        wordTemplateMappings,
        wordExportLogs,
        members,
        loans,
        relatedPersons,
        collaterals,
        loanValuations,
        disbursements,
        repayments,
        auditLogs,
      },
    };

    const jsonString = JSON.stringify(payload, null, 2);
    const buffer = Buffer.from(jsonString, 'utf-8');
    const dateSuffix = dayjs().format('YYYYMMDD_HHmmss');
    const filename = `NQTD_Backup_Database_${dateSuffix}.json`;

    logger.info(`Sao lưu thành công! Tổng số bản ghi: ${totalRecords}, Dung lượng: ${(buffer.length / 1024).toFixed(1)} KB`);

    return { buffer, filename, stats: collectionCounts };
  }

  /**
   * Phục hồi toàn bộ cơ sở dữ liệu từ file JSON sao lưu
   */
  public async importDatabase(rawContent: string | object, operatorUsername = 'SYSTEM'): Promise<RestoreResponse> {
    logger.info(`Bắt đầu quá trình nạp lại Cơ sở dữ liệu bởi ${operatorUsername}...`);

    let payload: BackupPayload;
    if (typeof rawContent === 'string') {
      try {
        payload = JSON.parse(rawContent);
      } catch (err: any) {
        throw AppError.badRequest('Tệp tin sao lưu không đúng định dạng JSON hợp lệ.');
      }
    } else {
      payload = rawContent as BackupPayload;
    }

    if (!payload || payload.system !== 'N_QTD' || !payload.data) {
      throw AppError.badRequest('Tệp tin sao lưu không hợp lệ hoặc không thuộc hệ thống Quỹ Tín Dụng N_QTD.');
    }

    const rawData = payload.data;
    const restoredCounts: Record<string, number> = {};
    let totalRecordsRestored = 0;

    // 1. Xóa dữ liệu theo thứ tự ngược quan hệ phụ thuộc để tránh xung đột
    logger.info('Đang xóa sạch dữ liệu cũ để chuẩn bị phục hồi...');
    await prisma.auditLog.deleteMany({});
    await prisma.repayment.deleteMany({});
    await prisma.disbursement.deleteMany({});
    await prisma.loanValuation.deleteMany({});
    await prisma.collateral.deleteMany({});
    await prisma.relatedPerson.deleteMany({});
    await prisma.loan.deleteMany({});
    await prisma.member.deleteMany({});
    await prisma.wordExportLog.deleteMany({});
    await prisma.wordTemplateMapping.deleteMany({});
    await prisma.wordTemplateVersion.deleteMany({});
    await prisma.wordTemplate.deleteMany({});
    await prisma.globalWordKeyword.deleteMany({});
    await prisma.assetPricingRule.deleteMany({});
    await prisma.interestRateConfig.deleteMany({});
    await prisma.hamlet.deleteMany({});
    await prisma.commune.deleteMany({});
    await prisma.province.deleteMany({});
    await prisma.areaGroup.deleteMany({});
    await prisma.userProfile.deleteMany({});
    await prisma.user.deleteMany({});

    // 2. Nạp dữ liệu theo đúng thứ tự phụ thuộc quan hệ
    logger.info('Đang nạp lại dữ liệu từng phân hệ...');

    const insertCollection = async (
      modelName: string,
      items: any[] | undefined,
      createBatchFn: (batch: any[]) => Promise<any>
    ) => {
      if (!items || items.length === 0) {
        restoredCounts[modelName] = 0;
        return;
      }
      const converted = recursivelyConvertDates(items);
      // Nạp theo từng chunk nhỏ 50 bản ghi
      const chunkSize = 50;
      for (let i = 0; i < converted.length; i += chunkSize) {
        const chunk = converted.slice(i, i + chunkSize);
        await createBatchFn(chunk);
      }
      restoredCounts[modelName] = items.length;
      totalRecordsRestored += items.length;
    };

    // User & Profiles
    await insertCollection('users', rawData.users, (chunk) => prisma.user.createMany({ data: chunk }));
    await insertCollection('userProfiles', rawData.userProfiles, (chunk) => prisma.userProfile.createMany({ data: chunk }));

    // Địa bàn & Phân nhóm
    await insertCollection('provinces', rawData.provinces, (chunk) => prisma.province.createMany({ data: chunk }));
    await insertCollection('communes', rawData.communes, (chunk) => prisma.commune.createMany({ data: chunk }));
    await insertCollection('hamlets', rawData.hamlets, (chunk) => prisma.hamlet.createMany({ data: chunk }));
    await insertCollection('areaGroups', rawData.areaGroups, (chunk) => prisma.areaGroup.createMany({ data: chunk }));

    // Cấu hình Lãi suất & Định giá đất
    await insertCollection('interestRateConfigs', rawData.interestRateConfigs, (chunk) => prisma.interestRateConfig.createMany({ data: chunk }));
    await insertCollection('assetPricingRules', rawData.assetPricingRules, (chunk) => prisma.assetPricingRule.createMany({ data: chunk }));

    // Biểu mẫu Word & Từ khóa toàn cục
    await insertCollection('globalWordKeywords', rawData.globalWordKeywords, (chunk) => prisma.globalWordKeyword.createMany({ data: chunk }));
    await insertCollection('wordTemplates', rawData.wordTemplates, (chunk) => prisma.wordTemplate.createMany({ data: chunk }));
    await insertCollection('wordTemplateVersions', rawData.wordTemplateVersions, (chunk) => prisma.wordTemplateVersion.createMany({ data: chunk }));
    await insertCollection('wordTemplateMappings', rawData.wordTemplateMappings, (chunk) => prisma.wordTemplateMapping.createMany({ data: chunk }));
    await insertCollection('wordExportLogs', rawData.wordExportLogs, (chunk) => prisma.wordExportLog.createMany({ data: chunk }));

    // Thành viên & Hồ sơ vay
    await insertCollection('members', rawData.members, (chunk) => prisma.member.createMany({ data: chunk }));
    await insertCollection('loans', rawData.loans, (chunk) => prisma.loan.createMany({ data: chunk }));

    // Dữ liệu chi tiết khoản vay
    await insertCollection('relatedPersons', rawData.relatedPersons, (chunk) => prisma.relatedPerson.createMany({ data: chunk }));
    await insertCollection('collaterals', rawData.collaterals, (chunk) => prisma.collateral.createMany({ data: chunk }));
    await insertCollection('loanValuations', rawData.loanValuations, (chunk) => prisma.loanValuation.createMany({ data: chunk }));
    await insertCollection('disbursements', rawData.disbursements, (chunk) => prisma.disbursement.createMany({ data: chunk }));
    await insertCollection('repayments', rawData.repayments, (chunk) => prisma.repayment.createMany({ data: chunk }));

    // Nhật ký hệ thống
    await insertCollection('auditLogs', rawData.auditLogs, (chunk) => prisma.auditLog.createMany({ data: chunk }));

    // Ghi nhận AuditLog hành động phục hồi cơ sở dữ liệu
    try {
      await prisma.auditLog.create({
        data: {
          action: 'RESTORE_DATABASE',
          entityType: 'SYSTEM',
          entityId: 'SYSTEM_BACKUP',
          actor: operatorUsername,
          metadata: {
            restoredCounts,
            totalRecordsRestored,
            backupDate: payload.exportDate,
          },
        },
      });
    } catch (_e) {
      // Bỏ qua lỗi ghi audit log nếu có
    }

    logger.info(`Phục hồi cơ sở dữ liệu hoàn tất! Tổng cộng: ${totalRecordsRestored} bản ghi.`);

    return {
      success: true,
      message: `Phục hồi cơ sở dữ liệu thành công! Đã nạp lại ${totalRecordsRestored} bản ghi từ file sao lưu.`,
      restoredAt: new Date().toISOString(),
      restoredCounts,
      totalRecordsRestored,
    };
  }

  /**
   * Làm sạch toàn bộ cơ sở dữ liệu:
   * Xóa tất cả các bảng giao dịch, thành viên, khoản vay, địa bàn, lãi suất, bảng giá đất...
   * CHỈ GIỮ LẠI:
   * 1. Tài khoản ADMIN và hồ sơ cá nhân của ADMIN
   * 2. Toàn bộ Thư viện từ khóa biểu mẫu (GlobalWordKeyword)
   * 3. Toàn bộ Biểu mẫu Word và ánh xạ (WordTemplate, WordTemplateVersion, WordTemplateMapping)
   */
  public async cleanDatabase(
    adminUserId: string,
    actorName: string
  ): Promise<{ success: boolean; message: string }> {
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });

    if (!admin) {
      throw AppError.badRequest('Không tìm thấy tài khoản quản trị Admin trong hệ thống');
    }

    logger.warn(`Bắt đầu làm sạch CSDL bởi ${actorName} (${adminUserId})...`);

    // 1. Dọn dẹp nghiệp vụ giao dịch & khoản vay
    await prisma.repayment.deleteMany({});
    await prisma.disbursement.deleteMany({});
    await prisma.loanValuation.deleteMany({});
    await prisma.collateral.deleteMany({});
    await prisma.relatedPerson.deleteMany({});
    await prisma.loan.deleteMany({});
    await prisma.member.deleteMany({});

    // 2. Dọn dẹp cấu hình lãi suất & bảng giá tài sản / đơn giá (theo yêu cầu: làm sạch csdl là làm sạch luôn đơn giá)
    await prisma.interestRateConfig.deleteMany({});
    await prisma.assetPricingRule.deleteMany({});
    // LƯU Ý: Bảo toàn danh mục Địa bàn (hamlet, commune, province, areaGroup) - không xóa danh mục nền tảng này

    // 3. Dọn dẹp log xuất file Word
    await prisma.wordExportLog.deleteMany({});

    // 4. Xóa người dùng và hồ sơ không phải Admin
    await prisma.userProfile.deleteMany({
      where: {
        userId: { not: admin.id },
      },
    });
    await prisma.user.deleteMany({
      where: {
        id: { not: admin.id },
      },
    });

    // 5. BẢO TOÀN Thư viện từ khóa biểu mẫu (GlobalWordKeyword), Mẫu Word và Tài khoản Admin
    // Yêu cầu người dùng: "xóa tất cả chỉ chừa tài khoản admin và thư viện keyword và các mẫu word thôi"

    // 6. Làm sạch audit logs và ghi lại audit log làm sạch này
    await prisma.auditLog.deleteMany({});
    await prisma.auditLog.create({
      data: {
        entityType: 'SYSTEM',
        entityId: 'DATABASE',
        action: 'DATABASE_CLEAN',
        actor: actorName,
        reason:
          'Làm sạch CSDL hệ thống (xóa sạch dữ liệu giao dịch nghiệp vụ và đơn giá; bảo toàn tài khoản Admin, Thư viện từ khóa, Mẫu Word và Địa bàn)',
        metadata: {
          cleanedAt: new Date().toISOString(),
          preserved: [
            'admin_user',
            'word_templates',
            'word_template_mappings',
            'global_word_keywords',
            'provinces',
            'communes',
            'hamlets',
            'area_groups',
          ],
        },
      },
    });

    logger.info(
      'Làm sạch CSDL hoàn tất! Đã xóa sạch dữ liệu nghiệp vụ và đơn giá, giữ lại tài khoản Admin, Thư viện từ khóa, Mẫu Word và Danh mục địa bàn.'
    );

    return {
      success: true,
      message:
        'Làm sạch cơ sở dữ liệu thành công! Đã xóa sạch dữ liệu nghiệp vụ và đơn giá; tài khoản Admin, Thư viện từ khóa Word, Mẫu Word và Địa bàn được bảo toàn an toàn.',
    };
  }

  /**
   * Nạp lại Thư viện từ khóa biểu mẫu Word từ file SQL
   * @param sqlContent Nội dung SQL (nếu bỏ trống sẽ tự động đọc từ file keywords.sql trong dự án)
   */
  public async restoreKeywordsFromSql(
    sqlContent?: string,
    actorName: string = 'ADMIN'
  ): Promise<{ success: boolean; message: string; count: number }> {
    let sqlText = sqlContent;
    if (!sqlText || !sqlText.trim()) {
      const candidates = [
        path.resolve(process.cwd(), 'backend', 'prisma', 'keywords.sql'),
        path.resolve(process.cwd(), 'prisma', 'keywords.sql'),
        path.resolve(__dirname, '..', '..', '..', 'prisma', 'keywords.sql'),
      ];
      const foundPath = candidates.find((p) => fs.existsSync(p));
      if (!foundPath) {
        throw AppError.notFound('Không tìm thấy file keywords.sql mặc định trong dự án');
      }
      sqlText = fs.readFileSync(foundPath, 'utf8');
    }

    const records = this.parseSqlKeywords(sqlText!);
    if (records.length === 0) {
      throw AppError.badRequest('Không tìm thấy bản ghi từ khóa hợp lệ trong nội dung file SQL');
    }

    // Xóa sạch từ khóa cũ để nạp lại chính xác từ file SQL
    await prisma.globalWordKeyword.deleteMany({});

    let importedCount = 0;
    for (const rec of records) {
      await prisma.globalWordKeyword.create({
        data: {
          keyword: rec.keyword,
          displayName: rec.displayName,
          category: rec.category,
          dataPath: rec.dataPath,
          dataType: rec.dataType || 'TEXT',
          formatPattern: rec.formatPattern || null,
          defaultValue: rec.defaultValue || '...................',
          isList: Boolean(rec.isList),
          itemProperties: rec.itemProperties || null,
          description: rec.description || null,
          isSystem: rec.isSystem !== false,
        },
      });
      importedCount++;
    }

    logger.info(`Đã nạp lại ${importedCount} từ khóa từ file SQL thành công bởi ${actorName}`);

    return {
      success: true,
      message: `Đã nạp lại thành công ${importedCount} từ khóa biểu mẫu Word từ file SQL.`,
      count: importedCount,
    };
  }

  public parseSqlKeywords(sqlText: string): any[] {
    const insertRegex = /INSERT\s+INTO\s+["`]?global_word_keywords["`]?\s*\(([^)]+)\)\s*VALUES\s*\(([\s\S]*?)\)\s*;/gi;
    let match;
    const records: any[] = [];

    while ((match = insertRegex.exec(sqlText)) !== null) {
      const rawCols = match[1].split(',').map((c) => c.replace(/["`]/g, '').trim());
      const rawVals = match[2].trim();

      const values: string[] = [];
      let cur = '';
      let inQuote = false;

      for (let i = 0; i < rawVals.length; i++) {
        const ch = rawVals[i];
        if (ch === "'" && !inQuote) {
          inQuote = true;
        } else if (ch === "'" && inQuote) {
          if (rawVals[i + 1] === "'") {
            cur += "'";
            i++;
          } else {
            inQuote = false;
          }
        } else if (ch === ',' && !inQuote) {
          values.push(cur.trim());
          cur = '';
        } else {
          cur += ch;
        }
      }
      values.push(cur.trim());

      const rec: any = {};
      rawCols.forEach((col, idx) => {
        let val = values[idx];
        if (val === 'NULL' || val === undefined) {
          rec[col] = null;
        } else if (val === 'TRUE') {
          rec[col] = true;
        } else if (val === 'FALSE') {
          rec[col] = false;
        } else if (val.startsWith("'") && val.endsWith("'")) {
          rec[col] = val.slice(1, -1);
        } else if (!isNaN(Number(val))) {
          rec[col] = Number(val);
        } else {
          rec[col] = val;
        }
      });

      if (rec.itemProperties && typeof rec.itemProperties === 'string') {
        try {
          rec.itemProperties = JSON.parse(rec.itemProperties);
        } catch (_e) {}
      }

      if (rec.keyword && rec.displayName) {
        records.push(rec);
      }
    }

    return records;
  }
}

export const backupService = new BackupService();
