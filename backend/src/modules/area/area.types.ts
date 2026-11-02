import { Province, Commune, Hamlet } from '@prisma/client';

export interface CreateProvinceDto {
  code?: string;
  name: string;
  isActive?: boolean;
}

export interface CreateCommuneDto {
  provinceId: string;
  code?: string;
  name: string;
  isActive?: boolean;
}

export interface CreateHamletDto {
  communeId: string;
  code?: string;
  name: string;
  isActive?: boolean;
}

export interface UpdateHamletDto {
  name?: string;
  code?: string;
  isActive?: boolean;
}

export interface LocationSelectionInput {
  provinceId?: string | null;
  communeId?: string | null;
  hamletId?: string | null;
  addressDetail?: string | null;
  fallbackAddress?: string | null;
}

export interface ResolvedLocationSnapshot {
  provinceId: string | null;
  provinceName: string | null;
  communeId: string | null;
  communeName: string | null;
  hamletId: string | null;
  hamletName: string | null;
  addressDetail: string | null;
  address: string;
}

export type AreaTreeProvince = Province & {
  communes: (Commune & {
    hamlets: Hamlet[];
  })[];
};

