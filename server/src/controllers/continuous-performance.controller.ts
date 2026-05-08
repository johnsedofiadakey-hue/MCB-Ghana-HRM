import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { getOrgId } from './enterprise.controller';
import { notify } from '../services/websocket.service';

export class ContinuousPerformanceController {
  // --- CHECK-INS ---
  static async scheduleCheckIn(req: Request, res: Response) {
    try {
      const { employeeId, scheduledAt } = req.body;
      const orgId = getOrgId(req);
      const organizationId = orgId || 'mcb-ghana-tenant';
      const user = (req as any).user;
      const managerId = user.id;

      if (!employeeId || !scheduledAt) {
        return res.status(400).json({ error: 'employeeId and scheduledAt are required' });
      }

      const checkIn = await prisma.checkIn.create({
        data: {
          organizationId,
          employeeId,
          managerId,
          scheduledAt: new Date(scheduledAt),
        },
      });

      await notify(employeeId, '📅 Check-In Scheduled', `Your manager has scheduled a check-in on ${new Date(scheduledAt).toLocaleString()}`, 'INFO', '/performance');

      return res.status(201).json(checkIn);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async completeCheckIn(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      const orgId = getOrgId(req);
      const whereOrg = orgId ? { organizationId: orgId } : {};

      const checkIn = await prisma.checkIn.updateMany({
        where: { id, ...whereOrg },
        data: {
          completedAt: new Date(),
          notes,
        },
      });

      return res.json({ success: true, checkIn });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async getCheckIns(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const orgId = getOrgId(req);
      const whereOrg = orgId ? { organizationId: orgId } : {};
      
      const checkIns = await prisma.checkIn.findMany({
        where: {
          ...whereOrg,
          OR: [
            { employeeId: user.id },
            { managerId: user.id },
          ],
        },
        include: {
          employee: { select: { fullName: true, avatarUrl: true } },
          manager: { select: { fullName: true, avatarUrl: true } },
        },
        orderBy: { scheduledAt: 'desc' },
      });

      return res.json(checkIns);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  // --- 360 FEEDBACK ---
  static async submitFeedback(req: Request, res: Response) {
    try {
      const { receiverId, content, rating } = req.body;
      const orgId = getOrgId(req);
      const organizationId = orgId || 'mcb-ghana-tenant';
      const user = (req as any).user;
      const providerId = user.id;

      if (!receiverId || !content) {
        return res.status(400).json({ error: 'receiverId and content are required' });
      }

      const feedback = await prisma.feedback360.create({
        data: {
          organizationId,
          providerId,
          receiverId,
          content,
          rating: rating ? parseInt(rating) : null,
        },
      });

      await notify(receiverId, '💬 New 360 Feedback', `You have received new feedback from a colleague.`, 'INFO', '/performance');

      return res.status(201).json(feedback);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async getFeedback(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const orgId = getOrgId(req);
      const whereOrg = orgId ? { organizationId: orgId } : {};

      const feedback = await prisma.feedback360.findMany({
        where: {
          ...whereOrg,
          OR: [
            { receiverId: user.id },
            { providerId: user.id },
          ],
        },
        include: {
          provider: { select: { fullName: true, avatarUrl: true } },
          receiver: { select: { fullName: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.json(feedback);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}
