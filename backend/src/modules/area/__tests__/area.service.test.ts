import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AreaService } from '../area.service';
import { AreaRepository } from '../area.repository';
import { prisma } from '../../../config/database';
import { AppError } from '../../../shared/errors/app-error';
import { ErrorCode } from '../../../shared/errors/error-codes';

describe('AreaService - deleteCommune', () => {
  let service: AreaService;
  let repo: AreaRepository;

  beforeEach(() => {
    vi.restoreAllMocks();
    repo = new AreaRepository();
    service = new AreaService(repo);
    // Bỏ qua seeding khi test
    (service as any).isSeeded = true;
  });

  it('1. Báo lỗi 404 AREA_NOT_FOUND nếu xã không tồn tại', async () => {
    vi.spyOn(repo, 'findCommuneById').mockResolvedValue(null);

    await expect(service.deleteCommune('commune-999')).rejects.toThrow(AppError);
    await expect(service.deleteCommune('commune-999')).rejects.toMatchObject({
      errorCode: ErrorCode.AREA_NOT_FOUND,
    });
  });

  it('2. Báo lỗi 409 AREA_IN_USE nếu xã đang có thành viên hoặc tài sản thế chấp tham chiếu', async () => {
    vi.spyOn(repo, 'findCommuneById').mockResolvedValue({
      id: 'commune-1',
      name: 'Xã Nhị Trường',
      code: 'XA_NHI_TRUONG',
      provinceId: 'prov-1',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      province: { id: 'prov-1', name: 'Trà Vinh', code: 'TV', isActive: true, createdAt: new Date(), updatedAt: new Date() },
    });
    vi.spyOn(repo, 'countCommuneUsage').mockResolvedValue({
      members: 5,
      collaterals: 2,
      hamlets: 4,
    });

    await expect(service.deleteCommune('commune-1')).rejects.toThrow(AppError);
    await expect(service.deleteCommune('commune-1')).rejects.toMatchObject({
      errorCode: ErrorCode.AREA_IN_USE,
    });
  });

  it('3. Xóa xã thành công khi không có thành viên/tài sản: xóa ấp con, gỡ khỏi nhóm địa bàn và ghi audit log', async () => {
    vi.spyOn(repo, 'findCommuneById').mockResolvedValue({
      id: 'commune-2',
      name: 'Xã Long Sơn',
      code: 'XA_LONG_SON',
      provinceId: 'prov-1',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      province: { id: 'prov-1', name: 'Trà Vinh', code: 'TV', isActive: true, createdAt: new Date(), updatedAt: new Date() },
    });
    vi.spyOn(repo, 'countCommuneUsage').mockResolvedValue({
      members: 0,
      collaterals: 0,
      hamlets: 3,
    });

    const deleteHamletsSpy = vi.spyOn(prisma.hamlet, 'deleteMany').mockResolvedValue({ count: 3 });
    const findAreaGroupsSpy = vi.spyOn(prisma.areaGroup, 'findMany').mockResolvedValue([
      { id: 'group-1', name: 'Nhóm 1', code: 'NHOM_1', description: null, communeIds: ['commune-2', 'commune-3'], isActive: true, createdAt: new Date(), updatedAt: new Date() },
    ] as any);
    const updateAreaGroupSpy = vi.spyOn(prisma.areaGroup, 'update').mockResolvedValue({} as any);
    const deleteCommuneSpy = vi.spyOn(repo, 'deleteCommune').mockResolvedValue({} as any);
    const auditLogSpy = vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({} as any);

    const result = await service.deleteCommune('commune-2');

    expect(result).toEqual({ id: 'commune-2', deletedName: 'Xã Long Sơn' });
    expect(deleteHamletsSpy).toHaveBeenCalledWith({
      where: { communeId: 'commune-2' },
    });
    expect(findAreaGroupsSpy).toHaveBeenCalledWith({
      where: { communeIds: { has: 'commune-2' } },
    });
    expect(updateAreaGroupSpy).toHaveBeenCalledWith({
      where: { id: 'group-1' },
      data: { communeIds: ['commune-3'] },
    });
    expect(deleteCommuneSpy).toHaveBeenCalledWith('commune-2');
    expect(auditLogSpy).toHaveBeenCalledWith({
      data: expect.objectContaining({
        entityType: 'AREA',
        entityId: 'commune-2',
        action: 'DELETE_COMMUNE',
      }),
    });
  });

  describe('createCommune', () => {
    it('4. Báo lỗi nếu Tỉnh không tồn tại', async () => {
      vi.spyOn(repo, 'findProvinceById').mockResolvedValue(null);

      await expect(
        service.createCommune({ provinceId: 'prov-invalid', name: 'Xã Long Toàn' })
      ).rejects.toMatchObject({
        errorCode: ErrorCode.AREA_NOT_FOUND,
      });
    });

    it('5. Báo lỗi trùng tên nếu Xã đã tồn tại trong Tỉnh', async () => {
      vi.spyOn(repo, 'findProvinceById').mockResolvedValue({
        id: 'prov-1',
        name: 'Trà Vinh',
        code: 'TV',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.spyOn(repo, 'findCommuneByNameInProvince').mockResolvedValue({
        id: 'commune-existing',
        name: 'Xã Long Toàn',
        code: 'XA_LONG_TOAN',
        provinceId: 'prov-1',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        service.createCommune({ provinceId: 'prov-1', name: 'Long Toàn' })
      ).rejects.toMatchObject({
        errorCode: ErrorCode.AREA_ALREADY_EXISTS,
      });
    });

    it('6. Thêm xã thành công: tự động chuẩn hóa tên có tiền tố Xã, tạo mã và ghi audit log', async () => {
      vi.spyOn(repo, 'findProvinceById').mockResolvedValue({
        id: 'prov-1',
        name: 'Trà Vinh',
        code: 'TV',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.spyOn(repo, 'findCommuneByNameInProvince').mockResolvedValue(null);
      vi.spyOn(repo, 'findCommuneByCodeInProvince').mockResolvedValue(null);

      const createCommuneSpy = vi.spyOn(repo, 'createCommune').mockResolvedValue({
        id: 'commune-new',
        name: 'Xã Đôn Châu',
        code: 'XA_DON_CHAU',
        provinceId: 'prov-1',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const auditLogSpy = vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({} as any);

      const result = await service.createCommune({
        provinceId: 'prov-1',
        name: 'Đôn Châu',
      });

      expect(result.name).toBe('Xã Đôn Châu');
      expect(createCommuneSpy).toHaveBeenCalledWith({
        provinceId: 'prov-1',
        name: 'Xã Đôn Châu',
        code: 'XA_DON_CHAU',
        isActive: true,
      });
      expect(auditLogSpy).toHaveBeenCalledWith({
        data: expect.objectContaining({
          entityType: 'AREA',
          action: 'CREATE_COMMUNE',
          entityId: 'commune-new',
        }),
      });
    });
  });
});
