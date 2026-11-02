export interface Province {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Commune {
  id: string;
  code: string;
  name: string;
  provinceId: string;
  province?: Province;
  isActive: boolean;
  _count?: {
    hamlets: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface Hamlet {
  id: string;
  code: string;
  name: string;
  communeId: string;
  commune?: Commune & { province?: Province };
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AreaTreeProvince extends Province {
  communes: (Commune & {
    hamlets: Hamlet[];
  })[];
}

export interface CreateHamletPayload {
  communeId: string;
  name: string;
  code?: string;
  isActive?: boolean;
}

export interface UpdateHamletPayload {
  name?: string;
  code?: string;
  isActive?: boolean;
}

