import prisma from '../prisma/client';
import { logAction } from './audit.service';
import { notify } from './websocket.service';
import { getRoleRank } from '../middleware/auth.middleware';
import { getEffectiveLeaveMetrics, canBorrowLeave } from '../utils/leave.utils';
import { ValidationError, NotFoundError, ForbiddenError, ConflictError } from '../utils/errors';
import { PdfExportService } from './pdf.service';

export const determineHrReviewStatus = (employeeRole: string | null | undefined, approve: boolean) => {
  if (!approve) return 'HR_REJECTED';
  return getRoleRank(employeeRole || '') < 90 ? 'APPROVED' : 'MD_REVIEW';
};

// Where a request lands once it's past the (optional) reliever step. Shared by both the
// initial-submission path and the post-reliever-acceptance path so the two can never drift.
// Rank >= 92 (HR Director/DEV) would otherwise BE the HR_REVIEW approver — skip straight to
// MD_REVIEW so they can never action their own leave request.
export const determinePostRelieverStatus = (employeeRole: string | null | undefined) => {
  const rank = getRoleRank(employeeRole || '');
  if (rank >= 92) return 'MD_REVIEW';
  if (rank >= 65) return 'HR_REVIEW';
  return 'MANAGER_REVIEW';
};

export const determineInitialLeaveStatus = (employeeRole: string | null | undefined, hasReliever: boolean) => {
  if (hasReliever) return 'SUBMITTED';
  return determinePostRelieverStatus(employeeRole);
};

export const determineMdReviewStatus = (approve: boolean) => approve ? 'APPROVED' : 'MD_REJECTED';

/**
 * Leave Statuses (V6 — manager-in-the-loop approval):
 * DRAFT, SUBMITTED, RELIEVER_ACCEPTED, RELIEVER_DECLINED,
 * MANAGER_REVIEW (direct manager — regular staff only, rank < 65), MANAGER_REJECTED,
 * HR_REVIEW (HR Director — terminal for regular staff; first stage for managers, rank >= 65), HR_REJECTED,
 * MD_REVIEW (managers' own leave only, after HR Director approval), APPROVED, MD_REJECTED, CANCELLED
 *
 * HR Director may act directly on a MANAGER_REVIEW request (override, rank >= 92 only) when the
 * assigned manager is unavailable — see leave.controller.ts processLeave().
 */

export class LeaveService {
  /**
   * Validates a set of individually-selected leave dates: rejects weekends, public
   * holidays, duplicates, and past dates. Returns the normalized, deduped date list
   * and its count (== days of leave consumed). Shared by every leave-creation path
   * so the rules can never drift between the controller, the service, and AI tools.
   */
  static async validateAndCountSelectedDays(organizationId: string, dates: string[]): Promise<{ count: number; normalizedDates: Date[] }> {
    if (!Array.isArray(dates) || dates.length === 0) {
      throw new ValidationError('Select at least one day of leave.');
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const seen = new Set<string>();
    const normalizedDates: Date[] = [];
    for (const raw of dates) {
      const parsed = new Date(`${raw}T00:00:00.000Z`);
      if (Number.isNaN(parsed.getTime())) {
        throw new ValidationError(`"${raw}" is not a valid date.`);
      }
      const key = parsed.toISOString().split('T')[0];
      if (seen.has(key)) continue; // dedupe silently
      seen.add(key);
      if (parsed < today) {
        throw new ValidationError(`${key} is in the past — leave can only be requested for today or future dates.`);
      }
      normalizedDates.push(parsed);
    }

    if (normalizedDates.length === 0) {
      throw new ValidationError('Select at least one day of leave.');
    }

    const minDate = normalizedDates.reduce((a, b) => (a < b ? a : b));
    const maxDate = normalizedDates.reduce((a, b) => (a > b ? a : b));

    const holidays = await prisma.publicHoliday.findMany({
      where: {
        organizationId,
        OR: [
          { date: { gte: minDate, lte: maxDate } },
          {
            isRecurring: true,
            date: {
              gte: new Date(minDate.getFullYear() - 1, minDate.getMonth(), minDate.getDate()),
              lte: new Date(maxDate.getFullYear() + 1, maxDate.getMonth(), maxDate.getDate()),
            }
          }
        ]
      },
      take: 200,
    });
    const holidaySet = new Set(holidays.map(h => new Date(h.date).toISOString().split('T')[0]));

    for (const d of normalizedDates) {
      const dayOfWeek = d.getUTCDay();
      const key = d.toISOString().split('T')[0];
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        throw new ValidationError(`${key} is a weekend — only weekdays (Monday–Friday) can be selected for leave.`);
      }
      if (holidaySet.has(key)) {
        throw new ValidationError(`${key} is a public holiday and cannot be selected for leave.`);
      }
    }

    normalizedDates.sort((a, b) => a.getTime() - b.getTime());
    return { count: normalizedDates.length, normalizedDates };
  }

  /**
   * Request leave.
   * Moves to SUBMITTED if reliever is specified, or directly into the manager/HR
   * approval chain if none (see determineInitialLeaveStatus).
   */
  static async requestLeave(organizationId: string, employeeId: string, data: any) {
    const { dates, reason, relieverId, leaveType, handoverNotes } = data;

    const { count: leaveDays, normalizedDates } = await this.validateAndCountSelectedDays(organizationId, dates);
    const start = normalizedDates[0];
    const end = normalizedDates[normalizedDates.length - 1];

    if (relieverId && (!handoverNotes || handoverNotes.trim().length < 10)) {
      throw new ValidationError('Please provide instructions for your cover person (at least 10 characters) when assigning a reliever.');
    }

    // 1. DUPLICATE CHECK: Prevent any of the selected days colliding with an existing request
    const exactConflict = await prisma.leaveRequestDay.findFirst({
      where: {
        date: { in: normalizedDates },
        leaveRequest: {
          employeeId,
          status: { notIn: ['CANCELLED', 'MANAGER_REJECTED', 'HR_REJECTED', 'MD_REJECTED', 'RELIEVER_DECLINED'] },
        }
      },
      include: { leaveRequest: { select: { id: true, status: true } } }
    });
    if (exactConflict) {
      throw new ConflictError(`You already have a leave request (${exactConflict.leaveRequest.status}) covering ${exactConflict.date.toISOString().split('T')[0]}.`);
    }

    // Bounding-box fallback for requests created before the LeaveRequestDay backfill ran
    const boundingBoxConflict = await prisma.leaveRequest.findFirst({
      where: {
        organizationId,
        employeeId,
        isArchived: false,
        status: { notIn: ['CANCELLED', 'MANAGER_REJECTED', 'HR_REJECTED', 'MD_REJECTED', 'RELIEVER_DECLINED'] },
        startDate: { lte: end },
        endDate: { gte: start },
        days: { none: {} },
      },
    });
    if (boundingBoxConflict) {
      throw new ConflictError(`You already have a leave request (${boundingBoxConflict.status}) overlapping ${boundingBoxConflict.startDate.toLocaleDateString()} – ${boundingBoxConflict.endDate.toLocaleDateString()}.`);
    }

    // 2. CONCURRENCY AUDIT: Check if department exceeds 20% threshold
    const user = await prisma.user.findUnique({
      where: { id: employeeId },
      include: { organization: { select: { defaultLeaveAllowance: true } } }
    });
    if (!user) throw new NotFoundError('User');

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

    const initialStatus = determineInitialLeaveStatus(user.role, Boolean(relieverId));

    const isSickLeave = (leaveType === 'SICK_LEAVE' || leaveType === 'Sick');

    const leave = await prisma.$transaction(async (tx) => {
      const created = await tx.leaveRequest.create({
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
          requiresMedicalCertificate: isSickLeave,
        }
      });
      await tx.leaveRequestDay.createMany({
        data: normalizedDates.map(date => ({ organizationId, leaveRequestId: created.id, date })),
      });
      return created;
    });

    if (relieverId) {
      const noteSnippet = handoverNotes ? `\n\nHandover Notes: ${handoverNotes.substring(0, 100)}` : '';
      await notify(relieverId, '🤝 Handover Request',
        `${user.fullName} has requested you as a reliever for leave.${noteSnippet}`, 'INFO', '/leave');
    } else if (initialStatus === 'MANAGER_REVIEW') {
      await this.notifyAssignedManagerAndHr(organizationId, user, leaveDays);
    } else {
      // No reliever, manager-tier employee → straight to HR_REVIEW or MD_REVIEW (HR Director's own leave)
      const reviewerRoles = initialStatus === 'MD_REVIEW' ? ['MD', 'DEV'] : ['HR_DIRECTOR', 'DEV'];
      const reviewers = await prisma.user.findMany({
        where: { organizationId, role: { in: reviewerRoles }, isArchived: false },
        select: { id: true }
      });
      await Promise.all(
        reviewers.map(reviewer => notify(reviewer.id, '📅 New Leave Request',
          `${user.fullName} has requested ${leaveDays} day(s) of leave. Pending your review.`, 'INFO', '/leave'))
      );
    }

    if (isSickLeave) {
      await notify(employeeId, '⚕️ Doctor\'s Report Required',
        'Sick leave requires a doctor\'s report. Please upload it via your leave request before HR review.',
        'WARNING', '/leave');
    }

    return { leave, warning: capacityWarning };
  }

  /**
   * Notifies the employee's direct supervisor (actionable) and all HR Directors
   * (passive/monitoring — they can only act once it reaches HR_REVIEW, or via
   * override if the manager is unavailable) that a request has entered MANAGER_REVIEW.
   */
  static async notifyAssignedManagerAndHr(organizationId: string, employee: { id: string; fullName: string; supervisorId?: string | null }, leaveDays: number) {
    if (employee.supervisorId) {
      await notify(employee.supervisorId, '📋 Leave Awaiting Your Review',
        `${employee.fullName} has requested ${leaveDays} day(s) of leave. Pending your approval.`, 'INFO', '/leave');
    }
    const hrDirectors = await prisma.user.findMany({
      where: { organizationId, role: { in: ['HR_DIRECTOR', 'DEV'] }, isArchived: false },
      select: { id: true }
    });
    await Promise.all(
      hrDirectors.map(hr => notify(hr.id, '👁️ Leave With Manager',
        `${employee.fullName}'s leave is now with their manager for review — visible to you for monitoring.`, 'INFO', '/leave', false))
    );
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

    // On accept, route the same way a no-reliever submission would (see determinePostRelieverStatus).
    const nextStatus = accept ? determinePostRelieverStatus(leave.employee.role) : 'RELIEVER_DECLINED';

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.leaveRequest.update({
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
      }

      return result;
    });

    if (accept) {
      if (nextStatus === 'MANAGER_REVIEW') {
        await this.notifyAssignedManagerAndHr(leave.organizationId || 'mcb-ghana-tenant', leave.employee, Number(leave.leaveDays || 0));
      } else {
        const reviewerRoles = nextStatus === 'MD_REVIEW' ? ['MD', 'DEV'] : ['HR_DIRECTOR', 'DEV'];
        const reviewers = await prisma.user.findMany({
          where: { organizationId: leave.organizationId || 'mcb-ghana-tenant', role: { in: reviewerRoles }, isArchived: false },
          select: { id: true }
        });
        await Promise.all(
          reviewers.map(reviewer => notify(reviewer.id, nextStatus === 'MD_REVIEW' ? '📝 Leave Pending MD Review' : '📝 Leave Pending HR Director Review',
            `${leave.employee.fullName}'s leave is ready for your review. Reliever has accepted.`, 'INFO', '/leave'))
        );
      }
    }

    await notify(leave.employeeId,
      accept ? '✅ Reliever Accepted' : '❌ Reliever Declined',
      `${leave.reliever?.fullName || 'Colleague'} has ${accept ? 'accepted' : 'declined'} your reliever request.`,
      accept ? 'SUCCESS' : 'WARNING',
      '/leave'
    );

    return updated;
  }

  /**
   * Step 1: Supervisor/Line Manager Review
   * Moves to HR_REVIEW if approved.
   */
  static async managerReview(leaveId: string, managerId: string, approve: boolean, comment?: string, options?: { isOverride?: boolean }) {
    const isOverride = !!options?.isOverride;
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
    // HR Director override only — not a general HR-tier fallback.
    const isHrDirectorOverride = rank >= 92;

    if (!isPrimaryManager && !isDeptManager && !isHrDirectorOverride) {
      throw new ForbiddenError('Unauthorized for Step 1 Manager Review. You must be the direct supervisor, a department manager, or the HR Director (override).');
    }

    if (!approve && (!comment || comment.trim().length < 3)) {
      throw new ValidationError('Please provide a reason for rejecting this leave request.');
    }
    if (isOverride && (!comment || comment.trim().length < 3)) {
      throw new ValidationError('A reason is required when the HR Director overrides an unavailable manager.');
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

    const overrideNote = isOverride ? ` (reviewed by HR Director ${actor.fullName} on your manager's behalf)` : '';
    await notify(leave.employeeId,
      approve ? '📋 Line Manager Approved' : '❌ Line Manager Rejected',
      approve
        ? `Your request has been approved by your Line Manager, ${actor.fullName}${overrideNote}. It now moves to HR for validation.`
        : `Management has rejected your leave request${overrideNote}. Reason: ${comment}`,
      approve ? 'INFO' : 'ERROR',
      '/leave'
    );

    if (approve) {
      const hrUsers = await prisma.user.findMany({
        where: { organizationId: leave.organizationId, role: { in: ['HR_DIRECTOR', 'DEV'] }, isArchived: false },
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
      throw new ValidationError('A doctor\'s report must be uploaded before HR can approve this sick leave request.');
    }

    // HR Director is terminal for regular staff; a manager's own leave escalates to MD
    const nextStatus = determineHrReviewStatus(leave.employee.role, approve);
    const isTerminalAtHR = nextStatus === 'APPROVED';

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.leaveRequest.update({
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

      return result;
    });

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

    if (approve && isTerminalAtHR) {
      await PdfExportService.generateAndArchiveLeaveApprovalPdf(leaveId, [leave.employeeId, leave.managerId, hrId].filter(Boolean) as string[]);
    }

    return updated;
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
    // Capture the HR Director who approved at HR_REVIEW before this update overwrites hrReviewerId with the MD's id
    const hrDirectorId = leave.hrReviewerId;

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.leaveRequest.update({
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

      return result;
    });

    await notify(leave.employeeId,
      approve ? '🎉 Leave Fully Approved' : '❌ MD Rejected',
      approve
        ? `Your leave has been finalized and approved by the Managing Director (${actor.fullName}).`
        : `Managing Director has rejected your leave request. Reason: ${comment}`,
      approve ? 'SUCCESS' : 'ERROR',
      '/leave'
    );

    if (approve) {
      await PdfExportService.generateAndArchiveLeaveApprovalPdf(leaveId, [leave.employeeId, hrDirectorId, mdId].filter(Boolean) as string[]);
    }

    return updated;
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
}
