import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { notify } from '../services/websocket.service';
import { logAction } from '../services/audit.service';

// ─── Templates (Admin) ────────────────────────────────────────────────────
export const getTemplates = async (_req: Request, res: Response) => {
  try {
  const templates = await prisma.onboardingTemplate.findMany({ include: { tasks: { orderBy: { order: 'asc' } } } });
  res.json(templates);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
};

export const createTemplate = async (req: Request, res: Response) => {
  try {
    const { name, description, tasks } = req.body;
    const template = await prisma.onboardingTemplate.create({
      data: {
        name, description,
        tasks: { create: tasks?.map((t: any, i: number) => ({ ...t, order: i })) || [] }
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

    const template = await prisma.onboardingTemplate.findUnique({
      where: { id: templateId }, include: { tasks: { orderBy: { order: 'asc' } } }
    });
    if (!template) return res.status(404).json({ error: 'Template not found' });

    const session = await prisma.onboardingSession.create({
      data: {
        employeeId, templateId,
        startDate: startDate ? new Date(startDate) : new Date(),
        items: {
          create: template.tasks.map(task => ({
            taskId: task.id,
            title: task.title,
            category: task.category,
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
  const sessions = await prisma.onboardingSession.findMany({
    where: { employeeId: userId },
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
    const { itemId, notes } = req.body;
    // @ts-ignore
    const userId = req.user?.id;

    const item = await prisma.onboardingItem.update({
      where: { id: itemId },
      data: { completedAt: new Date(), completedBy: userId, notes }
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
        data: { progress, ...(completedAt ? { completedAt } : {}) }
      });

      if (progress === 100) {
        await notify(session.employeeId, 'Onboarding Complete! 🏆', 'Congratulations! You have completed all onboarding tasks.', 'SUCCESS');
      }
    }

    res.json(item);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
};

export const getAllOnboardingSessions = async (req: Request, res: Response) => {
  try {  const sessions = await prisma.onboardingSession.findMany({
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
