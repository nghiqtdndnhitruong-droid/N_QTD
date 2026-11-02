import { apiDelete, apiGet, apiPost, apiPut } from '@/lib/http';
import type {
  AreaTreeProvince,
  Commune,
  CreateHamletPayload,
  Hamlet,
  Province,
  UpdateHamletPayload,
} from '../types/area.types';

export const areasApi = {
  getTree(includeInactive = false): Promise<AreaTreeProvince[]> {
    return apiGet<AreaTreeProvince[]>('/areas/tree', {
      params: includeInactive ? { includeInactive: true } : undefined,
    });
  },

  getProvinces(search?: string): Promise<Province[]> {
    return apiGet<Province[]>('/areas/provinces', {
      params: search ? { search } : undefined,
    });
  },

  getCommunesByProvince(provinceId: string, search?: string): Promise<Commune[]> {
    return apiGet<Commune[]>(`/areas/provinces/${provinceId}/communes`, {
      params: search ? { search } : undefined,
    });
  },

  getHamletsByCommune(communeId: string, search?: string): Promise<Hamlet[]> {
    return apiGet<Hamlet[]>(`/areas/communes/${communeId}/hamlets`, {
      params: search ? { search } : undefined,
    });
  },

  searchHamlets(params: {
    provinceId?: string;
    communeId?: string;
    search?: string;
    includeInactive?: boolean;
  }): Promise<Hamlet[]> {
    return apiGet<Hamlet[]>('/areas/hamlets', { params });
  },

  createHamlet(payload: CreateHamletPayload): Promise<Hamlet> {
    return apiPost<Hamlet, CreateHamletPayload>('/areas/hamlets', payload);
  },

  updateHamlet(id: string, payload: UpdateHamletPayload): Promise<Hamlet> {
    return apiPut<Hamlet, UpdateHamletPayload>(`/areas/hamlets/${id}`, payload);
  },

  deleteHamlet(id: string): Promise<{ id: string; deletedName: string }> {
    return apiDelete<{ id: string; deletedName: string }>(`/areas/hamlets/${id}`);
  },
};

