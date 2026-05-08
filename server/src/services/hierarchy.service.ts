import prisma from '../prisma/client';

export class HierarchyService {
  /**
   * Returns a unique list of employee IDs who report to the given userId.
   * This includes:
   * 1. Direct reports (via supervisorId field)
   * 2. Matrix/Reporting Lines (via EmployeeReporting table)
   * 3. ALL employees in any Department where the user is the Manager (HOD)
   */
  static async getManagedEmployeeIds(userId: string, organizationId: string): Promise<string[]> {
    // 1. Fetch departments where this user is the Manager
    const managedDepts = await prisma.department.findMany({
      where: { organizationId, managerId: userId },
      select: { id: true }
    });
    const deptIds = managedDepts.map(d => d.id);

    // 2. Fetch people in those departments
    const deptMembers = await prisma.user.findMany({
      where: { organizationId, departmentId: { in: deptIds } },
      select: { id: true }
    });

    // 3. Fetch direct reports (supervisorId)
    const directReports = await prisma.user.findMany({
      where: { organizationId, supervisorId: userId },
      select: { id: true }
    });

    // 4. Fetch matrix reports (EmployeeReporting)
    const matrixReports = await (prisma as any).employeeReporting.findMany({
      where: { organizationId, managerId: userId, effectiveTo: null },
      select: { employeeId: true }
    });

    // Combine and deduplicate
    const allIds = new Set<string>([
      ...deptMembers.map(u => u.id),
      ...directReports.map(u => u.id),
      ...matrixReports.map((r: any) => r.employeeId)
    ]);

    // Ensure user doesn't report to themselves (sanity check)
    allIds.delete(userId);

    return Array.from(allIds);
  }

  /**
   * Helper to check if a specific employee reports to a specific manager
   */
  static async isSubordinate(managerId: string, employeeId: string, organizationId: string): Promise<boolean> {
    const ids = await this.getManagedEmployeeIds(managerId, organizationId);
    return ids.includes(employeeId);
  }

  /**
   * Prevents circular reporting logic.
   * Returns true if assigning potentialSupervisor as supervisor of employeeId would create a loop.
   */
  static async detectCycle(employeeId: string, potentialSupervisorId: string): Promise<boolean> {
    if (!potentialSupervisorId || employeeId === potentialSupervisorId) return employeeId === potentialSupervisorId;

    let currentId: string | null = potentialSupervisorId;
    const visited = new Set<string>();

    while (currentId) {
      if (currentId === employeeId) return true;
      if (visited.has(currentId)) break; // Prevent infinite loop on existing corrupt data
      visited.add(currentId);

      const user = await prisma.user.findUnique({
        where: { id: currentId },
        select: { supervisorId: true }
      });
      
      currentId = user?.supervisorId || null;
    }

    return false;
  }

  /**
   * Ensures User.supervisorId and EmployeeReporting table are synchronized for SOLID lines.
   */
  static async syncPrimaryReporting(organizationId: string, employeeId: string, managerId: string | null) {
      // 1. Update User model
      await prisma.user.update({
          where: { id: employeeId },
          data: { supervisorId: managerId }
      });

      // 2. Manage EmployeeReporting table (DIRECT type)
      // Cleanup any existing primary direct lines for this employee
      await (prisma as any).employeeReporting.deleteMany({
          where: { organizationId, employeeId, type: 'DIRECT' }
      });

      if (managerId) {
          await (prisma as any).employeeReporting.create({
              data: {
                  organizationId,
                  employeeId,
                  managerId,
                  type: 'DIRECT',
                  isPrimary: true
              }
          });
      }
  }
}
