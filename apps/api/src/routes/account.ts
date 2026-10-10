import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireClient } from '../middleware/auth';
import { accountUpdateSchema } from '../lib/validate';
import { audit } from '../lib/audit';

export const accountRouter = Router();

/** Current account: profile + plan + role. */
accountRouter.get('/', requireClient, async (req, res) => {
  const client = req.client!;
  const user = req.user!;
  const subscription = await prisma.subscription.findUnique({
    where: { clientId: client.id },
    include: { plan: true },
  });
  res.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role ?? 'CUSTOMER' },
    client: {
      displayName: client.displayName,
      businessName: client.businessName,
      phone: client.phone,
      createdAt: client.createdAt,
    },
    subscription: subscription && {
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      plan: {
        code: subscription.plan.code,
        name: subscription.plan.name,
        priceCents: subscription.plan.priceCents,
        maxTrucks: subscription.plan.maxTrucks,
      },
    },
  });
});

/** Update profile details. */
accountRouter.patch('/', requireClient, async (req, res) => {
  const parsed = accountUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid profile data.', details: parsed.error.flatten() });
    return;
  }
  const { displayName, businessName, phone } = parsed.data;
  const client = await prisma.client.update({
    where: { id: req.client!.id },
    data: {
      ...(displayName !== undefined ? { displayName } : {}),
      ...(businessName !== undefined ? { businessName } : {}),
      ...(phone !== undefined ? { phone } : {}),
    },
  });
  if (displayName !== undefined && displayName !== req.user!.name) {
    await prisma.user.update({ where: { id: req.user!.id }, data: { name: displayName } });
  }
  await audit(req, 'account.update', { entity: 'client', entityId: client.id });
  res.json({ displayName: client.displayName, businessName: client.businessName, phone: client.phone });
});
