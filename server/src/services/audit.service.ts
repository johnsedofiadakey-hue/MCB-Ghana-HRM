/**
 * Audit Service — Phase D: Automatic Audit Logging
 *
 * Provides automatic write-operation logging via Express middleware.
 * All critical actions (KPI updates, appraisals, approvals) are logged
 * with full context: user, action, entity, metadata, IP, and user-agent.
 *
 * Usage:
 * 1. Auto-log via withAudit() wrapper in services
 * 2. Or use logAction() directly in controllers
 * 3. Or apply auditMiddleware to specific routes
 */
import { Request, Response, NextFunction } from 'express';
import prisma from '../prisma/client';

// ─── Core Logging Function ─────────────────────────────────────────

interface AuditParams {
  userId?: string | null;
  organizationId?: string | null;
  action: string;         // e.g. 'APPRAISAL_SUBMITTED', 'KPI_UPDATED'
  entity: string;         // e.g. 'Appraisal', 'KpiItem'
  entityId?: string;
  metadata?: Record<string, any>; // structured JSON context
  ipAddress?: string;
  userAgent?: string;
}

export const logAction = async (
  paramsOrUserId: AuditParams | string | null | undefined,
  legacyAction?: string,
  legacyEntity?: string,
  legacyEntityId?: string,
  legacyDetails?: any,
  legacyIp?: string,
): Promise<void> => {
  try {
    // Detect calling convention: new object-style vs old positional-arg style
    let p: AuditParams;
    if (paramsOrUserId && typeof paramsOrUserId === 'object' && 'action' in paramsOrUserId) {
      p = paramsOrUserId as AuditParams;
    } else {
      // Legacy style: logAction(userId, action, entity, entityId, details, ip)
      p = {
        userId: paramsOrUserId as string | null | undefined,
        action: legacyAction || 'UNKNOWN',
        entity: legacyEntity || 'UNKNOWN',
        entityId: legacyEntityId,
        metadata: legacyDetails,
        ipAddress: legacyIp,
      };
    }

    await prisma.auditLog.create({
      data: {
        userId: p.userId || null,
        organizationId: p.organizationId || 'default-tenant',
        action: p.action,
        entity: p.entity,
        entityId: p.entityId || null,
        details: p.metadata ? JSON.stringify(p.metadata) : null,
        ipAddress: p.ipAddress || null,
      },
    });
  } catch (err) {
    console.error('[AuditService] Failed to write log:', err);
  }
};

// ─── Service Wrapper ───────────────────────────────────────────────

/**
 * Wraps a service function to automatically audit log its execution.
 * 
 * @example
 * const result = await withAudit(
 *   () => appraisalService.submitSelfRating(...),
 *   { userId, action: 'SELF_RATING_SUBMITTED', entity: 'Appraisal', entityId: appraisalId }
 * );
 */
export const withAudit = async <T>(
  fn: () => Promise<T>,
  params: AuditParams
): Promise<T> => {
  const result = await fn();
  // Fire-and-forget audit log
  logAction(params).catch(() => {});
  return result;
};

// ─── Express Middleware ────────────────────────────────────────────

/**
 * Auto-audit middleware for HTTP routes.
 * Attaches request context and logs on response finish for WRITE operations.
 * Apply to routers: router.use(autoAuditMiddleware)
 */
export const autoAuditMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
  if (!WRITE_METHODS.has(req.method)) {
    next();
    return;
  }

  const originalEnd = res.end.bind(res);

  (res as any).end = function (...args: any[]) {
    // Only log successful writes (2xx responses)
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const user = (req as any).user;
      logAction({
        userId: user?.id,
        organizationId: user?.organizationId,
        action: `${req.method} ${req.route?.path || req.path}`,
        entity: 'HTTP_REQUEST',
        entityId: req.params?.id,
        metadata: {
          method: req.method,
          path: req.path,
          params: req.params,
          statusCode: res.statusCode,
        },
        ipAddress: req.ip || req.headers['x-forwarded-for']?.toString(),
        userAgent: req.headers['user-agent'],
      }).catch(() => {});
    }
    return originalEnd(...args);
  };

  next();
};

// ─── Domain-Specific Log Helpers ──────────────────────────────────

export const auditAppraisalEvent = (
  userId: string,
  organizationId: string,
  action: string,
  appraisalId: string,
  metadata?: Record<string, any>,
  req?: Request
) =>
  logAction({
    userId,
    organizationId,
    action,
    entity: 'Appraisal',
    entityId: appraisalId,
    metadata,
    ipAddress: req?.ip,
    userAgent: req?.headers['user-agent'],
  });

export const auditKpiEvent = (
  userId: string,
  organizationId: string,
  action: string,
  kpiId: string,
  metadata?: Record<string, any>,
  req?: Request
) =>
  logAction({
    userId,
    organizationId,
    action,
    entity: 'KpiItem',
    entityId: kpiId,
    metadata,
    ipAddress: req?.ip,
    userAgent: req?.headers['user-agent'],
  });

// ─── Query Functions ───────────────────────────────────────────────

export const getAuditLogs = async (
  organizationId: string,
  page = 1,
  limit = 50,
  filters?: { entity?: string; userId?: string }
) => {
  const where: any = { 
    organizationId,
    // 🛡️ DEV ISOLATION: Hide actions performed by DEV accounts from standard audit trails
    user: {
      isNot: { role: 'DEV' }
    }
  };

  if (filters?.entity) where.entity = filters.entity;
  if (filters?.userId) where.userId = filters.userId;

  const skip = (page - 1) * limit;
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { fullName: true, email: true, role: true } } },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs: logs.map((log) => ({
      ...log,
      details: log.details
        ? (() => { try { return JSON.parse(log.details as string); } catch { return log.details; } })()
        : null,
    })),
    total,
    page,
    pages: Math.ceil(total / limit),
  };
};
