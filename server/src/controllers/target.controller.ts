import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { TargetService } from '../services/target.service';
import { getRoleRank } from '../middleware/auth.middleware';
import { errorLogger } from '../services/error-log.service';

import { HierarchyService } from '../services/hierarchy.service';

const getOrgId = (req: Request) => (req as any).user?.organizationId || 'mcb-ghana-tenant';
const getUser = (req: Request) => (req as any).user;

const sanitizeTarget = (target: any): any => {
  if (!target) return target;
  return {
    ...target,
    weight: Number(target.weight || 0),
    progress: Number(target.progress || 0),
    metrics: target.metrics?.map((m: any) => ({
      ...m,
      targetValue: Number(m.targetValue || 0),
      currentValue: Number(m.currentValue || 0),
      weight: Number(m.weight || 0)
    })),
    childTargets: target.childTargets?.map(sanitizeTarget)
  };
};

// ── LIST: my targets (assigned to me + I'm lineManager/reviewer) ──────────────

export const getTargets = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const user = getUser(req);
    const userId = user.id;
    const { status, level } = req.query;

    const managedDepts = await prisma.department.findMany({
      where: { organizationId: orgId, managerId: userId },
      select: { id: true }
    });
    const managedDeptIds = managedDepts.map(d => d.id);

    const where: any = {
      organizationId: orgId,
      isArchived: false,
      OR: [
        { assigneeId: userId },
        { lineManagerId: userId },
        { originatorId: userId },
        { reviewerId: userId },
        { department: { managerId: userId } },
        { departmentId: { in: [user.departmentId, ...managedDeptIds].filter(Boolean) as number[] }, level: 'DEPARTMENT' }
      ],
    };
    if (status) where.status = status;
    if (level) where.level = level;

    const targets = await prisma.target.findMany({
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

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// ── LIST: targets I assigned / manage (Manager+) ─────────────────────────────
export const getTeamTargets = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const user = getUser(req);
    const userId = user.id;
    const { status } = req.query;

    const managedDepts = await prisma.department.findMany({
      where: { organizationId: orgId, managerId: userId },
      select: { id: true }
    });
    const managedDeptIds = managedDepts.map(d => d.id);

    const where: any = {
      organizationId: orgId,
      isArchived: false,
      OR: [
        { lineManagerId: userId },
        { originatorId: userId },
        { reviewerId: userId },
        { department: { managerId: userId } },
        { departmentId: { in: [user.departmentId, ...managedDeptIds].filter(Boolean) as number[] }, level: 'DEPARTMENT' }
      ],
    };
    if (status) where.status = status;

    const targets = await prisma.target.findMany({
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

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// ── LIST: department-level targets (Director+) ────────────────────────────────
export const getDepartmentTargets = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const { departmentId } = req.query;

    const where: any = {
      organizationId: orgId,
      level: 'DEPARTMENT',
      isArchived: false,
    };
    if (departmentId) where.departmentId = Number(departmentId);

    const targets = await prisma.target.findMany({
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

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// ── SINGLE ────────────────────────────────────────────────────────────────────
export const getTarget = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const userId = getUser(req).id;
    const userRank = getRoleRank(getUser(req).role);

    const target = await prisma.target.findUnique({
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

    // Access check: must be involved or rank 80+
    const isInvolved = [target.assigneeId, target.lineManagerId, target.originatorId, target.reviewerId].includes(userId);
    if (!isInvolved && userRank < 80) {
      return res.status(403).json({ error: 'Not authorised to view this target' });
    }

    res.json(sanitizeTarget(target));

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// ── UPDATE TARGET METADATA ────────────────────────────────────────────────────
export const updateTarget = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const userId = getUser(req).id;
    const userRank = getRoleRank(getUser(req).role);
    const { id } = req.params;

    const target = await prisma.target.findUnique({ where: { id } });
    if (!target || target.organizationId !== orgId) return res.status(404).json({ error: 'Target not found' });

    // Only originator or rank 80+ can edit
    if (target.originatorId !== userId && userRank < 80) {
      return res.status(403).json({ error: 'Not authorised to edit this target' });
    }

    const updated = await TargetService.updateTarget(id, orgId, req.body);
    res.json(sanitizeTarget(updated));

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// ── DELETE TARGET ─────────────────────────────────────────────────────────────
export const deleteTarget = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const userId = getUser(req).id;
    const userRank = getRoleRank(getUser(req).role);
    const { id } = req.params;

    const target = await prisma.target.findUnique({ where: { id }, include: { _count: { select: { childTargets: true } } } });
    if (!target || target.organizationId !== orgId) return res.status(404).json({ error: 'Target not found' });

    // Permission check: Originator, Dept Manager, or Rank 85+ (Director+)
    const isOriginator = target.originatorId === userId;
    const isDeptManager = userRank >= 70 && target.departmentId === getUser(req).departmentId;
    const isHighRank = userRank >= 85;

    if (!isOriginator && !isDeptManager && !isHighRank) {
      return res.status(403).json({ error: 'Not authorised to delete this target' });
    }

    // Recursive archiving is now handled by TargetService.deleteTarget
    await TargetService.deleteTarget(id, orgId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// ── STRATEGIC ROLLUP ──────────────────────────────────────────────────────────
export const getStrategicRollup = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const result = await TargetService.getStrategicRollup(req.params.id, orgId);
    if (!result) return res.status(404).json({ error: 'Target not found' });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// ── CREATE ────────────────────────────────────────────────────────────────────
export const createTarget = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const originatorId = getUser(req).id;
    const target = await TargetService.createTarget(req.body, originatorId, orgId);
    return res.status(201).json(sanitizeTarget(target));

  } catch (err: any) {
    errorLogger.log('TargetController.createTarget', err);
    return res.status(400).json({ error: err.message || 'Failed to create target' });
  }
};

// ── ACKNOWLEDGE (POST /targets/:id/acknowledge) ───────────────────────────────
export const acknowledge = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const userId = getUser(req).id;
    const { status, message } = req.body;
    const target = await TargetService.acknowledge(req.params.id, userId, orgId, status, message);
    return res.json(sanitizeTarget(target));

  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

// ── PROGRESS UPDATE (POST /targets/:id/progress) ─────────────────────────────
export const updateProgress = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const userId = getUser(req).id;
    const { metricUpdates, submit } = req.body;
    const target = await TargetService.updateProgress(req.params.id, metricUpdates || req.body.updates, userId, orgId, submit);
    return res.json(sanitizeTarget(target));

  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

// ── REVIEW (POST /targets/:id/review) ────────────────────────────────────────
export const reviewTarget = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const reviewerId = getUser(req).id;
    const reviewerRank = getRoleRank(getUser(req).role);
    const { approved, feedback } = req.body;
    const target = await TargetService.reviewTarget(req.params.id, reviewerId, orgId, approved, feedback, reviewerRank);
    return res.json(sanitizeTarget(target));

  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

// ── CASCADE (POST /targets/:id/cascade) ──────────────────────────────────────
export const cascadeTarget = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const managerId = getUser(req).id;
    const { assignments } = req.body;
    const targets = await TargetService.cascadeTarget(req.params.id, assignments, managerId, orgId);
    return res.status(201).json(targets.map(sanitizeTarget));

  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};
