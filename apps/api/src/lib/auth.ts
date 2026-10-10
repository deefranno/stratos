import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from './prisma';
import { env } from './env';
import { APP_NAME } from '@stratos/financial-engine';

/**
 * Better Auth handles sessions, password hashing, and sign-up/sign-in.
 * Customer onboarding (Client profile + starter Truck + Subscription) happens
 * lazily on first authenticated request via lib/onboarding.ts — keeping
 * Better Auth's sign-up transaction authoritative.
 */
export const auth = betterAuth({
  appName: APP_NAME,
  baseURL: env.apiUrl,
  secret: env.authSecret,
  // The React app runs on a separate origin (app.stratosfinancials.com).
  trustedOrigins: env.webOrigin.split(',').map((o) => o.trim()),
  telemetry: { enabled: false },
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },
  user: {
    additionalFields: {
      role: { type: 'string', defaultValue: 'CUSTOMER', required: false },
    },
  },
});

export type AuthSession = {
  user: { id: string; email: string; name: string; role?: string };
  session: { id: string };
};
