import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { getOrgId } from './enterprise.controller';

export const clockIn = async (req: Request, res: Response) => {
    try {
        const orgId = getOrgId(req);
        const organizationId = orgId || 'mcb-ghana-tenant';
        const user = (req as any).user;
        const employeeId = user.id;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const existingLog = await prisma.attendanceLog.findFirst({
            where: {
                employeeId,
                date: today,
                organizationId
            }
        });

        if (existingLog) return res.status(400).json({ error: 'Already clocked in for today.' });

        const log = await prisma.attendanceLog.create({
            data: {
                organizationId,
                employeeId,
                date: today,
                clockIn: new Date(),
                status: 'PRESENT'
            }
        });
        res.status(201).json(log);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};

export const clockOut = async (req: Request, res: Response) => {
    try {
        const orgId = getOrgId(req);
        const organizationId = orgId || 'mcb-ghana-tenant';
        const user = (req as any).user;
        const employeeId = user.id;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const log = await prisma.attendanceLog.findFirst({
            where: {
                employeeId,
                date: today,
                organizationId
            }
        });

        if (!log) return res.status(404).json({ error: 'No active clock-in found for today.' });
        if (log.clockOut) return res.status(400).json({ error: 'Already clocked out today.' });

        const updatedLog = await prisma.attendanceLog.update({
            where: { id: log.id },
            data: { clockOut: new Date() }
        });
        res.json(updatedLog);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};

export const getMyAttendance = async (req: Request, res: Response) => {
    try {
        const orgId = getOrgId(req);
        const whereOrg = orgId ? { organizationId: orgId } : {};
        const user = (req as any).user;
        const employeeId = user.id;
        const logs = await prisma.attendanceLog.findMany({
            where: {
                employeeId,
                ...whereOrg
            },
            orderBy: { date: 'desc' },
            take: 30
        });
        res.json(logs);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getAllAttendance = async (req: Request, res: Response) => {
    try {
        const orgId = getOrgId(req);
        const whereOrg = orgId ? { organizationId: orgId } : {};
        const logs = await prisma.attendanceLog.findMany({
            where: whereOrg,
            include: { employee: { select: { fullName: true, departmentObj: true } } },
            orderBy: { date: 'desc' },
            take: 100
        });
        res.json(logs);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
export const nodeScan = async (req: Request, res: Response) => {
    try {
        const apiKey = req.headers['authorization'];
        if (!apiKey) return res.status(401).json({ error: 'Missing Hardware Node Key' });

        const org = await prisma.organization.findFirst({
            where: { attendanceApiKey: apiKey, attendanceScanningEnabled: true }
        });
        if (!org) return res.status(401).json({ error: 'Invalid or disabled Hardware Node Key' });

        const { employeeCode } = req.body;
        if (!employeeCode) return res.status(400).json({ error: 'Missing Employee Code' });

        const employee = await prisma.user.findFirst({
            where: { employeeCode, organizationId: org.id }
        });
        if (!employee) return res.status(404).json({ error: 'Employee not found' });

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const log = await prisma.attendanceLog.findFirst({
            where: { employeeId: employee.id, date: today, organizationId: org.id }
        });

        const now = new Date();
        let result;

        if (!log) {
            result = await prisma.attendanceLog.create({
                data: {
                    organizationId: org.id,
                    employeeId: employee.id,
                    date: today,
                    clockIn: now,
                    source: 'HARDWARE_NODE',
                    status: 'PRESENT'
                }
            });
        } else if (!log.clockOut) {
            result = await prisma.attendanceLog.update({
                where: { id: log.id },
                data: { clockOut: now }
            });
        } else {
            return res.status(400).json({ error: 'Already clocked out.' });
        }

        res.json({ 
            success: true, 
            employee: employee.fullName, 
            time: now, 
            type: !log ? 'CLOCK_IN' : 'CLOCK_OUT' 
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
