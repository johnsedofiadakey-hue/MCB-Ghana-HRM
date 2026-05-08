import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { getRoleRank } from '../middleware/auth.middleware';
import { HierarchyService } from '../services/hierarchy.service';

const getOrgId = (req: Request): string => (req as any).user?.organizationId || 'mcb-ghana-tenant';
const getUser = (req: Request) => (req as any).user;

// GET /reporting/employee/:employeeId — all reporting lines for an employee
export const getEmployeeReportingLines = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const { employeeId } = req.params;
    const me = getUser(req);
    const myRank = getRoleRank(me.role);

    // Access check: self, own managers, or rank 60+
    if (me.id !== employeeId && myRank < 60) {
      return res.status(403).json({ error: 'Not authorised' });
    }

    const lines = await (prisma as any).employeeReporting.findMany({
      where: { organizationId: orgId, employeeId, effectiveTo: null },
      include: {
        manager: { select: { id: true, fullName: true, jobTitle: true, role: true, avatarUrl: true } },
      },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });

    res.json(lines);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// GET /reporting/my-reports — employees who report to me
export const getMyDirectReports = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const userId = getUser(req).id;
    const ids = await HierarchyService.getManagedEmployeeIds(userId, orgId);

    const lines = await prisma.user.findMany({
      where: { organizationId: orgId, id: { in: ids }, isArchived: false },
      select: { 
        id: true, fullName: true, jobTitle: true, role: true, avatarUrl: true,
        departmentObj: { select: { name: true } },
      },
      orderBy: { fullName: 'asc' },
    });

    // Format to match expected output (array of objects with 'employee' property)
    res.json(lines.map(emp => ({ employee: emp, type: 'DIRECT', isPrimary: true })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// POST /reporting — add a reporting line
export const addReportingLine = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const { employeeId, managerId, type = 'DIRECT', isPrimary = false } = req.body;

    if (!employeeId || !managerId) {
      return res.status(400).json({ error: 'employeeId and managerId are required' });
    }

    // Prevent self-reporting
    if (employeeId === managerId) {
      return res.status(400).json({ error: 'An employee cannot report to themselves' });
    }

    // Validate both users exist in this org
    const [employee, manager] = await Promise.all([
      prisma.user.findFirst({ where: { id: employeeId, organizationId: orgId } }),
      prisma.user.findFirst({ where: { id: managerId, organizationId: orgId } }),
    ]);

    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    if (!manager) return res.status(404).json({ error: 'Manager not found' });

    // Manager must have higher rank than employee (or equal for peer relationships)
    const empRank = getRoleRank(employee.role);
    const mgrRank = getRoleRank(manager.role);
    if (mgrRank < empRank && type === 'DIRECT') {
      return res.status(400).json({ error: `Manager rank (${manager.role}) must be >= employee rank (${employee.role}) for DIRECT reporting lines` });
    }

    // If setting as primary, unset any existing primary
    if (isPrimary) {
      await (prisma as any).employeeReporting.updateMany({
        where: { organizationId: orgId, employeeId, isPrimary: true, effectiveTo: null },
        data: { isPrimary: false },
      });
    }

    const line = await (prisma as any).employeeReporting.upsert({
      where: { employeeId_managerId_type: { employeeId, managerId, type } },
      update: { isPrimary, effectiveTo: null, effectiveFrom: new Date() },
      create: { organizationId: orgId, employeeId, managerId, type, isPrimary, effectiveFrom: new Date() },
      include: {
        manager: { select: { id: true, fullName: true, jobTitle: true } },
      },
    });

    // Also update the simple supervisorId on User if this is a primary direct line
    if (isPrimary && type === 'DIRECT') {
      await prisma.user.update({ where: { id: employeeId }, data: { supervisorId: managerId } });
    }

    res.status(201).json(line);
  } catch (err: any) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'This reporting line already exists' });
    res.status(500).json({ error: err.message });
  }
};

// PATCH /reporting/:id
export const updateReportingLine = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const { id } = req.params;
    const { type, isPrimary, effectiveTo } = req.body;

    const line = await (prisma as any).employeeReporting.findUnique({ where: { id } });
    if (!line || line.organizationId !== orgId) return res.status(404).json({ error: 'Reporting line not found' });

    if (isPrimary) {
      await (prisma as any).employeeReporting.updateMany({
        where: { organizationId: orgId, employeeId: line.employeeId, isPrimary: true, effectiveTo: null, id: { not: id } },
        data: { isPrimary: false },
      });
    }

    const updated = await (prisma as any).employeeReporting.update({
      where: { id },
      data: {
        ...(type !== undefined && { type }),
        ...(isPrimary !== undefined && { isPrimary }),
        ...(effectiveTo !== undefined && { effectiveTo: effectiveTo ? new Date(effectiveTo) : null }),
      },
      include: { manager: { select: { id: true, fullName: true, jobTitle: true } } },
    });

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /reporting/:id (soft-delete by setting effectiveTo = now)
export const removeReportingLine = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const { id } = req.params;

    const line = await (prisma as any).employeeReporting.findUnique({ where: { id } });
    if (!line || line.organizationId !== orgId) return res.status(404).json({ error: 'Reporting line not found' });

    const updated = await (prisma as any).employeeReporting.update({
      where: { id },
      data: { effectiveTo: new Date() },
    });

    res.json({ success: true, line: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
