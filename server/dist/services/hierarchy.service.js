"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HierarchyService = void 0;
const client_1 = __importDefault(require("../prisma/client"));
class HierarchyService {
    /**
     * Returns a unique list of employee IDs who report to the given userId.
     * This includes:
     * 1. Direct reports (via supervisorId field)
     * 2. Matrix/Reporting Lines (via EmployeeReporting table)
     * 3. ALL employees in any Department where the user is the Manager (HOD)
     */
    static async getManagedEmployeeIds(userId, organizationId) {
        // 1. Fetch departments where this user is the Manager
        const managedDepts = await client_1.default.department.findMany({
            where: { organizationId, managerId: userId },
            select: { id: true }
        });
        const deptIds = managedDepts.map(d => d.id);
        // 2. Fetch people in those departments
        const deptMembers = await client_1.default.user.findMany({
            where: { organizationId, departmentId: { in: deptIds } },
            select: { id: true }
        });
        // 3. Fetch direct reports (supervisorId)
        const directReports = await client_1.default.user.findMany({
            where: { organizationId, supervisorId: userId },
            select: { id: true }
        });
        // 4. Fetch matrix reports (EmployeeReporting)
        const matrixReports = await client_1.default.employeeReporting.findMany({
            where: { organizationId, managerId: userId, effectiveTo: null },
            select: { employeeId: true }
        });
        // Combine and deduplicate
        const allIds = new Set([
            ...deptMembers.map(u => u.id),
            ...directReports.map(u => u.id),
            ...matrixReports.map((r) => r.employeeId)
        ]);
        // Ensure user doesn't report to themselves (sanity check)
        allIds.delete(userId);
        return Array.from(allIds);
    }
    /**
     * Helper to check if a specific employee reports to a specific manager
     */
    static async isSubordinate(managerId, employeeId, organizationId) {
        const ids = await this.getManagedEmployeeIds(managerId, organizationId);
        return ids.includes(employeeId);
    }
    /**
     * Prevents circular reporting logic.
     * Returns true if assigning potentialSupervisor as supervisor of employeeId would create a loop.
     */
    static async detectCycle(employeeId, potentialSupervisorId) {
        if (!potentialSupervisorId || employeeId === potentialSupervisorId)
            return employeeId === potentialSupervisorId;
        let currentId = potentialSupervisorId;
        const visited = new Set();
        while (currentId) {
            if (currentId === employeeId)
                return true;
            if (visited.has(currentId))
                break; // Prevent infinite loop on existing corrupt data
            visited.add(currentId);
            const user = await client_1.default.user.findUnique({
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
    static async syncPrimaryReporting(organizationId, employeeId, managerId) {
        // 1. Update User model
        await client_1.default.user.update({
            where: { id: employeeId },
            data: { supervisorId: managerId }
        });
        // 2. Manage EmployeeReporting table (DIRECT type)
        // Cleanup any existing primary direct lines for this employee
        await client_1.default.employeeReporting.deleteMany({
            where: { organizationId, employeeId, type: 'DIRECT' }
        });
        if (managerId) {
            await client_1.default.employeeReporting.create({
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
exports.HierarchyService = HierarchyService;
