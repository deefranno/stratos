import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './lib/auth';
import { env } from './lib/env';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';
import { ensureSubscriptionPlans } from './lib/plans';
import { healthRouter } from './routes/health';
import { accountRouter } from './routes/account';
import { trucksRouter } from './routes/trucks';
import { entriesRouter } from './routes/entries';
import { billingRouter } from './routes/billing';
import { supportRouter } from './routes/support';
import { adminRouter } from './routes/admin';
import { webhooksRouter } from './routes/webhooks';
import { resolveSession } from './middleware/auth';
import { APP_NAME } from '@stratos/financial-engine';

const app = express();

app.set('trust proxy', 1); // Railway routes via proxy; needed for secure cookies + req.ip

app.use(
  cors({
    origin: env.webOrigin.split(',').map((o) => o.trim()),
    credentials: true,
  })
);

// Stripe webhooks need the raw body and must be mounted before express.json().
app.use('/webhooks', webhooksRouter);

// Better Auth handles its own body parsing — mount before express.json().
app.use('/api/auth/*', toNodeHandler(auth));

app.use(express.json({ limit: '1mb' }));

// Request logging with duration.
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    if (req.path !== '/api/health') {
      logger.request(req.method, req.originalUrl, res.statusCode, Date.now() - start, req.user?.id);
    }
  });
  resolveSession(req)
    .catch(() => undefined)
    .finally(() => next());
});

app.use('/api/health', healthRouter);
app.use('/api/account', accountRouter);
app.use('/api/trucks', trucksRouter);
app.use('/api/entries', entriesRouter);
app.use('/api/billing', billingRouter);
app.use('/api/support', supportRouter);
app.use('/api/admin', adminRouter);

app.get('/', (_req, res) => {
  res.json({ service: 'stratos-api', productName: APP_NAME, docs: '/api/health' });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('unhandled_error', { error: err.message, stack: env.isProduction ? undefined : err.stack });
  res.status(500).json({ error: 'Internal server error.' });
});

async function main(): Promise<void> {
  await ensureSubscriptionPlans();
  app.listen(env.port, '0.0.0.0', () => {
    logger.info('server_started', { port: env.port, env: env.nodeEnv, product: APP_NAME });
  });
}

main().catch(async (error) => {
  logger.error('server_start_failed', { error: String(error) });
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});
