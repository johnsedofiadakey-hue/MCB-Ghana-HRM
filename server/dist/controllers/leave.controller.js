"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadMedicalCertificate = exports.getLeaveById = exports.adjustLeaveBalance = exports.deleteHandover = exports.deleteLeave = exports.getHandoverHistory = exports.getMyReliefRequests = exports.getAllLeaves = exports.cancelLeave = exports.processLeave = exports.getPendingLeaves = exports.getMyLeaveBalance = exports.getMyLeaves = exports.getEligibleRelievers = exports.applyForLeave = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const audit_service_1 = require("../services/audit.service");
const auth_middleware_1 = require("../middleware/auth.middleware");
const leave_utils_1 = require("../utils/leave.utils");
const leave_service_1 = require("../services/leave.service");
const hierarchy_service_1 = require("../services/hierarchy.service");
const websocket_service_1 = require("../services/websocket.service");
const error_log_service_1 = require("../services/error-log.service");
const errors_1 = require("../utils/errors");
const policy_service_1 = require("../services/policy.service");
const permissions_1 = require("../types/permissions");
const getOrgId = (req) => req.user?.organizationId || 'mcb-ghana-tenant';
// ── 1. APPLY FOR LEAVE ────────────────────────────────────────────────────────
const applyForLeave = async (req, res) => {
    try {
        const { dates, reason, relieverId, leaveType, handoverNotes, relieverAcceptanceRequired } = req.body;
        const orgId = getOrgId(req);
        const user = req.user;
        const employeeId = user.id;
        if (!Array.isArray(dates) || dates.length === 0 || !reason) {
            return res.status(400).json({ error: 'dates (at least one) and reason are required' });
        }
        const employee = await client_1.default.user.findFirst({ where: { id: employeeId, organizationId: orgId } });
        if (!employee)
            return res.status(404).json({ error: 'User not found' });
        // ── L1 FIX: Reliever rank check removed (Any employee can relieve any employee) ──
        if (relieverId) {
            if (relieverId === employeeId)
                return res.status(400).json({ error: 'You cannot select yourself as your cover person' });
            const reliever = await client_1.default.user.findFirst({ where: { id: relieverId, organizationId: orgId, isArchived: false, status: 'ACTIVE' } });
            if (!reliever)
                return res.status(400).json({ error: 'Selected reliever not found' });
            if (!handoverNotes || String(handoverNotes).trim().length < 10) {
                return res.status(400).json({ error: 'Please provide instructions for your cover person (at least 10 characters) when assigning a reliever.' });
            }
        }
        // Validates weekday-only/no-holiday/no-past-date/no-duplicate selections
        let normalizedDates;
        let daysRequested;
        try {
            const result = await leave_service_1.LeaveService.validateAndCountSelectedDays(orgId, dates);
            normalizedDates = result.normalizedDates;
            daysRequested = result.count;
        }
        catch (e) {
            return res.status(400).json({ error: e.message || 'Invalid date selection' });
        }
        const start = normalizedDates[0];
        const end = normalizedDates[normalizedDates.length - 1];
        // Exact-date conflict check against this employee's own non-rejected requests
        const exactConflict = await client_1.default.leaveRequestDay.findFirst({
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
        const boundingBoxConflict = await client_1.default.leaveRequest.findFirst({
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
        let borrowingWarning = null;
        const org = await client_1.default.organization.findUnique({ where: { id: orgId }, select: { allowLeaveBorrowing: true, borrowingLimit: true, defaultLeaveAllowance: true } });
        const balance = Number(employee.leaveBalance || 0);
        const pending = await client_1.default.leaveRequest.aggregate({
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
        let overlapWarning = null;
        if (employee.departmentId) {
            const overlap = await leave_service_1.LeaveService.checkLeaveOverlap(orgId, employee.departmentId, start, end);
            if (overlap.warning) {
                overlapWarning = overlap.message || 'Potential departmental overlap detected';
            }
        }
        // ── RELIEVER LOCK: Cannot take leave if covering for someone else ────────────────
        const myCoverage = await client_1.default.leaveRequest.findFirst({
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
        const initialStatus = (0, leave_service_1.determineInitialLeaveStatus)(employee.role, Boolean(relieverId));
        const isSickLeave = (leaveType === 'SICK_LEAVE' || leaveType === 'Sick');
        const leave = await client_1.default.$transaction(async (tx) => {
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
            await (0, websocket_service_1.notify)(relieverId, '🤝 Handover Request', `${employee.fullName} has requested you as reliever for ${daysRequested} day(s).${noteSnippet}`, 'INFO', '/leave');
        }
        else if (initialStatus === 'MANAGER_REVIEW') {
            await leave_service_1.LeaveService.notifyAssignedManagerAndHr(orgId, employee, daysRequested);
        }
        else {
            const reviewerRoles = initialStatus === 'MD_REVIEW' ? ['MD', 'DEV'] : ['HR_DIRECTOR', 'DEV'];
            const reviewers = await client_1.default.user.findMany({
                where: { organizationId: orgId, role: { in: reviewerRoles }, isArchived: false },
                select: { id: true }
            });
            await Promise.all(reviewers.map(reviewer => (0, websocket_service_1.notify)(reviewer.id, '📅 New Leave Request', `${employee.fullName} has requested ${daysRequested} day(s) of leave. Pending your review.`, 'INFO', '/leave')));
        }
        if (isSickLeave) {
            await (0, websocket_service_1.notify)(employeeId, '⚕️ Doctor\'s Report Required', 'Sick leave requires a doctor\'s report. Please upload it via your leave request before HR review.', 'WARNING', '/leave');
        }
        await (0, audit_service_1.logAction)(employeeId, 'LEAVE_APPLIED', 'LeaveRequest', leave.id, { daysRequested, leaveType }, req.ip);
        // Combine warnings
        const combinedWarning = [overlapWarning, borrowingWarning].filter(Boolean).join(' | ');
        return res.status(201).json({ ...leave, warning: combinedWarning || null });
    }
    catch (err) {
        if (err instanceof errors_1.AppError)
            return res.status(err.statusCode).json({ error: err.message, code: err.code });
        error_log_service_1.errorLogger.log('LeaveController.applyForLeave', err);
        return res.status(500).json({ error: err.message || 'Failed to submit leave request' });
    }
};
exports.applyForLeave = applyForLeave;
// ── 2. GET ELIGIBLE RELIEVERS (same department only) ──────────────────────────
const getEligibleRelievers = async (req, res) => {
    try {
        const orgId = getOrgId(req);
        const userId = req.user.id;
        const me = await client_1.default.user.findFirst({ where: { id: userId, organizationId: orgId }, select: { role: true, departmentId: true } });
        if (!me)
            return res.status(404).json({ error: 'User not found' });
        // V5: Relievers must be from the same department as the requester
        const deptFilter = me.departmentId ? { departmentId: me.departmentId } : {};
        const eligible = await client_1.default.user.findMany({
            where: { organizationId: orgId, isArchived: false, status: 'ACTIVE', id: { not: userId }, ...deptFilter },
            select: { id: true, fullName: true, role: true, jobTitle: true, departmentObj: { select: { name: true } } },
        });
        return res.json(eligible);
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
exports.getEligibleRelievers = getEligibleRelievers;
// ── 3. GET MY LEAVES ──────────────────────────────────────────────────────────
const getMyLeaves = async (req, res) => {
    try {
        const orgId = getOrgId(req);
        const userId = req.user.id;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, parseInt(req.query.limit) || 20);
        const [leaves, total] = await Promise.all([
            client_1.default.leaveRequest.findMany({
                where: { employeeId: userId, organizationId: orgId, isArchived: false },
                orderBy: { createdAt: 'desc' },
                include: {
                    reliever: { select: { fullName: true } },
                    employee: { select: { fullName: true } },
                },
                skip: (page - 1) * limit,
                take: limit,
            }),
            client_1.default.leaveRequest.count({ where: { employeeId: userId, organizationId: orgId, isArchived: false } }),
        ]);
        const sanitizedLeaves = leaves.map(l => ({
            ...l,
            leaveDays: Number(l.leaveDays)
        }));
        return res.json({ leaves: sanitizedLeaves, total, page, pages: Math.ceil(total / limit) });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
exports.getMyLeaves = getMyLeaves;
// ── 4. MY LEAVE BALANCE ───────────────────────────────────────────────────────
const getMyLeaveBalance = async (req, res) => {
    try {
        const orgId = getOrgId(req);
        const userId = req.user.id;
        const user = await client_1.default.user.findFirst({
            where: { id: userId, organizationId: orgId },
            select: {
                leaveBalance: true,
                leaveAllowance: true,
                organization: {
                    select: { defaultLeaveAllowance: true }
                }
            },
        });
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        // Hierarchy of precedence: 
        // 1. User specified allowance 
        // 2. Organization default
        // 3. System hardcode (24)
        const metrics = (0, leave_utils_1.getEffectiveLeaveMetrics)(user);
        return res.json({
            leaveBalance: metrics.balance,
            leaveAllowance: metrics.allowance
        });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
exports.getMyLeaveBalance = getMyLeaveBalance;
// ── 5. GET PENDING (Manager/HR queue) ─────────────────────────────────────────
const getPendingLeaves = async (req, res) => {
    try {
        const orgId = getOrgId(req);
        const { id: managerId, role } = req.user;
        const rank = (0, auth_middleware_1.getRoleRank)(role);
        let leaves;
        if (['HR_DIRECTOR', 'HR_MANAGER', 'MD', 'DEV'].includes(String(role).toUpperCase())) {
            // Directors+ see ALL pending across organization
            leaves = await client_1.default.leaveRequest.findMany({
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
        }
        else {
            const ids = await hierarchy_service_1.HierarchyService.getManagedEmployeeIds(managerId, orgId);
            leaves = await client_1.default.leaveRequest.findMany({
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
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
exports.getPendingLeaves = getPendingLeaves;
// ── 6. PROCESS LEAVE (Reliever / Manager / HR) ────────────────────────────────
const processLeave = async (req, res) => {
    try {
        const { id, action, comment, role: actorRoleHint } = req.body;
        const actorId = req.user.id;
        const actorRole = req.user.role;
        const orgId = getOrgId(req);
        const leave = await client_1.default.leaveRequest.findFirst({ where: { id, organizationId: orgId, isArchived: false } });
        if (!leave)
            return res.status(404).json({ error: 'Leave request not found' });
        let updated;
        // 1. Reliever Response (Explicitly as reliever)
        if (actorRoleHint === 'RELIEVER' || (leave.status === 'SUBMITTED' && leave.relieverId === actorId)) {
            updated = await leave_service_1.LeaveService.respondAsReliever(id, actorId, action === 'APPROVE', comment);
        }
        // 2. MD final sign-off
        else if (leave.status === 'MD_REVIEW') {
            const access = await policy_service_1.PolicyService.evaluatePolicy(actorId, permissions_1.Permission.LEAVE_MD_APPROVE, { targetUserId: leave.employeeId });
            if (!access.allowed)
                return res.status(403).json({ error: 'Only the Managing Director may complete final sign-off' });
            updated = await leave_service_1.LeaveService.mdFinalReview(id, actorId, action === 'APPROVE', comment);
        }
        // 3. Direct manager review (or HR Director override when the manager is unavailable)
        else if (leave.status === 'MANAGER_REVIEW') {
            const actorRank = (0, auth_middleware_1.getRoleRank)(actorRole);
            const employeeRecord = await client_1.default.user.findUnique({ where: { id: leave.employeeId }, select: { supervisorId: true } });
            const isAssignedManager = employeeRecord?.supervisorId === actorId;
            if (!isAssignedManager && actorRank >= 92) {
                // HR Director override — manager not around. Reason required regardless of outcome.
                if (!comment || comment.trim().length < 3) {
                    return res.status(400).json({ error: 'A reason is required when overriding the manager-review step.' });
                }
                updated = await leave_service_1.LeaveService.managerReview(id, actorId, action === 'APPROVE', comment, { isOverride: true });
                await (0, audit_service_1.logAction)(actorId, 'LEAVE_MANAGER_REVIEW_OVERRIDDEN_BY_HR', 'LeaveRequest', id, { comment, assignedManagerId: employeeRecord?.supervisorId || null }, req.ip);
            }
            else {
                // Assigned manager, or a same-department manager (managerReview() validates this internally)
                updated = await leave_service_1.LeaveService.managerReview(id, actorId, action === 'APPROVE', comment);
            }
        }
        // 4. HR Director final review for regular staff
        else if (leave.status === 'HR_REVIEW') {
            const access = await policy_service_1.PolicyService.evaluatePolicy(actorId, permissions_1.Permission.LEAVE_HR_APPROVE, { targetUserId: leave.employeeId });
            if (!access.allowed)
                return res.status(403).json({ error: 'Only the HR Director may review this leave request' });
            updated = await leave_service_1.LeaveService.hrValidation(id, actorId, action === 'APPROVE', comment);
        }
        else {
            return res.status(400).json({ error: `Cannot process leave in current status: ${leave.status}` });
        }
        await (0, audit_service_1.logAction)(actorId, `LEAVE_${action}_BY_${actorRoleHint || actorRole}`, 'LeaveRequest', id, { comment }, req.ip);
        return res.json(updated);
    }
    catch (error) {
        if (error instanceof errors_1.AppError)
            return res.status(error.statusCode).json({ error: error.message, code: error.code });
        console.error(`[ProcessLeave Error] ${error.message}`);
        return res.status(500).json({ error: error.message });
    }
};
exports.processLeave = processLeave;
// ── 7. CANCEL LEAVE ───────────────────────────────────────────────────────────
const cancelLeave = async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = getOrgId(req);
        const userId = req.user.id;
        const leave = await client_1.default.leaveRequest.findFirst({ where: { id, organizationId: orgId } });
        if (!leave)
            return res.status(404).json({ error: 'Leave request not found' });
        if (leave.employeeId !== userId)
            return res.status(403).json({ error: 'Not your leave request' });
        if (leave.status === 'APPROVED')
            return res.status(400).json({ error: 'Cannot cancel an approved leave. Contact HR.' });
        const updated = await client_1.default.leaveRequest.update({
            where: { id },
            data: { status: 'CANCELLED' },
        });
        await (0, audit_service_1.logAction)(userId, 'LEAVE_CANCELLED', 'LeaveRequest', id, {}, req.ip);
        return res.json(updated);
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
exports.cancelLeave = cancelLeave;
// ── 8. GET ALL LEAVES (Admin view, rank 80+) ──────────────────────────────────
// L4 FIX: This route is rank-guarded in routes file, so only Directors+ reach it
const getAllLeaves = async (req, res) => {
    try {
        const orgId = getOrgId(req);
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, parseInt(req.query.limit) || 20);
        const { status } = req.query;
        const where = { organizationId: orgId, isArchived: false };
        if (status)
            where.status = status;
        const [leaves, total] = await Promise.all([
            client_1.default.leaveRequest.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                include: {
                    employee: { select: { fullName: true, jobTitle: true, departmentObj: { select: { name: true } } } },
                    reliever: { select: { fullName: true } },
                },
                skip: (page - 1) * limit,
                take: limit,
            }),
            client_1.default.leaveRequest.count({ where }),
        ]);
        const sanitizedLeaves = leaves.map(l => ({
            ...l,
            leaveDays: Number(l.leaveDays)
        }));
        return res.json({ leaves: sanitizedLeaves, total, page, pages: Math.ceil(total / limit) });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
exports.getAllLeaves = getAllLeaves;
// ── 9. GET MY RELIEF REQUESTS (requests where I am the reliever) ──────────────
const getMyReliefRequests = async (req, res) => {
    try {
        const orgId = getOrgId(req);
        const userId = req.user.id;
        const requests = await client_1.default.leaveRequest.findMany({
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
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
exports.getMyReliefRequests = getMyReliefRequests;
// ── 10. GET HANDOVER HISTORY (Permanent Register) ──────────────────────────
const getHandoverHistory = async (req, res) => {
    try {
        const orgId = getOrgId(req);
        const userId = req.user.id;
        const history = await client_1.default.handoverRecord.findMany({
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
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
exports.getHandoverHistory = getHandoverHistory;
// ── 11. DELETE LEAVE REQUEST (MD ONLY) ───────────────────────────────────────
const deleteLeave = async (req, res) => {
    try {
        const { id } = req.params;
        const actorId = req.user.id;
        const orgId = getOrgId(req);
        const role = req.user.role;
        const rank = (0, auth_middleware_1.getRoleRank)(role);
        if (rank < 95) {
            return res.status(403).json({ error: 'Unauthorized: Only the Managing Director can perform administrative deletions' });
        }
        const leave = await client_1.default.leaveRequest.findFirst({ where: { id, organizationId: orgId } });
        if (!leave)
            return res.status(404).json({ error: 'Leave request not found' });
        await client_1.default.leaveRequest.delete({ where: { id } });
        await (0, audit_service_1.logAction)(actorId, 'LEAVE_DELETED_BY_MD', 'LeaveRequest', id, { details: `MD deleted leave request for employee ${leave.employeeId}` }, req.ip);
        return res.json({ success: true, message: 'Leave request and associated handovers deleted successfully' });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
exports.deleteLeave = deleteLeave;
// ── 12. DELETE HANDOVER RECORD (MD ONLY) ─────────────────────────────────────
const deleteHandover = async (req, res) => {
    try {
        const { id } = req.params;
        const actorId = req.user.id;
        const orgId = getOrgId(req);
        const role = req.user.role;
        const rank = (0, auth_middleware_1.getRoleRank)(role);
        if (rank < 95) {
            return res.status(403).json({ error: 'Unauthorized: Only the Managing Director can perform administrative deletions' });
        }
        const record = await client_1.default.handoverRecord.findFirst({ where: { id, organizationId: orgId } });
        if (!record)
            return res.status(404).json({ error: 'Handover record not found' });
        await client_1.default.handoverRecord.delete({ where: { id } });
        await (0, audit_service_1.logAction)(actorId, 'HANDOVER_DELETED_BY_MD', 'HandoverRecord', id, { details: `MD deleted handover record for request ${record.leaveRequestId}` }, req.ip);
        return res.json({ success: true, message: 'Handover record deleted successfully' });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
exports.deleteHandover = deleteHandover;
// ── 13. ADJUST LEAVE BALANCE (Admin Level) ───────────────────────────────────
const adjustLeaveBalance = async (req, res) => {
    try {
        const { targetUserId, leaveBalance, leaveAllowance, reason } = req.body;
        const orgId = getOrgId(req);
        const actorId = req.user.id;
        if (!targetUserId) {
            return res.status(400).json({ error: 'Target user identification is required' });
        }
        const user = await client_1.default.user.findFirst({
            where: { id: targetUserId, organizationId: orgId }
        });
        if (!user)
            return res.status(404).json({ error: 'Target staff member not found in this organization' });
        const updatedUser = await client_1.default.user.update({
            where: { id: targetUserId },
            data: {
                leaveBalance: leaveBalance !== undefined ? leaveBalance : undefined,
                leaveAllowance: leaveAllowance !== undefined ? leaveAllowance : undefined,
                hasManualLeaveOverride: true,
                lastManualLeaveAdjustmentAt: new Date()
            }
        });
        await (0, audit_service_1.logAction)(actorId, 'LEAVE_BALANCE_ADJUSTED', 'User', targetUserId, {
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
    }
    catch (error) {
        console.error(`[BalanceAdjustment Error] ${error.message}`);
        return res.status(500).json({ error: error.message || 'Critical failure in institutional ledger update' });
    }
};
exports.adjustLeaveBalance = adjustLeaveBalance;
// ── GET SINGLE LEAVE (for approval modal) ────────────────────────────────────
const getLeaveById = async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = getOrgId(req);
        const actorId = req.user.id;
        const actorRank = (0, auth_middleware_1.getRoleRank)(req.user.role);
        const leave = await client_1.default.leaveRequest.findFirst({
            where: { id, organizationId: orgId, isArchived: false },
            include: {
                employee: {
                    select: {
                        id: true, fullName: true, jobTitle: true, email: true,
                        leaveBalance: true, leaveAllowance: true,
                        departmentObj: { select: { name: true } },
                    }
                },
                reliever: { select: { id: true, fullName: true, jobTitle: true } },
                days: { orderBy: { date: 'asc' }, select: { date: true } },
            }
        });
        if (!leave)
            return res.status(404).json({ error: 'Leave request not found' });
        // Permit: the employee themselves, their supervisor, any HR/MD rank, or managers 75+
        const isEmployee = leave.employeeId === actorId;
        const isSupervisor = (await client_1.default.user.findUnique({ where: { id: leave.employeeId }, select: { supervisorId: true } }))?.supervisorId === actorId;
        if (!isEmployee && !isSupervisor && actorRank < 75) {
            return res.status(403).json({ error: 'Access denied' });
        }
        return res.json({
            ...leave,
            leaveDays: Number(leave.leaveDays),
            leaveDaysArr: leave.days,
            employee: { ...leave.employee, leaveBalance: Number(leave.employee?.leaveBalance || 0), leaveAllowance: Number(leave.employee?.leaveAllowance || 0) },
        });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
exports.getLeaveById = getLeaveById;
// ── UPLOAD MEDICAL CERTIFICATE ────────────────────────────────────────────────
const uploadMedicalCertificate = async (req, res) => {
    try {
        const { id } = req.params;
        const { medicalCertificateUrl } = req.body;
        const orgId = getOrgId(req);
        const actorId = req.user.id;
        if (!medicalCertificateUrl) {
            return res.status(400).json({ error: 'medicalCertificateUrl is required' });
        }
        const leave = await client_1.default.leaveRequest.findFirst({
            where: { id, organizationId: orgId }
        });
        if (!leave)
            return res.status(404).json({ error: 'Leave request not found' });
        // Only the employee themselves or HR Director+ may upload
        const actorRank = (0, auth_middleware_1.getRoleRank)(req.user.role);
        if (leave.employeeId !== actorId && actorRank < 92) {
            return res.status(403).json({ error: 'Not authorised to upload certificate for this leave' });
        }
        // Upload to Firebase Storage if a base64 data URI was sent
        let certUrl = medicalCertificateUrl;
        if (medicalCertificateUrl.startsWith('data:')) {
            try {
                const { FirebaseStorageService } = await Promise.resolve().then(() => __importStar(require('../services/firebase-storage.service')));
                const match = medicalCertificateUrl.match(/^data:([^;]+);base64,(.+)$/);
                if (match) {
                    const mime = match[1];
                    const ext = mime.split('/')[1]?.replace('jpeg', 'jpg') || 'bin';
                    const buffer = Buffer.from(match[2], 'base64');
                    certUrl = await FirebaseStorageService.uploadFile(buffer, `med-cert-${id}-${Date.now()}.${ext}`, 'medical-certs', mime);
                }
            }
            catch (fbErr) {
                console.warn('[LeaveController] Firebase upload failed for medical cert, storing data URI:', fbErr);
            }
        }
        const updated = await client_1.default.leaveRequest.update({
            where: { id },
            data: {
                medicalCertificateUrl: certUrl,
                medicalCertificateUploaded: true,
            }
        });
        await (0, audit_service_1.logAction)(actorId, 'MEDICAL_CERT_UPLOADED', 'LeaveRequest', id, {}, req.ip);
        return res.json({ success: true, leave: updated });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
exports.uploadMedicalCertificate = uploadMedicalCertificate;
