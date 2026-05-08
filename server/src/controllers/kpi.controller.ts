import { getRoleRank } from '../middleware/auth.middleware';
import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { logAction } from '../services/audit.service';
import { notify } from '../services/websocket.service';
import { getOrgId } from './enterprise.controller';
import { HierarchyService } from '../services/hierarchy.service';

// ─── HELPER: can reviewer assign to this employee? ────────────────────────
const canAssignTo = async (organizationId: string, reviewerId: string, employeeId: string, role: string) => {
  if (getRoleRank(role) >= 80) return true;
  if (!organizationId) return true; // DEV user has no orgId
  
  if (role === 'MANAGER' || role === 'SUPERVISOR' || role === 'DIRECTOR') {
    return await HierarchyService.isSubordinate(reviewerId, employeeId, organizationId);
  }
  return false;
};

const sanitizeKpiSheet = (sheet: any) => {
  if (!sheet) return sheet;
  return {
    ...sheet,
    totalScore: sheet.totalScore ? Number(sheet.totalScore) : null,
    items: sheet.items?.map((item: any) => ({
      ...item,
      targetValue: Number(item.targetValue),
      actualValue: Number(item.actualValue),
      weight: Number(item.weight),
      score: item.score ? Number(item.score) : 0
    }))
  };
};

// 1. ASSIGN KPI TARGETS / CREATE STRATEGIC TEMPLATES

export const createKpiSheet = async (req: Request, res: Response) => {
  try {
    const { title, employeeId, targetDepartmentId, isTemplate, month, year, items } = req.body;
    const orgId = getOrgId(req);
    const organizationId = orgId || 'mcb-ghana-tenant';
    const user = (req as any).user;
    const reviewerId = user.id;
    const reviewerRole = user.role;

    if (!isTemplate && !employeeId) return res.status(400).json({ error: 'employeeId is required for individual sheets' });
    if (!items?.length) return res.status(400).json({ error: 'At least one KPI item is required' });

    // Enforce org chart chain - Only MD/Directors can create templates
    if (isTemplate) {
      if (getRoleRank(reviewerRole) < 80) {
        return res.status(403).json({ error: 'Only MD/Directors can create strategic mandates.' });
      }
    } else if (employeeId && !(await canAssignTo(organizationId, reviewerId, employeeId, reviewerRole))) {
      return res.status(403).json({ error: 'You can only assign KPIs to your direct reports.' });
    }

    // Removed 100% total weight restriction to support new 1-10 priority scale.
    // Total weight is now the sum of priorities, and scores are normalized against this sum.

    const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleString('default', { month: 'long', year: 'numeric' });

    // FRESH START: Delete existing unapproved sheet for same month/year
    if (!isTemplate) {
      await prisma.kpiSheet.deleteMany({
        where: {
          organizationId,
          employeeId,
          month: parseInt(month),
          year: parseInt(year),
          isLocked: false
        }
      });
    }

    const sheet = await prisma.kpiSheet.create({
      data: {
        organizationId,
        title: title || (isTemplate ? `STRATEGIC: ${monthName}` : `KPI Sheet — ${monthName}`),
        month: parseInt(month), year: parseInt(year),
        employeeId: isTemplate ? null : employeeId,
        targetDepartmentId: targetDepartmentId ? parseInt(targetDepartmentId) : null,
        isTemplate: !!isTemplate,
        reviewerId, 
        status: isTemplate ? 'TEMPLATE' : 'ACTIVE',
        items: {
          create: items.map((i: any) => ({
            organizationId,
            name: i.name || i.description || 'KPI Goal',
            category: i.category || 'General',
            description: i.description || '',
<<<<<<< HEAD
            type: i.type || 'LAGGING',
=======
>>>>>>> 430a1da1a47c271c0801ba6d3e2fad6da5b864e7
            weight: parseFloat(i.weight),
            targetValue: parseFloat(i.target || i.targetValue || 0),
            actualValue: 0, score: 0
          }))
        }
      },
      include: { items: true, employee: { select: { fullName: true } } }
    });

    if (!isTemplate && employeeId) {
      await notify(employeeId as string, '🎯 New KPI Targets Set',
        `Your manager has set KPI targets for ${monthName}.`, 'INFO', '/performance');
    }
    await logAction(reviewerId, isTemplate ? 'KPI_TEMPLATE_CREATED' : 'KPI_ASSIGNED', 'KpiSheet', sheet.id, { employeeId, targetDepartmentId, month, year }, req.ip);
    return res.status(201).json(sanitizeKpiSheet(sheet));

  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// 2. MY SHEETS (assigned to me)
export const getMySheets = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const orgId = getOrgId(req);
    const whereOrg = orgId ? { organizationId: orgId } : {};
    const start = Date.now();
    const sheets = await prisma.kpiSheet.findMany({
      where: { ...whereOrg, employeeId: user.id },
    include: { items: true, reviewer: { select: { fullName: true, role: true, avatarUrl: true } } },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
    take: 50
  });
  console.log(`[PERF] getMySheets for ${user.id} took ${Date.now() - start}ms`);
  return res.json(sheets.map(sanitizeKpiSheet));

  } catch (err: any) {
    console.error('[kpi.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

// 3. SHEETS I ASSIGNED (as reviewer/manager)
export const getSheetsIAssigned = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const orgId = getOrgId(req);
    const whereOrg = orgId ? { organizationId: orgId } : {};
    const { id: reviewerId, role } = user;
    const where: any = { ...whereOrg };
    if (getRoleRank(role) < 80) where.reviewerId = reviewerId;

    const sheets = await prisma.kpiSheet.findMany({
      where: where,
    include: {
      items: true,
      employee: { select: { fullName: true, avatarUrl: true } },
      reviewer: { select: { fullName: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: 50
  });
  return res.json(sheets.map(sanitizeKpiSheet));

  } catch (err: any) {
    console.error('[kpi.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

// 4. SINGLE SHEET
export const getSheetById = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const orgId = getOrgId(req);
    const whereOrg = orgId ? { organizationId: orgId } : {};
    const { id: userId, role } = user;
    const sheet = await prisma.kpiSheet.findFirst({
      where: { id: req.params.id, ...whereOrg },
    include: {
      items: true,
      employee: { select: { id: true, fullName: true, jobTitle: true, avatarUrl: true } },
      reviewer: { select: { id: true, fullName: true, role: true } }
    }
  });
  if (!sheet) return res.status(404).json({ error: 'Not found' });
  const canView = sheet.employeeId === userId || sheet.reviewerId === userId
    || getRoleRank(role) >= 80;
  if (!canView) return res.status(403).json({ error: 'Access denied' });
  return res.json(sanitizeKpiSheet(sheet));

  } catch (err: any) {
    console.error('[kpi.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

// 5. UPDATE PROGRESS (employee enters actuals)
export const updateKpiProgress = async (req: Request, res: Response) => {
  try {
    const { sheetId, items, submit } = req.body;
    const user = (req as any).user;
    const orgId = getOrgId(req);
    const whereOrg = orgId ? { organizationId: orgId } : {};
    const userId = user.id;
    const sheet = await prisma.kpiSheet.findFirst({
      where: { id: sheetId, ...whereOrg }
    });
  if (!sheet) return res.status(404).json({ error: 'Not found' });
  if (sheet.employeeId !== userId) return res.status(403).json({ error: 'Not your sheet' });
  if (sheet.isLocked) return res.status(403).json({ error: 'Sheet is locked after approval' });
  if (sheet.status === 'PENDING_APPROVAL') return res.status(403).json({ error: 'Sheet is pending review — recall it first to edit' });

  let total = 0;
  if (items?.length) {
    for (const upd of items) {
      const item = await prisma.kpiItem.findFirst({
        where: { id: upd.id, ...whereOrg }
      });
      if (!item || item.sheetId !== sheetId) continue;
      const actual = parseFloat(upd.actualValue);
      const targetValue = Number(item.targetValue);
      const weight = Number(item.weight);
      const raw = targetValue > 0 ? (actual / targetValue) * weight : 0;
      const score = Math.min(raw, weight * 1.2);
      await prisma.kpiItem.updateMany({
        where: { id: upd.id, ...whereOrg },
        data: { actualValue: actual, score, lastEntryDate: new Date() }
      });
      total += score;
  /*
      const existing = await prisma.kpiItem.findMany({
        where: { sheetId: sheetId, ...whereOrg }
      });
      total = existing.reduce((s, i) => s + (i.score || 0), 0);
      */
      // Handled below by fetching all items to ensure accurate normalization
    }

    // Always re-calculate normalized totalScore from current state of all items
    const allItems = await prisma.kpiItem.findMany({
      where: { sheetId: sheetId, ...whereOrg }
    });
    const sumWeights = allItems.reduce((s, i) => s + (Number(i.weight) || 0), 0);
    const sumScores = allItems.reduce((s, i) => s + (Number(i.score) || 0), 0);
    total = sumWeights > 0 ? (sumScores / sumWeights) * 100 : 0;
  }

  const status = submit ? 'PENDING_APPROVAL' : 'ACTIVE';
  await prisma.kpiSheet.updateMany({
    where: { id: sheetId, ...whereOrg },
    data: { totalScore: total, status }
  });

  if (submit && sheet.reviewerId) {
    await notify(sheet.reviewerId, 'KPI Sheet Submitted for Review',
      'An employee submitted their KPI sheet.', 'INFO', '/team');
  }
  await logAction(userId, submit ? 'KPI_SUBMITTED' : 'KPI_UPDATED', 'KpiSheet', sheetId, { score: total }, req.ip);
  return res.json({ success: true, totalScore: total, status });
  } catch (err: any) {
    console.error('[kpi.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

// 6. REVIEW (approve/reject)
export const reviewKpiSheet = async (req: Request, res: Response) => {
  try {
    const { sheetId, decision, feedback } = req.body;
    const user = (req as any).user;
    const orgId = getOrgId(req);
    const whereOrg = orgId ? { organizationId: orgId } : {};
    const { id: managerId, role } = user;
    const sheet = await prisma.kpiSheet.findFirst({
      where: { id: sheetId, ...whereOrg }
    });
  if (!sheet) return res.status(404).json({ error: 'Not found' });
  if (sheet.reviewerId !== managerId && getRoleRank(role) < 80)
    return res.status(403).json({ error: 'Only the assigned reviewer can approve' });
  if (sheet.status !== 'PENDING_APPROVAL')
    return res.status(400).json({ error: 'Sheet must be PENDING_APPROVAL to review' });

  const approved = decision === 'APPROVE';
  await prisma.kpiSheet.updateMany({
    where: { id: sheetId, ...whereOrg },
    data: { status: approved ? 'LOCKED' : 'ACTIVE', isLocked: approved, lockedAt: approved ? new Date() : null }
  });

  if (sheet.employeeId) {
    await notify(sheet.employeeId,
      approved ? '🎉 KPI Sheet Approved' : '🔄 KPI Sheet Returned for Revision',
      approved ? 'Your KPI sheet has been approved.' : `Returned for changes. ${feedback || ''}`,
      approved ? 'SUCCESS' : 'WARNING', '/performance');
  }
  await logAction(managerId, 'KPI_REVIEWED', 'KpiSheet', sheetId, { decision, feedback }, req.ip);
  return res.json({ success: true, status: approved ? 'LOCKED' : 'ACTIVE' });
  } catch (err: any) {
    console.error('[kpi.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

// 7. RECALL (employee pulls back submitted sheet)
export const recallKpiSheet = async (req: Request, res: Response) => {
  try {
    const { sheetId } = req.body;
    const orgId = getOrgId(req);
    const whereOrg = orgId ? { organizationId: orgId } : {};
    const user = (req as any).user;
    const userId = user.id;
    const sheet = await prisma.kpiSheet.findFirst({
      where: { id: sheetId, ...whereOrg }
    });
  if (!sheet) return res.status(404).json({ error: 'Not found' });
  if (sheet.employeeId !== userId) return res.status(403).json({ error: 'Not your sheet' });
  if (sheet.isLocked) return res.status(400).json({ error: 'Approved sheets cannot be recalled' });
  if (sheet.status !== 'PENDING_APPROVAL') return res.status(400).json({ error: 'Sheet is not pending' });
  await prisma.kpiSheet.updateMany({
    where: { id: sheetId, ...whereOrg },
    data: { status: 'ACTIVE' }
  });
  return res.json({ success: true });
  } catch (err: any) {
    console.error('[kpi.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

// 8. DELETE (MD/HR only)
export const deleteKpiSheet = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const whereOrg = orgId ? { organizationId: orgId } : {};
    const user = (req as any).user;
    const { id: userId, role } = user;

    // Check if sheet exists and if user has permission
    const sheet = await prisma.kpiSheet.findFirst({
      where: { id: req.params.id, ...whereOrg }
    });

    if (!sheet) return res.status(404).json({ error: 'Sheet not found' });
    
    const isOwner = sheet.reviewerId === userId;
    const isAdmin = getRoleRank(role) >= 80;

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Deletion access denied' });
    }

    if (sheet.isLocked && !isAdmin) {
      return res.status(403).json({ error: 'Only MD can delete an approved/locked mission.' });
    }

    await prisma.kpiItem.deleteMany({
      where: { sheetId: req.params.id, ...whereOrg }
    });
    await prisma.kpiSheet.deleteMany({
      where: { id: req.params.id, ...whereOrg }
    });
    return res.status(204).send();
  } catch (err: any) {
    console.error('[kpi.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

// 9. ALL SHEETS (MD overview)
export const getAllSheets = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const whereOrg = orgId ? { organizationId: orgId } : {};
    const { month, year, employeeId } = req.query;
    const sheets = await prisma.kpiSheet.findMany({
      where: {
        ...whereOrg,
        ...(month ? { month: parseInt(month as string) } : {}),
        ...(year ? { year: parseInt(year as string) } : {}),
        ...(employeeId ? { employeeId: employeeId as string } : {})
      },
    include: {
      employee: { select: { fullName: true, jobTitle: true, departmentObj: { select: { name: true } } } },
      reviewer: { select: { fullName: true } },
      items: true
    },
    orderBy: [{ year: 'desc' }, { month: 'desc' }]
  });
  return res.json(sheets.map(sanitizeKpiSheet));

  } catch (err: any) {
    console.error('[kpi.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

// 10. DEPARTMENTAL KPI SUMMARY (MD executive view)
export const getDepartmentalSummary = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const organizationId = orgId || 'mcb-ghana-tenant';

    const departments = await prisma.department.findMany({
      where: { organizationId },
      include: {
        manager: { select: { fullName: true } },
        employees: {
          select: {
            id: true,
            kpiSheets: {
              include: { items: { select: { score: true, targetValue: true, actualValue: true, weight: true } } },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    const summary = departments.map((dept) => {
      let totalKpis = 0;
      let totalScore = 0;
      let onTrack = 0;
      let atRisk = 0;
      let overdue = 0;
      let sheetsWithScore = 0;

      for (const emp of dept.employees) {
        const latestSheet = emp.kpiSheets[0];
        if (!latestSheet) continue;
        for (const item of latestSheet.items) {
          totalKpis++;
          const targetValue = Number(item.targetValue);
          const actualValue = Number(item.actualValue);
          const score = Number(item.score);
          const pct = targetValue > 0 ? (actualValue / targetValue) * 100 : 0;
          if (pct >= 80) onTrack++;
          else if (pct >= 50) atRisk++;
          else overdue++;
          if (item.score !== null) { totalScore += score; sheetsWithScore++; }
        }
      }

      return {
        departmentId: dept.id,
        departmentName: dept.name,
        managerName: dept.manager?.fullName || null,
        totalKpis,
        avgScore: sheetsWithScore > 0 ? Math.round((totalScore / sheetsWithScore) * 10) / 10 : 0,
        onTrack,
        atRisk,
        overdue,
      };
    });

    return res.json(summary);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// 11. INDIVIDUAL KPI SUMMARY (MD executive drilldown — direct reports only)
export const getIndividualSummary = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const organizationId = orgId || 'mcb-ghana-tenant';
    const user = (req as any).user;

    const userRank = getRoleRank(user.role);
    const where: any = { organizationId };

    if (userRank >= 80) {
      // MD/Directors see all department heads and direct reports
      where.OR = [
        { supervisorId: user.id },
        { role: { in: ['DIRECTOR', 'MANAGER', 'MD', 'IT_MANAGER', 'HR_OFFICER'] } },
      ];
    } else {
      // Others see themselves + their direct reports
      where.OR = [
        { id: user.id },
        { supervisorId: user.id }
      ];
    }

    const directReports = await prisma.user.findMany({
      where,
      include: {
        departmentObj: { select: { name: true } },
        kpiSheets: {
          include: { items: { select: { score: true, targetValue: true, actualValue: true } } },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    const summary = directReports.map((emp) => {
      const latestSheet = emp.kpiSheets[0];
      const items = latestSheet?.items || [];
      const scoredItems = items.filter((i) => i.score !== null);
      const avgScore =
        scoredItems.length > 0
          ? Math.round((scoredItems.reduce((s, i) => s + (Number(i.score) || 0), 0) / scoredItems.length) * 10) / 10
          : 0;

      return {
        employeeId: emp.id,
        employeeName: emp.fullName,
        role: emp.role,
        departmentName: emp.departmentObj?.name || 'Unassigned',
        totalKpis: items.length,
        avgScore,
        sheetStatus: latestSheet?.status || 'N/A',
      };
    });

    return res.json(summary);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// 12. GET STRATEGIC MANDATES (For managers to see what MD set for their department)
export const getStrategicMandates = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const organizationId = orgId || 'mcb-ghana-tenant';
    const { departmentId, month, year } = req.query;

    const mandates = await prisma.kpiSheet.findMany({
      where: {
        organizationId,
        isTemplate: true,
        month: month ? parseInt(month as string) : undefined,
        year: year ? parseInt(year as string) : undefined,
        OR: [
          { targetDepartmentId: departmentId ? parseInt(departmentId as string) : undefined },
          { targetDepartmentId: null } // Global mandates
        ]
      },
      include: { items: true, reviewer: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' }
    });

    return res.json(mandates.map(sanitizeKpiSheet));

  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// 13. ASSIGN FROM TEMPLATE
export const assignFromTemplate = async (req: Request, res: Response) => {
  try {
    const { templateId, employeeId, month, year } = req.body;
    const orgId = getOrgId(req);
    const organizationId = orgId || 'mcb-ghana-tenant';
    const user = (req as any).user;

    const template = await prisma.kpiSheet.findFirst({
      where: { id: templateId, organizationId, isTemplate: true },
      include: { items: true }
    });

    if (!template) return res.status(404).json({ error: 'Mandate template not found' });

    // Enforce hierarchy
    if (!(await canAssignTo(organizationId, user.id, employeeId, user.role))) {
      return res.status(403).json({ error: 'You can only assign to your direct reports.' });
    }

    const m = month || template.month;
    const y = year || template.year;

    // Delete existing unapproved sheet
    await prisma.kpiSheet.deleteMany({
      where: { organizationId, employeeId, month: m, year: y, isLocked: false }
    });

    const sheet = await prisma.kpiSheet.create({
      data: {
        organizationId,
        title: `KPI Sheet (Mandated) - ${template.title}`,
        month: m,
        year: y,
        employeeId,
        reviewerId: user.id,
        status: 'ACTIVE',
        items: {
          create: template.items.map((i: any) => ({
            organizationId,
            name: i.name,
            category: i.category,
            description: i.description,
<<<<<<< HEAD
            type: i.type,
=======
>>>>>>> 430a1da1a47c271c0801ba6d3e2fad6da5b864e7
            metricType: i.metricType,
            weight: i.weight,
            targetValue: i.targetValue,
            actualValue: 0
          }))
        }
      },
      include: { items: true }
    });

    await notify(employeeId, '🎯 Strategic KPIs Assigned', `Your manager has assigned strategic mandates for review.`, 'INFO', '/performance');
    return res.status(201).json(sanitizeKpiSheet(sheet));

  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};
