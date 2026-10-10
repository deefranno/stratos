/** Environment access with strict validation at boot. */
const required = (key: string, fallback?: string): string => {
  const value = process.env[key] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

export const env = {
  get port() { return Number(process.env.PORT ?? 3001); },
  get nodeEnv() { return process.env.NODE_ENV ?? 'development'; },
  get isProduction() { return this.nodeEnv === 'production'; },
  get webOrigin() { return required('WEB_ORIGIN', 'http://localhost:5173'); },
  get apiUrl() { return required('API_URL', 'http://localhost:3001'); },
  get appUrl() { return required('APP_URL', 'http://localhost:5173'); },
  get databaseUrl() { return required('DATABASE_URL'); },
  get authSecret() { return required('AUTH_SECRET', 'dev-only-insecure-secret-change-me'); },
  get stripeSecretKey() { return process.env.STRIPE_SECRET_KEY ?? ''; },
  get stripeWebhookSecret() { return process.env.STRIPE_WEBHOOK_SECRET ?? ''; },
  get stripePriceOwnerOperator() { return process.env.STRIPE_PRICE_OWNER_OPERATOR ?? ''; },
  get requireActiveSubscription() { return process.env.REQUIRE_ACTIVE_SUBSCRIPTION === 'true'; },
  get adminEmails(): string[] {
    return (process.env.ADMIN_EMAILS ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  },
};
