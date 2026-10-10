import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireClient } from '../middleware/auth';
import { getStripe, stripeEnabled } from '../lib/stripe';
import { env } from '../lib/env';
import { audit } from '../lib/audit';
import { ensureSubscriptionPlans } from '../lib/plans';

export const billingRouter = Router();
billingRouter.use(requireClient);

/** Subscription + available plans. */
billingRouter.get('/', async (req, res) => {
  await ensureSubscriptionPlans();
  const [subscription, plans] = await Promise.all([
    prisma.subscription.findUnique({ where: { clientId: req.client!.id }, include: { plan: true } }),
    prisma.subscriptionPlan.findMany({ orderBy: { priceCents: 'asc' } }),
  ]);
  res.json({
    paymentsConfigured: stripeEnabled(),
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
    plans: plans.map((p) => ({
      code: p.code, name: p.name, description: p.description,
      priceCents: p.priceCents, maxTrucks: p.maxTrucks, active: p.active,
    })),
  });
});

/** Creates a Stripe Checkout session for the Owner-Operator plan (test mode). */
billingRouter.post('/checkout', async (req, res) => {
  if (!stripeEnabled()) {
    res.status(503).json({ error: 'Payments are not configured yet. Enable Stripe in environment settings.' });
    return;
  }
  const plans = await ensureSubscriptionPlans();
  const planCode = typeof req.body?.planCode === 'string' ? req.body.planCode : 'OWNER_OPERATOR';
  const plan = await prisma.subscriptionPlan.findUnique({ where: { code: planCode } });
  if (!plan || !plan.active || !plan.stripePriceId) {
    res.status(400).json({ error: 'This plan is not available for purchase yet.' });
    return;
  }
  const stripe = getStripe();
  const clientId = req.client!.id;
  let subscription = await prisma.subscription.findUnique({ where: { clientId } });
  let customerId = subscription?.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: req.user!.email,
      name: req.client!.displayName,
      metadata: { clientId },
    });
    customerId = customer.id;
    subscription = await prisma.subscription.upsert({
      where: { clientId },
      update: { stripeCustomerId: customerId },
      create: { clientId, planId: plans.ownerOperator.id, stripeCustomerId: customerId, status: 'inactive' },
    });
    if (!subscription) {
      res.status(500).json({ error: 'Could not initialize billing account.' });
      return;
    }
  }
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    client_reference_id: clientId,
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    success_url: `${env.appUrl}/billing?checkout=success`,
    cancel_url: `${env.appUrl}/billing?checkout=cancelled`,
    subscription_data: { metadata: { clientId, planCode } },
    metadata: { clientId, planCode },
  });
  const finalSubscription = subscription ?? (await prisma.subscription.findUnique({ where: { clientId } }));
  await audit(req, 'billing.checkout_created', { entity: 'subscription', entityId: finalSubscription?.id ?? clientId, metadata: { planCode } });
  res.json({ url: session.url });
});

/** Stripe Customer Portal. */
billingRouter.post('/portal', async (req, res) => {
  if (!stripeEnabled()) {
    res.status(503).json({ error: 'Payments are not configured yet.' });
    return;
  }
  const subscription = await prisma.subscription.findUnique({ where: { clientId: req.client!.id } });
  if (!subscription?.stripeCustomerId) {
    res.status(400).json({ error: 'No billing account exists yet.' });
    return;
  }
  const session = await getStripe().billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: `${env.appUrl}/billing`,
  });
  res.json({ url: session.url });
});
