import { Router, raw, type Request, type Response } from 'express';
import type Stripe from 'stripe';
import { prisma } from '../lib/prisma';
import { getStripe, stripeEnabled } from '../lib/stripe';
import { env } from '../lib/env';
import { logger } from '../lib/logger';

export const webhooksRouter = Router();

async function activateFromSubscription(sub: Stripe.Subscription, clientIdHint?: string) {
  const clientId =
    clientIdHint ||
    (sub.metadata?.clientId as string | undefined) ||
    (await prisma.subscription.findUnique({ where: { stripeSubscriptionId: sub.id } })?.then((s) => s?.clientId));
  if (!clientId) {
    logger.warn('stripe_webhook_no_client', { subscriptionId: sub.id });
    return;
  }
  const priceId = sub.items.data[0]?.price?.id ?? '';
  const plan = await prisma.subscriptionPlan.findFirst({
    where: { OR: [priceId ? { stripePriceId: priceId } : {}, { code: sub.metadata?.planCode ?? '' }] },
  });
  const periodEnd = sub.items.data[0]?.current_period_end;
  await prisma.subscription.upsert({
    where: { clientId },
    update: {
      stripeSubscriptionId: sub.id,
      stripeCustomerId: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
      status: sub.status,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      ...(periodEnd ? { currentPeriodEnd: new Date(periodEnd * 1000) } : {}),
      ...(plan ? { planId: plan.id } : {}),
    },
    create: {
      clientId,
      planId: plan?.id ?? (await prisma.subscriptionPlan.findUniqueOrThrow({ where: { code: 'OWNER_OPERATOR' } })).id,
      stripeSubscriptionId: sub.id,
      stripeCustomerId: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
      status: sub.status,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      ...(periodEnd ? { currentPeriodEnd: new Date(periodEnd * 1000) } : {}),
    },
  });
  logger.info('stripe_subscription_synced', { subscriptionId: sub.id, status: sub.status });
}

async function handleEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      if (session.mode === 'subscription' && session.subscription) {
        const sub = await getStripe().subscriptions.retrieve(session.subscription as string);
        await activateFromSubscription(sub, session.client_reference_id ?? undefined);
      }
      break;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      await activateFromSubscription(event.data.object);
      break;
    }
    case 'invoice.paid':
    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      const parentSub = invoice.parent?.subscription_details?.subscription ?? null;
      const subId = typeof parentSub === 'string' ? parentSub : parentSub?.id;
      if (subId) {
        const sub = await getStripe().subscriptions.retrieve(subId);
        await activateFromSubscription(sub);
      }
      break;
    }
    default:
      logger.info('stripe_webhook_ignored', { type: event.type });
  }
}

/**
 * Stripe webhook receiver.
 * - Signature verified against STRIPE_WEBHOOK_SECRET.
 * - Idempotent: each Stripe event ID is recorded once (unique constraint);
 *   duplicate deliveries return 200 without reprocessing.
 */
webhooksRouter.post('/stripe', raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  if (!stripeEnabled() || !env.stripeWebhookSecret) {
    res.status(503).json({ error: 'Stripe webhooks are not configured.' });
    return;
  }
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(req.body, req.headers['stripe-signature'] as string, env.stripeWebhookSecret);
  } catch (error) {
    logger.warn('stripe_webhook_invalid_signature', { error: String(error) });
    res.status(400).json({ error: 'Invalid webhook signature.' });
    return;
  }
  const already = await prisma.stripeWebhookEvent.findUnique({ where: { stripeEventId: event.id } });
  if (already) {
    res.json({ received: true, duplicate: true });
    return;
  }
  await prisma.stripeWebhookEvent.create({
    data: {
      stripeEventId: event.id,
      type: event.type,
      payload: JSON.parse(JSON.stringify(event.data)) as never,
    },
  });
  try {
    await handleEvent(event);
    await prisma.stripeWebhookEvent.update({
      where: { stripeEventId: event.id },
      data: { processedAt: new Date() },
    });
    res.json({ received: true });
  } catch (error) {
    logger.error('stripe_webhook_processing_failed', { eventId: event.id, type: event.type, error: String(error) });
    await prisma.stripeWebhookEvent.update({
      where: { stripeEventId: event.id },
      data: { error: String(error).slice(0, 500) },
    });
    res.status(500).json({ error: 'Webhook processing failed.' });
  }
});
