import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { logAction } from '../services/audit.service';
import { getOrgId } from './enterprise.controller';
import { HierarchyService } from '../services/hierarchy.service';

const hasPerformanceAdminAccess = (role?: string) =>
    ['HR_DIRECTOR', 'HR_MANAGER', 'MD', 'DEV'].includes(String(role || '').toUpperCase());

// --- DEPARTMENT KPIs (Director+) ---
export const createDepartmentKPI = async (req: Request, res: Response) => {
    try {
        const { departmentId, title, description, metricType, targetValue, measurementPeriod } = req.body;
        const orgId = getOrgId(req);
        const organizationId = orgId || 'mcb-ghana-tenant';
        const user = (req as any).user;
        const department = await prisma.department.findFirst({ where: { id: Number(departmentId), organizationId }, select: { id: true, managerId: true } });
        if (!department) return res.status(404).json({ error: 'Department not found' });
        if (department.managerId !== user.id && !hasPerformanceAdminAccess(user.role)) {
            return res.status(403).json({ error: 'Only the department owner may create this KPI' });
        }
        const kpi = await prisma.departmentKPI.create({
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
        await logAction(user.id, 'KPI_CREATED', 'DepartmentKPI', kpi.id, { title }, req.ip);
        res.status(201).json(kpi);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
};

export const getDepartmentKPIs = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const orgId = getOrgId(req);
        const whereOrg = orgId ? { organizationId: orgId } : {};
        const where: any = { ...whereOrg };

        if (!hasPerformanceAdminAccess(user.role)) {
            const managed = await prisma.department.findMany({ where: { organizationId: orgId || 'mcb-ghana-tenant', managerId: user.id }, select: { id: true } });
            where.departmentId = { in: [...new Set([user.departmentId, ...managed.map(department => department.id)].filter(Boolean))] };
        }

        const kpis = await prisma.departmentKPI.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });
        res.json(kpis);
    } catch (err: any) {
        console.error('[performance-v2.controller.ts]', err.message);
        if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
    }
};

// --- TEAM TARGETS (Manager+) ---
export const createTeamTarget = async (req: Request, res: Response) => {
    try {
        const { departmentKpiId, title, description, metricType, targetValue, measurementPeriod, teamName } = req.body;
        const orgId = getOrgId(req);
        const organizationId = orgId || 'mcb-ghana-tenant';
        const user = (req as any).user;
        const parentKpi = await prisma.departmentKPI.findFirst({
            where: { id: departmentKpiId, organizationId },
            include: { department: { select: { managerId: true } } }
        });
        if (!parentKpi) return res.status(404).json({ error: 'Department KPI not found' });
        const ownsDepartment = parentKpi.department.managerId === user.id || parentKpi.departmentId === user.departmentId;
        if (!ownsDepartment && !hasPerformanceAdminAccess(user.role)) return res.status(403).json({ error: 'KPI is outside your department scope' });
        const target = await prisma.teamTarget.create({
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
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
};

export const getTeamTargets = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const orgId = getOrgId(req);
        const whereOrg = orgId ? { organizationId: orgId } : {};
        const where: any = { ...whereOrg };

        if (!hasPerformanceAdminAccess(user.role)) {
            where.managerId = user.id;
        }

        const targets = await (prisma.teamTarget as any).findMany({
            where,
            include: { departmentKpi: true }
        });
        res.json(targets);
    } catch (err: any) {
        console.error('[performance-v2.controller.ts]', err.message);
        if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
    }
};

// --- EMPLOYEE TARGETS (Manager+) ---
export const createEmployeeTarget = async (req: Request, res: Response) => {
    try {
        const { teamTargetId, employeeId, title, description, metricType, targetValue, measurementPeriod } = req.body;
        const orgId = getOrgId(req);
        const organizationId = orgId || 'mcb-ghana-tenant';
        const user = (req as any).user;
        const teamTarget = await prisma.teamTarget.findFirst({ where: { id: teamTargetId, organizationId }, select: { id: true, managerId: true } });
        if (!teamTarget) return res.status(404).json({ error: 'Team target not found' });
        const managedIds = await HierarchyService.getManagedEmployeeIds(user.id, organizationId);
        if (teamTarget.managerId !== user.id && !hasPerformanceAdminAccess(user.role)) return res.status(403).json({ error: 'Team target is outside your scope' });
        if (!managedIds.includes(employeeId) && !hasPerformanceAdminAccess(user.role)) return res.status(403).json({ error: 'Employee is outside your reporting scope' });
        const employee = await prisma.user.findFirst({ where: { id: employeeId, organizationId }, select: { id: true } });
        if (!employee) return res.status(404).json({ error: 'Employee not found' });
        const target = await prisma.employeeTarget.create({
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
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
};

export const getMyTargets = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const orgId = getOrgId(req);
        const whereOrg = orgId ? { organizationId: orgId } : {};
        const targets = await prisma.employeeTarget.findMany({
            where: {
                ...whereOrg,
                employeeId: user.id
            }
        });
        res.json(targets);
    } catch (err: any) {
        console.error('[performance-v2.controller.ts]', err.message);
        if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
    }
};

// --- PERFORMANCE REVIEWS (Multi-stage) ---
export const createReview = async (req: Request, res: Response) => {
    try {
        const { cycleId, selfReview, selfScore } = req.body;
        const orgId = getOrgId(req);
        const organizationId = orgId || 'mcb-ghana-tenant';
        const user = (req as any).user;
        const employeeId = user.id;
        const cycle = await prisma.reviewCycle.findFirst({ where: { id: cycleId, organizationId } });
        if (!cycle) return res.status(404).json({ error: 'Review cycle not found' });

        const review = await prisma.performanceReviewV2.create({
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
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
};

export const managerReview = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { managerReview, managerScore } = req.body;
        const orgId = getOrgId(req);
        const whereOrg = orgId ? { organizationId: orgId } : {};
        const user = (req as any).user;
        const existing = await prisma.performanceReviewV2.findFirst({ where: { id, organizationId: orgId || 'mcb-ghana-tenant' }, select: { id: true, employeeId: true } });
        if (!existing) return res.status(404).json({ error: 'Performance review not found' });
        const managedIds = await HierarchyService.getManagedEmployeeIds(user.id, orgId || 'mcb-ghana-tenant');
        if (!managedIds.includes(existing.employeeId) && !hasPerformanceAdminAccess(user.role)) return res.status(403).json({ error: 'Employee is outside your reporting scope' });
        const review = await prisma.performanceReviewV2.updateMany({
            where: { id, ...whereOrg },
            data: {
                managerId: user.id,
                managerReview,
                managerScore,
                status: 'REVIEWED_BY_MANAGER',
            }
        });
        await logAction(user.id, 'PERFORMANCE_REVIEWED_MANAGER', 'PerformanceReviewV2', id, { managerScore }, req.ip);
        res.json(review);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
};

export const directorFinalize = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { directorReview, directorScore, finalScore } = req.body;
        const user = (req as any).user;
        const organizationId = user.organizationId || 'mcb-ghana-tenant';

        const review = await prisma.performanceReviewV2.updateMany({
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
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
};

export const deleteDepartmentKPI = async (req: Request, res: Response) => {
    try {
        const orgId = getOrgId(req);
        const whereOrg = orgId ? { organizationId: orgId } : {};
        const user = (req as any).user;
        const existing = await prisma.departmentKPI.findFirst({ where: { id: req.params.id, ...whereOrg }, include: { department: { select: { managerId: true } } } });
        if (!existing) return res.status(404).json({ error: 'Department KPI not found' });
        if (existing.department.managerId !== user.id && existing.assignedById !== user.id && !hasPerformanceAdminAccess(user.role)) return res.status(403).json({ error: 'KPI is outside your department scope' });
        await prisma.departmentKPI.deleteMany({
            where: { id: req.params.id, ...whereOrg }
        });
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

export const updateEmployeeTarget = async (req: Request, res: Response) => {
    return res.status(410).json({ error: 'This legacy target endpoint has been retired. Use /api/targets/:id/progress.' });
};
