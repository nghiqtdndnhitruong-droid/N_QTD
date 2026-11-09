import { apiDelete, apiGet, apiPost, apiPut } from '@/lib/http';
import type {
  AreaGroup,
  AreaTreeProvince,
  Commune,
  CreateAreaGroupPayload,
  CreateHamletPayload,
  Hamlet,
  Province,
  UpdateAreaGroupPayload,
  UpdateHamletPayload,
} from '../types/area.types';

export const areasApi = {
  getAreaGroups(): Promise<AreaGroup[]> {
    return apiGet<AreaGroup[]>('/areas/groups');
  },

  createAreaGroup(payload: CreateAreaGroupPayload): Promise<AreaGroup> {
    return apiPost<AreaGroup, CreateAreaGroupPayload>('/areas/groups', payload);
  },

  updateAreaGroup(id: string, payload: UpdateAreaGroupPayload): Promise<AreaGroup> {
    return apiPut<AreaGroup, UpdateAreaGroupPayload>(`/areas/groups/${id}`, payload);
  },

  deleteAreaGroup(id: string): Promise<{ success: boolean; message: string }> {
    return apiDelete<{ success: boolean; message: string }>(`/areas/groups/${id}`);
  },

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

