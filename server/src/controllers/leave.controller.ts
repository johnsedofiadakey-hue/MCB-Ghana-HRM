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

// Working-day calculator (weekends & holidays excluded) - Timezone Stable
const calcWorkingDays = (start: Date, end: Date, holidayDates: string[] = []): number => {
  let count = 0;
  // Use UTC to avoid local timezone shifts during day iteration
  const cur = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const fin = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  
  const holidaySet = new Set(holidayDates);

  while (cur <= fin) {
    const d = cur.getUTCDay(); // 0=Sun, 6=Sat
    const dateStr = cur.toISOString().split('T')[0];
    
    // Skip weekends and registered public holidays
    if (d !== 0 && d !== 6 && !holidaySet.has(dateStr)) {
      count++;
    }
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return count;
};

// ── 1. APPLY FOR LEAVE ────────────────────────────────────────────────────────
export const applyForLeave = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, reason, relieverId, leaveType, handoverNotes, relieverAcceptanceRequired } = req.body;
    const orgId = getOrgId(req);
    const user = (req as any).user;
    const employeeId = user.id;

    if (!startDate || !endDate || !reason) {
      return res.status(400).json({ error: 'startDate, endDate, and reason are required' });
    }
    const start = new Date(`${startDate}T00:00:00.000Z`);
    const end = new Date(`${endDate}T00:00:00.000Z`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Please provide valid start and end dates' });
    }
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    if (start < today) {
      return res.status(400).json({ error: 'Cannot request leave for a past date' });
    }
    if (end < start) {
      return res.status(400).json({ error: 'End date cannot be before start date' });
    }

    const employee = await prisma.user.findFirst({ where: { id: employeeId, organizationId: orgId } });
    if (!employee) return res.status(404).json({ error: 'User not found' });

    // ── L1 FIX: Reliever rank check removed (Any employee can relieve any employee) ──
    if (relieverId) {
      if (relieverId === employeeId) return res.status(400).json({ error: 'You cannot select yourself as your cover person' });
      const reliever = await prisma.user.findFirst({ where: { id: relieverId, organizationId: orgId, isArchived: false, status: 'ACTIVE' } });
      if (!reliever) return res.status(400).json({ error: 'Selected reliever not found' });
    }

    const overlappingRequest = await prisma.leaveRequest.findFirst({
      where: {
        organizationId: orgId,
        employeeId,
        isArchived: false,
        status: { notIn: ['CANCELLED', 'RELIEVER_DECLINED', 'MANAGER_REJECTED', 'HR_REJECTED', 'MD_REJECTED'] },
        startDate: { lte: end },
        endDate: { gte: start },
      },
    });
    if (overlappingRequest) {
      return res.status(409).json({ error: 'You already have an active leave request that overlaps these dates' });
    }

    // Fetch public holidays for this org to exclude from calculation
    const holidays = await prisma.publicHoliday.findMany({
      where: { organizationId: orgId, date: { gte: start, lte: end } }
    });
    const holidayDates = holidays.map(h => h.date.toISOString().split('T')[0]);

    const daysRequested = calcWorkingDays(start, end, holidayDates);
    if (daysRequested < 1) {
      return res.status(400).json({ error: 'The selected period contains no working days' });
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

    // V5: no reliever → HR_REVIEW directly (HR Director is sole approver)
    const initialStatus = determineInitialLeaveStatus(employee.role, Boolean(relieverId));

    const isSickLeaveLong = (leaveType === 'SICK_LEAVE' || leaveType === 'Sick') && daysRequested >= 3;

    const leave = await prisma.leaveRequest.create({
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
        requiresMedicalCertificate: isSickLeaveLong,
      },
    });

    // Notify reliever or HR Director
    if (relieverId) {
      const noteSnippet = handoverNotes ? `\n\nHandover: ${handoverNotes.substring(0, 60)}${handoverNotes.length > 60 ? '...' : ''}` : '';
      await notify(relieverId, '🤝 Handover Request', `${employee.fullName} has requested you as reliever for ${daysRequested} day(s).${noteSnippet}`, 'INFO', '/leave');
    } else {
      const reviewerRoles = initialStatus === 'MD_REVIEW' ? ['MD'] : ['HR_DIRECTOR'];
      const reviewers = await prisma.user.findMany({
        where: { organizationId: orgId, role: { in: reviewerRoles }, isArchived: false },
        select: { id: true }
      });
      await Promise.all(
        reviewers.map(reviewer => notify(reviewer.id, '📅 New Leave Request',
          `${employee.fullName} has requested ${daysRequested} day(s) of leave. Pending your review.`, 'INFO', '/leave'))
      );
    }

    if (isSickLeaveLong) {
      await notify(employeeId, '⚕️ Medical Certificate Required',
        'Sick leave of 3+ days requires a medical certificate. Please upload it via your leave request before HR review.',
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
    // 2. HR Director / MD Processing
    else if (leave.status === 'MD_REVIEW') {
        const access = await PolicyService.evaluatePolicy(actorId, Permission.LEAVE_MD_APPROVE, { targetUserId: leave.employeeId });
        if (!access.allowed) return res.status(403).json({ error: 'Only the Managing Director may complete final sign-off' });
        updated = await LeaveService.mdFinalReview(id, actorId, action === 'APPROVE', comment);
    }
    else if (['HR_REVIEW', 'MANAGER_REVIEW'].includes(leave.status)) {
        const access = await PolicyService.evaluatePolicy(actorId, Permission.LEAVE_HR_APPROVE, { targetUserId: leave.employeeId });
        if (!access.allowed) return res.status(403).json({ error: 'Only the HR Director may review this leave request' });
        // MANAGER_REVIEW is a legacy status — HR Director can still action it via hrValidation
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
