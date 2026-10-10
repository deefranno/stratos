import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAdmin } from '../middleware/auth';
import { audit } from '../lib/audit';

export const adminRouter = Router();
adminRouter.use(requireAdmin);

/** Registered customers with subscription status. */
adminRouter.get('/customers', async (_req, res) => {
  const clients = await prisma.client.findMany({
    include: {
      user: { select: { id: true, email: true, createdAt: true, role: true } },
      subscription: { include: { plan: true } },
      trucks: { select: { id: true } },
      _count: { select: { tickets: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(
    clients.map((c) => ({
      id: c.id,
      displayName: c.displayName,
      businessName: c.businessName,
      email: c.user.email,
      role: c.user.role,
      createdAt: c.user.createdAt,
      truckCount: c.trucks.length,
      ticketCount: c._count.tickets,
      subscription: c.subscription && {
        status: c.subscription.status,
        planName: c.subscription.plan.name,
        priceCents: c.subscription.plan.priceCents,
        currentPeriodEnd: c.subscription.currentPeriodEnd,
      },
    }))
  );
});

/** Platform activity: subscription revenue and health metrics. */
adminRouter.get('/metrics', async (_req, res) => {
  const [customerCount, activeSubs, mrrRows, ticketCounts, entriesAgg] = await Promise.all([
    prisma.client.count(),
    prisma.subscription.count({ where: { status: { in: ['active', 'trialing'] } } }),
    prisma.subscription.findMany({
      where: { status: { in: ['active', 'trialing'] } },
      include: { plan: true },
    }),
    prisma.supportTicket.groupBy({ by: ['status'], _count: true }),
    prisma.monthlyEntry.aggregate({ _count: true }),
  ]);
  const mrrCents = mrrRows.reduce((sum, s) => sum + s.plan.priceCents, 0);
  res.json({
    customers: customerCount,
    activeSubscriptions: activeSubs,
    monthlyRecurringRevenueCents: mrrCents,
    totalEntries: entriesAgg._count,
    ticketsByStatus: Object.fromEntries(ticketCounts.map((t) => [t.status, t._count])),
  });
});

/** Support requests across all customers. */
adminRouter.get('/tickets', async (_req, res) => {
  const tickets = await prisma.supportTicket.findMany({
    include: { client: { select: { displayName: true, user: { select: { email: true } } } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(
    tickets.map((t) => ({
      id: t.id,
      subject: t.subject,
      message: t.message,
      status: t.status,
      createdAt: t.createdAt,
      customer: t.client?.displayName ?? 'Unknown',
      email: t.client?.user.email,
    }))
  );
});

adminRouter.patch('/tickets/:id', async (req, res) => {
  const status = String(req.body?.status ?? '');
  if (!['open', 'in_progress', 'resolved'].includes(status)) {
    res.status(400).json({ error: 'Status must be open, in_progress, or resolved.' });
    return;
  }
  const ticket = await prisma.supportTicket.update({ where: { id: req.params.id }, data: { status } });
  await audit(req, 'admin.ticket_status', { entity: 'supportTicket', entityId: ticket.id, metadata: { status } });
  res.json(ticket);
});

/** Manage authorized accounts (role changes). */
adminRouter.patch('/users/:id/role', async (req, res) => {
  const role = String(req.body?.role ?? '');
  if (!['CUSTOMER', 'ADMIN'].includes(role)) {
    res.status(400).json({ error: 'Role must be CUSTOMER or ADMIN.' });
    return;
  }
  if (req.params.id === req.user!.id) {
    res.status(400).json({ error: 'You cannot change your own role.' });
    return;
  }
  const user = await prisma.user.update({ where: { id: req.params.id }, data: { role: role as never } });
  await audit(req, 'admin.role_change', { entity: 'user', entityId: user.id, metadata: { role } });
  res.json({ id: user.id, role: user.role });
});

/** Platform audit trail. */
adminRouter.get('/audit', async (req, res) => {
  const take = Math.min(Number(req.query.limit ?? 100), 500);
  const logs = await prisma.auditLog.findMany({
    take,
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { email: true } } },
  });
  res.json(
    logs.map((l) => ({
      id: l.id,
      action: l.action,
      entity: l.entity,
      entityId: l.entityId,
      email: l.user?.email,
      ipAddress: l.ipAddress,
      createdAt: l.createdAt,
    }))
  );
});
