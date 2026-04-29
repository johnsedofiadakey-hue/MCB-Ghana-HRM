import prisma from '../prisma/client';
import { logAction } from './audit.service';
import { notify } from './websocket.service';
import { getRoleRank } from '../middleware/auth.middleware';
import { getEffectiveLeaveMetrics, canBorrowLeave } from '../utils/leave.utils';

/**
 * Leave Statuses (V4 - Ghana Compliance):
 * DRAFT, SUBMITTED, RELIEVER_ACCEPTED, RELIEVER_DECLINED, 
 * MANAGER_REVIEW, MANAGER_APPROVED, MANAGER_REJECTED, 
 * HR_REVIEW, HR_REJECTED,
 * MD_REVIEW, APPROVED, MD_REJECTED, CANCELLED
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

    if (start < today) throw new Error('Cannot request leave for a past date.');
    if (end < start) throw new Error('End date cannot be earlier than start date.');

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
      throw new Error(`You already have a leave request (${userOverlap.status}) that overlaps with these dates (${userOverlap.startDate.toLocaleDateString()} - ${userOverlap.endDate.toLocaleDateString()}).`);
    }

    // 2. CONCURRENCY AUDIT: Check if department exceeds 20% threshold
    const user = await prisma.user.findUnique({ 
      where: { id: employeeId },
      include: { organization: { select: { defaultLeaveAllowance: true } } }
    });
    if (!user) throw new Error('User not found');

    if (user.departmentId) {
        const audit = await this.checkLeaveOverlap(organizationId, user.departmentId, start, end);
        if (audit.warning) {
            console.warn(`[LeaveService] Concurrency Warning: ${audit.message}`);
        }
    }
    
    // Check for public holidays and weekends
    const holidays = await prisma.publicHoliday.findMany({
      where: { 
        OR: [
          { date: { gte: start, lte: end } },
          { isRecurring: true } 
        ]
      }
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
        throw new Error(`Insufficient available balance. You have ${metrics.balance} days, but ${pendingDays} days are already tied up in pending/approved requests. Available: ${availableBalance}, Needed: ${leaveDays}`);
      }
    }

    const initialStatus = relieverId ? 'SUBMITTED' : 'MANAGER_REVIEW';

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
        status: initialStatus
      }
    });

    if (relieverId) {
      const noteSnippet = handoverNotes ? `\n\nHandover Notes: ${handoverNotes.substring(0, 100)}` : '';
      await notify(relieverId, '🤝 Handover Request', 
        `${user.fullName} has requested you as a reliever for leave.${noteSnippet}`, 'INFO', '/leave');
    } else if (user.supervisorId) {
      await notify(user.supervisorId, '📅 New Leave Request', `${user.fullName} has requested leave.`, 'INFO', '/leave');
    }

    return leave;
  }

  /**
   * Reliever accepts or declines
   */
  static async respondAsReliever(leaveId: string, relieverId: string, accept: boolean, comment?: string) {
    const leave = await prisma.leaveRequest.findUnique({
      where: { id: leaveId },
      include: { employee: true, reliever: { select: { fullName: true } } }
    });

    if (!leave) throw new Error('Leave request not found');
    if (leave.relieverId !== relieverId) throw new Error('Not authorized to respond as reliever');
    if (leave.status !== 'SUBMITTED') throw new Error('Leave is not in SUBMITTED state');

    if (!accept && (!comment || comment.trim().length < 3)) {
      throw new Error('A rejection reason is required to decline a handover request.');
    }

    const nextStatus = accept ? 'MANAGER_REVIEW' : 'RELIEVER_DECLINED';
    
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

        if (leave.employee.supervisorId) {
          await notify(leave.employee.supervisorId, '📝 Leave Pending Line Manager Review', 
            `${leave.employee.fullName}'s leave is now ready for your review. Handover accepted.`, 'INFO', '/leave');
        }
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

    if (!leave) throw new Error('Leave request not found');
    if (!['MANAGER_REVIEW', 'RELIEVER_ACCEPTED', 'SUBMITTED'].includes(leave.status)) {
      throw new Error(`Invalid stage: Leave is currently in ${leave.status} status.`);
    }

    if (leave.relieverAcceptanceRequired && leave.relieverId && leave.status === 'SUBMITTED') {
      throw new Error('This leave requires reliever acceptance before manager approval can proceed.');
    }

    const actor = await prisma.user.findUnique({ where: { id: managerId } });
    if (!actor) throw new Error('Reviewer account not found');

    const rank = getRoleRank(actor.role);
    const isPrimaryManager = leave.employee.supervisorId === managerId;
    const isDeptManager = actor.departmentId === leave.employee.departmentId && rank >= 70;
    const isHRorHigher = rank >= 75; 

    if (!isPrimaryManager && !isDeptManager && !isHRorHigher) {
      throw new Error('Unauthorized for Step 1 Manager Review. You must be the direct supervisor or a department manager.');
    }

    if (!approve && (!comment || comment.trim().length < 3)) {
      throw new Error('Please provide a reason for rejecting this leave request.');
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

    // Notify HR
    if (approve) {
        // Broad notification to HR personnel
        const hrUsers = await prisma.user.findMany({
            where: { organizationId: leave.organizationId, role: { in: ['MD', 'DIRECTOR', 'HR_MANAGER', 'HR_OFFICER', 'HR', 'HR_ADMIN', 'SUPER_ADMIN'] }, isArchived: false },
            select: { id: true }
        });
        for (const hr of hrUsers) {
            await notify(hr.id, '📋 Leave Pending HR Validation', `${leave.employee.fullName} needs HR sign-off.`, 'INFO', '/leave');
        }
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

    if (!leave) throw new Error('Leave request not found');
    if (leave.status !== 'HR_REVIEW') {
      throw new Error(`Invalid stage: Leave is currently in ${leave.status} status. It must be in HR_REVIEW.`);
    }

    const actor = await prisma.user.findUnique({ where: { id: hrId } });
    if (!actor) throw new Error('Reviewer account not found');

    const rank = getRoleRank(actor.role);
    if (rank < 85) {
      throw new Error('Unauthorized for HR Validation. This action is reserved for HR Managers/Officers (Rank 85+).');
    }

    if (!approve && (!comment || comment.trim().length < 3)) {
      throw new Error('A rejection reason is required for the HR audit trail.');
    }

    const employeeRank = getRoleRank(leave.employee.role);
    const isTerminalAtHR = employeeRank < 85;
    const nextStatus = approve ? (isTerminalAtHR ? 'APPROVED' : 'MD_REVIEW') : 'HR_REJECTED';

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

    if (!leave) throw new Error('Leave request not found');
    
    // MD can approve if it's in MD_REVIEW, or bypass HR if they are rank 90+
    const canProcess = leave.status === 'MD_REVIEW' || (getRoleRank((await prisma.user.findUnique({ where: { id: mdId } }))?.role) >= 90);
    
    if (!canProcess) {
        throw new Error(`Invalid stage: Leave is currently in ${leave.status} status.`);
    }

    const actor = await prisma.user.findUnique({ where: { id: mdId } });
    if (!actor) throw new Error('Reviewer account not found');

    const rank = getRoleRank(actor.role);
    if (rank < 90) {
       throw new Error('Unauthorized for Final Sign-off. This action is reserved for the Managing Director or Director (Rank 90+).');
    }

    if (!approve && (!comment || comment.trim().length < 3)) {
      throw new Error('A final rejection reason is required for the audit trail.');
    }

    const nextStatus = approve ? 'APPROVED' : 'MD_REJECTED';

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
