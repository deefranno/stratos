import type { Request } from 'express';
import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { logger } from './logger';

/** Records an audit trail entry. Audit failures never break user requests. */
export async function audit(
  req: Request,
  action: string,
  opts: { userId?: string | null; entity?: string; entityId?: string; metadata?: Record<string, unknown> } = {}
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: opts.userId ?? req.user?.id ?? null,
        action,
        entity: opts.entity,
        entityId: opts.entityId,
        metadata: opts.metadata as Prisma.InputJsonValue | undefined,
        ipAddress: req.ip,
      },
    });
  } catch (error) {
    logger.error('audit_log_failed', { action, error: String(error) });
  }
}
