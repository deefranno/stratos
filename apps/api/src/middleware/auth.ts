import type { Request, Response, NextFunction } from 'express';
import { auth } from '../lib/auth';
import { prisma } from '../lib/prisma';
import { env } from '../lib/env';
import { logger } from '../lib/logger';
import { ensureClientForUser } from '../lib/onboarding';

/** Resolves the Better Auth session for a request, if any. */
export async function resolveSession(req: Request): Promise<void> {
  const session = await auth.api.getSession({ headers: req.headers as unknown as Headers });
  if (session) {
    req.authSession = session as never;
    req.user = session.user as unknown as Request['user'];
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await resolveSession(req);
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    // Onboard on first request (idempotent): creates Client/Truck/Subscription
    // and promotes ADMIN_EMAILS accounts. Role is re-read AFTER onboarding so
    // the very first request already sees the authoritative role.
    await ensureClientForUser(req.user);
    const dbUser = await prisma.user.findUnique({ where: { id: req.user.id }, select: { role: true } });
    if (dbUser) req.user.role = dbUser.role;
    next();
  } catch (error) {
    logger.error('require_auth_failed', { error: String(error) });
    res.status(500).json({ error: 'Authentication check failed.' });
  }
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  await requireAuth(req, res, async () => {
    if (!req.user) return;
    if (req.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Administrator access required.' });
      return;
    }
    next();
  });
}

/** Loads the customer's Client row + subscription and enforces the feature gate. */
export async function requireClient(req: Request, res: Response, next: NextFunction): Promise<void> {
  await requireAuth(req, res, async () => {
    if (!req.user) return;
    const client = await prisma.client.findUnique({
      where: { userId: req.user.id },
      include: { subscription: { include: { plan: true } } },
    });
    if (!client) {
      res.status(403).json({ error: 'No customer profile is linked to this account.' });
      return;
    }
    req.client = client;
    req.subscription = client.subscription;
    const active = client.subscription && ['active', 'trialing'].includes(client.subscription.status);
    if (env.requireActiveSubscription && !active) {
      res.status(402).json({ error: 'An active subscription is required.', code: 'SUBSCRIPTION_REQUIRED' });
      return;
    }
    next();
  });
}
