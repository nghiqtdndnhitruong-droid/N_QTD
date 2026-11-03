import type { AxiosInstance } from 'axios';
import {
  CollateralAssetType,
  CollateralOwnerType,
  Gender,
  IdDocumentType,
  LoanStatus,
  LoanTermType,
  LoanType,
  ValuationMethod,
} from '@/shared/types';
import type { Member } from '@/features/members/types/member.types';
import type {
  Collateral,
  Disbursement,
  Loan,
  LoanSummary,
  Repayment,
} from '@/features/loans/types/loan.types';
import type { InterestRateConfig } from '@/features/interest-rates/types/interest-rate.types';
import type { AssetPricingRule } from '@/features/asset-pricing/types/asset-pricing.types';

/**
 * [DEV MOCK FALLBACK]
 * Chỉ được nạp động (dynamic import) khi `import.meta.env.DEV && env.enableMock === true`.
 * Nếu Backend thật tại localhost:3000 đang chạy -> đi thẳng tới Backend thật.
 * Nếu Backend chưa bật (Network Error / 502 / 504 từ Vite proxy) -> trả về dữ liệu mẫu trong bộ nhớ
 * để phục vụ kiểm thử giao diện đầy đủ. Hoàn toàn bị loại khỏi bản build Production.
 */

const mockMembers: Member[] = [
  {
    id: '6ae602b37e2c7916a7df5701',
    memberCode: 'TV-2026-001',
    fullName: 'Nguyễn Văn Hoài',
    yearOfBirth: 1978,
    idType: IdDocumentType.CAN_CUOC_CONG_DAN,
    idNumber: '080078001234',
    idIssueDate: '2022-05-12',
    idIssuePlace: 'Cục Cảnh sát QLHC về TTXH',
    idExpiry: '2038-05-12',
    gender: Gender.NAM,
    address: 'Ấp Bình Hòa, Xã Bình Tịnh, Huyện Tân Trụ, Tỉnh Long An',
    createdAt: '2026-01-10T08:00:00.000Z',
    updatedAt: '2026-01-10T08:00:00.000Z',
  },
  {
    id: '6ae602b37e2c7916a7df5702',
    memberCode: 'TV-2026-002',
    fullName: 'Trần Thị Ngọc Lan',
    yearOfBirth: 1984,
    idType: IdDocumentType.CAN_CUOC_CONG_DAN,
    idNumber: '080184005678',
    idIssueDate: '2023-03-20',
    idIssuePlace: 'Cục Cảnh sát QLHC về TTXH',
    idExpiry: '2044-03-20',
    gender: Gender.NU,
    address: 'Ấp 3, Xã Mỹ Thạnh Đông, Huyện Đức Huệ, Tỉnh Long An',
    createdAt: '2026-01-15T09:30:00.000Z',
    updatedAt: '2026-01-15T09:30:00.000Z',
  },
  {
    id: '6ae602b37e2c7916a7df5703',
    memberCode: 'TV-2026-003',
    fullName: 'Lê Hoàng Phúc',
    yearOfBirth: 1980,
    idType: IdDocumentType.CAN_CUOC,
    idNumber: '080080009876',
    idIssueDate: '2024-08-01',
    idIssuePlace: 'Bộ Công An',
    idExpiry: null,
    gender: Gender.NAM,
    address: 'Khu phố 2, Thị trấn Tầm Vu, Huyện Châu Thành, Tỉnh Long An',
    createdAt: '2026-02-01T10:00:00.000Z',
    updatedAt: '2026-02-01T10:00:00.000Z',
  },
];

const mockInterestRates: InterestRateConfig[] = [
  {
    id: 'rate-short-2026',
    effectiveDate: '2026-01-01T00:00:00.000Z',
    termType: LoanTermType.NGAN_HAN,
    isActive: true,
    note: 'Biểu lãi suất cho vay ngắn hạn năm 2026 (MOCK)',
    tiers: [
      { minAmount: 0, maxAmount: 100_000_000, annualRate: 9.6 },
      { minAmount: 100_000_001, maxAmount: 500_000_000, annualRate: 10.2 },
      { minAmount: 500_000_001, maxAmount: 2_000_000_000, annualRate: 10.8 },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'rate-medium-2026',
    effectiveDate: '2026-01-01T00:00:00.000Z',
    termType: LoanTermType.TRUNG_HAN,
    isActive: true,
    note: 'Biểu lãi suất cho vay trung hạn năm 2026 (MOCK)',
    tiers: [
      { minAmount: 0, maxAmount: 200_000_000, annualRate: 10.8 },
      { minAmount: 200_000_001, maxAmount: 2_000_000_000, annualRate: 11.4 },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

const mockAssetPricingRules: AssetPricingRule[] = [
  {
    id: 'price-01',
    landCategory: 'Đất ruộng nội đồng',
    pricePerSqMeter: 180_000,
    effectiveDate: '2026-01-01T00:00:00.000Z',
    isActive: true,
    note: 'Áp dụng cho đất chuyên trồng lúa nước (MOCK)',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'price-02',
    landCategory: 'Đất nông nghiệp cập kênh',
    pricePerSqMeter: 260_000,
    effectiveDate: '2026-01-01T00:00:00.000Z',
    isActive: true,
    note: 'Thuận tiện tưới tiêu và vận chuyển thủy (MOCK)',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'price-03',
    landCategory: 'Đất cập đường lộ nhựa',
    pricePerSqMeter: 650_000,
    effectiveDate: '2026-01-01T00:00:00.000Z',
    isActive: true,
    note: 'Mặt tiền đường liên xã/huyện (MOCK)',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

const mockLoans: Loan[] = [
  {
    id: '6ae602b37e2c7916a7df5801',
    memberId: mockMembers[0]!.id,
    member: mockMembers[0],
    loanType: LoanType.THE_CHAP,
    termType: LoanTermType.NGAN_HAN,
    termMonths: 12,
    loanAmount: 200_000_000,
    interestRate: 10.2,
    loanStartDate: '2026-02-10T00:00:00.000Z',
    contractNumber: 'KU-2026-001',
    contractDate: '2026-02-10T00:00:00.000Z',
    status: LoanStatus.DA_GIAI_NGAN,
    maturityDate: '2027-02-10T00:00:00.000Z',
    settlementDate: null,
    heir: {
      fullName: 'Nguyễn Minh Tuấn',
      yearOfBirth: 2001,
      idType: IdDocumentType.CAN_CUOC_CONG_DAN,
      idNumber: '080201003344',
      idIssueDate: '2021-06-15',
      idIssuePlace: 'Cục Cảnh sát QLHC về TTXH',
      idExpiry: null,
      gender: Gender.NAM,
      address: 'Ấp Bình Hòa, Xã Bình Tịnh, Huyện Tân Trụ, Tỉnh Long An',
      relationship: 'Con trai',
    },
    loanPlan: {
      purpose: 'Cải tạo vườn thanh long ruột đỏ và lắp hệ thống tưới tiết kiệm',
      loanAmount: 200_000_000,
      ownCapital: 80_000_000,
      borrowedCapital: 200_000_000,
      expenses: [
        { name: 'Trụ bê tông và giống thanh long', amount: 150_000_000 },
        { name: 'Hệ thống tưới và phân bón hữu cơ', amount: 130_000_000 },
      ],
      revenues: [{ name: 'Thu hoạch thanh long 3 vụ trong năm', amount: 420_000_000 }],
      totalExpenses: 280_000_000,
      totalRevenues: 420_000_000,
      profit: 140_000_000,
    },
    mortgageContract: {
      contractNumber: 'HĐTC-2026/001',
      contractDuration: '12 tháng',
      contractExpiryDate: '2027-02-10T00:00:00.000Z',
      committeeAuthDate: '2026-02-09T00:00:00.000Z',
    },
    collaterals: [
      {
        id: 'col-01',
        loanId: '6ae602b37e2c7916a7df5801',
        assetType: CollateralAssetType.QUYEN_SU_DUNG_DAT,
        assetCode: 'TS-2026-001',
        certificateNumber: 'CS 098123',
        sheetNumber: '14',
        plotNumber: '512',
        area: 1500,
        origin: 'Nhà nước công nhận QSDĐ',
        usagePurpose: 'Đất trồng cây lâu năm',
        usageDuration: 'Đến năm 2070',
        useRestrictions: 'Không',
        issuePlace: 'Sở TN&MT Tỉnh Long An',
        issueDate: '2020-04-10T00:00:00.000Z',
        valuationAmount: 390_000_000,
        valuationMethod: ValuationMethod.BANG_GIA_QUY,
        ownerType: CollateralOwnerType.NGUOI_VAY_CA_NHAN,
        thirdPartyInfo: null,
        createdAt: '2026-02-09T00:00:00.000Z',
        updatedAt: '2026-02-09T00:00:00.000Z',
      },
    ],
    disbursements: [
      {
        id: 'disb-01',
        loanId: '6ae602b37e2c7916a7df5801',
        disbursementDate: '2026-02-10T00:00:00.000Z',
        amount: 200_000_000,
        note: 'Giải ngân 100% theo phiếu chi PC-2026-018',
        createdAt: '2026-02-10T00:00:00.000Z',
        updatedAt: '2026-02-10T00:00:00.000Z',
      },
    ],
    repayments: [
      {
        id: 'rep-01',
        loanId: '6ae602b37e2c7916a7df5801',
        repaymentDate: '2026-05-10T00:00:00.000Z',
        principalAmount: 40_000_000,
        interestAmount: 5_030_137,
        interestDays: 90,
        note: 'Thu lãi quý 1 và trả một phần nợ gốc',
        createdAt: '2026-05-10T00:00:00.000Z',
        updatedAt: '2026-05-10T00:00:00.000Z',
      },
    ],
    createdAt: '2026-02-10T00:00:00.000Z',
    updatedAt: '2026-05-10T00:00:00.000Z',
  },
  {
    id: '6ae602b37e2c7916a7df5802',
    memberId: mockMembers[1]!.id,
    member: mockMembers[1],
    loanType: LoanType.TIN_CHAP,
    termType: LoanTermType.NGAN_HAN,
    termMonths: 12,
    loanAmount: 60_000_000,
    interestRate: 9.6,
    loanStartDate: '2026-03-01T00:00:00.000Z',
    contractNumber: 'KU-2026-002',
    contractDate: '2026-03-01T00:00:00.000Z',
    status: LoanStatus.DA_HOAN_THANH_HO_SO,
    maturityDate: null,
    settlementDate: null,
    heir: null,
    loanPlan: {
      purpose: 'Bổ sung vốn lưu động mua lúa giống và vật tư vụ Hè Thu',
      loanAmount: 60_000_000,
      ownCapital: 30_000_000,
      borrowedCapital: 60_000_000,
      expenses: [{ name: 'Mua lúa giống xác nhận và phân NPK', amount: 90_000_000 }],
      revenues: [{ name: 'Bán lúa thương phẩm cuối vụ', amount: 135_000_000 }],
      totalExpenses: 90_000_000,
      totalRevenues: 135_000_000,
      profit: 45_000_000,
    },
    mortgageContract: null,
    collaterals: [],
    disbursements: [],
    repayments: [],
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
  },
];

function computeSummary(loan: Loan): LoanSummary {
  const disbursements = loan.disbursements ?? [];
  const repayments = loan.repayments ?? [];
  const totalDisbursed = disbursements.reduce((s, d) => s + d.amount, 0);
  const totalPrincipalPaid = repayments.reduce((s, r) => s + r.principalAmount, 0);
  const totalInterestPaid = repayments.reduce((s, r) => s + r.interestAmount, 0);
  const currentPrincipalBalance = Math.max(0, totalDisbursed - totalPrincipalPaid);
  const remainingDisbursableAmount = Math.max(0, loan.loanAmount - totalDisbursed);
  const unpaidInterestDays = currentPrincipalBalance > 0 ? 90 : 0;
  const unpaidInterestAmount = Math.round(
    (currentPrincipalBalance * (loan.interestRate / 100) * unpaidInterestDays) / 365,
  );

  return {
    loanId: loan.id,
    contractNumber: loan.contractNumber,
    loanType: loan.loanType,
    termType: loan.termType,
    termMonths: loan.termMonths,
    approvedLoanAmount: loan.loanAmount,
    interestRateAnnual: loan.interestRate,
    status: loan.status,
    disbursementCount: disbursements.length,
    totalDisbursed,
    remainingDisbursableAmount,
    totalPrincipalPaid,
    totalInterestPaid,
    currentPrincipalBalance,
    lastInterestReferenceDate:
      repayments[repayments.length - 1]?.repaymentDate ??
      disbursements[0]?.disbursementDate ??
      null,
    unpaidInterestDays,
    unpaidInterestAmount,
    isInterestOverdue: unpaidInterestDays >= 90,
    expectedMaturityDate: loan.maturityDate,
    maturityDate: loan.maturityDate,
    isMortgageShortened: false,
    halfTermPaymentDate: null,
    halfTermPaymentStatus: null,
    halfTermRequiredAmount: null,
    halfTermPrincipalPaid: totalPrincipalPaid,
    isOverdue: loan.status === LoanStatus.QUA_HAN,
    overdueDays: loan.status === LoanStatus.QUA_HAN ? 15 : 0,
  };
}

function paginate<T>(items: T[], page = 1, limit = 10) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const slice = items.slice((page - 1) * limit, page * limit);
  return {
    success: true,
    message: 'OK (DEV Mock Fallback)',
    data: slice,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
    timestamp: new Date().toISOString(),
  };
}

function ok<T>(data: T) {
  return {
    success: true,
    message: 'OK (DEV Mock Fallback)',
    data,
    timestamp: new Date().toISOString(),
  };
}

export function attachDevMockFallback(client: AxiosInstance): void {
  client.interceptors.response.use(
    (res) => res,
    (error) => {
      const status = error?.response?.status as number | undefined;
      // Chỉ kích hoạt fallback khi Backend không phản hồi (mạng lỗi hoặc Vite proxy báo 500/502/504 khi backend tắt)
      const isBackendOffline = !error?.response || status === 502 || status === 504;
      if (!isBackendOffline || !error?.config) {
        return Promise.reject(error);
      }

      const method = (error.config.method || 'get').toLowerCase();
      const url: string = error.config.url || '';
      const params = (error.config.params || {}) as Record<string, any>;
      const body =
        typeof error.config.data === 'string'
          ? JSON.parse(error.config.data)
          : error.config.data || {};

      // 0. Areas (Tỉnh -> Xã -> Ấp)
      const mockProvinces = [
        {
          id: 'prov-vinh-long',
          code: 'VINH_LONG',
          name: 'Tỉnh Vĩnh Long',
          isActive: true,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ];
      const mockCommunes = [
        {
          id: 'com-nhi-truong',
          code: 'NHI_TRUONG',
          name: 'Xã Nhị Trường',
          provinceId: 'prov-vinh-long',
          isActive: true,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'com-tap-son',
          code: 'TAP_SON',
          name: 'Xã Tập Sơn',
          provinceId: 'prov-vinh-long',
          isActive: true,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'com-long-hiep',
          code: 'LONG_HIEP',
          name: 'Xã Long Hiệp',
          provinceId: 'prov-vinh-long',
          isActive: true,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ];
      const mockHamlets = [
        {
          id: 'ham-no-lua',
          code: 'NO_LUA',
          name: 'Ấp Nô Lựa',
          communeId: 'com-nhi-truong',
          isActive: true,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ];

      if (url === '/areas/tree' && method === 'get') {
        return Promise.resolve({
          status: 200,
          data: ok(
            mockProvinces.map((p) => ({
              ...p,
              communes: mockCommunes
                .filter((c) => c.provinceId === p.id)
                .map((c) => ({
                  ...c,
                  hamlets: mockHamlets.filter((h) => h.communeId === c.id),
                })),
            })),
          ),
        });
      }
      if (url === '/areas/provinces' && method === 'get') {
        return Promise.resolve({ status: 200, data: ok(mockProvinces) });
      }
      if (url === '/areas/communes' && method === 'get') {
        return Promise.resolve({ status: 200, data: ok(mockCommunes) });
      }
      if (url === '/areas/hamlets' && method === 'get') {
        const filtered = mockHamlets.filter(
          (h) => !params.communeId || h.communeId === params.communeId,
        );
        return Promise.resolve({ status: 200, data: ok(filtered) });
      }

      // 1. Members
      if (url === '/members' && method === 'get') {
        const search = String(params.search || '').toLowerCase();
        const filtered = mockMembers.filter(
          (m) =>
            (!search ||
              m.fullName.toLowerCase().includes(search) ||
              (m.memberCode ? m.memberCode.toLowerCase().includes(search) : false) ||
              m.idNumber.includes(search)) &&
            (!params.gender || m.gender === params.gender) &&
            (!params.idType || m.idType === params.idType),
        );
        return Promise.resolve({
          status: 200,
          data: paginate(filtered, Number(params.page) || 1, Number(params.limit) || 10),
        });
      }

      if (url === '/members' && method === 'post') {
        const created: Member = {
          id: `mock-member-${Date.now()}`,
          ...body,
          idExpiry: body.idExpiry || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        mockMembers.unshift(created);
        return Promise.resolve({ status: 201, data: ok(created) });
      }

      const memberMatch = url.match(/^\/members\/([^/]+)$/);
      if (memberMatch) {
        const found = mockMembers.find((m) => m.id === memberMatch[1]);
        if (method === 'get' && found) {
          return Promise.resolve({ status: 200, data: ok(found) });
        }
        if (method === 'put' && found) {
          Object.assign(found, body, { updatedAt: new Date().toISOString() });
          return Promise.resolve({ status: 200, data: ok(found) });
        }
      }

      // 2. Interest Rates
      if (url === '/interest-rates/current' && method === 'get') {
        const rate =
          mockInterestRates.find((r) => r.termType === params.termType && r.isActive) ??
          mockInterestRates[0];
        return Promise.resolve({ status: 200, data: ok(rate) });
      }

      if (url === '/interest-rates' && method === 'get') {
        return Promise.resolve({
          status: 200,
          data: paginate(mockInterestRates, Number(params.page) || 1, Number(params.limit) || 10),
        });
      }

      if (url === '/interest-rates' && method === 'post') {
        const created: InterestRateConfig = {
          id: `mock-rate-${Date.now()}`,
          ...body,
          isActive: true,
          note: body.note || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        mockInterestRates.unshift(created);
        return Promise.resolve({ status: 201, data: ok(created) });
      }

      // 3. Asset Pricing Rules
      if (url === '/asset-pricing-rules/calculate' && method === 'get') {
        const rule =
          mockAssetPricingRules.find((r) => r.landCategory === params.landCategory) ??
          mockAssetPricingRules[0]!;
        const area = Number(params.area) || 0;
        return Promise.resolve({
          status: 200,
          data: ok({
            landCategory: rule.landCategory,
            pricePerSqMeter: rule.pricePerSqMeter,
            area,
            valuationAmount: area * rule.pricePerSqMeter,
            effectiveDate: rule.effectiveDate,
          }),
        });
      }

      if (url === '/asset-pricing-rules' && method === 'get') {
        return Promise.resolve({
          status: 200,
          data: paginate(
            mockAssetPricingRules,
            Number(params.page) || 1,
            Number(params.limit) || 20,
          ),
        });
      }

      if (url === '/asset-pricing-rules' && method === 'post') {
        const created: AssetPricingRule = {
          id: `mock-price-${Date.now()}`,
          ...body,
          isActive: true,
          note: body.note || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        mockAssetPricingRules.unshift(created);
        return Promise.resolve({ status: 201, data: ok(created) });
      }

      const priceMatch = url.match(/^\/asset-pricing-rules\/([^/]+)$/);
      if (priceMatch && method === 'put') {
        const rule = mockAssetPricingRules.find((r) => r.id === priceMatch[1]);
        if (rule) {
          Object.assign(rule, body, { updatedAt: new Date().toISOString() });
          return Promise.resolve({ status: 200, data: ok(rule) });
        }
      }

      // 4. Loans
      if (url === '/loans' && method === 'get') {
        const search = String(params.search || '').toLowerCase();
        const filtered = mockLoans.filter(
          (l) =>
            (!params.memberId || l.memberId === params.memberId) &&
            (!params.status || l.status === params.status) &&
            (!params.loanType || l.loanType === params.loanType) &&
            (!params.termType || l.termType === params.termType) &&
            (!search ||
              (l.contractNumber || '').toLowerCase().includes(search) ||
              (l.member?.fullName || '').toLowerCase().includes(search) ||
              (l.member?.memberCode || '').toLowerCase().includes(search)),
        );
        return Promise.resolve({
          status: 200,
          data: paginate(filtered, Number(params.page) || 1, Number(params.limit) || 10),
        });
      }

      if (url === '/loans' && method === 'post') {
        const member = mockMembers.find((m) => m.id === body.memberId);
        const created: Loan = {
          id: `mock-loan-${Date.now()}`,
          memberId: body.memberId,
          member,
          loanType: body.loanType,
          termType: body.termType,
          termMonths: body.termType === LoanTermType.TRUNG_HAN ? 24 : 12,
          loanAmount: body.loanAmount,
          interestRate: body.termType === LoanTermType.TRUNG_HAN ? 10.8 : 9.6,
          loanStartDate: new Date().toISOString(),
          contractNumber: body.contractNumber || `KU-2026-${mockLoans.length + 1}`,
          contractDate: body.contractDate || new Date().toISOString(),
          status: LoanStatus.DANG_TAO,
          maturityDate: null,
          settlementDate: null,
          heir: body.heir || null,
          loanPlan: body.loanPlan || null,
          mortgageContract: body.mortgageContract || null,
          collaterals: [],
          disbursements: [],
          repayments: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        mockLoans.unshift(created);
        return Promise.resolve({ status: 201, data: ok(created) });
      }

      const loanSummaryMatch = url.match(/^\/loans\/([^/]+)\/summary$/);
      if (loanSummaryMatch && method === 'get') {
        const loan = mockLoans.find((l) => l.id === loanSummaryMatch[1]);
        if (loan) return Promise.resolve({ status: 200, data: ok(computeSummary(loan)) });
      }

      const loanStatusMatch = url.match(/^\/loans\/([^/]+)\/status$/);
      if (loanStatusMatch && method === 'patch') {
        const loan = mockLoans.find((l) => l.id === loanStatusMatch[1]);
        if (loan) {
          loan.status = body.status;
          if (body.status === LoanStatus.DA_TAT_TOAN) {
            loan.settlementDate = new Date().toISOString();
          }
          return Promise.resolve({ status: 200, data: ok(loan) });
        }
      }

      const loanCollateralsMatch = url.match(/^\/loans\/([^/]+)\/collaterals$/);
      if (loanCollateralsMatch && method === 'post') {
        const loan = mockLoans.find((l) => l.id === loanCollateralsMatch[1]);
        if (loan) {
          const col: Collateral = {
            id: `mock-col-${Date.now()}`,
            loanId: loan.id,
            ...body,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          loan.collaterals = [...(loan.collaterals ?? []), col];
          return Promise.resolve({ status: 201, data: ok(col) });
        }
      }

      const collateralIdMatch = url.match(/^\/collaterals\/([^/]+)$/);
      if (collateralIdMatch) {
        for (const loan of mockLoans) {
          const idx = (loan.collaterals ?? []).findIndex((c) => c.id === collateralIdMatch[1]);
          if (idx >= 0 && loan.collaterals) {
            if (method === 'delete') {
              loan.collaterals.splice(idx, 1);
              return Promise.resolve({ status: 200, data: ok(undefined) });
            }
            if (method === 'put') {
              Object.assign(loan.collaterals[idx]!, body);
              return Promise.resolve({ status: 200, data: ok(loan.collaterals[idx]) });
            }
          }
        }
      }

      const loanDisbMatch = url.match(/^\/loans\/([^/]+)\/disbursements$/);
      if (loanDisbMatch && method === 'post') {
        const loan = mockLoans.find((l) => l.id === loanDisbMatch[1]);
        if (loan) {
          const disb: Disbursement = {
            id: `mock-disb-${Date.now()}`,
            loanId: loan.id,
            disbursementDate: body.disbursementDate,
            amount: body.amount,
            note: body.note || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          loan.disbursements = [...(loan.disbursements ?? []), disb];
          loan.status = LoanStatus.DA_GIAI_NGAN;
          if (!loan.maturityDate) {
            const d = new Date(body.disbursementDate);
            d.setMonth(d.getMonth() + loan.termMonths);
            loan.maturityDate = d.toISOString();
          }
          return Promise.resolve({ status: 201, data: ok({ disbursement: disb }) });
        }
      }

      const loanEstMatch = url.match(/^\/loans\/([^/]+)\/repayments\/estimate-interest$/);
      if (loanEstMatch && method === 'get') {
        const loan = mockLoans.find((l) => l.id === loanEstMatch[1]);
        if (loan) {
          const sum = computeSummary(loan);
          const days = Number(params.days) || 90;
          const estimatedInterestAmount = Math.round(
            (sum.currentPrincipalBalance * (loan.interestRate / 100) * days) / 365,
          );
          return Promise.resolve({
            status: 200,
            data: ok({
              loanId: loan.id,
              contractNumber: loan.contractNumber,
              currentPrincipalBalance: sum.currentPrincipalBalance,
              annualInterestRate: loan.interestRate,
              interestCalculationDays: days,
              estimatedInterestAmount,
              formula: `${sum.currentPrincipalBalance.toLocaleString('vi-VN')} × ${loan.interestRate}% × ${days} / 365`,
            }),
          });
        }
      }

      const loanRepayMatch = url.match(/^\/loans\/([^/]+)\/repayments$/);
      if (loanRepayMatch && method === 'post') {
        const loan = mockLoans.find((l) => l.id === loanRepayMatch[1]);
        if (loan) {
          const rep: Repayment = {
            id: `mock-rep-${Date.now()}`,
            loanId: loan.id,
            repaymentDate: body.repaymentDate,
            principalAmount: body.principalAmount ?? 0,
            interestAmount: body.interestAmount ?? 0,
            interestDays: body.interestDays ?? 0,
            note: body.note || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          loan.repayments = [...(loan.repayments ?? []), rep];
          const sum = computeSummary(loan);
          if (sum.currentPrincipalBalance === 0 && body.autoSettleIfPaidInFull) {
            loan.status = LoanStatus.DA_TAT_TOAN;
            loan.settlementDate = body.repaymentDate;
          }
          return Promise.resolve({
            status: 201,
            data: ok({
              repayment: rep,
              remainingPrincipalBalance: sum.currentPrincipalBalance,
              isFullySettled: sum.currentPrincipalBalance === 0,
            }),
          });
        }
      }

      const loanIdMatch = url.match(/^\/loans\/([^/]+)$/);
      if (loanIdMatch) {
        const loan = mockLoans.find((l) => l.id === loanIdMatch[1]);
        if (loan && method === 'get') {
          return Promise.resolve({ status: 200, data: ok(loan) });
        }
        if (loan && method === 'put') {
          if (body.loanPlan) {
            const totalExpenses = (body.loanPlan.expenses || []).reduce(
              (s: number, e: any) => s + Number(e.amount || 0),
              0,
            );
            const totalRevenues = (body.loanPlan.revenues || []).reduce(
              (s: number, r: any) => s + Number(r.amount || 0),
              0,
            );
            body.loanPlan = {
              ...body.loanPlan,
              totalExpenses,
              totalRevenues,
              profit: totalRevenues - totalExpenses,
            };
          }
          Object.assign(loan, body, { updatedAt: new Date().toISOString() });
          return Promise.resolve({ status: 200, data: ok(loan) });
        }
      }

      return Promise.reject(error);
    },
  );
}

