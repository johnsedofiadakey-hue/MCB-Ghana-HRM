import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { logAction } from '../services/audit.service';
import { getOrgId } from './enterprise.controller';

// --- DEPARTMENT KPIs (Director+) ---
export const createDepartmentKPI = async (req: Request, res: Response) => {
    try {
        const { departmentId, title, description, metricType, targetValue, measurementPeriod } = req.body;
        const orgId = getOrgId(req);
        const organizationId = orgId || 'mcb-ghana-tenant';
        const user = (req as any).user;
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
        const userRank = user.rank || 0;
        const where: any = { ...whereOrg };

        // Managers can view, Directors can manage. Staff cannot see Dept KPIs unless assigned.
        if (userRank < 70) {
            where.assignedToId = user.id;
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
        const userRank = user.rank || 0;
        const where: any = { ...whereOrg };

        // Managers see their own team targets, Directors see all in dept (simplified here to all in org)
        if (userRank < 80) {
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
        const { employeeId, cycleId, selfReview, selfScore } = req.body;
        const orgId = getOrgId(req);
        const organizationId = orgId || 'mcb-ghana-tenant';
        const user = (req as any).user;
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
        await prisma.departmentKPI.deleteMany({
            where: { id: req.params.id, ...whereOrg }
        });
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

export const updateEmployeeTarget = async (req: Request, res: Response) => {
    try {
        const orgId = getOrgId(req);
        const whereOrg = orgId ? { organizationId: orgId } : {};
        const target = await prisma.employeeTarget.updateMany({
            where: { id: req.params.id, ...whereOrg },
            data: { ...req.body }
        });
        res.json(target);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};
