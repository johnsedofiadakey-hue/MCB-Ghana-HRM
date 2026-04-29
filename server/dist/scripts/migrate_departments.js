"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateDepartmentsToTenant = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const enterprise_controller_1 = require("../controllers/enterprise.controller");
/**
 * PART 4 — DATA CONSISTENCY
 * Migrates all departments with default/null organizationId to the current user's organization.
 */
const migrateDepartmentsToTenant = async (req, res) => {
    try {
        const targetOrgId = (0, enterprise_controller_1.getOrgId)(req);
        if (!targetOrgId || targetOrgId === 'mcb-ghana-tenant') {
            return res.status(400).json({ error: 'Cannot migrate to default or undefined tenant' });
        }
        // Update Departments
        const deptUpdate = await client_1.default.department.updateMany({
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
        const kpiUpdate = await client_1.default.departmentKPI.updateMany({
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
    }
    catch (error) {
        console.error('[Migration] Failed:', error.message);
        return res.status(500).json({ error: 'Migration failed: ' + error.message });
    }
};
exports.migrateDepartmentsToTenant = migrateDepartmentsToTenant;
