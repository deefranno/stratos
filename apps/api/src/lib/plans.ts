import { prisma } from './prisma';
import type { SubscriptionPlan } from '@prisma/client';

/** Plans are defined by the product spec. Only Owner-Operator activates at launch. */
export const PLAN_SEED = [
  {
    code: 'OWNER_OPERATOR',
    name: 'Owner-Operator',
    description: 'One truck. Monthly financial tracking, trend charts, and reports.',
    priceCents: 2000, // $20/month
    maxTrucks: 1,
    active: true,
  },
  {
    code: 'SMALL_FLEET',
    name: 'Small Fleet',
    description: 'Up to 3 trucks. Planned for a future release.',
    priceCents: 5000, // $50/month
    maxTrucks: 3,
    active: false,
  },
  {
    code: 'GROWING_FLEET',
    name: 'Growing Fleet',
    description: 'Up to 10 trucks. Planned for a future release.',
    priceCents: 10000, // $100/month
    maxTrucks: 10,
    active: false,
  },
] as const;

let cached: { ownerOperator: SubscriptionPlan } | null = null;

/** Idempotently seeds/updates plans; binds Stripe price IDs from env when set. */
export async function ensureSubscriptionPlans(): Promise<{ ownerOperator: SubscriptionPlan }> {
  if (cached) return cached;
  const priceByCode: Record<string, string> = {
    OWNER_OPERATOR: process.env.STRIPE_PRICE_OWNER_OPERATOR ?? '',
    SMALL_FLEET: process.env.STRIPE_PRICE_SMALL_FLEET ?? '',
    GROWING_FLEET: process.env.STRIPE_PRICE_GROWING_FLEET ?? '',
  };
  let ownerOperator: SubscriptionPlan | null = null;
  for (const plan of PLAN_SEED) {
    const row = await prisma.subscriptionPlan.upsert({
      where: { code: plan.code },
      update: { priceCents: plan.priceCents, active: plan.active, stripePriceId: priceByCode[plan.code] || null },
      create: {
        code: plan.code,
        name: plan.name,
        description: plan.description,
        priceCents: plan.priceCents,
        maxTrucks: plan.maxTrucks,
        active: plan.active,
        stripePriceId: priceByCode[plan.code] || null,
      },
    });
    if (plan.code === 'OWNER_OPERATOR') ownerOperator = row;
  }
  if (!ownerOperator) throw new Error('Failed to seed Owner-Operator plan');
  cached = { ownerOperator };
  return cached;
}
