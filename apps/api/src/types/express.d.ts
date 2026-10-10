import type { AuthSession } from '../lib/auth';
import type { Client, Subscription, SubscriptionPlan } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: AuthSession['user'];
      authSession?: AuthSession;
      client?: Client;
      subscription?: (Subscription & { plan: SubscriptionPlan }) | null;
    }
  }
}
export {};
