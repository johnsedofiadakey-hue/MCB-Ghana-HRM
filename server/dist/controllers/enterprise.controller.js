"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEnterpriseSummary = exports.listTaxRules = exports.listEmployeeShifts = exports.getCulturePulse = exports.generateJobDraft = exports.listShifts = exports.listBenefitEnrollments = exports.listBenefitPlans = exports.listCandidates = exports.createTaxBracket = exports.createTaxRule = exports.listAnnouncements = exports.createAnnouncement = exports.assignShift = exports.createShift = exports.enrollEmployeeBenefit = exports.createBenefitPlan = exports.recordAssetReturn = exports.completeExitInterview = exports.startOffboarding = exports.updateOnboardingTask = exports.addOnboardingTask = exports.listOnboardingChecklists = exports.updateCandidateStatus = exports.createCandidate = exports.listJobPositions = exports.createJobPosition = exports.listPerformanceReviews = exports.upsertPerformanceReview = exports.createEmployeeTarget = exports.createTeamTarget = exports.listDepartmentKPIsLegacy = exports.deleteDepartmentKPI = exports.updateDepartmentKPI = exports.listDepartmentKPIs = exports.createDepartmentKPI = exports.getRoleDashboard = exports.getOrgId = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const ai_service_1 = require("../services/ai.service");
const auth_middleware_1 = require("../middleware/auth.middleware");
const getOrgId = (req) => {
    if (req.user?.role === 'DEV')
        return undefined;
    return req.user?.organizationId || 'mcb-ghana-tenant';
};
exports.getOrgId = getOrgId;
const parsePagination = (req) => {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
    return { page, limit, skip: (page - 1) * limit };
};
const asString = (v) => (typeof v === 'string' ? v : '');
const asNumber = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};
// ─────────────────────────────────────────────────────────────────────────────
// Dynamic Role Dashboards
// ─────────────────────────────────────────────────────────────────────────────
const getRoleDashboard = async (req, res) => {
    try {
        const role = String(req.user?.role || '').toUpperCase();
        const orgId = (0, exports.getOrgId)(req);
        const whereOrg = orgId ? { organizationId: orgId } : {};
        const [headcount, pendingLeaves, pendingReviews, openJobs] = await Promise.all([
            client_1.default.user.count({ where: { ...whereOrg, isArchived: false } }),
            client_1.default.leaveRequest.count({ where: { ...whereOrg, status: 'PENDING' } }),
            client_1.default.performanceReviewV2.count({ where: { ...whereOrg, status: { in: ['DRAFT', 'SUBMITTED'] } } }),
            client_1.default.jobPosition.count({ where: { ...whereOrg, status: { not: 'CLOSED' } } }),
        ]);
        if (role === 'MD' || role === 'DEV') {
            const [payrollTotals, deptCount, attrition] = await Promise.all([
                client_1.default.payrollRun.aggregate({
                    where: whereOrg,
                    _sum: { totalNet: true, totalGross: true }
                }),
                client_1.default.department.count({ where: whereOrg }),
                client_1.default.user.count({ where: { ...whereOrg, status: 'TERMINATED' } }),
            ]);
            return res.json({
                role: 'MD',
                headcount,
                payroll: payrollTotals._sum,
                departmentCount: deptCount,
                attrition,
                upcomingPayrollRun: null,
            });
        }
        if (role === 'DIRECTOR') {
            return res.json({
                role: 'DIRECTOR',
                departmentHeadcount: headcount,
                pendingLeaveApprovals: pendingLeaves,
                pendingKpiValidations: pendingReviews,
                recruitmentPipelineOpenings: openJobs,
            });
        }
        if ((0, auth_middleware_1.getRoleRank)(role) >= 60 && (0, auth_middleware_1.getRoleRank)(role) < 80) {
            return res.json({
                role: 'MANAGER',
                teamMembers: headcount,
                pendingLeaveApprovals: pendingLeaves,
                pendingPerformanceReviews: pendingReviews,
                attendanceAnomalies: 0,
            });
        }
        if (role === 'CASUAL') {
            return res.json({ role: 'CASUAL', assignedTasks: [], attendanceHistory: [] });
        }
        return res.json({
            role: 'STAFF',
            leaveBalance: 0,
            payslips: [],
            assignedKpis: [],
            trainingModules: [],
            announcements: [],
        });
    }
    catch (error) {
        console.error('[Enterprise] getRoleDashboard error', error);
        return res.status(500).json({ error: 'Failed to load dashboard' });
    }
};
exports.getRoleDashboard = getRoleDashboard;
// ─────────────────────────────────────────────────────────────────────────────
// Performance V2
// ─────────────────────────────────────────────────────────────────────────────
const createDepartmentKPI = async (req, res) => {
    try {
        const orgId = (0, exports.getOrgId)(req);
        const organizationId = orgId || 'mcb-ghana-tenant';
        const data = req.body;
        const item = await client_1.default.departmentKPI.create({
            data: {
                organizationId,
                departmentId: asNumber(data.departmentId),
                title: asString(data.title),
                description: asString(data.description) || null,
                metricType: asString(data.metricType),
                targetValue: asNumber(data.targetValue),
                measurementPeriod: asString(data.measurementPeriod),
                assignedById: req.user?.id || '',
                assignedToId: asString(data.assignedToId) || null,
                status: 'ACTIVE'
            },
        });
        return res.status(201).json(item);
    }
    catch (error) {
        console.error('[Enterprise] createDepartmentKPI error', error);
        return res.status(500).json({ error: 'Failed to create department KPI' });
    }
};
exports.createDepartmentKPI = createDepartmentKPI;
const listDepartmentKPIs = async (req, res) => {
    try {
        const org = (0, exports.getOrgId)(req);
        const departmentId = req.query.departmentId ? Number(req.query.departmentId) : undefined;
        const { skip, limit, page } = parsePagination(req);
        const where = { organizationId: org };
        if (departmentId) {
            where.OR = [
                { departmentId: departmentId },
                { departmentId: 0 } // Global/Strategic Mandates
            ];
        }
        const [rows, total] = await Promise.all([
            client_1.default.departmentKPI.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
            client_1.default.departmentKPI.count({ where }),
        ]);
        return res.json({ data: rows, pagination: { page, limit, total } });
    }
    catch (error) {
        console.error('[Enterprise] listDepartmentKPIs error', error);
        return res.status(500).json({ error: 'Failed to list department KPIs' });
    }
};
exports.listDepartmentKPIs = listDepartmentKPIs;
const updateDepartmentKPI = async (req, res) => {
    try {
        const orgId = (0, exports.getOrgId)(req);
        const organizationId = orgId || 'mcb-ghana-tenant';
        const { id } = req.params;
        const data = req.body;
        const item = await client_1.default.departmentKPI.update({
            where: { id, organizationId },
            data: {
                departmentId: data.departmentId ? asNumber(data.departmentId) : undefined,
                title: data.title ? asString(data.title) : undefined,
                description: data.description !== undefined ? asString(data.description) : undefined,
                metricType: data.metricType ? asString(data.metricType) : undefined,
                targetValue: data.targetValue !== undefined ? asNumber(data.targetValue) : undefined,
                measurementPeriod: data.measurementPeriod ? asString(data.measurementPeriod) : undefined,
                status: data.status ? asString(data.status) : undefined,
            },
        });
        return res.json(item);
    }
    catch (error) {
        console.error('[Enterprise] updateDepartmentKPI error', error);
        return res.status(500).json({ error: 'Failed to update department KPI' });
    }
};
exports.updateDepartmentKPI = updateDepartmentKPI;
const deleteDepartmentKPI = async (req, res) => {
    try {
        const orgId = (0, exports.getOrgId)(req);
        const organizationId = orgId || 'mcb-ghana-tenant';
        const { id } = req.params;
        await client_1.default.departmentKPI.delete({
            where: { id, organizationId },
        });
        return res.json({ success: true, message: 'Department KPI deleted' });
    }
    catch (error) {
        console.error('[Enterprise] deleteDepartmentKPI error', error);
        return res.status(500).json({ error: 'Failed to delete department KPI' });
    }
};
exports.deleteDepartmentKPI = deleteDepartmentKPI;
// Legacy alias for old JS bundles expecting an array directly
const listDepartmentKPIsLegacy = async (req, res) => {
    try {
        const org = (0, exports.getOrgId)(req);
        const rows = await client_1.default.departmentKPI.findMany({
            where: { organizationId: org },
            orderBy: { createdAt: 'desc' }
        });
        return res.json(rows);
    }
    catch (error) {
        return res.status(500).json({ error: 'Failed to list department KPIs' });
    }
};
exports.listDepartmentKPIsLegacy = listDepartmentKPIsLegacy;
const createTeamTarget = async (req, res) => {
    try {
        const orgId = (0, exports.getOrgId)(req);
        const organizationId = orgId || 'mcb-ghana-tenant';
        const data = req.body;
        const row = await client_1.default.teamTarget.create({
            data: {
                organizationId,
                departmentKpiId: asString(data.departmentKpiId),
                originKPIId: asString(data.departmentKpiId), // Root origin
                managerId: req.user?.id || '',
                teamName: asString(data.teamName) || null,
                title: asString(data.title),
                description: asString(data.description) || null,
                metricType: asString(data.metricType),
                targetValue: asNumber(data.targetValue),
                measurementPeriod: asString(data.measurementPeriod),
            },
        });
        return res.status(201).json(row);
    }
    catch (error) {
        console.error('[Enterprise] createTeamTarget error', error);
        return res.status(500).json({ error: 'Failed to create team target' });
    }
};
exports.createTeamTarget = createTeamTarget;
const createEmployeeTarget = async (req, res) => {
    try {
        const orgId = (0, exports.getOrgId)(req);
        const organizationId = orgId || 'mcb-ghana-tenant';
        const data = req.body;
        // Fetch team target to get originKPIId
        const teamTarget = await client_1.default.teamTarget.findUnique({
            where: { id: asString(data.teamTargetId) }
        });
        const row = await client_1.default.employeeTarget.create({
            data: {
                organizationId,
                teamTargetId: asString(data.teamTargetId),
                originKPIId: teamTarget?.originKPIId || teamTarget?.departmentKpiId || null,
                managerId: req.user?.id || '', // Explicit manager who assigned it
                employeeId: asString(data.employeeId),
                title: asString(data.title),
                description: asString(data.description) || null,
                metricType: asString(data.metricType),
                targetValue: asNumber(data.targetValue),
                measurementPeriod: asString(data.measurementPeriod),
                assignedById: req.user?.id || '',
                assignedToId: asString(data.employeeId),
            },
        });
        return res.status(201).json(row);
    }
    catch (error) {
        console.error('[Enterprise] createEmployeeTarget error', error);
        return res.status(500).json({ error: 'Failed to create employee target' });
    }
};
exports.createEmployeeTarget = createEmployeeTarget;
const upsertPerformanceReview = async (req, res) => {
    try {
        const orgId = (0, exports.getOrgId)(req);
        const whereOrg = orgId ? { organizationId: orgId } : {};
        const organizationId = orgId || 'mcb-ghana-tenant';
        const data = req.body;
        const reviewId = asString(data.id);
        if (reviewId) {
            const row = await client_1.default.performanceReviewV2.update({
                where: { id: reviewId, ...whereOrg },
                data: {
                    selfReview: asString(data.selfReview) || undefined,
                    managerReview: asString(data.managerReview) || undefined,
                    directorReview: asString(data.directorReview) || undefined,
                    selfScore: data.selfScore === undefined ? undefined : asNumber(data.selfScore),
                    managerScore: data.managerScore === undefined ? undefined : asNumber(data.managerScore),
                    directorScore: data.directorScore === undefined ? undefined : asNumber(data.directorScore),
                    finalScore: data.finalScore === undefined ? undefined : asNumber(data.finalScore),
                    status: asString(data.status) || undefined,
                },
            });
            return res.json(row);
        }
        const cycle = await client_1.default.reviewCycle.findFirst({ where: { ...whereOrg, status: 'ACTIVE' } });
        if (!cycle)
            throw new Error('No active review cycle found');
        const created = await client_1.default.performanceReviewV2.create({
            data: {
                organizationId,
                employeeId: asString(data.employeeId),
                managerId: asString(data.managerId) || null,
                directorId: asString(data.directorId) || null,
                cycleId: cycle.id,
                cycle: asString(data.cycle) || cycle.title,
                selfReview: asString(data.selfReview) || null,
                status: asString(data.status) || 'DRAFT',
            },
        });
        return res.status(201).json(created);
    }
    catch (error) {
        console.error('[Enterprise] upsertPerformanceReview error', error);
        return res.status(500).json({ error: 'Failed to save performance review' });
    }
};
exports.upsertPerformanceReview = upsertPerformanceReview;
const listPerformanceReviews = async (req, res) => {
    try {
        const orgId = (0, exports.getOrgId)(req);
        const whereOrg = orgId ? { organizationId: orgId } : {};
        const { skip, limit, page } = parsePagination(req);
        const [rows, total] = await Promise.all([
            client_1.default.performanceReviewV2.findMany({ where: whereOrg, orderBy: { createdAt: 'desc' }, skip, take: limit }),
            client_1.default.performanceReviewV2.count({ where: whereOrg }),
        ]);
        return res.json({ data: rows, pagination: { page, limit, total } });
    }
    catch (error) {
        console.error('[Enterprise] listPerformanceReviews error', error);
        return res.status(500).json({ error: 'Failed to list performance reviews' });
    }
};
exports.listPerformanceReviews = listPerformanceReviews;
// ─────────────────────────────────────────────────────────────────────────────
// ATS
// ─────────────────────────────────────────────────────────────────────────────
const createJobPosition = async (req, res) => {
    try {
        const orgId = (0, exports.getOrgId)(req);
        const organizationId = orgId || 'mcb-ghana-tenant';
        const data = req.body;
        const row = await client_1.default.jobPosition.create({
            data: {
                organizationId,
                title: asString(data.title),
                departmentId: data.departmentId ? asNumber(data.departmentId) : null,
                description: asString(data.description) || null,
                location: asString(data.location) || null,
                employmentType: asString(data.employmentType) || null,
                openedById: req.user?.id || null,
            },
        });
        return res.status(201).json(row);
    }
    catch (error) {
        console.error('[Enterprise] createJobPosition error', error);
        return res.status(500).json({ error: 'Failed to create job position' });
    }
};
exports.createJobPosition = createJobPosition;
const listJobPositions = async (req, res) => {
    try {
        const orgId = (0, exports.getOrgId)(req);
        const whereOrg = orgId ? { organizationId: orgId } : {};
        const { skip, limit, page } = parsePagination(req);
        const [rows, total] = await Promise.all([
            client_1.default.jobPosition.findMany({ where: whereOrg, orderBy: { createdAt: 'desc' }, skip, take: limit }),
            client_1.default.jobPosition.count({ where: whereOrg }),
        ]);
        return res.json({ data: rows, pagination: { page, limit, total } });
    }
    catch (error) {
        console.error('[Enterprise] listJobPositions error', error);
        return res.status(500).json({ error: 'Failed to list job positions' });
    }
};
exports.listJobPositions = listJobPositions;
const createCandidate = async (req, res) => {
    try {
        const orgId = (0, exports.getOrgId)(req);
        const organizationId = orgId || 'mcb-ghana-tenant';
        const data = req.body;
        const row = await client_1.default.candidate.create({
            data: {
                organizationId,
                jobPositionId: asString(data.jobPositionId),
                fullName: asString(data.fullName),
                email: asString(data.email) || null,
                phone: asString(data.phone) || null,
                resumeUrl: asString(data.resumeUrl) || null,
                source: asString(data.source) || null,
            },
        });
        return res.status(201).json(row);
    }
    catch (error) {
        console.error('[Enterprise] createCandidate error', error);
        return res.status(500).json({ error: 'Failed to create candidate' });
    }
};
exports.createCandidate = createCandidate;
const updateCandidateStatus = async (req, res) => {
    try {
        const orgId = (0, exports.getOrgId)(req);
        const whereOrg = orgId ? { organizationId: orgId } : {};
        const organizationId = orgId || 'mcb-ghana-tenant';
        const candidateId = req.params.id;
        const status = asString(req.body.status).toUpperCase();
        const row = await client_1.default.candidate.update({
            where: { id: candidateId, ...whereOrg },
            data: { status },
        });
        if (status === 'HIRED') {
            await client_1.default.onboardingChecklist.create({
                data: {
                    organizationId,
                    employeeId: asString(req.body.employeeId) || row.id,
                    source: 'ATS',
                    status: 'IN_PROGRESS',
                    createdById: req.user?.id || null,
                },
            });
        }
        return res.json(row);
    }
    catch (error) {
        console.error('[Enterprise] updateCandidateStatus error', error);
        return res.status(500).json({ error: 'Failed to update candidate status' });
    }
};
exports.updateCandidateStatus = updateCandidateStatus;
// ─────────────────────────────────────────────────────────────────────────────
// Onboarding / Offboarding / Benefits / Shift / Announcements / Tax
// ─────────────────────────────────────────────────────────────────────────────
const listOnboardingChecklists = async (req, res) => {
    try {
        const orgId = (0, exports.getOrgId)(req);
        const whereOrg = orgId ? { organizationId: orgId } : {};
        const { skip, limit, page } = parsePagination(req);
        const [rows, total] = await Promise.all([
            client_1.default.onboardingChecklist.findMany({ where: whereOrg, orderBy: { createdAt: 'desc' }, skip, take: limit }),
            client_1.default.onboardingChecklist.count({ where: whereOrg }),
        ]);
        return res.json({ data: rows, pagination: { page, limit, total } });
    }
    catch (err) {
        console.error('[enterprise.controller.ts]', err.message);
        if (!res.headersSent)
            res.status(500).json({ error: err.message || 'Internal server error' });
    }
};
exports.listOnboardingChecklists = listOnboardingChecklists;
const addOnboardingTask = async (req, res) => {
    try {
        const orgId = (0, exports.getOrgId)(req);
        const organizationId = orgId || 'mcb-ghana-tenant';
        const data = req.body;
        const row = await client_1.default.onboardingChecklistTask.create({
            data: {
                organizationId,
                checklistId: asString(data.checklistId),
                title: asString(data.title),
                description: asString(data.description) || null,
                category: asString(data.category) || 'GENERAL',
                dueDate: data.dueDate ? new Date(asString(data.dueDate)) : null,
            },
        });
        return res.status(201).json(row);
    }
    catch (err) {
        console.error('[enterprise.controller.ts]', err.message);
        if (!res.headersSent)
            res.status(500).json({ error: err.message || 'Internal server error' });
    }
};
exports.addOnboardingTask = addOnboardingTask;
const updateOnboardingTask = async (req, res) => {
    try {
        const orgId = (0, exports.getOrgId)(req);
        const whereOrg = orgId ? { organizationId: orgId } : {};
        const row = await client_1.default.onboardingChecklistTask.update({
            where: { id: req.params.id, ...whereOrg },
            data: {
                status: asString(req.body.status) || undefined,
                completedAt: req.body.status === 'COMPLETED' ? new Date() : undefined,
                notes: asString(req.body.notes) || undefined,
                completedById: req.body.status === 'COMPLETED' ? req.user?.id : undefined,
            },
        });
        return res.json(row);
    }
    catch (err) {
        console.error('[enterprise.controller.ts]', err.message);
        if (!res.headersSent)
            res.status(500).json({ error: err.message || 'Internal server error' });
    }
};
exports.updateOnboardingTask = updateOnboardingTask;
const startOffboarding = async (req, res) => {
    try {
        const orgId = (0, exports.getOrgId)(req);
        const organizationId = orgId || 'mcb-ghana-tenant';
        const row = await client_1.default.offboardingProcess.create({
            data: {
                organizationId,
                employeeId: asString(req.body.employeeId),
                triggeredById: req.user?.id || '',
                effectiveDate: req.body.effectiveDate ? new Date(asString(req.body.effectiveDate)) : null,
            },
        });
        return res.status(201).json(row);
    }
    catch (err) {
        console.error('[enterprise.controller.ts]', err.message);
        if (!res.headersSent)
            res.status(500).json({ error: err.message || 'Internal server error' });
    }
};
exports.startOffboarding = startOffboarding;
const completeExitInterview = async (req, res) => {
    try {
        const orgId = (0, exports.getOrgId)(req);
        const organizationId = orgId || 'mcb-ghana-tenant';
        const row = await client_1.default.exitInterview.create({
            data: {
                organizationId,
                offboardingId: asString(req.body.offboardingId),
                interviewerId: req.user?.id || null,
                interviewDate: req.body.interviewDate ? new Date(asString(req.body.interviewDate)) : new Date(),
                reason: asString(req.body.reason) || null,
                feedback: asString(req.body.feedback) || null,
                rehireEligible: typeof req.body.rehireEligible === 'boolean' ? req.body.rehireEligible : null,
            },
        });
        return res.status(201).json(row);
    }
    catch (err) {
        console.error('[enterprise.controller.ts]', err.message);
        if (!res.headersSent)
            res.status(500).json({ error: err.message || 'Internal server error' });
    }
};
exports.completeExitInterview = completeExitInterview;
const recordAssetReturn = async (req, res) => {
    try {
        const orgId = (0, exports.getOrgId)(req);
        const organizationId = orgId || 'mcb-ghana-tenant';
        const row = await client_1.default.assetReturn.create({
            data: {
                organizationId,
                offboardingId: asString(req.body.offboardingId),
                assetId: asString(req.body.assetId) || null,
                assetName: asString(req.body.assetName) || null,
                returned: true,
                returnedAt: new Date(),
                conditionNotes: asString(req.body.conditionNotes) || null,
            },
        });
        return res.status(201).json(row);
    }
    catch (err) {
        console.error('[enterprise.controller.ts]', err.message);
        if (!res.headersSent)
            res.status(500).json({ error: err.message || 'Internal server error' });
    }
};
exports.recordAssetReturn = recordAssetReturn;
const createBenefitPlan = async (req, res) => {
    try {
        const orgId = (0, exports.getOrgId)(req);
        const organizationId = orgId || 'mcb-ghana-tenant';
        const data = req.body;
        const row = await client_1.default.benefitPlan.create({
            data: {
                organizationId,
                name: asString(data.name),
                category: asString(data.category),
                description: asString(data.description) || null,
                employerAmount: asNumber(data.employerAmount),
                employeeAmount: asNumber(data.employeeAmount),
                taxable: Boolean(data.taxable),
                payrollCode: asString(data.payrollCode) || null,
            },
        });
        return res.status(201).json(row);
    }
    catch (err) {
        console.error('[enterprise.controller.ts]', err.message);
        if (!res.headersSent)
            res.status(500).json({ error: err.message || 'Internal server error' });
    }
};
exports.createBenefitPlan = createBenefitPlan;
const enrollEmployeeBenefit = async (req, res) => {
    try {
        const orgId = (0, exports.getOrgId)(req);
        const organizationId = orgId || 'mcb-ghana-tenant';
        const data = req.body;
        const row = await client_1.default.employeeBenefitEnrollment.create({
            data: {
                organizationId,
                employeeId: asString(data.employeeId),
                benefitPlanId: asString(data.benefitPlanId),
                startDate: data.startDate ? new Date(asString(data.startDate)) : new Date(),
                endDate: data.endDate ? new Date(asString(data.endDate)) : null,
                employeeAmount: asNumber(data.employeeAmount),
                employerAmount: asNumber(data.employerAmount),
            },
        });
        return res.status(201).json(row);
    }
    catch (err) {
        console.error('[enterprise.controller.ts]', err.message);
        if (!res.headersSent)
            res.status(500).json({ error: err.message || 'Internal server error' });
    }
};
exports.enrollEmployeeBenefit = enrollEmployeeBenefit;
const createShift = async (req, res) => {
    try {
        const orgId = (0, exports.getOrgId)(req);
        const organizationId = orgId || 'mcb-ghana-tenant';
        const data = req.body;
        const row = await client_1.default.shift.create({
            data: {
                organizationId,
                name: asString(data.name),
                startTime: asString(data.startTime),
                endTime: asString(data.endTime),
                timezone: asString(data.timezone) || 'Africa/Accra',
                gracePeriodMins: asNumber(data.gracePeriodMins) || 10,
            },
        });
        return res.status(201).json(row);
    }
    catch (err) {
        console.error('[enterprise.controller.ts]', err.message);
        if (!res.headersSent)
            res.status(500).json({ error: err.message || 'Internal server error' });
    }
};
exports.createShift = createShift;
const assignShift = async (req, res) => {
    try {
        const orgId = (0, exports.getOrgId)(req);
        const organizationId = orgId || 'mcb-ghana-tenant';
        const data = req.body;
        const row = await client_1.default.employeeShift.create({
            data: {
                organizationId,
                employeeId: asString(data.employeeId),
                shiftId: asString(data.shiftId),
                effectiveFrom: data.effectiveFrom ? new Date(asString(data.effectiveFrom)) : new Date(),
                effectiveTo: data.effectiveTo ? new Date(asString(data.effectiveTo)) : null,
                assignedById: req.user?.id || null,
            },
        });
        return res.status(201).json(row);
    }
    catch (err) {
        console.error('[enterprise.controller.ts]', err.message);
        if (!res.headersSent)
            res.status(500).json({ error: err.message || 'Internal server error' });
    }
};
exports.assignShift = assignShift;
const createAnnouncement = async (req, res) => {
    try {
        const orgId = (0, exports.getOrgId)(req);
        const organizationId = orgId || 'mcb-ghana-tenant';
        const data = req.body;
        const row = await client_1.default.announcement.create({
            data: {
                organizationId,
                title: asString(data.title),
                content: asString(data.content),
                targetAudience: asString(data.targetAudience),
                departmentId: data.departmentId ? asNumber(data.departmentId) : null,
                publishDate: data.publishDate ? new Date(asString(data.publishDate)) : new Date(),
                expirationDate: data.expirationDate ? new Date(asString(data.expirationDate)) : null,
                createdById: req.user?.id || '',
            },
        });
        return res.status(201).json(row);
    }
    catch (err) {
        console.error('[enterprise.controller.ts]', err.message);
        if (!res.headersSent)
            res.status(500).json({ error: err.message || 'Internal server error' });
    }
};
exports.createAnnouncement = createAnnouncement;
const listAnnouncements = async (req, res) => {
    try {
        const orgId = (0, exports.getOrgId)(req);
        const whereOrg = orgId ? { organizationId: orgId } : {};
        const { page, limit, skip } = parsePagination(req);
        const [rows, total] = await Promise.all([
            client_1.default.announcement.findMany({ where: whereOrg, orderBy: { publishDate: 'desc' }, skip, take: limit }),
            client_1.default.announcement.count({ where: whereOrg }),
        ]);
        return res.json({ data: rows, pagination: { page, limit, total } });
    }
    catch (err) {
        console.error('[enterprise.controller.ts]', err.message);
        if (!res.headersSent)
            res.status(500).json({ error: err.message || 'Internal server error' });
    }
};
exports.listAnnouncements = listAnnouncements;
const createTaxRule = async (req, res) => {
    try {
        const orgId = (0, exports.getOrgId)(req);
        const organizationId = orgId || 'mcb-ghana-tenant';
        const data = req.body;
        const row = await client_1.default.taxRule.create({
            data: {
                organizationId,
                countryCode: asString(data.countryCode),
                taxType: asString(data.taxType),
                name: asString(data.name),
                appliesTo: asString(data.appliesTo) || 'PAYROLL',
                effectiveFrom: data.effectiveFrom ? new Date(asString(data.effectiveFrom)) : new Date(),
                effectiveTo: data.effectiveTo ? new Date(asString(data.effectiveTo)) : null,
            },
        });
        return res.status(201).json(row);
    }
    catch (err) {
        console.error('[enterprise.controller.ts]', err.message);
        if (!res.headersSent)
            res.status(500).json({ error: err.message || 'Internal server error' });
    }
};
exports.createTaxRule = createTaxRule;
const createTaxBracket = async (req, res) => {
    try {
        const orgId = (0, exports.getOrgId)(req);
        const organizationId = orgId || 'mcb-ghana-tenant';
        const data = req.body;
        const row = await client_1.default.taxBracket.create({
            data: {
                organizationId,
                taxRuleId: asString(data.taxRuleId),
                minAmount: asNumber(data.minAmount),
                maxAmount: data.maxAmount === undefined || data.maxAmount === null ? null : asNumber(data.maxAmount),
                rate: asNumber(data.rate),
                fixedAmount: asNumber(data.fixedAmount) || 0,
            },
        });
        return res.status(201).json(row);
    }
    catch (err) {
        console.error('[enterprise.controller.ts]', err.message);
        if (!res.headersSent)
            res.status(500).json({ error: err.message || 'Internal server error' });
    }
};
exports.createTaxBracket = createTaxBracket;
const listCandidates = async (req, res) => {
    try {
        const orgId = (0, exports.getOrgId)(req);
        const whereOrg = orgId ? { organizationId: orgId } : {};
        const { page, limit, skip } = parsePagination(req);
        const [rows, total] = await Promise.all([
            client_1.default.candidate.findMany({ where: whereOrg, orderBy: { createdAt: 'desc' }, skip, take: limit }),
            client_1.default.candidate.count({ where: whereOrg }),
        ]);
        return res.json({ data: rows, pagination: { page, limit, total } });
    }
    catch (err) {
        console.error('[enterprise.controller.ts]', err.message);
        if (!res.headersSent)
            res.status(500).json({ error: err.message || 'Internal server error' });
    }
};
exports.listCandidates = listCandidates;
const listBenefitPlans = async (req, res) => {
    try {
        const orgId = (0, exports.getOrgId)(req);
        const whereOrg = orgId ? { organizationId: orgId } : {};
        const { page, limit, skip } = parsePagination(req);
        const [rows, total] = await Promise.all([
            client_1.default.benefitPlan.findMany({ where: whereOrg, orderBy: { createdAt: 'desc' }, skip, take: limit }),
            client_1.default.benefitPlan.count({ where: whereOrg }),
        ]);
        return res.json({ data: rows, pagination: { page, limit, total } });
    }
    catch (err) {
        console.error('[enterprise.controller.ts]', err.message);
        if (!res.headersSent)
            res.status(500).json({ error: err.message || 'Internal server error' });
    }
};
exports.listBenefitPlans = listBenefitPlans;
const listBenefitEnrollments = async (req, res) => {
    try {
        const orgId = (0, exports.getOrgId)(req);
        const whereOrg = orgId ? { organizationId: orgId } : {};
        const { page, limit, skip } = parsePagination(req);
        const [rows, total] = await Promise.all([
            client_1.default.employeeBenefitEnrollment.findMany({ where: whereOrg, orderBy: { createdAt: 'desc' }, skip, take: limit }),
            client_1.default.employeeBenefitEnrollment.count({ where: whereOrg }),
        ]);
        return res.json({ data: rows, pagination: { page, limit, total } });
    }
    catch (err) {
        console.error('[enterprise.controller.ts]', err.message);
        if (!res.headersSent)
            res.status(500).json({ error: err.message || 'Internal server error' });
    }
};
exports.listBenefitEnrollments = listBenefitEnrollments;
const listShifts = async (req, res) => {
    try {
        const orgId = (0, exports.getOrgId)(req);
        const whereOrg = orgId ? { organizationId: orgId } : {};
        const { page, limit, skip } = parsePagination(req);
        const [rows, total] = await Promise.all([
            client_1.default.shift.findMany({ where: whereOrg, orderBy: { createdAt: 'desc' }, skip, take: limit }),
            client_1.default.shift.count({ where: whereOrg }),
        ]);
        return res.json({ data: rows, pagination: { page, limit, total } });
    }
    catch (err) {
        console.error('[enterprise.controller.ts]', err.message);
        if (!res.headersSent)
            res.status(500).json({ error: err.message || 'Internal server error' });
    }
};
exports.listShifts = listShifts;
// ─────────────────────────────────────────────────────────────────────────────
// AI Intelligence Features (Phase 4)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * AI Job Architect: Generates a professional JD draft
 */
const generateJobDraft = async (req, res) => {
    try {
        const { title, departmentId } = req.body;
        if (!title)
            return res.status(400).json({ error: 'Job title is required' });
        let departmentName = 'General';
        if (departmentId) {
            const dept = await client_1.default.department.findUnique({ where: { id: Number(departmentId) } });
            if (dept)
                departmentName = dept.name;
        }
        const draft = await ai_service_1.AIService.generateJobDescription(title, departmentName);
        return res.json({ draft });
    }
    catch (err) {
        console.error('[EnterpriseAI] Job Architect Failure:', err);
        res.status(500).json({ error: 'AI generation failed' });
    }
};
exports.generateJobDraft = generateJobDraft;
/**
 * Culture Pulse: Analyzes institutional sentiment
 */
const getCulturePulse = async (req, res) => {
    try {
        const orgId = (0, exports.getOrgId)(req) || 'mcb-ghana-tenant';
        const insights = await ai_service_1.AIService.getCultureInsights(orgId);
        return res.json(insights);
    }
    catch (err) {
        console.error('[EnterpriseAI] Culture Pulse Failure:', err);
        res.status(500).json({ error: 'AI insight generation failed' });
    }
};
exports.getCulturePulse = getCulturePulse;
const listEmployeeShifts = async (req, res) => {
    try {
        const orgId = (0, exports.getOrgId)(req);
        const whereOrg = orgId ? { organizationId: orgId } : {};
        const { page, limit, skip } = parsePagination(req);
        const [rows, total] = await Promise.all([
            client_1.default.employeeShift.findMany({ where: whereOrg, orderBy: { createdAt: 'desc' }, skip, take: limit }),
            client_1.default.employeeShift.count({ where: whereOrg }),
        ]);
        return res.json({ data: rows, pagination: { page, limit, total } });
    }
    catch (err) {
        console.error('[enterprise.controller.ts]', err.message);
        if (!res.headersSent)
            res.status(500).json({ error: err.message || 'Internal server error' });
    }
};
exports.listEmployeeShifts = listEmployeeShifts;
const listTaxRules = async (req, res) => {
    try {
        const orgId = (0, exports.getOrgId)(req);
        const whereOrg = orgId ? { organizationId: orgId } : {};
        const { page, limit, skip } = parsePagination(req);
        const [rows, total] = await Promise.all([
            client_1.default.taxRule.findMany({ where: whereOrg, orderBy: { createdAt: 'desc' }, skip, take: limit }),
            client_1.default.taxRule.count({ where: whereOrg }),
        ]);
        return res.json({ data: rows, pagination: { page, limit, total } });
    }
    catch (err) {
        console.error('[enterprise.controller.ts]', err.message);
        if (!res.headersSent)
            res.status(500).json({ error: err.message || 'Internal server error' });
    }
};
exports.listTaxRules = listTaxRules;
const getEnterpriseSummary = async (req, res) => {
    try {
        const orgId = (0, exports.getOrgId)(req);
        const whereOrg = orgId ? { organizationId: orgId } : {};
        const limit = 8;
        const [headcount, pendingLeaves, pendingReviews, openJobs, deptKpis, jobs, candidates, onboarding, benefitPlans, shifts, announcements, taxRules, departments] = await Promise.all([
            client_1.default.user.count({ where: { ...whereOrg, isArchived: false } }),
            client_1.default.leaveRequest.count({ where: { ...whereOrg, status: 'PENDING' } }),
            client_1.default.performanceReviewV2.count({ where: { ...whereOrg, status: { in: ['DRAFT', 'SUBMITTED'] } } }),
            client_1.default.jobPosition.count({ where: { ...whereOrg, status: { not: 'CLOSED' } } }),
            client_1.default.departmentKPI.findMany({ where: whereOrg, orderBy: { createdAt: 'desc' }, take: limit }),
            client_1.default.jobPosition.findMany({ where: whereOrg, orderBy: { createdAt: 'desc' }, take: limit }),
            client_1.default.candidate.findMany({ where: whereOrg, orderBy: { createdAt: 'desc' }, take: limit }),
            client_1.default.onboardingChecklist.findMany({ where: whereOrg, orderBy: { createdAt: 'desc' }, take: limit }),
            client_1.default.benefitPlan.findMany({ where: whereOrg, orderBy: { createdAt: 'desc' }, take: limit }),
            client_1.default.shift.findMany({ where: whereOrg, orderBy: { createdAt: 'desc' }, take: limit }),
            client_1.default.announcement.findMany({ where: whereOrg, orderBy: { publishDate: 'desc' }, take: limit }),
            client_1.default.taxRule.findMany({ where: whereOrg, orderBy: { createdAt: 'desc' }, take: limit }),
            client_1.default.department.findMany({ where: whereOrg, orderBy: { name: 'asc' } }),
        ]);
        res.json({
            dashboard: {
                headcount,
                pendingLeaveApprovals: pendingLeaves,
                pendingKpiValidations: pendingReviews,
                recruitmentPipelineOpenings: openJobs,
            },
            deptKpis: { data: deptKpis },
            jobs: { data: jobs },
            candidates: { data: candidates },
            onboarding: { data: onboarding },
            benefitPlans: { data: benefitPlans },
            shifts: { data: shifts },
            announcements: { data: announcements },
            taxRules: { data: taxRules },
            departments: { data: departments },
        });
    }
    catch (err) {
        console.error('[enterprise.controller.ts] summary error', err.message);
        res.status(500).json({ error: 'Failed to fetch enterprise summary' });
    }
};
exports.getEnterpriseSummary = getEnterpriseSummary;
