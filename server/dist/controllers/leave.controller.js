"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadMedicalCertificate = exports.adjustLeaveBalance = exports.deleteHandover = exports.deleteLeave = exports.getHandoverHistory = exports.getMyReliefRequests = exports.getAllLeaves = exports.cancelLeave = exports.processLeave = exports.getPendingLeaves = exports.getMyLeaveBalance = exports.getMyLeaves = exports.getEligibleRelievers = exports.applyForLeave = void 0;
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
// Working-day calculator (weekends & holidays excluded) - Timezone Stable
const calcWorkingDays = (start, end, holidayDates = []) => {
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
const applyForLeave = async (req, res) => {
    try {
        const { startDate, endDate, reason, relieverId, leaveType, handoverNotes, relieverAcceptanceRequired } = req.body;
        const orgId = getOrgId(req);
        const user = req.user;
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
        }
        const overlappingRequest = await client_1.default.leaveRequest.findFirst({
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
        const holidays = await client_1.default.publicHoliday.findMany({
            where: { organizationId: orgId, date: { gte: start, lte: end } }
        });
        const holidayDates = holidays.map(h => h.date.toISOString().split('T')[0]);
        const daysRequested = calcWorkingDays(start, end, holidayDates);
        if (daysRequested < 1) {
            return res.status(400).json({ error: 'The selected period contains no working days' });
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
        // V5: no reliever → HR_REVIEW directly (HR Director is sole approver)
        const initialStatus = (0, leave_service_1.determineInitialLeaveStatus)(employee.role, Boolean(relieverId));
        const isSickLeaveLong = (leaveType === 'SICK_LEAVE' || leaveType === 'Sick') && daysRequested >= 3;
        const leave = await client_1.default.leaveRequest.create({
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
            await (0, websocket_service_1.notify)(relieverId, '🤝 Handover Request', `${employee.fullName} has requested you as reliever for ${daysRequested} day(s).${noteSnippet}`, 'INFO', '/leave');
        }
        else {
            const reviewerRoles = initialStatus === 'MD_REVIEW' ? ['MD'] : ['HR_DIRECTOR'];
            const reviewers = await client_1.default.user.findMany({
                where: { organizationId: orgId, role: { in: reviewerRoles }, isArchived: false },
                select: { id: true }
            });
            await Promise.all(reviewers.map(reviewer => (0, websocket_service_1.notify)(reviewer.id, '📅 New Leave Request', `${employee.fullName} has requested ${daysRequested} day(s) of leave. Pending your review.`, 'INFO', '/leave')));
        }
        if (isSickLeaveLong) {
            await (0, websocket_service_1.notify)(employeeId, '⚕️ Medical Certificate Required', 'Sick leave of 3+ days requires a medical certificate. Please upload it via your leave request before HR review.', 'WARNING', '/leave');
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
        // 2. HR Director / MD Processing
        else if (leave.status === 'MD_REVIEW') {
            const access = await policy_service_1.PolicyService.evaluatePolicy(actorId, permissions_1.Permission.LEAVE_MD_APPROVE, { targetUserId: leave.employeeId });
            if (!access.allowed)
                return res.status(403).json({ error: 'Only the Managing Director may complete final sign-off' });
            updated = await leave_service_1.LeaveService.mdFinalReview(id, actorId, action === 'APPROVE', comment);
        }
        else if (['HR_REVIEW', 'MANAGER_REVIEW'].includes(leave.status)) {
            const access = await policy_service_1.PolicyService.evaluatePolicy(actorId, permissions_1.Permission.LEAVE_HR_APPROVE, { targetUserId: leave.employeeId });
            if (!access.allowed)
                return res.status(403).json({ error: 'Only the HR Director may review this leave request' });
            // MANAGER_REVIEW is a legacy status — HR Director can still action it via hrValidation
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
        const updated = await client_1.default.leaveRequest.update({
            where: { id },
            data: {
                medicalCertificateUrl,
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
