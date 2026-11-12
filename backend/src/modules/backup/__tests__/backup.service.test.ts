import { describe, it, expect, vi, beforeEach } from 'vitest';
import { backupService } from '../backup.service';
import { prisma } from '../../../config/database';

describe('BackupService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('1. exportDatabase xuất toàn bộ cơ sở dữ liệu và đính kèm đầy đủ metadata', async () => {
    vi.spyOn(prisma.member, 'findMany').mockResolvedValue([
      { id: 'm1', fullName: 'Thành viên Test 1', idNumber: '083200001111' },
    ] as any);
    vi.spyOn(prisma.loan, 'findMany').mockResolvedValue([
      { id: 'l1', contractNumber: 'HD-TEST', loanAmount: 50000000 },
    ] as any);
    vi.spyOn(prisma.user, 'findMany').mockResolvedValue([] as any);
    vi.spyOn(prisma.userProfile, 'findMany').mockResolvedValue([] as any);
    vi.spyOn(prisma.province, 'findMany').mockResolvedValue([] as any);
    vi.spyOn(prisma.commune, 'findMany').mockResolvedValue([] as any);
    vi.spyOn(prisma.hamlet, 'findMany').mockResolvedValue([] as any);
    vi.spyOn(prisma.areaGroup, 'findMany').mockResolvedValue([] as any);
    vi.spyOn(prisma.interestRateConfig, 'findMany').mockResolvedValue([] as any);
    vi.spyOn(prisma.assetPricingRule, 'findMany').mockResolvedValue([] as any);
    vi.spyOn(prisma.globalWordKeyword, 'findMany').mockResolvedValue([] as any);
    vi.spyOn(prisma.wordTemplate, 'findMany').mockResolvedValue([] as any);
    vi.spyOn(prisma.wordTemplateVersion, 'findMany').mockResolvedValue([] as any);
    vi.spyOn(prisma.wordTemplateMapping, 'findMany').mockResolvedValue([] as any);
    vi.spyOn(prisma.wordExportLog, 'findMany').mockResolvedValue([] as any);
    vi.spyOn(prisma.relatedPerson, 'findMany').mockResolvedValue([] as any);
    vi.spyOn(prisma.collateral, 'findMany').mockResolvedValue([] as any);
    vi.spyOn(prisma.loanValuation, 'findMany').mockResolvedValue([] as any);
    vi.spyOn(prisma.disbursement, 'findMany').mockResolvedValue([] as any);
    vi.spyOn(prisma.repayment, 'findMany').mockResolvedValue([] as any);
    vi.spyOn(prisma.auditLog, 'findMany').mockResolvedValue([] as any);

    const { buffer, filename, stats } = await backupService.exportDatabase();

    expect(buffer).toBeDefined();
    expect(filename).toContain('NQTD_Backup_Database_');
    expect(filename).toContain('.json');
    expect(stats.members).toBe(1);
    expect(stats.loans).toBe(1);

    const parsed = JSON.parse(buffer.toString('utf-8'));
    expect(parsed.system).toBe('N_QTD');
    expect(parsed.version).toBe('3.9');
    expect(parsed.data.members).toHaveLength(1);
    expect(parsed.data.members[0].fullName).toBe('Thành viên Test 1');
  });

  it('2. importDatabase kiểm tra tính hợp lệ của file và phục hồi dữ liệu', async () => {
    // Mock deleteMany
    vi.spyOn(prisma.auditLog, 'deleteMany').mockResolvedValue({ count: 0 } as any);
    vi.spyOn(prisma.repayment, 'deleteMany').mockResolvedValue({ count: 0 } as any);
    vi.spyOn(prisma.disbursement, 'deleteMany').mockResolvedValue({ count: 0 } as any);
    vi.spyOn(prisma.loanValuation, 'deleteMany').mockResolvedValue({ count: 0 } as any);
    vi.spyOn(prisma.collateral, 'deleteMany').mockResolvedValue({ count: 0 } as any);
    vi.spyOn(prisma.relatedPerson, 'deleteMany').mockResolvedValue({ count: 0 } as any);
    vi.spyOn(prisma.loan, 'deleteMany').mockResolvedValue({ count: 0 } as any);
    vi.spyOn(prisma.member, 'deleteMany').mockResolvedValue({ count: 0 } as any);
    vi.spyOn(prisma.wordExportLog, 'deleteMany').mockResolvedValue({ count: 0 } as any);
    vi.spyOn(prisma.wordTemplateMapping, 'deleteMany').mockResolvedValue({ count: 0 } as any);
    vi.spyOn(prisma.wordTemplateVersion, 'deleteMany').mockResolvedValue({ count: 0 } as any);
    vi.spyOn(prisma.wordTemplate, 'deleteMany').mockResolvedValue({ count: 0 } as any);
    vi.spyOn(prisma.globalWordKeyword, 'deleteMany').mockResolvedValue({ count: 0 } as any);
    vi.spyOn(prisma.assetPricingRule, 'deleteMany').mockResolvedValue({ count: 0 } as any);
    vi.spyOn(prisma.interestRateConfig, 'deleteMany').mockResolvedValue({ count: 0 } as any);
    vi.spyOn(prisma.hamlet, 'deleteMany').mockResolvedValue({ count: 0 } as any);
    vi.spyOn(prisma.commune, 'deleteMany').mockResolvedValue({ count: 0 } as any);
    vi.spyOn(prisma.province, 'deleteMany').mockResolvedValue({ count: 0 } as any);
    vi.spyOn(prisma.areaGroup, 'deleteMany').mockResolvedValue({ count: 0 } as any);
    vi.spyOn(prisma.userProfile, 'deleteMany').mockResolvedValue({ count: 0 } as any);
    vi.spyOn(prisma.user, 'deleteMany').mockResolvedValue({ count: 0 } as any);

    // Mock createMany
    const memberCreateMany = vi.spyOn(prisma.member, 'createMany').mockResolvedValue({ count: 1 } as any);
    const loanCreateMany = vi.spyOn(prisma.loan, 'createMany').mockResolvedValue({ count: 1 } as any);
    vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({} as any);

    const backupPayload = {
      version: '3.9',
      system: 'N_QTD',
      exportDate: '2026-11-10T20:00:00.000Z',
      metadata: {
        version: '3.9',
        system: 'N_QTD',
        exportDate: '2026-11-10T20:00:00.000Z',
        totalCollections: 2,
        totalRecords: 2,
        collectionCounts: { members: 1, loans: 1 },
      },
      data: {
        members: [{ id: 'm1', fullName: 'Thành viên A', createdAt: '2026-01-01T00:00:00.000Z' }],
        loans: [{ id: 'l1', contractNumber: 'HD-01', loanStartDate: '2026-02-01T00:00:00.000Z' }],
      },
    };

    const result = await backupService.importDatabase(JSON.stringify(backupPayload), 'TEST_USER');

    expect(result.success).toBe(true);
    expect(result.totalRecordsRestored).toBe(2);
    expect(memberCreateMany).toHaveBeenCalled();
    expect(loanCreateMany).toHaveBeenCalled();
  });

  it('3. cleanDatabase xóa toàn bộ dữ liệu nghiệp vụ, bảo toàn tài khoản admin, keyword và mẫu word', async () => {
    vi.spyOn(prisma.user, 'findFirst').mockResolvedValue({
      id: 'admin-id-1',
      username: 'ADMIN',
      role: 'ADMIN',
    } as any);

    const deleteRepayments = vi.spyOn(prisma.repayment, 'deleteMany').mockResolvedValue({ count: 5 } as any);
    const deleteDisbursements = vi.spyOn(prisma.disbursement, 'deleteMany').mockResolvedValue({ count: 2 } as any);
    const deleteValuations = vi.spyOn(prisma.loanValuation, 'deleteMany').mockResolvedValue({ count: 3 } as any);
    const deleteCollaterals = vi.spyOn(prisma.collateral, 'deleteMany').mockResolvedValue({ count: 4 } as any);
    const deleteRelatedPersons = vi.spyOn(prisma.relatedPerson, 'deleteMany').mockResolvedValue({ count: 2 } as any);
    const deleteLoans = vi.spyOn(prisma.loan, 'deleteMany').mockResolvedValue({ count: 2 } as any);
    const deleteMembers = vi.spyOn(prisma.member, 'deleteMany').mockResolvedValue({ count: 10 } as any);
    const deletePricingRules = vi.spyOn(prisma.assetPricingRule, 'deleteMany').mockResolvedValue({ count: 5 } as any);
    const deleteRates = vi.spyOn(prisma.interestRateConfig, 'deleteMany').mockResolvedValue({ count: 2 } as any);
    const deleteUsers = vi.spyOn(prisma.user, 'deleteMany').mockResolvedValue({ count: 3 } as any);
    const deleteUserProfiles = vi.spyOn(prisma.userProfile, 'deleteMany').mockResolvedValue({ count: 3 } as any);
    const deleteAuditLogs = vi.spyOn(prisma.auditLog, 'deleteMany').mockResolvedValue({ count: 20 } as any);
    const createAuditLog = vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({} as any);

    // Spy on globalWordKeyword, wordTemplate, và master areas để đảm bảo KHÔNG bị xóa
    const deleteKeywords = vi.spyOn(prisma.globalWordKeyword, 'deleteMany');
    const deleteTemplates = vi.spyOn(prisma.wordTemplate, 'deleteMany');
    const deleteProvinces = vi.spyOn(prisma.province, 'deleteMany');
    const deleteCommunes = vi.spyOn(prisma.commune, 'deleteMany');
    const deleteHamlets = vi.spyOn(prisma.hamlet, 'deleteMany');

    const result = await backupService.cleanDatabase('admin-id-1', 'ADMIN');

    expect(result.success).toBe(true);
    expect(deleteRepayments).toHaveBeenCalled();
    expect(deleteDisbursements).toHaveBeenCalled();
    expect(deleteValuations).toHaveBeenCalled();
    expect(deleteCollaterals).toHaveBeenCalled();
    expect(deleteRelatedPersons).toHaveBeenCalled();
    expect(deleteLoans).toHaveBeenCalled();
    expect(deleteMembers).toHaveBeenCalled();
    expect(deletePricingRules).toHaveBeenCalled();
    expect(deleteRates).toHaveBeenCalled();
    expect(deleteUsers).toHaveBeenCalledWith({ where: { id: { not: 'admin-id-1' } } });
    expect(deleteUserProfiles).toHaveBeenCalledWith({ where: { userId: { not: 'admin-id-1' } } });
    expect(deleteAuditLogs).toHaveBeenCalled();
    expect(createAuditLog).toHaveBeenCalled();

    // Verify: Bảo toàn an toàn Tài khoản Admin, Mẫu Word, Thư viện từ khóa và Địa bàn
    expect(deleteKeywords).not.toHaveBeenCalled();
    expect(deleteTemplates).not.toHaveBeenCalled();
    expect(deleteProvinces).not.toHaveBeenCalled();
    expect(deleteCommunes).not.toHaveBeenCalled();
    expect(deleteHamlets).not.toHaveBeenCalled();
  });

  it('4. restoreKeywordsFromSql nạp lại danh sách từ khóa từ câu lệnh SQL', async () => {
    const mockCreate = vi.fn().mockResolvedValue({});
    const mockDeleteMany = vi.fn().mockResolvedValue({ count: 10 });
    (prisma.globalWordKeyword.deleteMany as any) = mockDeleteMany;
    (prisma.globalWordKeyword.create as any) = mockCreate;

    const sampleSql = `
      INSERT INTO global_word_keywords (id, keyword, "displayName", category, "dataPath", "dataType", "isSystem")
      VALUES ('kw_1', 'TEST.KEYWORD_1', 'Từ khóa test 1', 'TEST', 'TEST.KEYWORD_1', 'TEXT', true);
      INSERT INTO global_word_keywords (id, keyword, "displayName", category, "dataPath", "dataType", "isSystem")
      VALUES ('kw_2', 'TEST.KEYWORD_2', 'Từ khóa test 2', 'TEST', 'TEST.KEYWORD_2', 'TEXT', true);
    `;

    const res = await backupService.restoreKeywordsFromSql(sampleSql, 'TESTER');

    expect(res.success).toBe(true);
    expect(res.count).toBe(2);
    expect(mockDeleteMany).toHaveBeenCalled();
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });
});

