import { prisma } from '../../config/database';
import { Province, Commune, Hamlet, Prisma } from '@prisma/client';
import { AreaTreeProvince } from './area.types';

export class AreaRepository {
  async findProvinces(search?: string, includeInactive = false): Promise<Province[]> {
    const where: Prisma.ProvinceWhereInput = {};
    if (!includeInactive) where.isActive = true;
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }
    return prisma.province.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async findProvinceById(id: string): Promise<Province | null> {
    return prisma.province.findUnique({ where: { id } });
  }

  async findProvinceByCode(code: string): Promise<Province | null> {
    return prisma.province.findUnique({ where: { code } });
  }

  async findCommunesByProvince(
    provinceId: string,
    search?: string,
    includeInactive = false
  ): Promise<(Commune & { _count?: { hamlets: number } })[]> {
    const where: Prisma.CommuneWhereInput = { provinceId };
    if (!includeInactive) where.isActive = true;
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }
    return prisma.commune.findMany({
      where,
      include: {
        _count: { select: { hamlets: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findCommuneById(id: string): Promise<(Commune & { province: Province }) | null> {
    return prisma.commune.findUnique({
      where: { id },
      include: { province: true },
    });
  }

  async findHamletsByCommune(
    communeId: string,
    search?: string,
    includeInactive = false
  ): Promise<(Hamlet & { commune: Commune & { province: Province } })[]> {
    const where: Prisma.HamletWhereInput = { communeId };
    if (!includeInactive) where.isActive = true;
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }
    return prisma.hamlet.findMany({
      where,
      include: {
        commune: {
          include: { province: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findAllHamlets(params: {
    provinceId?: string;
    communeId?: string;
    search?: string;
    includeInactive?: boolean;
  }) {
    const where: Prisma.HamletWhereInput = {};
    if (!params.includeInactive) where.isActive = true;
    if (params.communeId) {
      where.communeId = params.communeId;
    } else if (params.provinceId) {
      where.commune = { provinceId: params.provinceId };
    }
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { code: { contains: params.search, mode: 'insensitive' } },
        { commune: { name: { contains: params.search, mode: 'insensitive' } } },
      ];
    }

    return prisma.hamlet.findMany({
      where,
      include: {
        commune: {
          include: { province: true },
        },
      },
      orderBy: [{ commune: { name: 'asc' } }, { name: 'asc' }],
    });
  }

  async findHamletById(
    id: string
  ): Promise<(Hamlet & { commune: Commune & { province: Province } }) | null> {
    return prisma.hamlet.findUnique({
      where: { id },
      include: {
        commune: {
          include: { province: true },
        },
      },
    });
  }

  async findHamletByNameInCommune(communeId: string, name: string): Promise<Hamlet | null> {
    return prisma.hamlet.findFirst({
      where: {
        communeId,
        name: { equals: name.trim(), mode: 'insensitive' },
      },
    });
  }

  async getAreaTree(includeInactive = false): Promise<AreaTreeProvince[]> {
    const activeFilter = includeInactive ? {} : { isActive: true };
    return prisma.province.findMany({
      where: activeFilter,
      include: {
        communes: {
          where: activeFilter,
          orderBy: { name: 'asc' },
          include: {
            hamlets: {
              where: activeFilter,
              orderBy: { name: 'asc' },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createProvince(data: { code: string; name: string; isActive?: boolean }) {
    return prisma.province.create({
      data: {
        code: data.code,
        name: data.name,
        isActive: data.isActive ?? true,
      },
    });
  }

  async createCommune(data: {
    provinceId: string;
    code: string;
    name: string;
    isActive?: boolean;
  }) {
    return prisma.commune.create({
      data: {
        provinceId: data.provinceId,
        code: data.code,
        name: data.name,
        isActive: data.isActive ?? true,
      },
    });
  }

  async createHamlet(data: {
    communeId: string;
    code: string;
    name: string;
    isActive?: boolean;
  }) {
    return prisma.hamlet.create({
      data: {
        communeId: data.communeId,
        code: data.code,
        name: data.name,
        isActive: data.isActive ?? true,
      },
      include: {
        commune: {
          include: { province: true },
        },
      },
    });
  }

  async updateHamlet(
    id: string,
    data: { name?: string; code?: string; isActive?: boolean }
  ) {
    return prisma.hamlet.update({
      where: { id },
      data,
      include: {
        commune: {
          include: { province: true },
        },
      },
    });
  }

  async deleteHamlet(id: string) {
    return prisma.hamlet.delete({ where: { id } });
  }

  async countHamletUsage(hamletId: string): Promise<{ members: number; collaterals: number }> {
    const [members, collaterals] = await Promise.all([
      prisma.member.count({ where: { hamletId, isDeleted: { not: true } } }),
      prisma.collateral.count({ where: { hamletId } }),
    ]);
    return { members, collaterals };
  }

  // ==========================================
  // AREA GROUP (Phân nhóm địa bàn cấp Xã)
  // ==========================================
  async findAreaGroups() {
    return prisma.areaGroup.findMany({
      orderBy: { createdAt: 'asc' },
    });
  }

  async findAreaGroupById(id: string) {
    return prisma.areaGroup.findUnique({
      where: { id },
    });
  }

  async findAreaGroupByCode(code: string) {
    return prisma.areaGroup.findUnique({
      where: { code },
    });
  }

  async createAreaGroup(data: {
    code: string;
    name: string;
    description?: string | null;
    communeIds: string[];
    isActive?: boolean;
  }) {
    return prisma.areaGroup.create({
      data: {
        code: data.code,
        name: data.name,
        description: data.description,
        communeIds: data.communeIds,
        isActive: data.isActive ?? true,
      },
    });
  }

  async updateAreaGroup(
    id: string,
    data: {
      code?: string;
      name?: string;
      description?: string | null;
      communeIds?: string[];
      isActive?: boolean;
    }
  ) {
    return prisma.areaGroup.update({
      where: { id },
      data,
    });
  }

  async deleteAreaGroup(id: string) {
    return prisma.areaGroup.delete({
      where: { id },
    });
  }
}

export const areaRepository = new AreaRepository();


