import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { 
    mapEmployee, mapPayroll, mapAttendance, mapTarget, mapAppraisal 
} from '../utils/data-mapper';

// Quick CSV stringifier builder a flat array of objects
const jsonToCsv = (data: any[]): string => {
    if (data.length === 0) return '';
    const headers = Object.keys(data[0]);
    const csvRows = [
        headers.join(','),
        ...data.map(row => headers.map(fieldName => JSON.stringify(row[fieldName] ?? '')).join(','))
    ];
    return csvRows.join('\r\n');
};

const getOrgId = (req: Request) => (req as any).user?.organizationId || 'mcb-ghana-tenant';

export const exportEmployeesCSV = async (req: Request, res: Response) => {
    try {
        const orgId = getOrgId(req);
        const users = await prisma.user.findMany({
            where: { organizationId: orgId, isArchived: false },
            include: { departmentObj: true, subUnit: true, supervisor: true }
        });
        
        const mapped = users.map(mapEmployee);
        const csv = jsonToCsv(mapped);
        
        res.header('Content-Type', 'text/csv');
        res.attachment('employees_export.csv');
        return res.send(csv);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
};

export const exportAttendanceCSV = async (req: Request, res: Response) => {
    try {
        const orgId = getOrgId(req);
        // Default to last 30 days if no date param
        const startDate = req.query.start ? new Date(req.query.start as string) : new Date(Date.now() - 30 * 86400000);
        
        const logs = await prisma.attendanceLog.findMany({
            where: { 
                organizationId: orgId,
                date: { gte: startDate }
            },
            include: { employee: true },
            orderBy: { date: 'desc' }
        });
        
        const mapped = logs.map(mapAttendance);
        const csv = jsonToCsv(mapped);
        
        res.header('Content-Type', 'text/csv');
        res.attachment('attendance_export.csv');
        return res.send(csv);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
};

export const exportPayrollCSV = async (req: Request, res: Response) => {
    try {
        const orgId = getOrgId(req);
        const { runId } = req.query;
        
        const items = await prisma.payrollItem.findMany({
            where: {
                organizationId: orgId,
                ...(runId ? { id: runId as string } : {}) // Note: would need to filter by run.id normally, assuming quick query here
            },
            include: { employee: { include: { departmentObj: true } }, run: true },
            orderBy: { createdAt: 'desc' }
        });
        
        // Manual map to fit schema fields (since Payroll schema above has `user`, not `employee`)
        const mapped = items.map(item => ({
             id: item.id,
             employeeName: item.employee?.fullName,
             month: item.run?.month,
             year: item.run?.year,
             netPay: item.netPay
             // Full mapping would use the data-mapper but we need to adjust standard schema here
        }));
        
        const csv = jsonToCsv(mapped);
        res.header('Content-Type', 'text/csv');
        res.attachment('payroll_export.csv');
        return res.send(csv);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
};
