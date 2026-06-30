"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRiskPulse = exports.generateSmartDraft = exports.cascadeTarget = exports.reviewTarget = exports.updateProgress = exports.acknowledge = exports.createTarget = exports.getStrategicRollup = exports.deleteTarget = exports.updateTarget = exports.getTarget = exports.getDepartmentTargets = exports.getTeamTargets = exports.getTargets = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const target_service_1 = require("../services/target.service");
const auth_middleware_1 = require("../middleware/auth.middleware");
const error_log_service_1 = require("../services/error-log.service");
const hierarchy_service_1 = require("../services/hierarchy.service");
const getOrgId = (req) => req.user?.organizationId || 'mcb-ghana-tenant';
const getUser = (req) => req.user;
const hasOrganizationTargetOversight = (role) => ['MD', 'DIRECTOR', 'HR_DIRECTOR', 'HR_MANAGER', 'DEV'].includes(String(role || '').toUpperCase());
const sanitizeTarget = (target) => {
    if (!target)
        return target;
    return {
        ...target,
        weight: Number(target.weight || 0),
        progress: Number(target.progress || 0),
        metrics: target.metrics?.map((m) => ({
            ...m,
            targetValue: Number(m.targetValue || 0),
            currentValue: Number(m.currentValue || 0),
            weight: Number(m.weight || 0)
        })),
        childTargets: target.childTargets?.map(sanitizeTarget)
    };
};
// ── LIST: my targets (assigned to me + I'm lineManager/reviewer) ──────────────
const getTargets = async (req, res) => {
    try {
        const orgId = getOrgId(req);
        const user = getUser(req);
        const userId = user.id;
        const { status, level, quarter, year } = req.query;
        const managedDepts = await client_1.default.department.findMany({
            where: { organizationId: orgId, managerId: userId },
            select: { id: true }
        });
        const managedDeptIds = managedDepts.map(d => d.id);
        const where = {
            organizationId: orgId,
            isArchived: false,
            OR: [
                { assigneeId: userId },
                { lineManagerId: userId },
                { originatorId: userId },
                { reviewerId: userId },
                { department: { managerId: userId } },
                { departmentId: { in: [user.departmentId, ...managedDeptIds].filter(Boolean) }, level: 'DEPARTMENT' }
            ],
        };
        if (status)
            where.status = status;
        if (level)
            where.level = level;
        if (quarter)
            where.quarter = parseInt(quarter);
        if (year)
            where.year = parseInt(year);
        const targets = await client_1.default.target.findMany({
            where,
            include: {
                metrics: true,
                assignee: { select: { id: true, fullName: true, avatarUrl: true, jobTitle: true, role: true } },
                originator: { select: { id: true, fullName: true, avatarUrl: true } },
                lineManager: { select: { id: true, fullName: true, avatarUrl: true } },
                reviewer: { select: { id: true, fullName: true, avatarUrl: true } },
                department: { select: { id: true, name: true } },
                parentTarget: { select: { id: true, title: true } },
                updates: {
                    orderBy: { createdAt: 'desc' },
                    take: 5,
                    include: { submittedBy: { select: { fullName: true, avatarUrl: true } }, metric: { select: { title: true } } }
                },
                _count: { select: { childTargets: true } },
            },
            orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        });
        res.json(targets.map(sanitizeTarget));
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.getTargets = getTargets;
// ── LIST: targets I assigned / manage (Manager+) ─────────────────────────────
const getTeamTargets = async (req, res) => {
    try {
        const orgId = getOrgId(req);
        const user = getUser(req);
        const userId = user.id;
        const { status } = req.query;
        const managedDepts = await client_1.default.department.findMany({
            where: { organizationId: orgId, managerId: userId },
            select: { id: true }
        });
        const managedDeptIds = managedDepts.map(d => d.id);
        const where = {
            organizationId: orgId,
            isArchived: false,
            OR: [
                { lineManagerId: userId },
                { originatorId: userId },
                { reviewerId: userId },
                { department: { managerId: userId } },
                { departmentId: { in: [user.departmentId, ...managedDeptIds].filter(Boolean) }, level: 'DEPARTMENT' }
            ],
        };
        if (status)
            where.status = status;
        const targets = await client_1.default.target.findMany({
            where,
            include: {
                metrics: true,
                assignee: { select: { id: true, fullName: true, avatarUrl: true, jobTitle: true, role: true } },
                originator: { select: { id: true, fullName: true, avatarUrl: true } },
                department: { select: { id: true, name: true } },
                updates: {
                    orderBy: { createdAt: 'desc' },
                    take: 5,
                    include: { submittedBy: { select: { fullName: true, avatarUrl: true } }, metric: { select: { title: true } } }
                },
                _count: { select: { childTargets: true } },
            },
            orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
        });
        res.json(targets.map(sanitizeTarget));
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.getTeamTargets = getTeamTargets;
// ── LIST: department-level targets (Director+) ────────────────────────────────
const getDepartmentTargets = async (req, res) => {
    try {
        const orgId = getOrgId(req);
        const user = getUser(req);
        const { departmentId, quarter, year } = req.query;
        const managedDepartments = await client_1.default.department.findMany({
            where: { organizationId: orgId, managerId: user.id },
            select: { id: true },
        });
        const allowedDepartmentIds = [...new Set([user.departmentId, ...managedDepartments.map((department) => department.id)].filter(Boolean))];
        const where = {
            organizationId: orgId,
            level: 'DEPARTMENT',
            isArchived: false,
        };
        if (departmentId)
            where.departmentId = Number(departmentId);
        if (!hasOrganizationTargetOversight(user.role)) {
            if (departmentId && !allowedDepartmentIds.includes(Number(departmentId))) {
                return res.status(403).json({ error: 'Not authorised to view that department target portfolio' });
            }
            if (!departmentId)
                where.departmentId = { in: allowedDepartmentIds };
        }
        if (quarter)
            where.quarter = parseInt(quarter);
        if (year)
            where.year = parseInt(year);
        const targets = await client_1.default.target.findMany({
            where,
            include: {
                metrics: true,
                department: { select: { id: true, name: true } },
                originator: { select: { id: true, fullName: true } },
                _count: { select: { childTargets: true } },
                childTargets: {
                    include: {
                        assignee: { select: { id: true, fullName: true, avatarUrl: true, role: true } },
                        metrics: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(targets.map(sanitizeTarget));
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.getDepartmentTargets = getDepartmentTargets;
// ── SINGLE ────────────────────────────────────────────────────────────────────
const getTarget = async (req, res) => {
    try {
        const orgId = getOrgId(req);
        const userId = getUser(req).id;
        const userRank = (0, auth_middleware_1.getRoleRank)(getUser(req).role);
        const target = await client_1.default.target.findUnique({
            where: { id: req.params.id },
            include: {
                metrics: { include: { updates: { orderBy: { createdAt: 'desc' }, take: 5 } } },
                assignee: { select: { id: true, fullName: true, avatarUrl: true, jobTitle: true, role: true } },
                originator: { select: { id: true, fullName: true, avatarUrl: true } },
                lineManager: { select: { id: true, fullName: true, avatarUrl: true } },
                reviewer: { select: { id: true, fullName: true, avatarUrl: true } },
                department: { select: { id: true, name: true } },
                parentTarget: { select: { id: true, title: true, status: true } },
                childTargets: {
                    include: {
                        assignee: { select: { id: true, fullName: true, avatarUrl: true, role: true } },
                        metrics: true,
                    },
                },
                updates: {
                    orderBy: { createdAt: 'desc' },
                    take: 20,
                    include: { submittedBy: { select: { fullName: true, avatarUrl: true } } },
                },
                acknowledgments: {
                    include: { user: { select: { fullName: true } } },
                },
            },
        });
        if (!target || target.organizationId !== orgId) {
            return res.status(404).json({ error: 'Target not found' });
        }
        // Access check: must be involved, own the department, or have explicit
        // organization-level performance oversight.
        const isInvolved = [target.assigneeId, target.lineManagerId, target.originatorId, target.reviewerId].includes(userId);
        const isDepartmentManager = target.departmentId && target.department?.id === getUser(req).departmentId && userRank >= 70;
        if (!isInvolved && !isDepartmentManager && !hasOrganizationTargetOversight(getUser(req).role)) {
            return res.status(403).json({ error: 'Not authorised to view this target' });
        }
        res.json(sanitizeTarget(target));
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.getTarget = getTarget;
// ── UPDATE TARGET METADATA ────────────────────────────────────────────────────
const updateTarget = async (req, res) => {
    try {
        const orgId = getOrgId(req);
        const userId = getUser(req).id;
        const userRank = (0, auth_middleware_1.getRoleRank)(getUser(req).role);
        const { id } = req.params;
        const target = await client_1.default.target.findUnique({ where: { id } });
        if (!target || target.organizationId !== orgId)
            return res.status(404).json({ error: 'Target not found' });
        const department = target.departmentId
            ? await client_1.default.department.findFirst({ where: { id: target.departmentId, organizationId: orgId }, select: { managerId: true } })
            : null;
        if (target.originatorId !== userId && department?.managerId !== userId && !hasOrganizationTargetOversight(getUser(req).role)) {
            return res.status(403).json({ error: 'Not authorised to edit this target' });
        }
        const updated = await target_service_1.TargetService.updateTarget(id, orgId, req.body);
        res.json(sanitizeTarget(updated));
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.updateTarget = updateTarget;
// ── DELETE TARGET ─────────────────────────────────────────────────────────────
const deleteTarget = async (req, res) => {
    try {
        const orgId = getOrgId(req);
        const userId = getUser(req).id;
        const userRank = (0, auth_middleware_1.getRoleRank)(getUser(req).role);
        const { id } = req.params;
        const target = await client_1.default.target.findUnique({ where: { id }, include: { _count: { select: { childTargets: true } } } });
        if (!target || target.organizationId !== orgId)
            return res.status(404).json({ error: 'Target not found' });
        // Permission check: Originator, owning department manager, or explicit
        // organization-level performance oversight.
        const isOriginator = target.originatorId === userId;
        const department = target.departmentId
            ? await client_1.default.department.findFirst({ where: { id: target.departmentId, organizationId: orgId }, select: { managerId: true } })
            : null;
        const isDeptManager = department?.managerId === userId;
        const isHighRank = hasOrganizationTargetOversight(getUser(req).role);
        if (!isOriginator && !isDeptManager && !isHighRank) {
            return res.status(403).json({ error: 'Not authorised to delete this target' });
        }
        // Recursive archiving is now handled by TargetService.deleteTarget
        await target_service_1.TargetService.deleteTarget(id, orgId);
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.deleteTarget = deleteTarget;
// ── STRATEGIC ROLLUP ──────────────────────────────────────────────────────────
const getStrategicRollup = async (req, res) => {
    try {
        const orgId = getOrgId(req);
        const user = getUser(req);
        const target = await client_1.default.target.findFirst({ where: { id: req.params.id, organizationId: orgId, isArchived: false } });
        if (!target)
            return res.status(404).json({ error: 'Target not found' });
        const department = target.departmentId
            ? await client_1.default.department.findFirst({ where: { id: target.departmentId, organizationId: orgId }, select: { managerId: true } })
            : null;
        const isInvolved = [target.assigneeId, target.lineManagerId, target.originatorId, target.reviewerId].includes(user.id);
        if (!isInvolved && department?.managerId !== user.id && !hasOrganizationTargetOversight(user.role)) {
            return res.status(403).json({ error: 'Not authorised to view this strategic rollup' });
        }
        const result = await target_service_1.TargetService.getStrategicRollup(req.params.id, orgId);
        if (!result)
            return res.status(404).json({ error: 'Target not found' });
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.getStrategicRollup = getStrategicRollup;
// ── CREATE ────────────────────────────────────────────────────────────────────
const createTarget = async (req, res) => {
    try {
        const orgId = getOrgId(req);
        const actor = getUser(req);
        const originatorId = actor.id;
        const managedEmployeeIds = await hierarchy_service_1.HierarchyService.getManagedEmployeeIds(originatorId, orgId);
        const targetLevel = req.body.level || 'INDIVIDUAL';
        if (targetLevel === 'INDIVIDUAL' && req.body.assigneeId && req.body.assigneeId !== originatorId && !managedEmployeeIds.includes(req.body.assigneeId) && !hasOrganizationTargetOversight(actor.role)) {
            return res.status(403).json({ error: 'Individual targets may only be assigned within your reporting scope' });
        }
        if (targetLevel === 'DEPARTMENT') {
            const department = await client_1.default.department.findFirst({ where: { id: Number(req.body.departmentId), organizationId: orgId }, select: { managerId: true } });
            if (!department)
                return res.status(404).json({ error: 'Department not found' });
            if (department.managerId !== originatorId && !hasOrganizationTargetOversight(actor.role)) {
                return res.status(403).json({ error: 'Only the department owner may create this departmental target' });
            }
        }
        const target = await target_service_1.TargetService.createTarget(req.body, originatorId, orgId);
        return res.status(201).json(sanitizeTarget(target));
    }
    catch (err) {
        error_log_service_1.errorLogger.log('TargetController.createTarget', err);
        return res.status(400).json({ error: err.message || 'Failed to create target' });
    }
};
exports.createTarget = createTarget;
// ── ACKNOWLEDGE (POST /targets/:id/acknowledge) ───────────────────────────────
const acknowledge = async (req, res) => {
    try {
        const orgId = getOrgId(req);
        const userId = getUser(req).id;
        const { status, message } = req.body;
        const target = await target_service_1.TargetService.acknowledge(req.params.id, userId, orgId, status, message);
        return res.json(sanitizeTarget(target));
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
};
exports.acknowledge = acknowledge;
// ── PROGRESS UPDATE (POST /targets/:id/progress) ─────────────────────────────
const updateProgress = async (req, res) => {
    try {
        const orgId = getOrgId(req);
        const userId = getUser(req).id;
        const { metricUpdates, submit } = req.body;
        const target = await target_service_1.TargetService.updateProgress(req.params.id, metricUpdates || req.body.updates, userId, orgId, submit);
        return res.json(sanitizeTarget(target));
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
};
exports.updateProgress = updateProgress;
// ── REVIEW (POST /targets/:id/review) ────────────────────────────────────────
const reviewTarget = async (req, res) => {
    try {
        const orgId = getOrgId(req);
        const reviewerId = getUser(req).id;
        const reviewerRank = (0, auth_middleware_1.getRoleRank)(getUser(req).role);
        const { approved, feedback } = req.body;
        const target = await target_service_1.TargetService.reviewTarget(req.params.id, reviewerId, orgId, approved, feedback, reviewerRank);
        return res.json(sanitizeTarget(target));
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
};
exports.reviewTarget = reviewTarget;
// ── CASCADE (POST /targets/:id/cascade) ──────────────────────────────────────
const cascadeTarget = async (req, res) => {
    try {
        const orgId = getOrgId(req);
        const managerId = getUser(req).id;
        const { assignments } = req.body;
        const targets = await target_service_1.TargetService.cascadeTarget(req.params.id, assignments, managerId, orgId);
        return res.status(201).json(targets.map(sanitizeTarget));
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
};
exports.cascadeTarget = cascadeTarget;
// ── AI: GENERATE SMART DRAFT ──────────────────────────────────────────────────
const generateSmartDraft = async (req, res) => {
    try {
        const { title, level, department } = req.body;
        if (!title)
            return res.status(400).json({ error: 'Goal title is required for AI drafting' });
        const draft = await target_service_1.TargetService.generateSmartDraft(title, level || 'INDIVIDUAL', department);
        res.json({ draft });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.generateSmartDraft = generateSmartDraft;
// ── RISK PULSE: GET ENDANGERED TARGETS ────────────────────────────────────────
const getRiskPulse = async (req, res) => {
    try {
        const orgId = getOrgId(req);
        const insights = await target_service_1.TargetService.getRiskInsights(orgId);
        res.json(insights);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.getRiskPulse = getRiskPulse;
