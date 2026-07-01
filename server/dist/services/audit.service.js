"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuditLogs = exports.auditKpiEvent = exports.auditAppraisalEvent = exports.autoAuditMiddleware = exports.withAudit = exports.logAction = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const logAction = async (paramsOrUserId, legacyAction, legacyEntity, legacyEntityId, legacyDetails, legacyIp) => {
    try {
        // Detect calling convention: new object-style vs old positional-arg style
        let p;
        if (paramsOrUserId && typeof paramsOrUserId === 'object' && 'action' in paramsOrUserId) {
            p = paramsOrUserId;
        }
        else {
            // Legacy style: logAction(userId, action, entity, entityId, details, ip)
            p = {
                userId: paramsOrUserId,
                action: legacyAction || 'UNKNOWN',
                entity: legacyEntity || 'UNKNOWN',
                entityId: legacyEntityId,
                metadata: legacyDetails,
                ipAddress: legacyIp,
            };
        }
        await client_1.default.auditLog.create({
            data: {
                userId: p.userId || null,
                organizationId: p.organizationId || 'mcb-ghana-tenant',
                action: p.action,
                entity: p.entity,
                entityId: p.entityId || null,
                details: p.metadata ? JSON.stringify(p.metadata) : null,
                ipAddress: p.ipAddress || null,
            },
        });
    }
    catch (err) {
        console.error('[AuditService] Failed to write log:', err);
    }
};
exports.logAction = logAction;
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
const withAudit = async (fn, params) => {
    const result = await fn();
    // Fire-and-forget audit log
    (0, exports.logAction)(params).catch(() => { });
    return result;
};
exports.withAudit = withAudit;
// ─── Express Middleware ────────────────────────────────────────────
/**
 * Auto-audit middleware for HTTP routes.
 * Attaches request context and logs on response finish for WRITE operations.
 * Apply to routers: router.use(autoAuditMiddleware)
 */
const autoAuditMiddleware = (req, res, next) => {
    const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
    if (!WRITE_METHODS.has(req.method)) {
        next();
        return;
    }
    const originalEnd = res.end.bind(res);
    res.end = function (...args) {
        // Only log successful writes (2xx responses)
        if (res.statusCode >= 200 && res.statusCode < 300) {
            const user = req.user;
            (0, exports.logAction)({
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
            }).catch(() => { });
        }
        return originalEnd(...args);
    };
    next();
};
exports.autoAuditMiddleware = autoAuditMiddleware;
// ─── Domain-Specific Log Helpers ──────────────────────────────────
const auditAppraisalEvent = (userId, organizationId, action, appraisalId, metadata, req) => (0, exports.logAction)({
    userId,
    organizationId,
    action,
    entity: 'Appraisal',
    entityId: appraisalId,
    metadata,
    ipAddress: req?.ip,
    userAgent: req?.headers['user-agent'],
});
exports.auditAppraisalEvent = auditAppraisalEvent;
const auditKpiEvent = (userId, organizationId, action, kpiId, metadata, req) => (0, exports.logAction)({
    userId,
    organizationId,
    action,
    entity: 'KpiItem',
    entityId: kpiId,
    metadata,
    ipAddress: req?.ip,
    userAgent: req?.headers['user-agent'],
});
exports.auditKpiEvent = auditKpiEvent;
// ─── Query Functions ───────────────────────────────────────────────
const getAuditLogs = async (organizationId, page = 1, limit = 50, filters) => {
    const where = {
        organizationId,
        user: {
            isNot: { role: 'DEV' }
        }
    };
    if (filters?.entity)
        where.entity = filters.entity;
    if (filters?.userId)
        where.userId = filters.userId;
    if (filters?.action)
        where.action = filters.action;
    if (filters?.dateFrom || filters?.dateTo) {
        where.createdAt = {};
        if (filters.dateFrom)
            where.createdAt.gte = new Date(filters.dateFrom);
        if (filters.dateTo) {
            const end = new Date(filters.dateTo);
            end.setHours(23, 59, 59, 999);
            where.createdAt.lte = end;
        }
    }
    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
        client_1.default.auditLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { fullName: true, email: true, role: true } } },
            skip,
            take: limit,
        }),
        client_1.default.auditLog.count({ where }),
    ]);
    return {
        logs: logs.map((log) => ({
            ...log,
            details: log.details
                ? (() => { try {
                    return JSON.parse(log.details);
                }
                catch {
                    return log.details;
                } })()
                : null,
        })),
        total,
        page,
        pages: Math.ceil(total / limit),
    };
};
exports.getAuditLogs = getAuditLogs;
