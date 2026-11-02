import { PrismaClient, LoanTermType, IdDocumentType, Gender } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Bắt đầu khởi tạo dữ liệu mẫu cho Quỹ tín dụng...');

  // 1. Cấu hình bảng lãi suất cho Ngắn hạn (12 tháng)
  const shortTermConfig = await prisma.interestRateConfig.create({
    data: {
      effectiveDate: new Date('2026-01-01'),
      termType: LoanTermType.NGAN_HAN,
      isActive: true,
      note: 'Bảng lãi suất vay ngắn hạn (12 tháng) công bố đầu năm 2026',
      tiers: [
        {
          minAmount: 0,
          maxAmount: 99_000_000,
          annualRate: 12.6, // 12.6% / năm
        },
        {
          minAmount: 100_000_000,
          maxAmount: 199_000_000,
          annualRate: 12.0, // 12.0% / năm
        },
        {
          minAmount: 200_000_000,
          maxAmount: 10_000_000_000,
          annualRate: 11.5, // 11.5% / năm
        },
      ],
    },
  });
  console.log(`✅ Đã tạo bảng lãi suất ngắn hạn: ID ${shortTermConfig.id}`);

  // 2. Cấu hình bảng lãi suất cho Trung hạn (24 tháng)
  const mediumTermConfig = await prisma.interestRateConfig.create({
    data: {
      effectiveDate: new Date('2026-01-01'),
      termType: LoanTermType.TRUNG_HAN,
      isActive: true,
      note: 'Bảng lãi suất vay trung hạn (24 tháng) công bố đầu năm 2026',
      tiers: [
        {
          minAmount: 0,
          maxAmount: 99_000_000,
          annualRate: 13.2,
        },
        {
          minAmount: 100_000_000,
          maxAmount: 199_000_000,
          annualRate: 12.5,
        },
        {
          minAmount: 200_000_000,
          maxAmount: 10_000_000_000,
          annualRate: 12.0,
        },
      ],
    },
  });
  console.log(`✅ Đã tạo bảng lãi suất trung hạn: ID ${mediumTermConfig.id}`);

  // 3. Quy định bảng giá đất của Quỹ
  const pricingRules = [
    {
      landCategory: 'Đất ruộng',
      pricePerSqMeter: 60_000, // 60.000 VNĐ / m²
      effectiveDate: new Date('2026-01-01'),
      note: 'Đất nông nghiệp trồng lúa',
    },
    {
      landCategory: 'Cập kênh',
      pricePerSqMeter: 70_000, // 70.000 VNĐ / m²
      effectiveDate: new Date('2026-01-01'),
      note: 'Đất tiếp giáp kênh rạch',
    },
    {
      landCategory: 'Cập đường lộ',
      pricePerSqMeter: 150_000, // 150.000 VNĐ / m²
      effectiveDate: new Date('2026-01-01'),
      note: 'Đất tiếp giáp đường lộ liên xã/huyện',
    },
  ];

  for (const rule of pricingRules) {
    await prisma.assetPricingRule.create({ data: rule });
  }
  console.log('✅ Đã tạo các quy định bảng giá đất');

  // 4. Địa bàn quản lý của Quỹ tín dụng: Tỉnh Vĩnh Long -> 3 Xã -> Ấp Nô Lựa
  const province = await prisma.province.upsert({
    where: { code: 'VINH_LONG' },
    update: {},
    create: {
      code: 'VINH_LONG',
      name: 'Tỉnh Vĩnh Long',
      isActive: true,
    },
  });

  const nhiTruong = await prisma.commune.upsert({
    where: { provinceId_code: { provinceId: province.id, code: 'NHI_TRUONG' } },
    update: {},
    create: {
      provinceId: province.id,
      code: 'NHI_TRUONG',
      name: 'Xã Nhị Trường',
      isActive: true,
    },
  });

  await prisma.commune.upsert({
    where: { provinceId_code: { provinceId: province.id, code: 'TAP_SON' } },
    update: {},
    create: {
      provinceId: province.id,
      code: 'TAP_SON',
      name: 'Xã Tập Sơn',
      isActive: true,
    },
  });

  await prisma.commune.upsert({
    where: { provinceId_code: { provinceId: province.id, code: 'LONG_HIEP' } },
    update: {},
    create: {
      provinceId: province.id,
      code: 'LONG_HIEP',
      name: 'Xã Long Hiệp',
      isActive: true,
    },
  });

  const apNoLua = await prisma.hamlet.upsert({
    where: { communeId_name: { communeId: nhiTruong.id, name: 'Ấp Nô Lựa' } },
    update: {},
    create: {
      communeId: nhiTruong.id,
      code: 'AP_NO_LUA',
      name: 'Ấp Nô Lựa',
      isActive: true,
    },
  });
  console.log('✅ Đã tạo địa bàn Quỹ tín dụng: Tỉnh Vĩnh Long (Xã Nhị Trường, Tập Sơn, Long Hiệp; Ấp Nô Lựa)');

  // 5. Thành viên mẫu
  const member = await prisma.member.upsert({
    where: { memberCode: 'TV-0001' },
    update: {},
    create: {
      memberCode: 'TV-0001',
      fullName: 'Nguyễn Văn An',
      yearOfBirth: 1985,
      idType: IdDocumentType.CAN_CUOC_CONG_DAN,
      idNumber: '079085001234',
      idIssueDate: new Date('2021-05-15'),
      idIssuePlace: 'Cục Cảnh sát QLHC về TTXH',
      gender: Gender.NAM,
      provinceId: province.id,
      provinceName: province.name,
      communeId: nhiTruong.id,
      communeName: nhiTruong.name,
      hamletId: apNoLua.id,
      hamletName: apNoLua.name,
      address: 'Ấp Nô Lựa, Xã Nhị Trường, Tỉnh Vĩnh Long',
      isDeleted: false,
    },
  });
  console.log(`✅ Đã tạo thành viên mẫu: ${member.fullName} (Mã: ${member.memberCode})`);

  console.log('🎉 Seed dữ liệu ban đầu hoàn tất!');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi khi seed dữ liệu:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

