import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { getOrgId } from './enterprise.controller';
import { getRoleRank } from '../middleware/auth.middleware';

export const getDepartments = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const whereOrg = orgId ? { organizationId: orgId } : {};

    const userRank = getRoleRank((req as any).user.role);
    const userDeptId = (req as any).user.departmentId;

    let departments = await prisma.department.findMany({
      where: {
        ...whereOrg,
        ...(userRank < 75 ? { id: userDeptId } : {})
      },
      include: {
        manager: {
          select: { fullName: true, avatarUrl: true, jobTitle: true }
        },
        employees: {
          select: { id: true }
        },
        subUnits: {
          select: { id: true, name: true, manager: { select: { fullName: true } } }
        }
      },
      orderBy: { name: 'asc' }
    });

    const employeeIds = departments.flatMap((dept) => dept.employees.map((emp) => emp.id));
    const sheets = await prisma.kpiSheet.findMany({
      where: {
        ...whereOrg,
        employeeId: { in: employeeIds },
        totalScore: { not: null }
      },
      orderBy: { createdAt: 'desc' },
      select: { employeeId: true, totalScore: true }
    });

    const latestScores = new Map<string, number>();
    for (const sheet of sheets) {
      if (!sheet.employeeId || latestScores.has(sheet.employeeId)) continue;
      latestScores.set(sheet.employeeId, Number(sheet.totalScore) ?? 0);
    }

    const payload = departments.map((dept) => {
      const scores = dept.employees
        .map((emp) => latestScores.get(emp.id))
        .filter((score): score is number => typeof score === 'number');
      const avgScore = scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;

      return {
        id: dept.id,
        name: dept.name,
        managerId: dept.managerId,
        manager: dept.manager ? { 
          fullName: dept.manager.fullName, 
          avatarUrl: (dept.manager as any).avatarUrl,
          jobTitle: (dept.manager as any).jobTitle
        } : null,
        memberCount: dept.employees.length,
        subUnits: (dept as any).subUnits || [],
        score: Math.round(avgScore)
      };
    });

    res.json(payload);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createDepartment = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const organizationId = orgId || 'mcb-ghana-tenant';
    const { name, managerId } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Department name is required' });
    if (managerId) {
      const manager = await prisma.user.findFirst({ where: { id: managerId, organizationId }, select: { id: true } });
      if (!manager) return res.status(404).json({ error: 'Manager not found in this organization' });
    }
    const existing = await prisma.department.findFirst({ where: { name: name.trim(), organizationId } });
    if (existing) return res.status(409).json({ error: 'Department already exists' });
    const dept = await prisma.department.create({ data: { name: name.trim(), organizationId, ...(managerId ? { managerId } : {}) } });
    res.status(201).json({ id: dept.id, name: dept.name, score: 0 });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const updateDepartment = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const whereOrg = orgId ? { organizationId: orgId } : {};
    const { name, managerId } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Department name is required' });
    if (managerId) {
      const manager = await prisma.user.findFirst({ where: { id: managerId, ...whereOrg }, select: { id: true } });
      if (!manager) return res.status(404).json({ error: 'Manager not found in this organization' });
    }
    const dept = await prisma.department.update({
      where: { id: Number(req.params.id), ...whereOrg },
      data: { name: name.trim(), ...(managerId !== undefined ? { managerId: managerId || null } : {}) }
    });
    res.json({ id: dept.id, name: dept.name, score: 0 });
  } catch (err: any) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Department not found' });
    res.status(500).json({ error: err.message });
  }
};

export const deleteDepartment = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const deptId = Number(req.params.id);
    const whereOrg = orgId ? { organizationId: orgId } : {};

    await prisma.$transaction(async (tx) => {
      // 1. Manually purge DepartmentKPIs first (as they have the most dependencies)
      // This will cascade TeamTargets automatically at the DB level
      await (tx as any).departmentKPI.deleteMany({
        where: { departmentId: deptId, ...whereOrg }
      });

      // 2. Clear targetDepartmentId in KpiSheet (Soft link/Reference)
      await (tx as any).kpiSheet.updateMany({
        where: { targetDepartmentId: deptId, ...whereOrg },
        data: { targetDepartmentId: null }
      });

      // 3. Delete Sub-Units explicitly (to ensure clean cascade)
      await (tx as any).subUnit.deleteMany({
        where: { departmentId: deptId, ...whereOrg }
      });

      // 4. Finally, delete the department
      await tx.department.deleteMany({
        where: { id: deptId, ...whereOrg }
      });
    });

    res.json({ success: true });
  } catch (err: any) {
    console.error('[Department] Delete error:', err);
    if (err.code === 'P2025') return res.status(404).json({ error: 'Department not found' });
    res.status(500).json({ error: err.message || 'Deletion failed due to existing relationships.' });
  }
};
