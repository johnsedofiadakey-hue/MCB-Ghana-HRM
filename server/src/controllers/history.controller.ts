import { Request, Response } from 'express';
import * as historyService from '../services/history.service';
import { logAction } from '../services/audit.service';
import { PolicyService } from '../services/policy.service';
import { Permission } from '../types/permissions';

const EMPLOYEE_VISIBLE_TYPES = ['COMMENDATION', 'GENERAL_NOTE'];
const ALLOWED_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

export const createRecord = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const organizationId = user.organizationId || 'mcb-ghana-tenant';
        if (!req.body.employeeId) return res.status(400).json({ message: 'employeeId is required' });
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
        const targetEmployeeId = req.params.employeeId;

        if (targetEmployeeId !== user.id) {
            const access = await PolicyService.evaluatePolicy(user.id, Permission.EMPLOYEE_HISTORY_READ, {
                targetUserId: targetEmployeeId
            });
            if (!access.allowed) return res.status(403).json({ message: 'You cannot view this employee history' });
        }

        const records = await historyService.getHistoryByEmployee(organizationId, targetEmployeeId);
        if (targetEmployeeId === user.id) {
            return res.json(records.filter(r => r.type && EMPLOYEE_VISIBLE_TYPES.includes(r.type)));
        }

        return res.json(records);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateStatus = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const organizationId = user.organizationId || 'mcb-ghana-tenant';
        const status = String(req.body.status || '').toUpperCase();
        if (!ALLOWED_STATUSES.includes(status)) {
            return res.status(400).json({ message: `status must be one of: ${ALLOWED_STATUSES.join(', ')}` });
        }
        const record = await historyService.updateHistoryStatus(organizationId, req.params.id, status);
        await logAction(user?.id, 'UPDATE_HISTORY_STATUS', 'EmployeeHistory', req.params.id, { status }, req.ip);
        res.json(record);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
