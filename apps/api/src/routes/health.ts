import { Router, type Request, type Response } from 'express';
import { prisma } from '../lib/prisma';
import { APP_NAME } from '@stratos/financial-engine';

export const healthRouter = Router();

healthRouter.get('/', async (_req: Request, res: Response) => {
  let database: 'up' | 'down' = 'down';
  try {
    await prisma.$queryRaw`SELECT 1`;
    database = 'up';
  } catch {
    database = 'down';
  }
  res.json({
    status: database === 'up' ? 'ok' : 'degraded',
    service: 'stratos-api',
    productName: APP_NAME,
    version: process.env.APP_VERSION ?? '0.1.0',
    database,
    timestamp: new Date().toISOString(),
  });
});
