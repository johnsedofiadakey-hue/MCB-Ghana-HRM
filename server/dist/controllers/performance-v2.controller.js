"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateEmployeeTarget = exports.deleteDepartmentKPI = exports.directorFinalize = exports.managerReview = exports.createReview = exports.getMyTargets = exports.createEmployeeTarget = exports.getTeamTargets = exports.createTeamTarget = exports.getDepartmentKPIs = exports.createDepartmentKPI = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const audit_service_1 = require("../services/audit.service");
const enterprise_controller_1 = require("./enterprise.controller");
// --- DEPARTMENT KPIs (Director+) ---
const createDepartmentKPI = async (req, res) => {
    try {
        const { departmentId, title, description, metricType, targetValue, measurementPeriod } = req.body;
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const organizationId = orgId || 'mcb-ghana-tenant';
        const user = req.user;
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
        const userRank = user.rank || 0;
        const where = { ...whereOrg };
        // Managers can view, Directors can manage. Staff cannot see Dept KPIs unless assigned.
        if (userRank < 70) {
            where.assignedToId = user.id;
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
        const userRank = user.rank || 0;
        const where = { ...whereOrg };
        // Managers see their own team targets, Directors see all in dept (simplified here to all in org)
        if (userRank < 80) {
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
        const { employeeId, cycleId, selfReview, selfScore } = req.body;
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const organizationId = orgId || 'mcb-ghana-tenant';
        const user = req.user;
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
    try {
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const whereOrg = orgId ? { organizationId: orgId } : {};
        const target = await client_1.default.employeeTarget.updateMany({
            where: { id: req.params.id, ...whereOrg },
            data: { ...req.body }
        });
        res.json(target);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.updateEmployeeTarget = updateEmployeeTarget;
