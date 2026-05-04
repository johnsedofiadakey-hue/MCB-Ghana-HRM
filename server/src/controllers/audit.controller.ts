import { Request, Response } from 'express';
import { getAuditLogs } from '../services/audit.service';
import prisma from '../prisma/client';

export const getLogs = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const organizationId = user?.organizationId || 'mcb-ghana-tenant';
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const entity = req.query.entity as string | undefined;
        const userId = req.query.userId as string | undefined;

        const data = await getAuditLogs(organizationId, page, limit, { entity, userId });
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const exportLogsCSV = async (req: Request, res: Response) => {
    try {
        const userReq = (req as any).user;
        const organizationId = userReq?.organizationId || 'mcb-ghana-tenant';

        // Fetch last 5000 audit logs
        const logs = await prisma.systemLog.findMany({
            where: { organizationId },
            orderBy: { createdAt: 'desc' },
            take: 5000
        });

        const csvHeaders = ['Timestamp', 'Type/Action', 'Source', 'Operator ID', 'IP Address', 'Details'];
        
        const rows = logs.map(l => [
            new Date(l.createdAt).toISOString(),
            l.type || l.action || 'SYSTEM',
            l.source || 'N/A',
            l.operatorId || 'SYSTEM',
            l.ipAddress || '0.0.0.0',
            // Escape quotes and commas
            `"${(l.details || l.message || '').replace(/"/g, '""')}"`
        ]);

        const csvContent = [csvHeaders.join(','), ...rows.map(r => r.join(','))].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="audit_trail_${new Date().toISOString().split('T')[0]}.csv"`);
        res.status(200).send(csvContent);
    } catch (error: any) {
        console.error('Audit CSV Export failed:', error);
        res.status(500).json({ message: error.message });
    }
};
