import { PrismaClient } from '@prisma/client';
import { ensureSubscriptionPlans } from '../src/lib/plans';

/** Seeds/updates subscription plans (idempotent). Run: npm run prisma:seed -w @stratos/api */
const prisma = new PrismaClient();

async function main(): Promise<void> {
  const { ownerOperator } = await ensureSubscriptionPlans();
  console.log(`Plans ready. Owner-Operator plan id: ${ownerOperator.id} ($${ownerOperator.priceCents / 100}/mo)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
