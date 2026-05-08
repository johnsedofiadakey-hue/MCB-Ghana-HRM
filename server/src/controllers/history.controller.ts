import { Request, Response } from 'express';
import * as historyService from '../services/history.service';
import { logAction } from '../services/audit.service';

export const createRecord = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const organizationId = user.organizationId || 'mcb-ghana-tenant';
        const record = await historyService.createHistory({ 
            ...req.body, 
            loggedById: user.id,
            organizationId 
        });

        await logAction(user.id, 'CREATE_HISTORY', 'EmployeeHistory', record.id, { type: record.type, employeeId: record.employeeId }, req.ip);

        res.status(201).json(record);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const getEmployeeRecords = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const organizationId = user.organizationId || 'mcb-ghana-tenant';
        const records = await historyService.getHistoryByEmployee(organizationId, req.params.employeeId);

        const userRole = user?.role;

        if (userRole === 'STAFF' || userRole === 'CASUAL') {
            const visibleToEmployee = ['COMMENDATION', 'GENERAL_NOTE'];
            const filtered = records.filter(r => r.type && visibleToEmployee.includes(r.type));
            return res.json(filtered);
        }

        res.json(records);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateStatus = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const organizationId = user.organizationId || 'mcb-ghana-tenant';
        const record = await historyService.updateHistoryStatus(organizationId, req.params.id, req.body.status);
        await logAction(user?.id, 'UPDATE_HISTORY_STATUS', 'EmployeeHistory', req.params.id, { status: req.body.status }, req.ip);
        res.json(record);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
