import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { getOrgId } from './enterprise.controller';

export const getSubUnits = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const { departmentId } = req.query;
    
    const whereClause: any = {
      organizationId: orgId || 'mcb-ghana-tenant'
    };
    
    if (departmentId) {
      whereClause.departmentId = Number(departmentId);
    }

    const subUnits = await prisma.subUnit.findMany({
      where: whereClause,
      include: {
        manager: {
          select: { fullName: true }
        },
        employees: {
          select: { id: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    const payload = subUnits.map((su) => ({
      id: su.id,
      name: su.name,
      departmentId: su.departmentId,
      managerId: su.managerId,
      manager: su.manager ? { fullName: su.manager.fullName } : null,
      memberCount: su.employees.length
    }));

    res.json(payload);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createSubUnit = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const organizationId = orgId || 'mcb-ghana-tenant';
    const { name, departmentId, managerId } = req.body;
    
    if (!name?.trim()) return res.status(400).json({ error: 'Sub-unit name is required' });
    if (!departmentId) return res.status(400).json({ error: 'Department ID is required' });

    const deptId = Number(departmentId);
    if (isNaN(deptId)) {
      return res.status(400).json({ error: 'Invalid Department ID format' });
    }
    const [department, manager] = await Promise.all([
      prisma.department.findFirst({ where: { id: deptId, organizationId }, select: { id: true } }),
      managerId ? prisma.user.findFirst({ where: { id: managerId, organizationId }, select: { id: true } }) : Promise.resolve(null),
    ]);
    if (!department) return res.status(404).json({ error: 'Department not found in this organization' });
    if (managerId && !manager) return res.status(404).json({ error: 'Manager not found in this organization' });

    console.log(`[SubUnit] Creating unit "${name}" for Department ${deptId} in Org ${organizationId}`);

    const subUnit = await prisma.subUnit.create({
      data: {
        name: name.trim(),
        departmentId: deptId,
        organizationId,
        ...(managerId ? { managerId } : {})
      }
    });
    
    res.status(201).json(subUnit);
  } catch (err: any) {
    console.error('[SubUnit] Creation error:', err);
    res.status(500).json({ error: err.message || 'Failed to create sub-unit' });
  }
};

export const updateSubUnit = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const organizationId = orgId || 'mcb-ghana-tenant';
    const { name, managerId } = req.body;
    if (managerId) {
      const manager = await prisma.user.findFirst({ where: { id: managerId, organizationId }, select: { id: true } });
      if (!manager) return res.status(404).json({ error: 'Manager not found in this organization' });
    }
    
    const subUnit = await prisma.subUnit.update({
      where: { 
        id: req.params.id,
        organizationId
      },
      data: {
        ...(name?.trim() ? { name: name.trim() } : {}),
        ...(managerId !== undefined ? { managerId: managerId || null } : {})
      }
    });
    
    res.json(subUnit);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// ─── DELETE SUB-UNIT ──────────────────────────────────────────────────────────
export const deleteSubUnit = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const subUnitId = req.params.id;

    // Prisma relation (onDelete: SetNull) will handle the employees automatically.
    // We use deleteMany to stay consistent with multi-tenancy safe deletions.
    await prisma.subUnit.deleteMany({
      where: { 
        id: subUnitId,
        organizationId: orgId || 'mcb-ghana-tenant'
      }
    });
    
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
