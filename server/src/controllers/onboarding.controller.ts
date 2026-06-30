import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { notify } from '../services/websocket.service';
import { logAction } from '../services/audit.service';
import { PolicyService } from '../services/policy.service';
import { Permission } from '../types/permissions';

const ownerPermission: Record<string, string> = {
  HR: Permission.ONBOARDING_MANAGE,
  IT: Permission.ACCOUNT_PROVISION,
  MARKETING: Permission.CARD_PRODUCTION,
};

// ─── Templates (Admin) ────────────────────────────────────────────────────
export const getTemplates = async (req: Request, res: Response) => {
  try {
  const organizationId = (req as any).user.organizationId;
  const templates = await prisma.onboardingTemplate.findMany({ where: { organizationId }, include: { tasks: { orderBy: { order: 'asc' } } } });
  res.json(templates);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
};

export const createTemplate = async (req: Request, res: Response) => {
  try {
    const { name, description, tasks } = req.body;
    const organizationId = (req as any).user.organizationId;
    const template = await prisma.onboardingTemplate.create({
      data: {
        organizationId, name, description,
        tasks: { create: tasks?.map((t: any, i: number) => ({ ...t, organizationId, order: i })) || [] }
      },
      include: { tasks: true }
    });
    res.status(201).json(template);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
};

// ─── Sessions (Employee onboarding instances) ────────────────────────────
export const startOnboarding = async (req: Request, res: Response) => {
  try {
    const { employeeId, templateId, startDate } = req.body;
    // @ts-ignore
    const actorId = req.user?.id;
    const organizationId = (req as any).user.organizationId;

    const template = await prisma.onboardingTemplate.findFirst({
      where: { id: templateId, organizationId }, include: { tasks: { orderBy: { order: 'asc' } } }
    });
    if (!template) return res.status(404).json({ error: 'Template not found' });
    const employee = await prisma.user.findFirst({ where: { id: employeeId, organizationId }, select: { supervisorId: true } });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const session = await prisma.onboardingSession.create({
      data: {
        organizationId, employeeId, templateId,
        startDate: startDate ? new Date(startDate) : new Date(),
        items: {
          create: template.tasks.map(task => ({
            taskId: task.id,
            organizationId,
            title: task.title,
            category: task.category,
            ownerRole: task.ownerRole,
            assignedToId: task.ownerRole === 'MANAGER' ? employee.supervisorId : null,
            autoCompleteEvent: task.autoCompleteEvent,
            status: 'PENDING',
            isRequired: task.isRequired,
            dueDate: new Date(Date.now() + task.dueAfterDays * 24 * 60 * 60 * 1000)
          }))
        }
      },
      include: { items: true, template: true }
    });

    await notify(employeeId, 'Onboarding Started 🎉', `Your onboarding checklist "${template.name}" is ready. Complete all tasks to get fully set up!`, 'INFO', '/onboarding');
    await logAction(actorId, 'ONBOARDING_STARTED', 'OnboardingSession', session.id, { employeeId, template: template.name }, req.ip);
    res.status(201).json(session);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
};

export const getMyOnboarding = async (req: Request, res: Response) => {
  try {  // @ts-ignore
  const userId = req.user?.id;
  const organizationId = (req as any).user.organizationId;
  const sessions = await prisma.onboardingSession.findMany({
    where: { employeeId: userId, organizationId },
    include: { items: { orderBy: { dueDate: 'asc' } }, template: true },
    orderBy: { createdAt: 'desc' }
  });
  res.json(sessions);
  } catch (err: any) {
    console.error('[onboarding.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const completeTask = async (req: Request, res: Response) => {
  try {
    const { itemId, notes, evidenceUrl } = req.body;
    // @ts-ignore
    const userId = req.user?.id;
    const organizationId = (req as any).user.organizationId;
    const current = await prisma.onboardingItem.findFirst({
      where: { id: itemId, organizationId },
      include: { session: { select: { employeeId: true } } },
    });
    if (!current) return res.status(404).json({ error: 'Onboarding task not found' });

    if (current.dependsOnItemId) {
      const dependency = await prisma.onboardingItem.findFirst({ where: { id: current.dependsOnItemId, organizationId } });
      if (!dependency || !['COMPLETED', 'VERIFIED'].includes(dependency.status)) {
        return res.status(409).json({ error: 'This task is blocked by an incomplete dependency.' });
      }
    }

    const isAssignee = current.assignedToId === userId;
    const isEmployeeTask = current.ownerRole === 'EMPLOYEE' && current.session.employeeId === userId;
    const permission = ownerPermission[current.ownerRole];
    const isDepartmentOwner = permission
      ? (await PolicyService.evaluatePolicy(userId || '', permission)).allowed
      : false;
    if (!isAssignee && !isEmployeeTask && !isDepartmentOwner) {
      return res.status(403).json({ error: 'This task belongs to another employee or department.' });
    }

    const item = await prisma.onboardingItem.update({
      where: { id: current.id },
      data: { completedAt: new Date(), completedBy: userId, notes, evidenceUrl, status: 'COMPLETED' }
    });

    // Recalculate progress
    const session = await prisma.onboardingSession.findUnique({
      where: { id: item.sessionId },
      include: { items: true }
    });

    if (session) {
      const total = session.items.length;
      const done = session.items.filter(i => i.completedAt || i.id === itemId).length;
      const progress = Math.round((done / total) * 100);
      const completedAt = progress === 100 ? new Date() : null;

      await prisma.onboardingSession.update({
        where: { id: session.id },
        data: { progress, status: completedAt ? 'AWAITING_HR_CLOSE' : 'IN_PROGRESS', ...(completedAt ? { completedAt } : {}) }
      });

      if (progress === 100) {
        await notify(session.employeeId, 'Onboarding Complete! 🏆', 'Congratulations! You have completed all onboarding tasks.', 'SUCCESS');
      }
    }

    res.json(item);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
};

export const getAllOnboardingSessions = async (req: Request, res: Response) => {
  try {
  const organizationId = (req as any).user.organizationId;
  const sessions = await prisma.onboardingSession.findMany({
    where: { organizationId },
    include: {
      employee: { select: { fullName: true, jobTitle: true, avatarUrl: true } },
      template: { select: { name: true } },
      items: { select: { completedAt: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
  res.json(sessions);
  } catch (err: any) {
    console.error('[onboarding.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const getDepartmentTasks = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const organizationId = user.organizationId || 'mcb-ghana-tenant';
    const owners: string[] = [];
    for (const [owner, permission] of Object.entries(ownerPermission)) {
      if ((await PolicyService.evaluatePolicy(user.id, permission)).allowed) owners.push(owner);
    }
    const tasks = await prisma.onboardingItem.findMany({
      where: {
        organizationId,
        OR: [{ assignedToId: user.id }, ...(owners.length ? [{ ownerRole: { in: owners } }] : [])],
      },
      include: { session: { include: { employee: { select: { id: true, fullName: true, jobTitle: true } } } } },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
    });
    return res.json(tasks);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const closeOnboarding = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const organizationId = user.organizationId || 'mcb-ghana-tenant';
    const session = await prisma.onboardingSession.findFirst({
      where: { id: req.params.id, organizationId },
      include: { items: true },
    });
    if (!session) return res.status(404).json({ error: 'Onboarding session not found' });
    const incomplete = session.items.filter((item) => item.isRequired && !['COMPLETED', 'VERIFIED'].includes(item.status));
    if (incomplete.length) return res.status(409).json({ error: `${incomplete.length} required task(s) remain incomplete.` });
    await prisma.$transaction([
      prisma.onboardingSession.update({ where: { id: session.id }, data: { status: 'COMPLETED', progress: 100, completedAt: new Date() } }),
      prisma.user.update({ where: { id: session.employeeId }, data: { employeeLifecycleStage: 'ACTIVE' } }),
    ]);
    await logAction(user.id, 'ONBOARDING_CLOSED', 'OnboardingSession', session.id, { employeeId: session.employeeId }, req.ip);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};
