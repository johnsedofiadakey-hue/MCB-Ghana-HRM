import { Request, Response } from 'express';
import * as cycleService from '../services/cycle.service';
import { getOrgId } from './enterprise.controller';

export const createCycle = async (req: Request, res: Response) => {
    try {
        const orgId = getOrgId(req);
        const organizationId = orgId || 'mcb-ghana-tenant';
        const cycle = await cycleService.createCycle(organizationId, req.body);
        res.status(201).json(cycle);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getCycles = async (req: Request, res: Response) => {
    try {
        const orgId = getOrgId(req);
        const organizationId = orgId || 'mcb-ghana-tenant';
        const cycles = await cycleService.getCycles(organizationId, req.query as any);
        res.json(cycles);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateCycleStatus = async (req: Request, res: Response) => {
    try {
        const orgId = getOrgId(req);
        const organizationId = orgId || 'mcb-ghana-tenant';
        const { id } = req.params;
        const cycle = await cycleService.updateCycle(organizationId, id, req.body);
        res.json(cycle);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteCycle = async (req: Request, res: Response) => {
    try {
        const orgId = getOrgId(req);
        const organizationId = orgId || 'mcb-ghana-tenant';
        const { id } = req.params;
        await cycleService.deleteCycle(organizationId, id);
        res.json({ success: true, message: 'Cycle deleted' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
