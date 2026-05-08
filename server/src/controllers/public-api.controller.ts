import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { 
    mapEmployee, mapPayroll, mapAttendance, mapTarget, mapAppraisal 
} from '../utils/data-mapper';

const getOrgId = (req: Request) => (req as any).user?.organizationId;

export const getEmployees = async (req: Request, res: Response) => {
    try {
        const orgId = getOrgId(req);
        const users = await prisma.user.findMany({
            where: { organizationId: orgId, isArchived: false },
            include: { departmentObj: true, subUnit: true, supervisor: true }
        });
        return res.json(users.map(mapEmployee));
    } catch (e: any) {
        return res.status(500).json({ error: e.message });
    }
};

export const getAttendance = async (req: Request, res: Response) => {
    try {
        const orgId = getOrgId(req);
        const startDate = req.query.start ? new Date(req.query.start as string) : new Date(Date.now() - 7 * 86400000); // Default to past 7 days

        const logs = await prisma.attendanceLog.findMany({
            where: { 
                organizationId: orgId,
                date: { gte: startDate }
            },
            include: { employee: true },
            orderBy: { date: 'desc' },
            take: 1000 // Limit for API performance
        });
        return res.json(logs.map(mapAttendance));
    } catch (e: any) {
        return res.status(500).json({ error: e.message });
    }
};

export const getPayroll = async (req: Request, res: Response) => {
    try {
        const orgId = getOrgId(req);
        
        // This is a simplified payroll query just for demonstration
        // A production env would handle specific runs or employee queries
        const items = await prisma.payrollItem.findMany({
            where: { organizationId: orgId },
            include: { employee: { include: { departmentObj: true } }, run: true },
            orderBy: { createdAt: 'desc' },
            take: 100
        });

        // Quick mapper for payroll items since data-mapper expects `payroll` structure
        const mapped = items.map(item => ({
            id: item.id,
            employeeName: item.employee?.fullName,
            month: item.run?.month,
            year: item.run?.year,
            netPay: item.netPay
       }));

        return res.json(mapped);
    } catch (e: any) {
        return res.status(500).json({ error: e.message });
    }
};

export const getAppraisals = async (req: Request, res: Response) => {
    try {
        const orgId = getOrgId(req);
        const appraisals = await prisma.appraisalPacket.findMany({
            where: { organizationId: orgId },
            include: { employee: { include: { departmentObj: true }}, cycle: true },
            orderBy: { createdAt: 'desc' },
            take: 100
        });
        return res.json(appraisals.map(mapAppraisal));
    } catch (e: any) {
        return res.status(500).json({ error: e.message });
    }
};

export const getTargets = async (req: Request, res: Response) => {
    try {
        const orgId = getOrgId(req);
        const targets = await prisma.target.findMany({
            where: { organizationId: orgId, isArchived: false },
            include: { assignee: true, department: true },
            orderBy: { createdAt: 'desc' },
            take: 100
        });
        return res.json(targets.map(mapTarget));
    } catch (e: any) {
        return res.status(500).json({ error: e.message });
    }
};
