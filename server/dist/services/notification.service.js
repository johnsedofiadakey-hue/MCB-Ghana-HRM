"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAllRead = exports.getNotifications = exports.getUnreadCount = exports.notifyKpiUpdate = exports.notifyAppraisalReturned = exports.notifyAppraisalCompleted = exports.notifyFinalVerdictRequired = exports.notifyAppraisalSubmitted = void 0;
/**
 * Notification Service — Phase G: Real-time UX Fix
 *
 * Triggers database notifications for critical HR workflow events.
 * The Notification model already exists in the Prisma schema.
 * This service provides domain-specific helpers to fire notifications
 * at key state transitions in the KPI and Appraisal pipelines.
 */
const client_1 = __importDefault(require("../prisma/client"));
/**
 * Core create function. Fire-and-forget — never throws.
 */
const createNotification = async (params) => {
    try {
        await client_1.default.notification.create({
            data: {
                organizationId: params.organizationId,
                userId: params.userId,
                title: params.title,
                message: params.message,
                type: params.type || 'INFO',
                link: params.link || null,
            },
        });
    }
    catch (err) {
        console.error('[NotificationService] Failed to create notification:', err);
    }
};
// ── Domain-Specific Triggers ──────────────────────────────────────────────────
/**
 * Notify manager when a staff member submits their self-appraisal.
 */
const notifyAppraisalSubmitted = async (params) => {
    await createNotification({
        organizationId: params.organizationId,
        userId: params.managerId,
        title: 'Self-Appraisal Submitted',
        message: `${params.employeeName} has submitted their self-appraisal and is awaiting your review.`,
        type: 'INFO',
        link: `/reviews/team`,
    });
};
exports.notifyAppraisalSubmitted = notifyAppraisalSubmitted;
/**
 * Notify MD/Director when a manager's calibration is done and needs executive sign-off.
 */
const notifyFinalVerdictRequired = async (params) => {
    await createNotification({
        organizationId: params.organizationId,
        userId: params.mdUserId,
        title: 'Final Verdict Required',
        message: `${params.employeeName}'s appraisal has been calibrated and is awaiting your institutional sign-off.`,
        type: 'WARNING',
        link: `/reviews/final`,
    });
};
exports.notifyFinalVerdictRequired = notifyFinalVerdictRequired;
/**
 * Notify employee when appraisal is completed (all levels approved).
 */
const notifyAppraisalCompleted = async (params) => {
    await createNotification({
        organizationId: params.organizationId,
        userId: params.employeeId,
        title: 'Performance Review Finalized',
        message: `Your ${params.cycleName} performance review has been finalized. Final Score: ${params.finalScore}/100.`,
        type: 'SUCCESS',
        link: `/reviews/my`,
    });
};
exports.notifyAppraisalCompleted = notifyAppraisalCompleted;
/**
 * Notify employee when feedback is returned or changes are requested.
 */
const notifyAppraisalReturned = async (params) => {
    await createNotification({
        organizationId: params.organizationId,
        userId: params.employeeId,
        title: 'Appraisal Returned for Revision',
        message: `${params.reviewerName} has returned your appraisal for changes. ${params.reason ? `Reason: ${params.reason}` : ''}`,
        type: 'WARNING',
        link: `/reviews/my`,
    });
};
exports.notifyAppraisalReturned = notifyAppraisalReturned;
/**
 * Notify employee/manager of a KPI update or overdue alert.
 */
const notifyKpiUpdate = async (params) => {
    const isOverdue = params.type === 'OVERDUE';
    await createNotification({
        organizationId: params.organizationId,
        userId: params.userId,
        title: isOverdue ? `KPI Overdue: ${params.kpiName}` : `KPI Updated: ${params.kpiName}`,
        message: isOverdue
            ? `The KPI "${params.kpiName}" is past its end date without a final update.`
            : `Progress has been recorded for "${params.kpiName}".`,
        type: isOverdue ? 'ERROR' : 'INFO',
        link: `/kpi/my-targets`,
    });
};
exports.notifyKpiUpdate = notifyKpiUpdate;
// ── Queries ────────────────────────────────────────────────────────────────────
/**
 * Get unread notification count for a user (for badge display).
 */
const getUnreadCount = async (userId, organizationId) => {
    return client_1.default.notification.count({
        where: { userId, organizationId, isRead: false },
    });
};
exports.getUnreadCount = getUnreadCount;
/**
 * Get paginated notifications for a user.
 */
const getNotifications = async (userId, organizationId, page = 1, limit = 20) => {
    const skip = (page - 1) * limit;
    const [items, total, unread] = await Promise.all([
        client_1.default.notification.findMany({
            where: { userId, organizationId },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        }),
        client_1.default.notification.count({ where: { userId, organizationId } }),
        client_1.default.notification.count({ where: { userId, organizationId, isRead: false } }),
    ]);
    return { items, total, unread, page, pages: Math.ceil(total / limit) };
};
exports.getNotifications = getNotifications;
/**
 * Mark all notifications as read for a user.
 */
const markAllRead = async (userId, organizationId) => {
    return client_1.default.notification.updateMany({
        where: { userId, organizationId, isRead: false },
        data: { isRead: true },
    });
};
exports.markAllRead = markAllRead;
