import prisma from '../prisma/client';
import { logAction } from './audit.service';
import { notify } from './websocket.service';
import { getRoleRank } from '../middleware/auth.middleware';
import { getEffectiveLeaveMetrics, canBorrowLeave } from '../utils/leave.utils';
import { ValidationError, NotFoundError, ForbiddenError, ConflictError } from '../utils/errors';

export const determineHrReviewStatus = (employeeRole: string | null | undefined, approve: boolean) => {
  if (!approve) return 'HR_REJECTED';
  return getRoleRank(employeeRole || '') < 90 ? 'APPROVED' : 'MD_REVIEW';
};

export const determineInitialLeaveStatus = (employeeRole: string | null | undefined, hasReliever: boolean) => {
  if (hasReliever) return 'SUBMITTED';
  return getRoleRank(employeeRole || '') >= 92 ? 'MD_REVIEW' : 'HR_REVIEW';
};

export const determineMdReviewStatus = (approve: boolean) => approve ? 'APPROVED' : 'MD_REJECTED';

/**
 * Leave Statuses (V5 - Simplified HR Director-Only Approval):
 * DRAFT, SUBMITTED, RELIEVER_ACCEPTED, RELIEVER_DECLINED,
 * HR_REVIEW (HR Director is the sole approver), HR_REJECTED,
 * MD_REVIEW (director-level staff rank >= 90), APPROVED, MD_REJECTED, CANCELLED
 *
 * MANAGER_REVIEW / MANAGER_REJECTED are legacy statuses (pre-V5 data) — no longer routed to.
 */

export class LeaveService {
  /**
   * Request leave. 
   * Moves to SUBMITTED if reliever is specified, or direct to MANAGER_REVIEW if none.
   */
  static async requestLeave(organizationId: string, employeeId: string, data: any) {
    const { startDate, endDate, reason, relieverId, leaveType, handoverNotes } = data;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0,0,0,0);

    if (start < today) throw new ValidationError('Cannot request leave for a past date.');
    if (end < start) throw new ValidationError('End date cannot be earlier than start date.');

    // 1. DUPLICATE CHECK: Prevent overlapping requests for the SAME user
    const userOverlap = await prisma.leaveRequest.findFirst({
      where: {
        employeeId,
        status: { notIn: ['CANCELLED', 'MANAGER_REJECTED', 'HR_REJECTED', 'MD_REJECTED'] },
        OR: [
          { startDate: { lte: end }, endDate: { gte: start } }
        ]
      }
    });
    if (userOverlap) {
      throw new ConflictError(`You already have a leave request (${userOverlap.status}) that overlaps with these dates (${userOverlap.startDate.toLocaleDateString()} - ${userOverlap.endDate.toLocaleDateString()}).`);
    }

    // 2. CONCURRENCY AUDIT: Check if department exceeds 20% threshold
    const user = await prisma.user.findUnique({ 
      where: { id: employeeId },
      include: { organization: { select: { defaultLeaveAllowance: true } } }
    });
    if (!user) throw new NotFoundError('User');

    // Check for public holidays and weekends — scope recurring holidays by month/day
    const holidays = await prisma.publicHoliday.findMany({
      where: {
        OR: [
          { date: { gte: start, lte: end } },
          // Only load recurring holidays whose month/day falls within the leave window
          {
            isRecurring: true,
            date: {
              gte: new Date(start.getFullYear() - 1, start.getMonth(), start.getDate()),
              lte: new Date(end.getFullYear() + 1, end.getMonth(), end.getDate()),
            }
          }
        ]
      },
      take: 200,
    });

    const leaveDays = this.calculateWorkingDaysWithHolidays(start, end, holidays);
    
    const metrics = getEffectiveLeaveMetrics(user);

    // Virtual Balance check: Actual Balance - Pending Requests
    const pendingRequests = await prisma.leaveRequest.findMany({
      where: { employeeId, status: { in: ['SUBMITTED', 'RELIEVER_ACCEPTED', 'MANAGER_REVIEW', 'HR_REVIEW', 'MD_REVIEW', 'APPROVED'] } }
    });
    const pendingDays = pendingRequests.reduce((sum, r) => sum + Number(r.leaveDays || 0), 0);

    const availableBalance = metrics.balance - pendingDays;
    
    if (availableBalance < leaveDays) {
      const allowedToBorrow = canBorrowLeave(user, leaveDays, availableBalance);
      if (!allowedToBorrow) {
        throw new ValidationError(`Insufficient available balance. You have ${metrics.balance} days, but ${pendingDays} days are already tied up in pending/approved requests. Available: ${availableBalance}, Needed: ${leaveDays}`);
      }
    }

    // Check capacity and capture any warning to surface to the user
    let capacityWarning: string | null = null;
    if (user.departmentId) {
      const audit = await this.checkLeaveOverlap(organizationId, user.departmentId, start, end);
      if (audit.warning) {
        capacityWarning = audit.message || null;
        console.warn(`[LeaveService] Concurrency Warning: ${audit.message}`);
      }
    }

    // V5: no reliever → directly to HR_REVIEW (HR Director is sole approver)
    const initialStatus = determineInitialLeaveStatus(user.role, Boolean(relieverId));

    const isSickLeaveLong = (leaveType === 'SICK_LEAVE' || leaveType === 'Sick') && leaveDays >= 3;

    const leave = await prisma.leaveRequest.create({
      data: {
        organizationId,
        employeeId,
        startDate: start,
        endDate: end,
        leaveDays,
        reason,
        leaveType: leaveType || 'Annual',
        relieverId: relieverId || null,
        handoverNotes: handoverNotes || null,
        relieverAcceptanceRequired: !!data.relieverAcceptanceRequired,
        status: initialStatus,
        requiresMedicalCertificate: isSickLeaveLong,
      }
    });

    if (relieverId) {
      const noteSnippet = handoverNotes ? `\n\nHandover Notes: ${handoverNotes.substring(0, 100)}` : '';
      await notify(relieverId, '🤝 Handover Request',
        `${user.fullName} has requested you as a reliever for leave.${noteSnippet}`, 'INFO', '/leave');
    } else {
      const reviewerRoles = initialStatus === 'MD_REVIEW' ? ['MD'] : ['HR_DIRECTOR'];
      const reviewers = await prisma.user.findMany({
        where: { organizationId, role: { in: reviewerRoles }, isArchived: false },
        select: { id: true }
      });
      await Promise.all(
        reviewers.map(reviewer => notify(reviewer.id, '📅 New Leave Request',
          `${user.fullName} has requested ${leaveDays} day(s) of leave. Pending your review.`, 'INFO', '/leave'))
      );
    }

    if (isSickLeaveLong) {
      await notify(employeeId, '⚕️ Medical Certificate Required',
        'Sick leave of 3+ days requires a medical certificate. Please upload it via your leave request before HR review.',
        'WARNING', '/leave');
    }

    return { leave, warning: capacityWarning };
  }

  /**
   * Reliever accepts or declines
   */
  static async respondAsReliever(leaveId: string, relieverId: string, accept: boolean, comment?: string) {
    const leave = await prisma.leaveRequest.findUnique({
      where: { id: leaveId },
      include: { employee: true, reliever: { select: { fullName: true } } }
    });

    if (!leave) throw new NotFoundError('Leave request');
    if (leave.relieverId !== relieverId) throw new ForbiddenError('Not authorized to respond as reliever');
    if (leave.status !== 'SUBMITTED') throw new ValidationError('Leave is not in SUBMITTED state');

    if (!accept && (!comment || comment.trim().length < 3)) {
      throw new ValidationError('A rejection reason is required to decline a handover request.');
    }

    // V5: reliever accept → HR_REVIEW (not MANAGER_REVIEW)
    const nextStatus = accept
      ? (getRoleRank(leave.employee.role) >= 92 ? 'MD_REVIEW' : 'HR_REVIEW')
      : 'RELIEVER_DECLINED';

    return prisma.$transaction(async (tx) => {
      const updated = await tx.leaveRequest.update({
        where: { id: leaveId },
        data: {
          relieverStatus: accept ? 'ACCEPTED' : 'DECLINED',
          relieverComment: comment,
          relieverRespondedAt: new Date(),
          handoverAcknowledged: accept,
          status: nextStatus
        }
      });

      if (accept) {
        await tx.handoverRecord.create({
          data: {
            organizationId: leave.organizationId || 'mcb-ghana-tenant',
            leaveRequestId: leaveId,
            requesterId: leave.employeeId,
            relieverId: relieverId,
            handoverNotes: leave.handoverNotes,
            status: 'ACCEPTED'
          }
        });

        const reviewerRoles = nextStatus === 'MD_REVIEW' ? ['MD'] : ['HR_DIRECTOR'];
        const reviewers = await prisma.user.findMany({
          where: { organizationId: leave.organizationId || 'mcb-ghana-tenant', role: { in: reviewerRoles }, isArchived: false },
          select: { id: true }
        });
        await Promise.all(
          reviewers.map(reviewer => notify(reviewer.id, nextStatus === 'MD_REVIEW' ? '📝 Leave Pending MD Review' : '📝 Leave Pending HR Director Review',
            `${leave.employee.fullName}'s leave is ready for your review. Reliever has accepted.`, 'INFO', '/leave'))
        );
      }

      await notify(leave.employeeId, 
        accept ? '✅ Reliever Accepted' : '❌ Reliever Declined',
        `${leave.reliever?.fullName || 'Colleague'} has ${accept ? 'accepted' : 'declined'} your reliever request.`,
        accept ? 'SUCCESS' : 'WARNING',
        '/leave'
      );

      return updated;
    });
  }

  /**
   * Step 1: Supervisor/Line Manager Review
   * Moves to HR_REVIEW if approved.
   */
  static async managerReview(leaveId: string, managerId: string, approve: boolean, comment?: string) {
    const leave = await prisma.leaveRequest.findUnique({
      where: { id: leaveId },
      include: { employee: true }
    });

    if (!leave) throw new NotFoundError('Leave request');
    if (!['MANAGER_REVIEW', 'RELIEVER_ACCEPTED', 'SUBMITTED'].includes(leave.status)) {
      throw new ValidationError(`Invalid stage: Leave is currently in ${leave.status} status.`);
    }

    // If there is a pending reliever, block approval until they respond regardless of the flag
    if (leave.status === 'SUBMITTED' && leave.relieverId) {
      throw new ValidationError('Reliever acceptance is still pending. The handover request must be resolved before managerial review.');
    }

    const actor = await prisma.user.findUnique({ where: { id: managerId } });
    if (!actor) throw new NotFoundError('Reviewer account');

    const rank = getRoleRank(actor.role);
    const isPrimaryManager = leave.employee.supervisorId === managerId;
    const isDeptManager = actor.departmentId === leave.employee.departmentId && rank >= 70;
    const isHRorHigher = rank >= 80;

    if (!isPrimaryManager && !isDeptManager && !isHRorHigher) {
      throw new ForbiddenError('Unauthorized for Step 1 Manager Review. You must be the direct supervisor, a department manager, or HR (rank 80+).');
    }

    if (!approve && (!comment || comment.trim().length < 3)) {
      throw new ValidationError('Please provide a reason for rejecting this leave request.');
    }

    const nextStatus = approve ? 'HR_REVIEW' : 'MANAGER_REJECTED'; 

    const updated = await prisma.leaveRequest.update({
      where: { id: leaveId },
      data: {
        status: nextStatus as any,
        managerComment: comment,
        managerId: managerId,
      }
    });

    await notify(leave.employeeId, 
      approve ? '📋 Line Manager Approved' : '❌ Line Manager Rejected',
      approve 
        ? `Your request has been approved by your Line Manager, ${actor.fullName}. It now moves to HR for validation.`
        : `Management has rejected your leave request. Reason: ${comment}`,
      approve ? 'INFO' : 'ERROR',
      '/leave'
    );

    if (approve) {
      const hrUsers = await prisma.user.findMany({
        where: { organizationId: leave.organizationId, role: { in: ['MD', 'HR_DIRECTOR', 'DIRECTOR', 'HR_MANAGER', 'HR_OFFICER', 'HR', 'HR_ADMIN', 'SUPER_ADMIN'] }, isArchived: false },
        select: { id: true }
      });
      await Promise.all(
        hrUsers.map(hr => notify(hr.id, '📋 Leave Pending HR Validation', `${leave.employee.fullName} needs HR sign-off.`, 'INFO', '/leave'))
      );
    }

    return updated;
  }

  /**
   * Step 2: HR Validation
   * Moves to MD_REVIEW if validated.
   */
  static async hrValidation(leaveId: string, hrId: string, approve: boolean, comment?: string) {
    const leave = await prisma.leaveRequest.findUnique({
      where: { id: leaveId },
      include: { employee: true }
    });

    if (!leave) throw new NotFoundError('Leave request');
    // Accept legacy MANAGER_REVIEW status for backward compat with pre-V5 data
    if (!['HR_REVIEW', 'MANAGER_REVIEW'].includes(leave.status)) {
      throw new ValidationError(`Invalid stage: Leave is currently in ${leave.status} status. It must be in HR_REVIEW.`);
    }

    const actor = await prisma.user.findFirst({ where: { id: hrId, organizationId: leave.organizationId, isArchived: false } });
    if (!actor) throw new NotFoundError('Reviewer account');

    const actorRole = String(actor.role || '').toUpperCase();
    if (!['HR_DIRECTOR', 'DEV'].includes(actorRole)) {
      throw new ForbiddenError('Unauthorized: Only the HR Director may approve or reject leave requests.');
    }

    if (!approve && (!comment || comment.trim().length < 3)) {
      throw new ValidationError('A rejection reason is required for the HR audit trail.');
    }

    if (approve && leave.requiresMedicalCertificate && !leave.medicalCertificateUploaded) {
      throw new ValidationError('A medical certificate must be uploaded before HR can approve this sick leave request.');
    }

    // V5: HR Director is terminal for staff below rank 92; HR Director's own leave goes to MD
    const nextStatus = determineHrReviewStatus(leave.employee.role, approve);
    const isTerminalAtHR = nextStatus === 'APPROVED';

    return prisma.$transaction(async (tx) => {
      const updated = await tx.leaveRequest.update({
        where: { id: leaveId },
        data: {
          status: nextStatus as any,
          hrReviewerId: hrId,
          hrComment: comment || 'Validated by HR'
        }
      });

      if (approve && isTerminalAtHR) {
        const user = await tx.user.findUnique({ where: { id: leave.employeeId } });
        if (user) {
          const metrics = getEffectiveLeaveMetrics(user);
          const newBalance = metrics.balance - Number(leave.leaveDays || 0);
          await tx.user.update({
            where: { id: user.id },
            data: { leaveBalance: newBalance }
          });
        }
      }

      await notify(leave.employeeId, 
        approve ? (isTerminalAtHR ? '🎉 Leave Fully Approved' : '🛡️ HR Validated') : '❌ HR Rejected',
        approve 
          ? (isTerminalAtHR 
              ? `Your leave has been finalized and fully approved by HR (${actor.fullName}).` 
              : `HR has validated your leave request. It now moves to the MD for final institutional approval.`)
          : `HR has rejected your leave validation. Reason: ${comment}`,
        approve ? 'SUCCESS' : 'ERROR',
        '/leave'
      );

      return updated;
    });
  }

  /**
   * Step 3: Final MD Approval
   * Moves to APPROVED.
   */
  static async mdFinalReview(leaveId: string, mdId: string, approve: boolean, comment?: string) {
    const leave = await prisma.leaveRequest.findUnique({
      where: { id: leaveId },
      include: { employee: true }
    });

    if (!leave) throw new NotFoundError('Leave request');

    const actor = await prisma.user.findFirst({ where: { id: mdId, organizationId: leave.organizationId, isArchived: false } });
    if (!actor) throw new NotFoundError('Reviewer account');

    if (leave.status !== 'MD_REVIEW') {
      throw new ValidationError(`Invalid stage: Leave is currently in ${leave.status} status.`);
    }

    if (!['MD', 'DEV'].includes(String(actor.role || '').toUpperCase())) {
      throw new ForbiddenError('Unauthorized for Final Sign-off. This action is reserved for the Managing Director.');
    }

    if (!approve && (!comment || comment.trim().length < 3)) {
      throw new ValidationError('A final rejection reason is required for the audit trail.');
    }

    const nextStatus = determineMdReviewStatus(approve);

    return prisma.$transaction(async (tx) => {
      const updated = await tx.leaveRequest.update({
        where: { id: leaveId },
        data: {
          status: nextStatus as any,
          hrComment: comment || leave.hrComment || 'Final Approval by MD',
          hrReviewerId: mdId,
        }
      });

      if (approve) {
        const user = await tx.user.findUnique({ 
          where: { id: leave.employeeId },
        });
        if (user) {
          const metrics = getEffectiveLeaveMetrics(user);
          const newBalance = metrics.balance - Number(leave.leaveDays || 0);

          await tx.user.update({
            where: { id: user.id },
            data: { leaveBalance: newBalance }
          });
        }
      }

      await notify(leave.employeeId, 
        approve ? '🎉 Leave Fully Approved' : '❌ MD Rejected',
        approve 
          ? `Your leave has been finalized and approved by the Managing Director (${actor.fullName}).`
          : `Managing Director has rejected your leave request. Reason: ${comment}`,
        approve ? 'SUCCESS' : 'ERROR',
        '/leave'
      );

      return updated;
    });
  }

  static async checkLeaveOverlap(organizationId: string, departmentId: number, startDate: Date, endDate: Date) {
    const totalStaff = await prisma.user.count({
      where: { organizationId, departmentId, status: 'ACTIVE', isArchived: false }
    });

    if (totalStaff === 0) return { warning: false };

    const overlapping = await prisma.leaveRequest.count({
      where: {
        organizationId,
        status: 'APPROVED',
        isArchived: false,
        employee: { departmentId: departmentId },
        OR: [
          { startDate: { lte: endDate }, endDate: { gte: startDate } }
        ]
      }
    });

    const ratio = (overlapping + 1) / totalStaff;
    if (ratio > 0.20) {
      return {
        warning: true,
        message: `Warning: This request will result in ${Math.round(ratio * 100)}% of your department being on leave simultaneously.`,
        ratio: ratio
      };
    }

    return { warning: false };
  }

  private static calculateWorkingDaysWithHolidays(start: Date, end: Date, holidays: any[]): number {
    let count = 0;
    const cur = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
    const fin = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));

    const holidaySet = new Set(holidays.map(h => {
      const d = new Date(h.date);
      return d.toISOString().split('T')[0];
    }));

    while (cur <= fin) {
      const d = cur.getUTCDay(); 
      const dateStr = cur.toISOString().split('T')[0];
      const isWeekend = (d === 0 || d === 6);
      const isHoliday = holidaySet.has(dateStr);
      if (!isWeekend && !isHoliday) count++;
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    return Math.max(1, count);
  }
}
