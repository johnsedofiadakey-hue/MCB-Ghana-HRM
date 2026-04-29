import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { logAction } from '../services/audit.service';
import { notify } from '../services/websocket.service';

/**
 * EXIT & SEPARATION (OFFBOARDING) CONTROLLER
 */

// ─── Templates (Admin) ────────────────────────────────────────────────────
export const getTemplates = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
    const templates = await prisma.offboardingTemplate.findMany({
      where: { organizationId },
      include: { tasks: { orderBy: { order: 'asc' } } }
    });
    res.json(templates);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
};

export const createTemplate = async (req: Request, res: Response) => {
  try {
    const { name, description, tasks } = req.body;
    const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
    const template = await prisma.offboardingTemplate.create({
      data: {
        organizationId,
        name, description,
        tasks: { create: tasks?.map((t: any, i: number) => ({ ...t, organizationId, order: i })) || [] }
      },
      include: { tasks: true }
    });
    res.status(201).json(template);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
};

export const initiateOffboarding = async (req: Request, res: Response) => {
  try {
    const { employeeId, effectiveDate, reason, templateId } = req.body;
    const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
    const triggeredById = req.user?.id!;

    let template: any = null;
    if (templateId) {
      template = await prisma.offboardingTemplate.findUnique({
        where: { id: templateId },
        include: { tasks: { orderBy: { order: 'asc' } } }
      });
    }

    const process = await prisma.offboardingProcess.create({
      data: {
        organizationId,
        employeeId,
        triggeredById,
        templateId,
        effectiveDate: effectiveDate ? new Date(effectiveDate) : null,
        status: 'INITIATED',
        items: {
          create: template?.tasks.map(task => ({
            organizationId,
            title: task.title,
            category: task.category,
            isRequired: task.isRequired,
            dueDate: effectiveDate ? new Date(effectiveDate) : new Date()
          })) || []
        }
      },
      include: { items: true }
    });

    // Create exit interview placeholder
    await prisma.exitInterview.create({
      data: {
        organizationId,
        offboardingId: process.id,
        reason
      }
    });

    await logAction(triggeredById, 'INITIATE_OFFBOARDING', 'User', employeeId, { processId: process.id }, req.ip);
    await notify(employeeId, 'Offboarding Commenced 🚪', `Your offboarding process has been initiated, effective ${effectiveDate || 'soon'}.`, 'WARNING', '/offboarding');

    res.status(201).json(process);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const getOffboardingList = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
    const list = await prisma.offboardingProcess.findMany({
      where: { organizationId },
      include: {
        employee: { select: { fullName: true, employeeCode: true, jobTitle: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const completeOffboarding = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';

    // Verify all mandatory clearance items are done
    const processCheck = await prisma.offboardingProcess.findUnique({
      where: { id },
      include: { items: true }
    });

    const pendingRequired = processCheck?.items.filter(i => i.isRequired && !i.completedAt);
    if (pendingRequired && pendingRequired.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot complete offboarding. Mandatory clearance items are still pending.',
        pendingTasks: pendingRequired.map(t => t.title)
      });
    }

    const process = await prisma.offboardingProcess.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        accountDisabledAt: new Date()
      }
    });

    // Deactivate user account
    await prisma.user.update({
      where: { id: process.employeeId },
      data: { status: 'TERMINATED' }
    });

    await logAction(req.user?.id!, 'COMPLETE_OFFBOARDING', 'User', process.employeeId, { processId: id }, req.ip);

    res.json(process);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const completeClearanceTask = async (req: Request, res: Response) => {
  try {
    const { itemId, notes } = req.body;
    // @ts-ignore
    const userId = req.user?.id;

    const item = await prisma.offboardingItem.update({
      where: { id: itemId },
      data: { 
        completedAt: new Date(), 
        completedBy: userId, 
        notes 
      }
    });

    res.json(item);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
};

export const updateExitInterview = async (req: Request, res: Response) => {
  try {
    const { offboardingId } = req.params;
    const { interviewerId, interviewDate, feedback, rehireEligible } = req.body;

    const interview = await prisma.exitInterview.updateMany({
      where: { offboardingId },
      data: {
        interviewerId,
        interviewDate: interviewDate ? new Date(interviewDate) : null,
        feedback,
        rehireEligible
      }
    });

    res.json(interview);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const trackAssetReturn = async (req: Request, res: Response) => {
  try {
    const { offboardingId, assetId, conditionNotes } = req.body;
    const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';

    const returnRecord = await prisma.assetReturn.create({
      data: {
        organizationId,
        offboardingId,
        assetId,
        returned: true,
        returnedAt: new Date(),
        conditionNotes
      }
    });

    res.status(201).json(returnRecord);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const getOffboardingDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const process = await prisma.offboardingProcess.findUnique({
      where: { id },
      include: {
        employee: { select: { fullName: true, employeeCode: true, jobTitle: true, departmentObj: { select: { name: true } } } },
        exitInterviews: { include: { interviewer: { select: { fullName: true } } } },
        assetReturns: true,
        items: { orderBy: { title: 'asc' } }
      }
    });

    if (!process) return res.status(404).json({ error: 'Process not found' });
    res.json(process);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * DELETE OFFBOARDING PROCESS (MD ONLY)
 */
export const deleteOffboarding = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const actorId = req.user?.id!;
    const rank = req.user?.rank || 0;

    if (rank < 90) {
      return res.status(403).json({ error: 'Unauthorized: Only the Managing Director can delete exit processes' });
    }

    const process = await prisma.offboardingProcess.findUnique({ where: { id } });
    if (!process) return res.status(404).json({ error: 'Process not found' });

    // Delete associated relations manually since schema might not have cascade
    await Promise.all([
      prisma.offboardingItem.deleteMany({ where: { offboardingId: id } }),
      prisma.exitInterview.deleteMany({ where: { offboardingId: id } }),
      prisma.assetReturn.deleteMany({ where: { offboardingId: id } })
    ]);

    await prisma.offboardingProcess.delete({ where: { id } });

    await logAction(actorId, 'DELETE_OFFBOARDING_PROCESS', 'User', process.employeeId, { processId: id }, req.ip);

    res.json({ success: true, message: 'Offboarding process and associated data deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
