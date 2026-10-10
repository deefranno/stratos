import Stripe from 'stripe';
import { env } from './env';
import { logger } from './logger';

/** Stripe is optional in local development: with no key the billing endpoints
 *  return a clear "payments not configured" error instead of crashing. */
let _stripe: Stripe | null = null;

export function stripeEnabled(): boolean {
  return env.stripeSecretKey.length > 0;
}

export function getStripe(): Stripe {
  if (!stripeEnabled()) {
    throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY (test mode key).');
  }
  if (!_stripe) {
    _stripe = new Stripe(env.stripeSecretKey);
    logger.info('stripe_client_initialized', { mode: env.stripeSecretKey.startsWith('sk_test') ? 'test' : 'live' });
  }
  return _stripe;
}
