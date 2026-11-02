/**
 * Query Key Factory tập trung giúp invalidate chính xác sau mỗi thao tác ghi.
 */
export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  dashboard: {
    all: ['dashboard'] as const,
    summary: () => ['dashboard', 'summary'] as const,
    structure: () => ['dashboard', 'structure'] as const,
  },
  members: {
    all: ['members'] as const,
    lists: () => ['members', 'list'] as const,
    list: (filters: Record<string, unknown>) => ['members', 'list', filters] as const,
    details: () => ['members', 'detail'] as const,
    detail: (id: string) => ['members', 'detail', id] as const,
  },
  loans: {
    all: ['loans'] as const,
    lists: () => ['loans', 'list'] as const,
    list: (filters: Record<string, unknown>) => ['loans', 'list', filters] as const,
    details: () => ['loans', 'detail'] as const,
    detail: (id: string) => ['loans', 'detail', id] as const,
    summary: (id: string) => ['loans', 'detail', id, 'summary'] as const,
    collaterals: (loanId: string) => ['loans', 'detail', loanId, 'collaterals'] as const,
    disbursements: (loanId: string) => ['loans', 'detail', loanId, 'disbursements'] as const,
    repayments: (loanId: string) => ['loans', 'detail', loanId, 'repayments'] as const,
    interestEstimate: (loanId: string, params: Record<string, unknown>) =>
      ['loans', 'detail', loanId, 'interest-estimate', params] as const,
  },
  interestRates: {
    all: ['interest-rates'] as const,
    list: (filters: Record<string, unknown>) => ['interest-rates', 'list', filters] as const,
    current: (termType: string) => ['interest-rates', 'current', termType] as const,
    detail: (id: string) => ['interest-rates', 'detail', id] as const,
  },
  assetPricing: {
    all: ['asset-pricing'] as const,
    list: (filters: Record<string, unknown>) => ['asset-pricing', 'list', filters] as const,
    detail: (id: string) => ['asset-pricing', 'detail', id] as const,
    calculate: (params: { landCategory: string; area: number }) =>
      ['asset-pricing', 'calculate', params] as const,
  },
  reports: {
    all: ['reports'] as const,
    maturing: (filters: Record<string, unknown>) => ['reports', 'maturing', filters] as const,
    overdue: (filters: Record<string, unknown>) => ['reports', 'overdue', filters] as const,
    outstanding: (filters: Record<string, unknown>) => ['reports', 'outstanding', filters] as const,
  },
  users: {
    all: ['users'] as const,
    list: (filters: Record<string, unknown>) => ['users', 'list', filters] as const,
    roles: () => ['users', 'roles'] as const,
  },
  areas: {
    all: ['areas'] as const,
    tree: (includeInactive?: boolean) => ['areas', 'tree', { includeInactive }] as const,
    provinces: () => ['areas', 'provinces'] as const,
    communes: (provinceId: string) => ['areas', 'communes', provinceId] as const,
    hamlets: (communeId: string) => ['areas', 'hamlets', communeId] as const,
    searchHamlets: (filters: Record<string, unknown>) => ['areas', 'hamlets-search', filters] as const,
  },
} as const;

