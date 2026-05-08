import prisma from '../prisma/client';
import { Request, Response } from 'express';
import { getOrgId } from '../controllers/enterprise.controller';

/**
 * PART 4 — DATA CONSISTENCY
 * Migrates all departments with default/null organizationId to the current user's organization.
 */
export const migrateDepartmentsToTenant = async (req: Request, res: Response) => {
  try {
    const targetOrgId = getOrgId(req);
    if (!targetOrgId || targetOrgId === 'mcb-ghana-tenant') {
       return res.status(400).json({ error: 'Cannot migrate to default or undefined tenant' });
    }

    // Update Departments
    const deptUpdate = await prisma.department.updateMany({
      where: {
        OR: [
          { organizationId: null },
          { organizationId: 'mcb-ghana-tenant' }
        ]
      },
      data: { organizationId: targetOrgId }
    });

    // Update KPI Sheets related to these departments if necessary
    // (Assuming DepartmentKPI also needs matching organizationId)
    const kpiUpdate = await prisma.departmentKPI.updateMany({
      where: {
        organizationId: 'mcb-ghana-tenant'
      },
      data: { organizationId: targetOrgId }
    });

    return res.json({
      message: 'Migration successful',
      departmentsMigrated: deptUpdate.count,
      kpisMigrated: kpiUpdate.count
    });
  } catch (error: any) {
    console.error('[Migration] Failed:', error.message);
    return res.status(500).json({ error: 'Migration failed: ' + error.message });
  }
};
