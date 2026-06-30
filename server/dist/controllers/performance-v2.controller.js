"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateEmployeeTarget = exports.deleteDepartmentKPI = exports.directorFinalize = exports.managerReview = exports.createReview = exports.getMyTargets = exports.createEmployeeTarget = exports.getTeamTargets = exports.createTeamTarget = exports.getDepartmentKPIs = exports.createDepartmentKPI = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const audit_service_1 = require("../services/audit.service");
const enterprise_controller_1 = require("./enterprise.controller");
const hierarchy_service_1 = require("../services/hierarchy.service");
const hasPerformanceAdminAccess = (role) => ['HR_DIRECTOR', 'HR_MANAGER', 'MD', 'DEV'].includes(String(role || '').toUpperCase());
// --- DEPARTMENT KPIs (Director+) ---
const createDepartmentKPI = async (req, res) => {
    try {
        const { departmentId, title, description, metricType, targetValue, measurementPeriod } = req.body;
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const organizationId = orgId || 'mcb-ghana-tenant';
        const user = req.user;
        const department = await client_1.default.department.findFirst({ where: { id: Number(departmentId), organizationId }, select: { id: true, managerId: true } });
        if (!department)
            return res.status(404).json({ error: 'Department not found' });
        if (department.managerId !== user.id && !hasPerformanceAdminAccess(user.role)) {
            return res.status(403).json({ error: 'Only the department owner may create this KPI' });
        }
        const kpi = await client_1.default.departmentKPI.create({
            data: {
                organizationId,
                departmentId,
                title,
                description,
                metricType,
                targetValue,
                measurementPeriod,
                assignedById: user.id,
            }
        });
        await (0, audit_service_1.logAction)(user.id, 'KPI_CREATED', 'DepartmentKPI', kpi.id, { title }, req.ip);
        res.status(201).json(kpi);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
};
exports.createDepartmentKPI = createDepartmentKPI;
const getDepartmentKPIs = async (req, res) => {
    try {
        const user = req.user;
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const whereOrg = orgId ? { organizationId: orgId } : {};
        const where = { ...whereOrg };
        if (!hasPerformanceAdminAccess(user.role)) {
            const managed = await client_1.default.department.findMany({ where: { organizationId: orgId || 'mcb-ghana-tenant', managerId: user.id }, select: { id: true } });
            where.departmentId = { in: [...new Set([user.departmentId, ...managed.map(department => department.id)].filter(Boolean))] };
        }
        const kpis = await client_1.default.departmentKPI.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });
        res.json(kpis);
    }
    catch (err) {
        console.error('[performance-v2.controller.ts]', err.message);
        if (!res.headersSent)
            res.status(500).json({ error: err.message || 'Internal server error' });
    }
};
exports.getDepartmentKPIs = getDepartmentKPIs;
// --- TEAM TARGETS (Manager+) ---
const createTeamTarget = async (req, res) => {
    try {
        const { departmentKpiId, title, description, metricType, targetValue, measurementPeriod, teamName } = req.body;
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const organizationId = orgId || 'mcb-ghana-tenant';
        const user = req.user;
        const parentKpi = await client_1.default.departmentKPI.findFirst({
            where: { id: departmentKpiId, organizationId },
            include: { department: { select: { managerId: true } } }
        });
        if (!parentKpi)
            return res.status(404).json({ error: 'Department KPI not found' });
        const ownsDepartment = parentKpi.department.managerId === user.id || parentKpi.departmentId === user.departmentId;
        if (!ownsDepartment && !hasPerformanceAdminAccess(user.role))
            return res.status(403).json({ error: 'KPI is outside your department scope' });
        const target = await client_1.default.teamTarget.create({
            data: {
                organizationId,
                departmentKpiId,
                managerId: user.id,
                title,
                description,
                metricType,
                targetValue,
                measurementPeriod,
                teamName,
            }
        });
        res.status(201).json(target);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
};
exports.createTeamTarget = createTeamTarget;
const getTeamTargets = async (req, res) => {
    try {
        const user = req.user;
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const whereOrg = orgId ? { organizationId: orgId } : {};
        const where = { ...whereOrg };
        if (!hasPerformanceAdminAccess(user.role)) {
            where.managerId = user.id;
        }
        const targets = await client_1.default.teamTarget.findMany({
            where,
            include: { departmentKpi: true }
        });
        res.json(targets);
    }
    catch (err) {
        console.error('[performance-v2.controller.ts]', err.message);
        if (!res.headersSent)
            res.status(500).json({ error: err.message || 'Internal server error' });
    }
};
exports.getTeamTargets = getTeamTargets;
// --- EMPLOYEE TARGETS (Manager+) ---
const createEmployeeTarget = async (req, res) => {
    try {
        const { teamTargetId, employeeId, title, description, metricType, targetValue, measurementPeriod } = req.body;
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const organizationId = orgId || 'mcb-ghana-tenant';
        const user = req.user;
        const teamTarget = await client_1.default.teamTarget.findFirst({ where: { id: teamTargetId, organizationId }, select: { id: true, managerId: true } });
        if (!teamTarget)
            return res.status(404).json({ error: 'Team target not found' });
        const managedIds = await hierarchy_service_1.HierarchyService.getManagedEmployeeIds(user.id, organizationId);
        if (teamTarget.managerId !== user.id && !hasPerformanceAdminAccess(user.role))
            return res.status(403).json({ error: 'Team target is outside your scope' });
        if (!managedIds.includes(employeeId) && !hasPerformanceAdminAccess(user.role))
            return res.status(403).json({ error: 'Employee is outside your reporting scope' });
        const employee = await client_1.default.user.findFirst({ where: { id: employeeId, organizationId }, select: { id: true } });
        if (!employee)
            return res.status(404).json({ error: 'Employee not found' });
        const target = await client_1.default.employeeTarget.create({
            data: {
                organizationId,
                teamTargetId,
                employeeId,
                title,
                description,
                metricType,
                targetValue,
                measurementPeriod,
                assignedById: user.id,
                assignedToId: employeeId,
            }
        });
        res.status(201).json(target);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
};
exports.createEmployeeTarget = createEmployeeTarget;
const getMyTargets = async (req, res) => {
    try {
        const user = req.user;
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const whereOrg = orgId ? { organizationId: orgId } : {};
        const targets = await client_1.default.employeeTarget.findMany({
            where: {
                ...whereOrg,
                employeeId: user.id
            }
        });
        res.json(targets);
    }
    catch (err) {
        console.error('[performance-v2.controller.ts]', err.message);
        if (!res.headersSent)
            res.status(500).json({ error: err.message || 'Internal server error' });
    }
};
exports.getMyTargets = getMyTargets;
// --- PERFORMANCE REVIEWS (Multi-stage) ---
const createReview = async (req, res) => {
    try {
        const { cycleId, selfReview, selfScore } = req.body;
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const organizationId = orgId || 'mcb-ghana-tenant';
        const user = req.user;
        const employeeId = user.id;
        const cycle = await client_1.default.reviewCycle.findFirst({ where: { id: cycleId, organizationId } });
        if (!cycle)
            return res.status(404).json({ error: 'Review cycle not found' });
        const review = await client_1.default.performanceReviewV2.create({
            data: {
                organizationId,
                employeeId,
                cycleId,
                cycle: cycle.title,
                cycleObj: { connect: { id: cycleId } },
                selfReview,
                selfScore: parseFloat(selfScore),
                status: 'SUBMITTED_BY_EMPLOYEE',
            }
        });
        res.status(201).json(review);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
};
exports.createReview = createReview;
const managerReview = async (req, res) => {
    try {
        const { id } = req.params;
        const { managerReview, managerScore } = req.body;
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const whereOrg = orgId ? { organizationId: orgId } : {};
        const user = req.user;
        const existing = await client_1.default.performanceReviewV2.findFirst({ where: { id, organizationId: orgId || 'mcb-ghana-tenant' }, select: { id: true, employeeId: true } });
        if (!existing)
            return res.status(404).json({ error: 'Performance review not found' });
        const managedIds = await hierarchy_service_1.HierarchyService.getManagedEmployeeIds(user.id, orgId || 'mcb-ghana-tenant');
        if (!managedIds.includes(existing.employeeId) && !hasPerformanceAdminAccess(user.role))
            return res.status(403).json({ error: 'Employee is outside your reporting scope' });
        const review = await client_1.default.performanceReviewV2.updateMany({
            where: { id, ...whereOrg },
            data: {
                managerId: user.id,
                managerReview,
                managerScore,
                status: 'REVIEWED_BY_MANAGER',
            }
        });
        await (0, audit_service_1.logAction)(user.id, 'PERFORMANCE_REVIEWED_MANAGER', 'PerformanceReviewV2', id, { managerScore }, req.ip);
        res.json(review);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
};
exports.managerReview = managerReview;
const directorFinalize = async (req, res) => {
    try {
        const { id } = req.params;
        const { directorReview, directorScore, finalScore } = req.body;
        const user = req.user;
        const organizationId = user.organizationId || 'mcb-ghana-tenant';
        const review = await client_1.default.performanceReviewV2.updateMany({
            where: { id, organizationId },
            data: {
                directorId: user.id,
                directorReview,
                directorScore,
                finalScore,
                status: 'FINALIZED',
                validatedAt: new Date(),
            }
        });
        res.json(review);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
};
exports.directorFinalize = directorFinalize;
const deleteDepartmentKPI = async (req, res) => {
    try {
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const whereOrg = orgId ? { organizationId: orgId } : {};
        const user = req.user;
        const existing = await client_1.default.departmentKPI.findFirst({ where: { id: req.params.id, ...whereOrg }, include: { department: { select: { managerId: true } } } });
        if (!existing)
            return res.status(404).json({ error: 'Department KPI not found' });
        if (existing.department.managerId !== user.id && existing.assignedById !== user.id && !hasPerformanceAdminAccess(user.role))
            return res.status(403).json({ error: 'KPI is outside your department scope' });
        await client_1.default.departmentKPI.deleteMany({
            where: { id: req.params.id, ...whereOrg }
        });
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.deleteDepartmentKPI = deleteDepartmentKPI;
const updateEmployeeTarget = async (req, res) => {
    return res.status(410).json({ error: 'This legacy target endpoint has been retired. Use /api/targets/:id/progress.' });
};
exports.updateEmployeeTarget = updateEmployeeTarget;
