import { Request, Response } from 'express';
import prisma from '../prisma/client';

export const getActivityLogs = async (req: Request, res: Response) => {
  try {
    const limit = Number(req.query.limit) || 10;
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 50),
      include: { user: { select: { fullName: true, email: true } } }
    });

    const payload = logs.map((log) => ({
      id: log.id,
      user: log.user?.fullName || log.user?.email || 'System',
      action: log.action || 'Updated',
      target: log.entity || 'System',
      time: log.createdAt.toLocaleString('en-US', { month: 'short', day: 'numeric' })
    }));

    res.json(payload);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
