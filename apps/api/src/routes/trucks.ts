import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireClient } from '../middleware/auth';
import { truckInputSchema } from '../lib/validate';
import { audit } from '../lib/audit';

export const trucksRouter = Router();

trucksRouter.use(requireClient);

trucksRouter.get('/', async (req, res) => {
  const trucks = await prisma.truck.findMany({
    where: { clientId: req.client!.id },
    orderBy: { createdAt: 'asc' },
    include: { _count: { select: { entries: true } } },
  });
  res.json(trucks.map((t) => ({ id: t.id, name: t.name, entryCount: t._count.entries })));
});

/** Plan-gated: Owner-Operator allows exactly 1 truck. */
trucksRouter.post('/', async (req, res) => {
  const parsed = truckInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid truck data.', details: parsed.error.flatten() });
    return;
  }
  const subscription = req.subscription;
  const maxTrucks = subscription?.plan.maxTrucks ?? 1;
  const count = await prisma.truck.count({ where: { clientId: req.client!.id } });
  if (count >= maxTrucks) {
    res.status(402).json({
      error: `Your plan includes ${maxTrucks} truck${maxTrucks === 1 ? '' : 's'}. Upgrade to add more.`,
      code: 'PLAN_LIMIT_REACHED',
    });
    return;
  }
  try {
    const truck = await prisma.truck.create({
      data: { clientId: req.client!.id, name: parsed.data.name },
    });
    await audit(req, 'truck.create', { entity: 'truck', entityId: truck.id });
    res.status(201).json({ id: truck.id, name: truck.name, entryCount: 0 });
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') {
      res.status(409).json({ error: 'A truck with this name already exists.' });
      return;
    }
    throw error;
  }
});

trucksRouter.delete('/:id', async (req, res) => {
  const truck = await prisma.truck.findFirst({ where: { id: req.params.id, clientId: req.client!.id } });
  if (!truck) {
    res.status(404).json({ error: 'Truck not found.' });
    return;
  }
  await prisma.truck.delete({ where: { id: truck.id } });
  await audit(req, 'truck.delete', { entity: 'truck', entityId: truck.id });
  res.status(204).end();
});
