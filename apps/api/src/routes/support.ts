import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireClient } from '../middleware/auth';
import { supportTicketSchema } from '../lib/validate';
import { audit } from '../lib/audit';

export const supportRouter = Router();
supportRouter.use(requireClient);

supportRouter.get('/', async (req, res) => {
  const tickets = await prisma.supportTicket.findMany({
    where: { clientId: req.client!.id },
    orderBy: { createdAt: 'desc' },
  });
  res.json(tickets);
});

supportRouter.post('/', async (req, res) => {
  const parsed = supportTicketSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid support request.', details: parsed.error.flatten() });
    return;
  }
  const ticket = await prisma.supportTicket.create({
    data: { clientId: req.client!.id, subject: parsed.data.subject, message: parsed.data.message },
  });
  await audit(req, 'support.ticket_created', { entity: 'supportTicket', entityId: ticket.id });
  res.status(201).json(ticket);
});
