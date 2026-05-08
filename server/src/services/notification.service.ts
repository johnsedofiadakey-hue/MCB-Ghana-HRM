/**
 * Notification Service — Phase G: Real-time UX Fix
 *
 * Triggers database notifications for critical HR workflow events.
 * The Notification model already exists in the Prisma schema.
 * This service provides domain-specific helpers to fire notifications
 * at key state transitions in the KPI and Appraisal pipelines.
 */
import prisma from '../prisma/client';

type NotificationType = 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR';

interface CreateNotificationParams {
  organizationId: string;
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  link?: string;
}

/**
 * Core create function. Fire-and-forget — never throws.
 */
const createNotification = async (params: CreateNotificationParams): Promise<void> => {
  try {
    await prisma.notification.create({
      data: {
        organizationId: params.organizationId,
        userId: params.userId,
        title: params.title,
        message: params.message,
        type: params.type || 'INFO',
        link: params.link || null,
      },
    });
  } catch (err) {
    console.error('[NotificationService] Failed to create notification:', err);
  }
};

// ── Domain-Specific Triggers ──────────────────────────────────────────────────

/**
 * Notify manager when a staff member submits their self-appraisal.
 */
export const notifyAppraisalSubmitted = async (params: {
  organizationId: string;
  managerId: string;
  employeeName: string;
  appraisalId: string;
}) => {
  await createNotification({
    organizationId: params.organizationId,
    userId: params.managerId,
    title: 'Self-Appraisal Submitted',
    message: `${params.employeeName} has submitted their self-appraisal and is awaiting your review.`,
    type: 'INFO',
    link: `/reviews/team`,
  });
};

/**
 * Notify MD/Director when a manager's calibration is done and needs executive sign-off.
 */
export const notifyFinalVerdictRequired = async (params: {
  organizationId: string;
  mdUserId: string;
  employeeName: string;
  cycleId: string;
}) => {
  await createNotification({
    organizationId: params.organizationId,
    userId: params.mdUserId,
    title: 'Final Verdict Required',
    message: `${params.employeeName}'s appraisal has been calibrated and is awaiting your institutional sign-off.`,
    type: 'WARNING',
    link: `/reviews/final`,
  });
};

/**
 * Notify employee when appraisal is completed (all levels approved).
 */
export const notifyAppraisalCompleted = async (params: {
  organizationId: string;
  employeeId: string;
  cycleName: string;
  finalScore: number;
}) => {
  await createNotification({
    organizationId: params.organizationId,
    userId: params.employeeId,
    title: 'Performance Review Finalized',
    message: `Your ${params.cycleName} performance review has been finalized. Final Score: ${params.finalScore}/100.`,
    type: 'SUCCESS',
    link: `/reviews/my`,
  });
};

/**
 * Notify employee when feedback is returned or changes are requested.
 */
export const notifyAppraisalReturned = async (params: {
  organizationId: string;
  employeeId: string;
  reviewerName: string;
  reason?: string;
}) => {
  await createNotification({
    organizationId: params.organizationId,
    userId: params.employeeId,
    title: 'Appraisal Returned for Revision',
    message: `${params.reviewerName} has returned your appraisal for changes. ${params.reason ? `Reason: ${params.reason}` : ''}`,
    type: 'WARNING',
    link: `/reviews/my`,
  });
};

/**
 * Notify employee/manager of a KPI update or overdue alert.
 */
export const notifyKpiUpdate = async (params: {
  organizationId: string;
  userId: string;
  kpiName: string;
  type: 'UPDATED' | 'OVERDUE';
}) => {
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

// ── Queries ────────────────────────────────────────────────────────────────────

/**
 * Get unread notification count for a user (for badge display).
 */
export const getUnreadCount = async (userId: string, organizationId: string): Promise<number> => {
  return prisma.notification.count({
    where: { userId, organizationId, isRead: false },
  });
};

/**
 * Get paginated notifications for a user.
 */
export const getNotifications = async (userId: string, organizationId: string, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  const [items, total, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId, organizationId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where: { userId, organizationId } }),
    prisma.notification.count({ where: { userId, organizationId, isRead: false } }),
  ]);
  return { items, total, unread, page, pages: Math.ceil(total / limit) };
};

/**
 * Mark all notifications as read for a user.
 */
export const markAllRead = async (userId: string, organizationId: string) => {
  return prisma.notification.updateMany({
    where: { userId, organizationId, isRead: false },
    data: { isRead: true },
  });
};
