import { PrismaClient, ValuationType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Đang kiểm tra và di chuyển dữ liệu định giá từ Collateral sang LoanValuation...');

  const collaterals = await prisma.collateral.findMany({
    where: {
      OR: [
        { valuationAmount: { gt: 0 } },
        { pricePerSqMeter: { gt: 0 } },
      ],
    },
    include: {
      valuations: true,
    },
  });

  console.log(`Tìm thấy ${collaterals.length} tài sản có thông tin định giá.`);

  let migratedCount = 0;

  for (const c of collaterals) {
    // Nếu tài sản này chưa có dòng định giá nào
    if (c.valuations.length === 0) {
      let vType: ValuationType = ValuationType.THEO_NGHI_DINH_QUY;
      if (c.valuationMethod === 'THI_TRUONG') {
        vType = ValuationType.THEO_GIA_THI_TRUONG;
      }

      const area = c.area || 0;
      const actualArea = c.actualArea;
      const effectiveArea = actualArea && actualArea > 0 ? actualArea : area;
      const pricePerSqMeter = c.pricePerSqMeter || 0;
      const totalPrice = c.valuationAmount || (effectiveArea * pricePerSqMeter);

      await prisma.loanValuation.create({
        data: {
          loanId: c.loanId,
          collateralId: c.id,
          valuationType: vType,
          valuationDate: c.issueDate || null,
          sheetNumber: String(c.sheetNumber || ''),
          plotNumber: String(c.plotNumber || ''),
          area,
          actualArea: actualArea || null,
          pricePerSqMeter,
          totalPrice,
          notes: 'Di chuyển tự động từ tài sản gốc',
        },
      });

      migratedCount++;
    }
  }

  console.log(`✅ Đã chuyển đổi thành công ${migratedCount} bản ghi định giá sang LoanValuation.`);
}

main()
  .catch((err) => {
    console.error('❌ Lỗi khi di chuyển định giá:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

