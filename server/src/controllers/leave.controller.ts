import { Request, Response, NextFunction } from 'express';
import prisma from '../prisma/client';
import { logAction } from '../services/audit.service';
import { getRoleRank } from '../middleware/auth.middleware';
import { getEffectiveLeaveMetrics } from '../utils/leave.utils';
import { LeaveService, determineInitialLeaveStatus } from '../services/leave.service';
import { HierarchyService } from '../services/hierarchy.service';
import { notify } from '../services/websocket.service';
import { errorLogger } from '../services/error-log.service';
import { AppError } from '../utils/errors';
import { PolicyService } from '../services/policy.service';
import { Permission } from '../types/permissions';

const getOrgId = (req: Request): string => (req as any).user?.organizationId || 'mcb-ghana-tenant';

// ── 1. APPLY FOR LEAVE ────────────────────────────────────────────────────────
export const applyForLeave = async (req: Request, res: Response) => {
  try {
    const { dates, reason, relieverId, leaveType, handoverNotes, relieverAcceptanceRequired } = req.body;
    const orgId = getOrgId(req);
    const user = (req as any).user;
    const employeeId = user.id;

    if (!Array.isArray(dates) || dates.length === 0 || !reason) {
      return res.status(400).json({ error: 'dates (at least one) and reason are required' });
    }

    const employee = await prisma.user.findFirst({ where: { id: employeeId, organizationId: orgId } });
    if (!employee) return res.status(404).json({ error: 'User not found' });

    // ── L1 FIX: Reliever rank check removed (Any employee can relieve any employee) ──
    if (relieverId) {
      if (relieverId === employeeId) return res.status(400).json({ error: 'You cannot select yourself as your cover person' });
      const reliever = await prisma.user.findFirst({ where: { id: relieverId, organizationId: orgId, isArchived: false, status: 'ACTIVE' } });
      if (!reliever) return res.status(400).json({ error: 'Selected reliever not found' });
      if (!handoverNotes || String(handoverNotes).trim().length < 10) {
        return res.status(400).json({ error: 'Please provide instructions for your cover person (at least 10 characters) when assigning a reliever.' });
      }
    }

    // Validates weekday-only/no-holiday/no-past-date/no-duplicate selections
    let normalizedDates: Date[];
    let daysRequested: number;
    try {
      const result = await LeaveService.validateAndCountSelectedDays(orgId, dates);
      normalizedDates = result.normalizedDates;
      daysRequested = result.count;
    } catch (e: any) {
      return res.status(400).json({ error: e.message || 'Invalid date selection' });
    }
    const start = normalizedDates[0];
    const end = normalizedDates[normalizedDates.length - 1];

    // Exact-date conflict check against this employee's own non-rejected requests
    const exactConflict = await prisma.leaveRequestDay.findFirst({
      where: {
        date: { in: normalizedDates },
        leaveRequest: {
          organizationId: orgId,
          employeeId,
          isArchived: false,
          status: { notIn: ['CANCELLED', 'RELIEVER_DECLINED', 'MANAGER_REJECTED', 'HR_REJECTED', 'MD_REJECTED'] },
        }
      },
      include: { leaveRequest: { select: { status: true } } }
    });
    if (exactConflict) {
      return res.status(409).json({ error: `You already have an active leave request (${exactConflict.leaveRequest.status}) covering ${exactConflict.date.toISOString().split('T')[0]}` });
    }

    // Bounding-box fallback: catches conflicts against requests created before the
    // LeaveRequestDay backfill ran (those rows have no per-day data yet). Safe to keep
    // permanently — cheap, and only adds false positives in the rare case two requests'
    // overall date spans overlap without sharing an actual selected day.
    const boundingBoxConflict = await prisma.leaveRequest.findFirst({
      where: {
        organizationId: orgId,
        employeeId,
        isArchived: false,
        status: { notIn: ['CANCELLED', 'RELIEVER_DECLINED', 'MANAGER_REJECTED', 'HR_REJECTED', 'MD_REJECTED'] },
        startDate: { lte: end },
        endDate: { gte: start },
        days: { none: {} }, // only un-backfilled rows — backfilled ones are already covered by the exact check above
      },
    });
    if (boundingBoxConflict) {
      return res.status(409).json({ error: `You already have an active leave request (${boundingBoxConflict.status}) overlapping this period (${boundingBoxConflict.startDate.toLocaleDateString()} – ${boundingBoxConflict.endDate.toLocaleDateString()})` });
    }

    // Leave balance policy applies consistently to every employee, including
    // department heads and directors.
    let borrowingWarning: string | null = null;
      const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { allowLeaveBorrowing: true, borrowingLimit: true, defaultLeaveAllowance: true } });
      const balance = Number(employee.leaveBalance || 0);
      const pending = await prisma.leaveRequest.aggregate({
        where: {
          organizationId: orgId,
          employeeId,
          isArchived: false,
          status: { in: ['SUBMITTED', 'PENDING_RELIEVER', 'RELIEVER_ACCEPTED', 'MANAGER_REVIEW', 'MANAGER_APPROVED', 'HR_REVIEW', 'MD_REVIEW'] },
        },
        _sum: { leaveDays: true },
      });
      const pendingDays = Number(pending._sum.leaveDays || 0);
      const availableBalance = balance - pendingDays;
      const allowBorrowing = org?.allowLeaveBorrowing ?? false;
      const borrowLimit = Number(org?.borrowingLimit ?? 5);
      const annualAllowance = Number(org?.defaultLeaveAllowance || 30);

      const effectiveLimit = allowBorrowing ? (availableBalance + borrowLimit) : availableBalance;

      if (effectiveLimit < daysRequested) {
        const errorMsg = allowBorrowing
          ? `Insufficient available leave. ${pendingDays} day(s) are already pending. Available including borrowing: ${effectiveLimit}; requested: ${daysRequested}.`
          : `Insufficient available leave. Balance: ${balance}; pending: ${pendingDays}; available: ${availableBalance}; requested: ${daysRequested}.`;
        return res.status(400).json({ error: errorMsg });
      }

      // ── BORROWING ANALYTICS: Calculate Recovery Horizon ─────────────────
      if (availableBalance < daysRequested) {
        const debt = Math.abs(availableBalance - daysRequested);
        const yearsToRecover = (debt / annualAllowance).toFixed(1);
        borrowingWarning = `⚠️ LEAVE BORROWING ALERT: This request uses ${debt} days from your future allocation. At your current accrual rate, you will have a zero/negative balance for approximately ${yearsToRecover} years.`;
      }

    // ── Check for Department Overlap (20% concurrency warning) ──
    let overlapWarning: string | null = null;
    if (employee.departmentId) {
      const overlap = await LeaveService.checkLeaveOverlap(orgId, employee.departmentId, start, end);
      if (overlap.warning) {
        overlapWarning = overlap.message || 'Potential departmental overlap detected';
      }
    }

    // ── RELIEVER LOCK: Cannot take leave if covering for someone else ────────────────
    const myCoverage = await prisma.leaveRequest.findFirst({
      where: {
        organizationId: orgId,
        relieverId: employeeId,
        status: { in: ['APPROVED', 'MANAGER_APPROVED', 'MD_REVIEW', 'RELIEVER_ACCEPTED', 'SUBMITTED'] },
        isArchived: false,
        OR: [
          { startDate: { lte: end }, endDate: { gte: start } }
        ]
      },
      include: { employee: { select: { fullName: true } } }
    });

    if (myCoverage) {
      return res.status(400).json({
        error: `Reliever Lock Active: You are assigned as a cover person for ${myCoverage.employee.fullName} during this period (${new Date(myCoverage.startDate).toLocaleDateString()} to ${new Date(myCoverage.endDate).toLocaleDateString()}). You cannot request leave while serving as a reliever.`
      });
    }

    const initialStatus = determineInitialLeaveStatus(employee.role, Boolean(relieverId));

    const isSickLeave = (leaveType === 'SICK_LEAVE' || leaveType === 'Sick');

    const leave = await prisma.$transaction(async (tx) => {
      const created = await tx.leaveRequest.create({
        data: {
          organizationId: orgId,
          employeeId,
          startDate: start,
          endDate: end,
          leaveDays: daysRequested,
          reason,
          leaveType: leaveType || 'Annual',
          relieverId: relieverId || null,
          handoverNotes: handoverNotes || null,
          relieverAcceptanceRequired: !!relieverAcceptanceRequired,
          status: initialStatus,
          requiresMedicalCertificate: isSickLeave,
        },
      });
      await tx.leaveRequestDay.createMany({
        data: normalizedDates.map(date => ({ organizationId: orgId, leaveRequestId: created.id, date })),
      });
      return created;
    });

    // Notify reliever, or the assigned manager + monitoring HR Directors, or HR Director directly
    if (relieverId) {
      const noteSnippet = handoverNotes ? `\n\nHandover: ${handoverNotes.substring(0, 60)}${handoverNotes.length > 60 ? '...' : ''}` : '';
      await notify(relieverId, '🤝 Handover Request', `${employee.fullName} has requested you as reliever for ${daysRequested} day(s).${noteSnippet}`, 'INFO', '/leave');
    } else if (initialStatus === 'MANAGER_REVIEW') {
      await LeaveService.notifyAssignedManagerAndHr(orgId, employee, daysRequested);
    } else {
      const reviewerRoles = initialStatus === 'MD_REVIEW' ? ['MD', 'DEV'] : ['HR_DIRECTOR', 'DEV'];
      const reviewers = await prisma.user.findMany({
        where: { organizationId: orgId, role: { in: reviewerRoles }, isArchived: false },
        select: { id: true }
      });
      await Promise.all(
        reviewers.map(reviewer => notify(reviewer.id, '📅 New Leave Request',
          `${employee.fullName} has requested ${daysRequested} day(s) of leave. Pending your review.`, 'INFO', '/leave'))
      );
    }

    if (isSickLeave) {
      await notify(employeeId, '⚕️ Doctor\'s Report Required',
        'Sick leave requires a doctor\'s report. Please upload it via your leave request before HR review.',
        'WARNING', '/leave');
    }

    await logAction(employeeId, 'LEAVE_APPLIED', 'LeaveRequest', leave.id, { daysRequested, leaveType }, req.ip);

    // Combine warnings
    const combinedWarning = [overlapWarning, borrowingWarning].filter(Boolean).join(' | ');
    return res.status(201).json({ ...leave, warning: combinedWarning || null });


  } catch (err: any) {
    if (err instanceof AppError) return res.status(err.statusCode).json({ error: err.message, code: err.code });
    errorLogger.log('LeaveController.applyForLeave', err);
    return res.status(500).json({ error: err.message || 'Failed to submit leave request' });
  }
};

// ── 2. GET ELIGIBLE RELIEVERS (same department only) ──────────────────────────
export const getEligibleRelievers = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const userId = (req as any).user.id;

    const me = await prisma.user.findFirst({ where: { id: userId, organizationId: orgId }, select: { role: true, departmentId: true } });
    if (!me) return res.status(404).json({ error: 'User not found' });

    // V5: Relievers must be from the same department as the requester
    const deptFilter = me.departmentId ? { departmentId: me.departmentId } : {};

    const eligible = await prisma.user.findMany({
      where: { organizationId: orgId, isArchived: false, status: 'ACTIVE', id: { not: userId }, ...deptFilter },
      select: { id: true, fullName: true, role: true, jobTitle: true, departmentObj: { select: { name: true } } },
    });

    return res.json(eligible);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// ── 3. GET MY LEAVES ──────────────────────────────────────────────────────────
export const getMyLeaves = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const userId = (req as any).user.id;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20);

    const [leaves, total] = await Promise.all([
      prisma.leaveRequest.findMany({
        where: { employeeId: userId, organizationId: orgId, isArchived: false },
        orderBy: { createdAt: 'desc' },
        include: {
          reliever: { select: { fullName: true } },
          employee: { select: { fullName: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.leaveRequest.count({ where: { employeeId: userId, organizationId: orgId, isArchived: false } }),
    ]);

    const sanitizedLeaves = leaves.map(l => ({
      ...l,
      leaveDays: Number(l.leaveDays)
    }));

    return res.json({ leaves: sanitizedLeaves, total, page, pages: Math.ceil(total / limit) });

  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// ── 4. MY LEAVE BALANCE ───────────────────────────────────────────────────────
export const getMyLeaveBalance = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const userId = (req as any).user.id;
    const user = await prisma.user.findFirst({
      where: { id: userId, organizationId: orgId },
      select: { 
        leaveBalance: true, 
        leaveAllowance: true,
        organization: {
          select: { defaultLeaveAllowance: true }
        }
      },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Hierarchy of precedence: 
    // 1. User specified allowance 
    // 2. Organization default
    // 3. System hardcode (24)
    const metrics = getEffectiveLeaveMetrics(user);

    return res.json({ 
      leaveBalance: metrics.balance, 
      leaveAllowance: metrics.allowance 
    });

  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// ── 5. GET PENDING (Manager/HR queue) ─────────────────────────────────────────
export const getPendingLeaves = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const { id: managerId, role } = (req as any).user;
    const rank = getRoleRank(role);

    let leaves: any[];

    if (['HR_DIRECTOR', 'HR_MANAGER', 'MD', 'DEV'].includes(String(role).toUpperCase())) {
      // Directors+ see ALL pending across organization
      leaves = await prisma.leaveRequest.findMany({
        where: { 
          organizationId: orgId, 
          status: { in: ['MANAGER_REVIEW', 'HR_REVIEW', 'SUBMITTED', 'MD_REVIEW', 'RELIEVER_ACCEPTED'] },
          isArchived: false
        },
        include: {
          employee: { select: { fullName: true, jobTitle: true, departmentObj: { select: { name: true } } } },
          reliever: { select: { fullName: true } },
        },
        orderBy: { startDate: 'asc' },
      });
    } else {
    const ids = await HierarchyService.getManagedEmployeeIds(managerId, orgId);

      leaves = await prisma.leaveRequest.findMany({
        where: { organizationId: orgId, employeeId: { in: ids }, status: { in: ['MANAGER_REVIEW', 'HR_REVIEW', 'SUBMITTED', 'RELIEVER_ACCEPTED'] }, isArchived: false },
        include: {
          employee: { select: { fullName: true, jobTitle: true, departmentObj: { select: { name: true } } } },
          reliever: { select: { fullName: true } },
        },
        orderBy: { startDate: 'asc' },
      });
    }

    const sanitizedLeaves = leaves.map(l => ({
      ...l,
      leaveDays: Number(l.leaveDays)
    }));

    return res.json(sanitizedLeaves);

  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// ── 6. PROCESS LEAVE (Reliever / Manager / HR) ────────────────────────────────
export const processLeave = async (req: Request, res: Response) => {
  try {
    const { id, action, comment, role: actorRoleHint } = req.body;
    const actorId = (req as any).user.id;
    const actorRole = (req as any).user.role;
    const orgId = getOrgId(req);

    const leave = await prisma.leaveRequest.findFirst({ where: { id, organizationId: orgId, isArchived: false } });
    if (!leave) return res.status(404).json({ error: 'Leave request not found' });

    let updated: any;

    // 1. Reliever Response (Explicitly as reliever)
    if (actorRoleHint === 'RELIEVER' || (leave.status === 'SUBMITTED' && leave.relieverId === actorId)) {
      updated = await LeaveService.respondAsReliever(id, actorId, action === 'APPROVE', comment);
    }
    // 2. MD final sign-off
    else if (leave.status === 'MD_REVIEW') {
        const access = await PolicyService.evaluatePolicy(actorId, Permission.LEAVE_MD_APPROVE, { targetUserId: leave.employeeId });
        if (!access.allowed) return res.status(403).json({ error: 'Only the Managing Director may complete final sign-off' });
        updated = await LeaveService.mdFinalReview(id, actorId, action === 'APPROVE', comment);
    }
    // 3. Direct manager review (or HR Director override when the manager is unavailable)
    else if (leave.status === 'MANAGER_REVIEW') {
        const actorRank = getRoleRank(actorRole);
        const employeeRecord = await prisma.user.findUnique({ where: { id: leave.employeeId }, select: { supervisorId: true } });
        const isAssignedManager = employeeRecord?.supervisorId === actorId;

        if (!isAssignedManager && actorRank >= 92) {
          // HR Director override — manager not around. Reason required regardless of outcome.
          if (!comment || comment.trim().length < 3) {
            return res.status(400).json({ error: 'A reason is required when overriding the manager-review step.' });
          }
          updated = await LeaveService.managerReview(id, actorId, action === 'APPROVE', comment, { isOverride: true });
          await logAction(actorId, 'LEAVE_MANAGER_REVIEW_OVERRIDDEN_BY_HR', 'LeaveRequest', id, { comment, assignedManagerId: employeeRecord?.supervisorId || null }, req.ip);
        } else {
          // Assigned manager, or a same-department manager (managerReview() validates this internally)
          updated = await LeaveService.managerReview(id, actorId, action === 'APPROVE', comment);
        }
    }
    // 4. HR Director final review for regular staff
    else if (leave.status === 'HR_REVIEW') {
        const access = await PolicyService.evaluatePolicy(actorId, Permission.LEAVE_HR_APPROVE, { targetUserId: leave.employeeId });
        if (!access.allowed) return res.status(403).json({ error: 'Only the HR Director may review this leave request' });
        updated = await LeaveService.hrValidation(id, actorId, action === 'APPROVE', comment);
    }
    else {
      return res.status(400).json({ error: `Cannot process leave in current status: ${leave.status}` });
    }

    await logAction(actorId, `LEAVE_${action}_BY_${actorRoleHint || actorRole}`, 'LeaveRequest', id, { comment }, req.ip);
    return res.json(updated);
  } catch (error: any) {
    if (error instanceof AppError) return res.status(error.statusCode).json({ error: error.message, code: error.code });
    console.error(`[ProcessLeave Error] ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
};

// ── 7. CANCEL LEAVE ───────────────────────────────────────────────────────────
export const cancelLeave = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = getOrgId(req);
    const userId = (req as any).user.id;

    const leave = await prisma.leaveRequest.findFirst({ where: { id, organizationId: orgId } });
    if (!leave) return res.status(404).json({ error: 'Leave request not found' });
    if (leave.employeeId !== userId) return res.status(403).json({ error: 'Not your leave request' });
    if (leave.status === 'APPROVED') return res.status(400).json({ error: 'Cannot cancel an approved leave. Contact HR.' });

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    await logAction(userId, 'LEAVE_CANCELLED', 'LeaveRequest', id, {}, req.ip);
    return res.json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// ── 8. GET ALL LEAVES (Admin view, rank 80+) ──────────────────────────────────
// L4 FIX: This route is rank-guarded in routes file, so only Directors+ reach it
export const getAllLeaves = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
    const { status } = req.query;

    const where: any = { organizationId: orgId, isArchived: false };
    if (status) where.status = status;

    const [leaves, total] = await Promise.all([
      prisma.leaveRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          employee: { select: { fullName: true, jobTitle: true, departmentObj: { select: { name: true } } } },
          reliever: { select: { fullName: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.leaveRequest.count({ where }),
    ]);

    const sanitizedLeaves = leaves.map(l => ({
      ...l,
      leaveDays: Number(l.leaveDays)
    }));

    return res.json({ leaves: sanitizedLeaves, total, page, pages: Math.ceil(total / limit) });

  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// ── 9. GET MY RELIEF REQUESTS (requests where I am the reliever) ──────────────
export const getMyReliefRequests = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const userId = (req as any).user.id;

    const requests = await prisma.leaveRequest.findMany({
      where: { 
        organizationId: orgId, 
        relieverId: userId, 
        status: 'SUBMITTED', // ONLY show requests where the reliever HAS NOT yet actioned it
        isArchived: false,
        endDate: { gte: new Date() } 
      },
      include: { employee: { select: { fullName: true, jobTitle: true, departmentObj: { select: { name: true } } } } },
      orderBy: { startDate: 'asc' },
    });

    const sanitizedRequests = requests.map(r => ({
      ...r,
      leaveDays: Number(r.leaveDays)
    }));

    return res.json(sanitizedRequests);

  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};
// ── 10. GET HANDOVER HISTORY (Permanent Register) ──────────────────────────
export const getHandoverHistory = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const userId = (req as any).user.id;

    const history = await prisma.handoverRecord.findMany({
      where: { 
        organizationId: orgId,
        OR: [
          { relieverId: userId },
          { requesterId: userId }
        ]
      },
      include: {
        requester: { select: { fullName: true, jobTitle: true } },
        reliever: { select: { fullName: true, jobTitle: true } },
        leaveRequest: { select: { startDate: true, endDate: true, leaveType: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json(history);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// ── 11. DELETE LEAVE REQUEST (MD ONLY) ───────────────────────────────────────
export const deleteLeave = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const actorId = (req as any).user.id;
    const orgId = getOrgId(req);
    const role = (req as any).user.role;
    const rank = getRoleRank(role);

    if (rank < 95) {
      return res.status(403).json({ error: 'Unauthorized: Only the Managing Director can perform administrative deletions' });
    }

    const leave = await prisma.leaveRequest.findFirst({ where: { id, organizationId: orgId } });
    if (!leave) return res.status(404).json({ error: 'Leave request not found' });

    await prisma.leaveRequest.delete({ where: { id } });
    
    await logAction(actorId, 'LEAVE_DELETED_BY_MD', 'LeaveRequest', id, { details: `MD deleted leave request for employee ${leave.employeeId}` }, req.ip);
    
    return res.json({ success: true, message: 'Leave request and associated handovers deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// ── 12. DELETE HANDOVER RECORD (MD ONLY) ─────────────────────────────────────
export const deleteHandover = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const actorId = (req as any).user.id;
    const orgId = getOrgId(req);
    const role = (req as any).user.role;
    const rank = getRoleRank(role);

    if (rank < 95) {
      return res.status(403).json({ error: 'Unauthorized: Only the Managing Director can perform administrative deletions' });
    }

    const record = await prisma.handoverRecord.findFirst({ where: { id, organizationId: orgId } });
    if (!record) return res.status(404).json({ error: 'Handover record not found' });

    await prisma.handoverRecord.delete({ where: { id } });
    
    await logAction(actorId, 'HANDOVER_DELETED_BY_MD', 'HandoverRecord', id, { details: `MD deleted handover record for request ${record.leaveRequestId}` }, req.ip);
    
    return res.json({ success: true, message: 'Handover record deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// ── 13. ADJUST LEAVE BALANCE (Admin Level) ───────────────────────────────────
export const adjustLeaveBalance = async (req: Request, res: Response) => {
  try {
    const { targetUserId, leaveBalance, leaveAllowance, reason } = req.body;
    const orgId = getOrgId(req);
    const actorId = (req as any).user.id;

    if (!targetUserId) {
      return res.status(400).json({ error: 'Target user identification is required' });
    }

    const user = await prisma.user.findFirst({
      where: { id: targetUserId, organizationId: orgId }
    });

    if (!user) return res.status(404).json({ error: 'Target staff member not found in this organization' });

    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        leaveBalance: leaveBalance !== undefined ? leaveBalance : undefined,
        leaveAllowance: leaveAllowance !== undefined ? leaveAllowance : undefined,
        hasManualLeaveOverride: true,
        lastManualLeaveAdjustmentAt: new Date()
      }
    });

    await logAction(actorId, 'LEAVE_BALANCE_ADJUSTED', 'User', targetUserId, { 
      previousBalance: Number(user.leaveBalance), 
      newBalance: leaveBalance, 
      previousAllowance: Number(user.leaveAllowance),
      newAllowance: leaveAllowance,
      reason 
    }, req.ip);
    
    return res.json({ 
      success: true, 
      message: `Institutional record updated. ${updatedUser.fullName}'s balance is now ${leaveBalance} days.`,
      user: {
        id: updatedUser.id,
        fullName: updatedUser.fullName,
        leaveBalance: Number(updatedUser.leaveBalance),
        leaveAllowance: Number(updatedUser.leaveAllowance)
      }
    });
  } catch (error: any) {
    console.error(`[BalanceAdjustment Error] ${error.message}`);
    return res.status(500).json({ error: error.message || 'Critical failure in institutional ledger update' });
  }
};

// ── UPLOAD MEDICAL CERTIFICATE ────────────────────────────────────────────────
export const uploadMedicalCertificate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { medicalCertificateUrl } = req.body;
    const orgId = getOrgId(req);
    const actorId = (req as any).user.id;

    if (!medicalCertificateUrl) {
      return res.status(400).json({ error: 'medicalCertificateUrl is required' });
    }

    const leave = await prisma.leaveRequest.findFirst({
      where: { id, organizationId: orgId }
    });

    if (!leave) return res.status(404).json({ error: 'Leave request not found' });

    // Only the employee themselves or HR Director+ may upload
    const actorRank = getRoleRank((req as any).user.role);
    if (leave.employeeId !== actorId && actorRank < 92) {
      return res.status(403).json({ error: 'Not authorised to upload certificate for this leave' });
    }

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: {
        medicalCertificateUrl,
        medicalCertificateUploaded: true,
      }
    });

    await logAction(actorId, 'MEDICAL_CERT_UPLOADED', 'LeaveRequest', id, {}, req.ip);

    return res.json({ success: true, leave: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};
