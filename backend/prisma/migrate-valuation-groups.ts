import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Đang kiểm tra và chuẩn hóa dữ liệu LoanValuation sang mô hình nhóm (Group Valuation)...');

  const valuations = await prisma.loanValuation.findMany();
  console.log(`Tìm thấy ${valuations.length} bản ghi định giá trong database.`);

  let updatedCount = 0;

  for (const v of valuations) {
    let needsUpdate = false;
    const currentCollateralIds: string[] = (v as any).collateralIds || [];

    let newCollateralIds = [...currentCollateralIds];
    if (newCollateralIds.length === 0 && v.collateralId) {
      newCollateralIds.push(v.collateralId);
      needsUpdate = true;
    }

    const effArea = v.actualArea && v.actualArea > 0 ? v.actualArea : v.area;
    const computedBeforeRound = (v as any).totalPriceBeforeRound || (v.pricePerSqMeter > 0 ? Math.round(effArea * v.pricePerSqMeter) : v.totalPrice);
    const flooredPrice = Math.floor(computedBeforeRound / 1_000_000) * 1_000_000;

    if (!(v as any).totalPriceBeforeRound || (v as any).totalPriceBeforeRound !== computedBeforeRound) {
      needsUpdate = true;
    }

    if (v.totalPrice !== flooredPrice) {
      needsUpdate = true;
    }

    if (needsUpdate) {
      await prisma.loanValuation.update({
        where: { id: v.id },
        data: {
          collateralIds: newCollateralIds,
          totalPriceBeforeRound: computedBeforeRound,
          totalPrice: flooredPrice,
        },
      });
      updatedCount++;
    }
  }

  console.log(`✅ Đã chuẩn hóa thành công ${updatedCount}/${valuations.length} bản ghi LoanValuation sang mô hình nhóm.`);
}

main()
  .catch((err) => {
    console.error('❌ Lỗi khi chuẩn hóa nhóm định giá:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

