import { globalWordKeywordService } from '../src/modules/word-template/global-word-keyword.service';
import { prisma } from '../src/config/database';

async function main() {
  console.log('Seeding Global Word Keyword Catalog...');
  await globalWordKeywordService.seedDefaultCatalog();
  const count = await prisma.globalWordKeyword.count();
  console.log(`✅ Done! Total keywords in catalog: ${count}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

