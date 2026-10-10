import { prisma } from './prisma';
import { env } from './env';
import { ensureSubscriptionPlans } from './plans';
import type { Client } from '@prisma/client';

/**
 * Creates the customer profile (Client + starter Truck + Subscription) on
 * first authenticated request. Running this lazily — instead of inside the
 * sign-up transaction — keeps Better Auth's writes authoritative and avoids
 * cross-connection visibility problems.
 */
export async function ensureClientForUser(user: { id: string; email: string; name: string }): Promise<Client> {
  // Env-driven admin bootstrap runs on every check so accounts listed in
  // ADMIN_EMAILS are (re)promoted even if they registered earlier.
  if (env.adminEmails.includes((user.email ?? '').toLowerCase())) {
    await prisma.user.updateMany({ where: { id: user.id, role: 'CUSTOMER' }, data: { role: 'ADMIN' } });
  }
  const existing = await prisma.client.findUnique({ where: { userId: user.id } });
  if (existing) return existing;

  const plans = await ensureSubscriptionPlans();
  const client = await prisma.client.create({
    data: {
      userId: user.id,
      displayName: user.name || 'Owner',
      trucks: { create: { name: 'Truck #1' } },
    },
  });
  await prisma.subscription.create({
    data: { clientId: client.id, planId: plans.ownerOperator.id, status: 'inactive' },
  });
  return client;
}
