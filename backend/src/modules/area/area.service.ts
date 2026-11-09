import { AreaRepository, areaRepository } from './area.repository';
import {
  CreateAreaGroupDto,
  CreateCommuneDto,
  CreateHamletDto,
  CreateProvinceDto,
  LocationSelectionInput,
  ResolvedLocationSnapshot,
  UpdateAreaGroupDto,
  UpdateHamletDto,
} from './area.types';
import { AppError } from '../../shared/errors/app-error';
import { ErrorCode } from '../../shared/errors/error-codes';
import { prisma } from '../../config/database';

function slugifyCode(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function normalizeHamletName(rawName: string): string {
  const trimmed = rawName.trim().replace(/\s+/g, ' ');
  if (/^(ấp|ap|khu phố|thôn)\b/i.test(trimmed)) {
    return trimmed.replace(/^ấp\b/i, 'Ấp');
  }
  return `Ấp ${trimmed}`;
}

export class AreaService {
  private isSeeded = false;

  constructor(private readonly repo: AreaRepository = areaRepository) {}

  /**
   * Tự động khởi tạo Địa bàn mặc định của Quỹ tín dụng nếu chưa có trong DB:
   * - Tỉnh Vĩnh Long
   *   + Xã Nhị Trường (Ấp mẫu: Ấp Nô Lựa)
   *   + Xã Tập Sơn
   *   + Xã Long Hiệp
   */
  async ensureDefaultAreasSeeded(): Promise<void> {
    if (this.isSeeded) return;

    let province = await this.repo.findProvinceByCode('VINH_LONG');
    if (!province) {
      province = await this.repo.createProvince({
        code: 'VINH_LONG',
        name: 'Tỉnh Vĩnh Long',
        isActive: true,
      });
    }

    const existingCommunes = await this.repo.findCommunesByProvince(province.id, undefined, true);
    const defaultCommunes = [
      { code: 'NHI_TRUONG', name: 'Xã Nhị Trường' },
      { code: 'TAP_SON', name: 'Xã Tập Sơn' },
      { code: 'LONG_HIEP', name: 'Xã Long Hiệp' },
    ];

    let nhiTruongCommune = existingCommunes.find((c) => c.code === 'NHI_TRUONG');

    for (const item of defaultCommunes) {
      const found = existingCommunes.find(
        (c) => c.code === item.code || c.name.toLowerCase() === item.name.toLowerCase()
      );
      if (!found) {
        const created = await this.repo.createCommune({
          provinceId: province.id,
          code: item.code,
          name: item.name,
          isActive: true,
        });
        if (item.code === 'NHI_TRUONG') {
          nhiTruongCommune = created;
        }
      }
    }

    if (nhiTruongCommune) {
      const existingNoLua = await this.repo.findHamletByNameInCommune(
        nhiTruongCommune.id,
        'Ấp Nô Lựa'
      );
      if (!existingNoLua) {
        await this.repo.createHamlet({
          communeId: nhiTruongCommune.id,
          code: 'AP_NO_LUA',
          name: 'Ấp Nô Lựa',
          isActive: true,
        });
      }
    }

    this.isSeeded = true;
  }

  async getTree(includeInactive = false) {
    await this.ensureDefaultAreasSeeded();
    return this.repo.getAreaTree(includeInactive);
  }

  async getProvinces(search?: string, includeInactive = false) {
    await this.ensureDefaultAreasSeeded();
    return this.repo.findProvinces(search, includeInactive);
  }

  async getCommunesByProvince(provinceId: string, search?: string, includeInactive = false) {
    await this.ensureDefaultAreasSeeded();
    const province = await this.repo.findProvinceById(provinceId);
    if (!province) {
      throw AppError.notFound('Không tìm thấy Tỉnh/Thành phố', ErrorCode.AREA_NOT_FOUND);
    }
    return this.repo.findCommunesByProvince(provinceId, search, includeInactive);
  }

  async getHamletsByCommune(communeId: string, search?: string, includeInactive = false) {
    await this.ensureDefaultAreasSeeded();
    const commune = await this.repo.findCommuneById(communeId);
    if (!commune) {
      throw AppError.notFound('Không tìm thấy Xã/Phường', ErrorCode.AREA_NOT_FOUND);
    }
    return this.repo.findHamletsByCommune(communeId, search, includeInactive);
  }

  async searchHamlets(params: {
    provinceId?: string;
    communeId?: string;
    search?: string;
    includeInactive?: boolean;
  }) {
    await this.ensureDefaultAreasSeeded();
    return this.repo.findAllHamlets(params);
  }

  async createProvince(dto: CreateProvinceDto) {
    await this.ensureDefaultAreasSeeded();
    const code = dto.code?.trim().toUpperCase() || slugifyCode(dto.name);
    const existing = await this.repo.findProvinceByCode(code);
    if (existing) {
      throw AppError.conflict(
        `Tỉnh/Thành phố với mã "${code}" đã tồn tại`,
        ErrorCode.AREA_ALREADY_EXISTS
      );
    }
    return this.repo.createProvince({
      code,
      name: dto.name.trim(),
      isActive: dto.isActive ?? true,
    });
  }

  async createCommune(dto: CreateCommuneDto) {
    await this.ensureDefaultAreasSeeded();
    const province = await this.repo.findProvinceById(dto.provinceId);
    if (!province) {
      throw AppError.notFound('Không tìm thấy Tỉnh/Thành phố', ErrorCode.AREA_NOT_FOUND);
    }
    const code = dto.code?.trim().toUpperCase() || slugifyCode(dto.name);
    return this.repo.createCommune({
      provinceId: dto.provinceId,
      code,
      name: dto.name.trim(),
      isActive: dto.isActive ?? true,
    });
  }

  async createHamlet(dto: CreateHamletDto) {
    await this.ensureDefaultAreasSeeded();
    const commune = await this.repo.findCommuneById(dto.communeId);
    if (!commune) {
      throw AppError.notFound('Không tìm thấy Xã/Phường được chọn', ErrorCode.AREA_NOT_FOUND);
    }

    const formattedName = normalizeHamletName(dto.name);
    const duplicate = await this.repo.findHamletByNameInCommune(dto.communeId, formattedName);
    if (duplicate) {
      throw AppError.conflict(
        `"${formattedName}" đã tồn tại trong ${commune.name}`,
        ErrorCode.AREA_ALREADY_EXISTS,
        [{ field: 'name', message: `"${formattedName}" đã tồn tại trong ${commune.name}` }]
      );
    }

    const code = dto.code?.trim().toUpperCase() || slugifyCode(formattedName);
    const created = await this.repo.createHamlet({
      communeId: dto.communeId,
      code,
      name: formattedName,
      isActive: dto.isActive ?? true,
    });

    await prisma.auditLog.create({
      data: {
        entityType: 'AREA',
        entityId: created.id,
        action: 'CREATE_HAMLET',
        reason: `Thêm ${created.name} thuộc ${commune.name}, ${commune.province.name}`,
        metadata: {
          hamletId: created.id,
          hamletName: created.name,
          communeId: commune.id,
          communeName: commune.name,
          provinceId: commune.provinceId,
          provinceName: commune.province.name,
        },
      },
    });

    return created;
  }

  async updateHamlet(id: string, dto: UpdateHamletDto) {
    const existing = await this.repo.findHamletById(id);
    if (!existing) {
      throw AppError.notFound('Không tìm thấy Ấp', ErrorCode.AREA_NOT_FOUND);
    }

    let formattedName: string | undefined = undefined;
    if (dto.name !== undefined) {
      formattedName = normalizeHamletName(dto.name);
      if (formattedName.toLowerCase() !== existing.name.toLowerCase()) {
        const duplicate = await this.repo.findHamletByNameInCommune(
          existing.communeId,
          formattedName
        );
        if (duplicate && duplicate.id !== id) {
          throw AppError.conflict(
            `"${formattedName}" đã tồn tại trong ${existing.commune.name}`,
            ErrorCode.AREA_ALREADY_EXISTS,
            [{ field: 'name', message: `"${formattedName}" đã tồn tại trong ${existing.commune.name}` }]
          );
        }
      }
    }

    return this.repo.updateHamlet(id, {
      name: formattedName,
      code: dto.code ? dto.code.trim().toUpperCase() : formattedName ? slugifyCode(formattedName) : undefined,
      isActive: dto.isActive,
    });
  }

  async deleteHamlet(id: string) {
    const existing = await this.repo.findHamletById(id);
    if (!existing) {
      throw AppError.notFound('Không tìm thấy Ấp', ErrorCode.AREA_NOT_FOUND);
    }

    const usage = await this.repo.countHamletUsage(id);
    if (usage.members > 0 || usage.collaterals > 0) {
      throw AppError.conflict(
        `Không thể xóa "${existing.name}" vì đang được sử dụng bởi ${usage.members} thành viên và ${usage.collaterals} tài sản thế chấp.`,
        ErrorCode.AREA_IN_USE
      );
    }

    await this.repo.deleteHamlet(id);
    return { id, deletedName: existing.name };
  }

  /**
   * Kiểm tra tính hợp lệ của chuỗi phân cấp Tỉnh -> Xã -> Ấp
   * và kết xuất Snapshot địa bàn đầy đủ.
   */
  async resolveLocationSnapshot(input: LocationSelectionInput): Promise<ResolvedLocationSnapshot> {
    await this.ensureDefaultAreasSeeded();

    const { provinceId, communeId, hamletId, addressDetail, fallbackAddress } = input;
    const trimmedDetail = addressDetail?.trim() || null;

    if (hamletId) {
      const hamlet = await this.repo.findHamletById(hamletId);
      if (!hamlet) {
        throw AppError.badRequest(
          'Ấp được chọn không tồn tại trong danh mục địa bàn của Quỹ',
          ErrorCode.AREA_NOT_FOUND,
          [{ field: 'hamletId', message: 'Ấp không tồn tại trong danh mục' }]
        );
      }

      if (communeId && hamlet.communeId !== communeId) {
        throw AppError.badRequest(
          `Ấp "${hamlet.name}" không thuộc xã đã chọn (thuộc ${hamlet.commune.name})`,
          ErrorCode.AREA_INVALID_HIERARCHY,
          [{ field: 'hamletId', message: `Ấp này không thuộc xã đã chọn` }]
        );
      }

      if (provinceId && hamlet.commune.provinceId !== provinceId) {
        throw AppError.badRequest(
          `Xã "${hamlet.commune.name}" không thuộc tỉnh đã chọn`,
          ErrorCode.AREA_INVALID_HIERARCHY,
          [{ field: 'communeId', message: `Xã này không thuộc tỉnh đã chọn` }]
        );
      }

      const parts = [
        trimmedDetail,
        hamlet.name,
        hamlet.commune.name,
        hamlet.commune.province.name,
      ].filter(Boolean);

      return {
        provinceId: hamlet.commune.provinceId,
        provinceName: hamlet.commune.province.name,
        communeId: hamlet.communeId,
        communeName: hamlet.commune.name,
        hamletId: hamlet.id,
        hamletName: hamlet.name,
        addressDetail: trimmedDetail,
        address: parts.join(', '),
      };
    }

    if (communeId) {
      const commune = await this.repo.findCommuneById(communeId);
      if (!commune) {
        throw AppError.badRequest(
          'Xã/Phường được chọn không tồn tại trong danh mục địa bàn của Quỹ',
          ErrorCode.AREA_NOT_FOUND,
          [{ field: 'communeId', message: 'Xã/Phường không tồn tại' }]
        );
      }

      if (provinceId && commune.provinceId !== provinceId) {
        throw AppError.badRequest(
          `Xã "${commune.name}" không thuộc tỉnh đã chọn`,
          ErrorCode.AREA_INVALID_HIERARCHY,
          [{ field: 'communeId', message: 'Xã không thuộc tỉnh đã chọn' }]
        );
      }

      const parts = [trimmedDetail, commune.name, commune.province.name].filter(Boolean);
      return {
        provinceId: commune.provinceId,
        provinceName: commune.province.name,
        communeId: commune.id,
        communeName: commune.name,
        hamletId: null,
        hamletName: null,
        addressDetail: trimmedDetail,
        address: parts.join(', '),
      };
    }

    if (provinceId) {
      const province = await this.repo.findProvinceById(provinceId);
      if (!province) {
        throw AppError.badRequest(
          'Tỉnh/Thành phố được chọn không tồn tại trong danh mục',
          ErrorCode.AREA_NOT_FOUND,
          [{ field: 'provinceId', message: 'Tỉnh/Thành phố không tồn tại' }]
        );
      }

      const parts = [trimmedDetail, province.name].filter(Boolean);
      return {
        provinceId: province.id,
        provinceName: province.name,
        communeId: null,
        communeName: null,
        hamletId: null,
        hamletName: null,
        addressDetail: trimmedDetail,
        address: parts.join(', '),
      };
    }

    return {
      provinceId: null,
      provinceName: null,
      communeId: null,
      communeName: null,
      hamletId: null,
      hamletName: null,
      addressDetail: trimmedDetail,
      address: fallbackAddress?.trim() || trimmedDetail || '',
    };
  }

  // ==========================================
  // AREA GROUP (Phân nhóm địa bàn cấp Xã)
  // ==========================================
  async getAreaGroups() {
    const [groups, allCommunes] = await Promise.all([
      this.repo.findAreaGroups(),
      prisma.commune.findMany({ select: { id: true, name: true, code: true } }),
    ]);

    const communeMap = new Map(allCommunes.map((c) => [c.id, c]));

    return groups.map((g) => {
      const populatedCommunes = (g.communeIds || [])
        .map((cid) => communeMap.get(cid))
        .filter(Boolean) as Array<{ id: string; name: string; code: string }>;

      return {
        ...g,
        communes: populatedCommunes,
      };
    });
  }

  async createAreaGroup(dto: CreateAreaGroupDto) {
    const rawName = dto.name.trim();
    if (rawName.length < 2) {
      throw AppError.badRequest('Tên nhóm phải có ít nhất 2 ký tự');
    }

    let code = (dto.code ? slugifyCode(dto.code) : slugifyCode(rawName)).toUpperCase();
    if (!code) {
      code = `NHOM_${Date.now().toString().slice(-4)}`;
    }

    const existing = await this.repo.findAreaGroupByCode(code);
    if (existing) {
      throw AppError.conflict(`Mã nhóm "${code}" đã tồn tại trên hệ thống`);
    }

    return this.repo.createAreaGroup({
      code,
      name: rawName,
      description: dto.description?.trim() || null,
      communeIds: dto.communeIds || [],
      isActive: dto.isActive ?? true,
    });
  }

  async updateAreaGroup(id: string, dto: UpdateAreaGroupDto) {
    const existing = await this.repo.findAreaGroupById(id);
    if (!existing) {
      throw AppError.notFound('Không tìm thấy nhóm địa bàn');
    }

    let code = existing.code;
    if (dto.code) {
      code = slugifyCode(dto.code).toUpperCase();
      if (code !== existing.code) {
        const dup = await this.repo.findAreaGroupByCode(code);
        if (dup && dup.id !== id) {
          throw AppError.conflict(`Mã nhóm "${code}" đã tồn tại trên hệ thống`);
        }
      }
    }

    return this.repo.updateAreaGroup(id, {
      code,
      name: dto.name?.trim() || existing.name,
      description: dto.description !== undefined ? dto.description?.trim() || null : existing.description,
      communeIds: dto.communeIds !== undefined ? dto.communeIds : existing.communeIds,
      isActive: dto.isActive !== undefined ? dto.isActive : existing.isActive,
    });
  }

  async deleteAreaGroup(id: string) {
    const existing = await this.repo.findAreaGroupById(id);
    if (!existing) {
      throw AppError.notFound('Không tìm thấy nhóm địa bàn');
    }
    await this.repo.deleteAreaGroup(id);
    return { success: true, message: `Đã xóa nhóm "${existing.name}" thành công` };
  }
}

export const areaService = new AreaService();

