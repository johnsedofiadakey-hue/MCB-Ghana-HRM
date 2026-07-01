import { Request, Response } from 'express';
import prisma from '../prisma/client';

const getOrgId = (req: Request) => (req as any).user?.organizationId;
const getActorId = (req: Request) => (req as any).user?.id;

export const listDeductionTemplates = async (req: Request, res: Response) => {
  try {
    const organizationId = getOrgId(req) || 'mcb-ghana-tenant';
    const { employeeId, scope } = req.query;
    const templates = await (prisma as any).payrollDeductionTemplate.findMany({
      where: {
        organizationId,
        ...(scope ? { scope: String(scope) } : {}),
        ...(employeeId ? { OR: [{ scope: 'GLOBAL' }, { employeeId: String(employeeId) }] } : {}),
      },
      include: {
        employee: { select: { id: true, fullName: true, employeeCode: true } },
        createdBy: { select: { id: true, fullName: true } },
      },
      orderBy: [{ scope: 'asc' }, { name: 'asc' }],
    });
    res.json(templates);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const createDeductionTemplate = async (req: Request, res: Response) => {
  try {
    const organizationId = getOrgId(req) || 'mcb-ghana-tenant';
    const createdById = getActorId(req);
    const { name, type, scope, employeeId, basis, amount, taxTreatment, notes } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0)
      return res.status(400).json({ error: 'Amount must be a positive number' });

    const template = await (prisma as any).payrollDeductionTemplate.create({
      data: {
        organizationId,
        name: name.trim(),
        type: type || 'DEDUCTION',
        scope: scope || 'GLOBAL',
        employeeId: scope === 'EMPLOYEE' ? (employeeId || null) : null,
        basis: basis || 'FIXED',
        amount: Number(amount),
        taxTreatment: taxTreatment || 'POST_TAX',
        notes: notes?.trim() || null,
        createdById,
      },
      include: {
        employee: { select: { id: true, fullName: true, employeeCode: true } },
        createdBy: { select: { id: true, fullName: true } },
      },
    });
    res.status(201).json(template);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const updateDeductionTemplate = async (req: Request, res: Response) => {
  try {
    const organizationId = getOrgId(req) || 'mcb-ghana-tenant';
    const { id } = req.params;
    const existing = await (prisma as any).payrollDeductionTemplate.findFirst({ where: { id, organizationId } });
    if (!existing) return res.status(404).json({ error: 'Deduction rule not found' });

    const { name, type, scope, employeeId, basis, amount, taxTreatment, isActive, notes } = req.body;
    const template = await (prisma as any).payrollDeductionTemplate.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(type !== undefined ? { type } : {}),
        ...(scope !== undefined ? { scope } : {}),
        ...(employeeId !== undefined ? { employeeId: scope === 'EMPLOYEE' ? employeeId : null } : {}),
        ...(basis !== undefined ? { basis } : {}),
        ...(amount !== undefined ? { amount: Number(amount) } : {}),
        ...(taxTreatment !== undefined ? { taxTreatment } : {}),
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
        ...(notes !== undefined ? { notes: notes?.trim() || null } : {}),
      },
      include: {
        employee: { select: { id: true, fullName: true, employeeCode: true } },
        createdBy: { select: { id: true, fullName: true } },
      },
    });
    res.json(template);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const deleteDeductionTemplate = async (req: Request, res: Response) => {
  try {
    const organizationId = getOrgId(req) || 'mcb-ghana-tenant';
    const { id } = req.params;
    const existing = await (prisma as any).payrollDeductionTemplate.findFirst({ where: { id, organizationId } });
    if (!existing) return res.status(404).json({ error: 'Deduction rule not found' });
    await (prisma as any).payrollDeductionTemplate.delete({ where: { id } });
    res.json({ message: 'Deduction rule deleted' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};
