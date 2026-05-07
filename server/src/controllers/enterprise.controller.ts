import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { AIService } from '../services/ai.service';
import { logAction } from '../services/audit.service';
import { getRoleRank } from '../middleware/auth.middleware';

export const getOrgId = (req: Request): string | undefined => {
  if (req.user?.role === 'DEV') return undefined;
  return req.user?.organizationId || 'mcb-ghana-tenant';
};

const parsePagination = (req: Request) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
  return { page, limit, skip: (page - 1) * limit };
};

const asString = (v: unknown): string => (typeof v === 'string' ? v : '');
const asNumber = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// ─────────────────────────────────────────────────────────────────────────────
// Dynamic Role Dashboards
// ─────────────────────────────────────────────────────────────────────────────
export const getRoleDashboard = async (req: Request, res: Response) => {
  try {
    const role = String(req.user?.role || '').toUpperCase();

    const orgId = getOrgId(req);
    const whereOrg = orgId ? { organizationId: orgId } : {};

    const [headcount, pendingLeaves, pendingReviews, openJobs] = await Promise.all([
      prisma.user.count({ where: { ...whereOrg, isArchived: false } }),
      prisma.leaveRequest.count({ where: { ...whereOrg, status: 'PENDING' } }),
      prisma.performanceReviewV2.count({ where: { ...whereOrg, status: { in: ['DRAFT', 'SUBMITTED'] } } }),
      prisma.jobPosition.count({ where: { ...whereOrg, status: { not: 'CLOSED' } } }),
    ]);

    if (role === 'MD' || role === 'DEV') {
      const [payrollTotals, deptCount, attrition] = await Promise.all([
        prisma.payrollRun.aggregate({ 
          where: whereOrg,
          _sum: { totalNet: true, totalGross: true } 
        }),
        prisma.department.count({ where: whereOrg }),
        prisma.user.count({ where: { ...whereOrg, status: 'TERMINATED' } }),
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

    if (getRoleRank(role) >= 60 && getRoleRank(role) < 80) {
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
  } catch (error) {
    console.error('[Enterprise] getRoleDashboard error', error);
    return res.status(500).json({ error: 'Failed to load dashboard' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Performance V2
// ─────────────────────────────────────────────────────────────────────────────
export const createDepartmentKPI = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const organizationId = orgId || 'mcb-ghana-tenant';
    const data = req.body as Record<string, unknown>;
    const item = await prisma.departmentKPI.create({
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
  } catch (error) {
    console.error('[Enterprise] createDepartmentKPI error', error);
    return res.status(500).json({ error: 'Failed to create department KPI' });
  }
};

export const listDepartmentKPIs = async (req: Request, res: Response) => {
  try {
    const org = getOrgId(req);
    const departmentId = req.query.departmentId ? Number(req.query.departmentId) : undefined;
    const { skip, limit, page } = parsePagination(req);
    
    const where: any = { organizationId: org };
    if (departmentId) {
      where.OR = [
        { departmentId: departmentId },
        { departmentId: 0 } // Global/Strategic Mandates
      ];
    }

    const [rows, total] = await Promise.all([
      prisma.departmentKPI.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.departmentKPI.count({ where }),
    ]);
    return res.json({ data: rows, pagination: { page, limit, total } });
  } catch (error) {
    console.error('[Enterprise] listDepartmentKPIs error', error);
    return res.status(500).json({ error: 'Failed to list department KPIs' });
  }
};

export const updateDepartmentKPI = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const organizationId = orgId || 'mcb-ghana-tenant';
    const { id } = req.params;
    const data = req.body as Record<string, unknown>;

    const item = await prisma.departmentKPI.update({
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
  } catch (error) {
    console.error('[Enterprise] updateDepartmentKPI error', error);
    return res.status(500).json({ error: 'Failed to update department KPI' });
  }
};

export const deleteDepartmentKPI = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const organizationId = orgId || 'mcb-ghana-tenant';
    const { id } = req.params;

    await prisma.departmentKPI.delete({
      where: { id, organizationId },
    });
    return res.json({ success: true, message: 'Department KPI deleted' });
  } catch (error) {
    console.error('[Enterprise] deleteDepartmentKPI error', error);
    return res.status(500).json({ error: 'Failed to delete department KPI' });
  }
};

// Legacy alias for old JS bundles expecting an array directly
export const listDepartmentKPIsLegacy = async (req: Request, res: Response) => {
  try {
    const org = getOrgId(req);
    const rows = await prisma.departmentKPI.findMany({ 
      where: { organizationId: org }, 
      orderBy: { createdAt: 'desc' }
    });
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to list department KPIs' });
  }
};

export const createTeamTarget = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const organizationId = orgId || 'mcb-ghana-tenant';
    const data = req.body as Record<string, unknown>;
    const row = await prisma.teamTarget.create({
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
      } as any,
    });
    return res.status(201).json(row);
  } catch (error) {
    console.error('[Enterprise] createTeamTarget error', error);
    return res.status(500).json({ error: 'Failed to create team target' });
  }
};

export const createEmployeeTarget = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const organizationId = orgId || 'mcb-ghana-tenant';
    const data = req.body as Record<string, unknown>;
    // Fetch team target to get originKPIId
    const teamTarget = await prisma.teamTarget.findUnique({
      where: { id: asString(data.teamTargetId) }
    });

    const row = await prisma.employeeTarget.create({
      data: {
        organizationId,
        teamTargetId: asString(data.teamTargetId),
        originKPIId: (teamTarget as any)?.originKPIId || (teamTarget as any)?.departmentKpiId || null,
        managerId: req.user?.id || '', // Explicit manager who assigned it
        employeeId: asString(data.employeeId),
        title: asString(data.title),
        description: asString(data.description) || null,
        metricType: asString(data.metricType),
        targetValue: asNumber(data.targetValue),
        measurementPeriod: asString(data.measurementPeriod),
        assignedById: req.user?.id || '',
        assignedToId: asString(data.employeeId),
      } as any,
    });
    return res.status(201).json(row);
  } catch (error) {
    console.error('[Enterprise] createEmployeeTarget error', error);
    return res.status(500).json({ error: 'Failed to create employee target' });
  }
};

export const upsertPerformanceReview = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const whereOrg = orgId ? { organizationId: orgId } : {};
    const organizationId = orgId || 'mcb-ghana-tenant';
    const data = req.body as Record<string, unknown>;
    const reviewId = asString(data.id);

    if (reviewId) {
      const row = await prisma.performanceReviewV2.update({
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

    const cycle = await prisma.reviewCycle.findFirst({ where: { ...whereOrg, status: 'ACTIVE' } });
    if (!cycle) throw new Error('No active review cycle found');

    const created = await prisma.performanceReviewV2.create({
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
  } catch (error) {
    console.error('[Enterprise] upsertPerformanceReview error', error);
    return res.status(500).json({ error: 'Failed to save performance review' });
  }
};

export const listPerformanceReviews = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const whereOrg = orgId ? { organizationId: orgId } : {};
    const { skip, limit, page } = parsePagination(req);
    const [rows, total] = await Promise.all([
      prisma.performanceReviewV2.findMany({ where: whereOrg, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.performanceReviewV2.count({ where: whereOrg }),
    ]);
    return res.json({ data: rows, pagination: { page, limit, total } });
  } catch (error) {
    console.error('[Enterprise] listPerformanceReviews error', error);
    return res.status(500).json({ error: 'Failed to list performance reviews' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ATS
// ─────────────────────────────────────────────────────────────────────────────
export const createJobPosition = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const organizationId = orgId || 'mcb-ghana-tenant';
    const data = req.body as Record<string, unknown>;
    const row = await prisma.jobPosition.create({
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
  } catch (error) {
    console.error('[Enterprise] createJobPosition error', error);
    return res.status(500).json({ error: 'Failed to create job position' });
  }
};

export const listJobPositions = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const whereOrg = orgId ? { organizationId: orgId } : {};
    const { skip, limit, page } = parsePagination(req);
    const [rows, total] = await Promise.all([
      prisma.jobPosition.findMany({ where: whereOrg, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.jobPosition.count({ where: whereOrg }),
    ]);
    return res.json({ data: rows, pagination: { page, limit, total } });
  } catch (error) {
    console.error('[Enterprise] listJobPositions error', error);
    return res.status(500).json({ error: 'Failed to list job positions' });
  }
};

export const createCandidate = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const organizationId = orgId || 'mcb-ghana-tenant';
    const data = req.body as Record<string, unknown>;
    const row = await prisma.candidate.create({
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
  } catch (error) {
    console.error('[Enterprise] createCandidate error', error);
    return res.status(500).json({ error: 'Failed to create candidate' });
  }
};

export const updateCandidateStatus = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const whereOrg = orgId ? { organizationId: orgId } : {};
    const organizationId = orgId || 'mcb-ghana-tenant';
    const candidateId = req.params.id;
    const status = asString(req.body.status).toUpperCase();

    const row = await prisma.candidate.update({
      where: { id: candidateId, ...whereOrg },
      data: { status },
    });

    if (status === 'HIRED') {
      await prisma.onboardingChecklist.create({
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
  } catch (error) {
    console.error('[Enterprise] updateCandidateStatus error', error);
    return res.status(500).json({ error: 'Failed to update candidate status' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Onboarding / Offboarding / Benefits / Shift / Announcements / Tax
// ─────────────────────────────────────────────────────────────────────────────
export const listOnboardingChecklists = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const whereOrg = orgId ? { organizationId: orgId } : {};
    const { skip, limit, page } = parsePagination(req);
    const [rows, total] = await Promise.all([
      prisma.onboardingChecklist.findMany({ where: whereOrg, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.onboardingChecklist.count({ where: whereOrg }),
    ]);
    return res.json({ data: rows, pagination: { page, limit, total } });
  } catch (err: any) {
    console.error('[enterprise.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const addOnboardingTask = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const organizationId = orgId || 'mcb-ghana-tenant';
    const data = req.body as Record<string, unknown>;
    const row = await prisma.onboardingChecklistTask.create({
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
  } catch (err: any) {
    console.error('[enterprise.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const updateOnboardingTask = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const whereOrg = orgId ? { organizationId: orgId } : {};
    const row = await prisma.onboardingChecklistTask.update({
      where: { id: req.params.id, ...whereOrg },
      data: {
        status: asString(req.body.status) || undefined,
        completedAt: req.body.status === 'COMPLETED' ? new Date() : undefined,
        notes: asString(req.body.notes) || undefined,
        completedById: req.body.status === 'COMPLETED' ? req.user?.id : undefined,
      },
    });
    return res.json(row);
  } catch (err: any) {
    console.error('[enterprise.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const startOffboarding = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const organizationId = orgId || 'mcb-ghana-tenant';
    const row = await prisma.offboardingProcess.create({
      data: {
        organizationId,
        employeeId: asString(req.body.employeeId),
        triggeredById: req.user?.id || '',
        effectiveDate: req.body.effectiveDate ? new Date(asString(req.body.effectiveDate)) : null,
      },
    });
    return res.status(201).json(row);
  } catch (err: any) {
    console.error('[enterprise.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const completeExitInterview = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const organizationId = orgId || 'mcb-ghana-tenant';
    const row = await prisma.exitInterview.create({
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
  } catch (err: any) {
    console.error('[enterprise.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const recordAssetReturn = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const organizationId = orgId || 'mcb-ghana-tenant';
    const row = await prisma.assetReturn.create({
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
  } catch (err: any) {
    console.error('[enterprise.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const createBenefitPlan = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const organizationId = orgId || 'mcb-ghana-tenant';
    const data = req.body as Record<string, unknown>;
    const row = await prisma.benefitPlan.create({
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
  } catch (err: any) {
    console.error('[enterprise.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const enrollEmployeeBenefit = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const organizationId = orgId || 'mcb-ghana-tenant';
    const data = req.body as Record<string, unknown>;
    const row = await prisma.employeeBenefitEnrollment.create({
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
  } catch (err: any) {
    console.error('[enterprise.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const createShift = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const organizationId = orgId || 'mcb-ghana-tenant';
    const data = req.body as Record<string, unknown>;
    const row = await prisma.shift.create({
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
  } catch (err: any) {
    console.error('[enterprise.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const assignShift = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const organizationId = orgId || 'mcb-ghana-tenant';
    const data = req.body as Record<string, unknown>;
    const row = await prisma.employeeShift.create({
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
  } catch (err: any) {
    console.error('[enterprise.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const createAnnouncement = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const organizationId = orgId || 'mcb-ghana-tenant';
    const data = req.body as Record<string, unknown>;
    const row = await prisma.announcement.create({
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
  } catch (err: any) {
    console.error('[enterprise.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const listAnnouncements = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const whereOrg = orgId ? { organizationId: orgId } : {};
    const { page, limit, skip } = parsePagination(req);
    const [rows, total] = await Promise.all([
      prisma.announcement.findMany({ where: whereOrg, orderBy: { publishDate: 'desc' }, skip, take: limit }),
      prisma.announcement.count({ where: whereOrg }),
    ]);
    return res.json({ data: rows, pagination: { page, limit, total } });
  } catch (err: any) {
    console.error('[enterprise.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const createTaxRule = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const organizationId = orgId || 'mcb-ghana-tenant';
    const data = req.body as Record<string, unknown>;
    const row = await prisma.taxRule.create({
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
  } catch (err: any) {
    console.error('[enterprise.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const createTaxBracket = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const organizationId = orgId || 'mcb-ghana-tenant';
    const data = req.body as Record<string, unknown>;
    const row = await prisma.taxBracket.create({
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
  } catch (err: any) {
    console.error('[enterprise.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const listCandidates = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const whereOrg = orgId ? { organizationId: orgId } : {};
    const { page, limit, skip } = parsePagination(req);
    const [rows, total] = await Promise.all([
      prisma.candidate.findMany({ where: whereOrg, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.candidate.count({ where: whereOrg }),
    ]);
    return res.json({ data: rows, pagination: { page, limit, total } });
  } catch (err: any) {
    console.error('[enterprise.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const listBenefitPlans = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const whereOrg = orgId ? { organizationId: orgId } : {};
    const { page, limit, skip } = parsePagination(req);
    const [rows, total] = await Promise.all([
      prisma.benefitPlan.findMany({ where: whereOrg, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.benefitPlan.count({ where: whereOrg }),
    ]);
    return res.json({ data: rows, pagination: { page, limit, total } });
  } catch (err: any) {
    console.error('[enterprise.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const listBenefitEnrollments = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const whereOrg = orgId ? { organizationId: orgId } : {};
    const { page, limit, skip } = parsePagination(req);
    const [rows, total] = await Promise.all([
      prisma.employeeBenefitEnrollment.findMany({ where: whereOrg, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.employeeBenefitEnrollment.count({ where: whereOrg }),
    ]);
    return res.json({ data: rows, pagination: { page, limit, total } });
  } catch (err: any) {
    console.error('[enterprise.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const listShifts = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const whereOrg = orgId ? { organizationId: orgId } : {};
    const { page, limit, skip } = parsePagination(req);
    const [rows, total] = await Promise.all([
      prisma.shift.findMany({ where: whereOrg, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.shift.count({ where: whereOrg }),
    ]);
    return res.json({ data: rows, pagination: { page, limit, total } });
  } catch (err: any) {
    console.error('[enterprise.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// AI Intelligence Features (Phase 4)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * AI Job Architect: Generates a professional JD draft
 */
export const generateJobDraft = async (req: Request, res: Response) => {
  try {
    const { title, departmentId } = req.body;
    if (!title) return res.status(400).json({ error: 'Job title is required' });

    let departmentName = 'General';
    if (departmentId) {
       const dept = await prisma.department.findUnique({ where: { id: Number(departmentId) } });
       if (dept) departmentName = dept.name;
    }

    const draft = await AIService.generateJobDescription(title, departmentName);
    
    return res.json({ draft });
  } catch (err: any) {
    console.error('[EnterpriseAI] Job Architect Failure:', err);
    res.status(500).json({ error: 'AI generation failed' });
  }
};

/**
 * Culture Pulse: Analyzes institutional sentiment
 */
export const getCulturePulse = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req) || 'mcb-ghana-tenant';
    const insights = await AIService.getCultureInsights(orgId);
    
    return res.json(insights);
  } catch (err: any) {
    console.error('[EnterpriseAI] Culture Pulse Failure:', err);
    res.status(500).json({ error: 'AI insight generation failed' });
  }
};

export const listEmployeeShifts = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const whereOrg = orgId ? { organizationId: orgId } : {};
    const { page, limit, skip } = parsePagination(req);
    const [rows, total] = await Promise.all([
      prisma.employeeShift.findMany({ where: whereOrg, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.employeeShift.count({ where: whereOrg }),
    ]);
    return res.json({ data: rows, pagination: { page, limit, total } });
  } catch (err: any) {
    console.error('[enterprise.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const listTaxRules = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const whereOrg = orgId ? { organizationId: orgId } : {};
    const { page, limit, skip } = parsePagination(req);
    const [rows, total] = await Promise.all([
      prisma.taxRule.findMany({ where: whereOrg, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.taxRule.count({ where: whereOrg }),
    ]);
    return res.json({ data: rows, pagination: { page, limit, total } });
  } catch (err: any) {
    console.error('[enterprise.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const getEnterpriseSummary = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const whereOrg = orgId ? { organizationId: orgId } : {};
    const limit = 8;

    const [
      headcount,
      pendingLeaves,
      pendingReviews,
      openJobs,
      deptKpis,
      jobs,
      candidates,
      onboarding,
      benefitPlans,
      shifts,
      announcements,
      taxRules,
      departments
    ] = await Promise.all([
      prisma.user.count({ where: { ...whereOrg, isArchived: false } }),
      prisma.leaveRequest.count({ where: { ...whereOrg, status: 'PENDING' } }),
      prisma.performanceReviewV2.count({ where: { ...whereOrg, status: { in: ['DRAFT', 'SUBMITTED'] } } }),
      prisma.jobPosition.count({ where: { ...whereOrg, status: { not: 'CLOSED' } } }),
      prisma.departmentKPI.findMany({ where: whereOrg, orderBy: { createdAt: 'desc' }, take: limit }),
      prisma.jobPosition.findMany({ where: whereOrg, orderBy: { createdAt: 'desc' }, take: limit }),
      prisma.candidate.findMany({ where: whereOrg, orderBy: { createdAt: 'desc' }, take: limit }),
      prisma.onboardingChecklist.findMany({ where: whereOrg, orderBy: { createdAt: 'desc' }, take: limit }),
      prisma.benefitPlan.findMany({ where: whereOrg, orderBy: { createdAt: 'desc' }, take: limit }),
      prisma.shift.findMany({ where: whereOrg, orderBy: { createdAt: 'desc' }, take: limit }),
      prisma.announcement.findMany({ where: whereOrg, orderBy: { publishDate: 'desc' }, take: limit }),
      prisma.taxRule.findMany({ where: whereOrg, orderBy: { createdAt: 'desc' }, take: limit }),
      prisma.department.findMany({ where: whereOrg, orderBy: { name: 'asc' } }),
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
  } catch (err: any) {
    console.error('[enterprise.controller.ts] summary error', err.message);
    res.status(500).json({ error: 'Failed to fetch enterprise summary' });
  }
};
