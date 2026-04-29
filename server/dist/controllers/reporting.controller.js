"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeReportingLine = exports.updateReportingLine = exports.addReportingLine = exports.getMyDirectReports = exports.getEmployeeReportingLines = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const hierarchy_service_1 = require("../services/hierarchy.service");
const getOrgId = (req) => req.user?.organizationId || 'mcb-ghana-tenant';
const getUser = (req) => req.user;
// GET /reporting/employee/:employeeId — all reporting lines for an employee
const getEmployeeReportingLines = async (req, res) => {
    try {
        const orgId = getOrgId(req);
        const { employeeId } = req.params;
        const me = getUser(req);
        const myRank = (0, auth_middleware_1.getRoleRank)(me.role);
        // Access check: self, own managers, or rank 60+
        if (me.id !== employeeId && myRank < 60) {
            return res.status(403).json({ error: 'Not authorised' });
        }
        const lines = await client_1.default.employeeReporting.findMany({
            where: { organizationId: orgId, employeeId, effectiveTo: null },
            include: {
                manager: { select: { id: true, fullName: true, jobTitle: true, role: true, avatarUrl: true } },
            },
            orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        });
        res.json(lines);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.getEmployeeReportingLines = getEmployeeReportingLines;
// GET /reporting/my-reports — employees who report to me
const getMyDirectReports = async (req, res) => {
    try {
        const orgId = getOrgId(req);
        const userId = getUser(req).id;
        const ids = await hierarchy_service_1.HierarchyService.getManagedEmployeeIds(userId, orgId);
        const lines = await client_1.default.user.findMany({
            where: { organizationId: orgId, id: { in: ids }, isArchived: false },
            select: {
                id: true, fullName: true, jobTitle: true, role: true, avatarUrl: true,
                departmentObj: { select: { name: true } },
            },
            orderBy: { fullName: 'asc' },
        });
        // Format to match expected output (array of objects with 'employee' property)
        res.json(lines.map(emp => ({ employee: emp, type: 'DIRECT', isPrimary: true })));
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.getMyDirectReports = getMyDirectReports;
// POST /reporting — add a reporting line
const addReportingLine = async (req, res) => {
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
            client_1.default.user.findFirst({ where: { id: employeeId, organizationId: orgId } }),
            client_1.default.user.findFirst({ where: { id: managerId, organizationId: orgId } }),
        ]);
        if (!employee)
            return res.status(404).json({ error: 'Employee not found' });
        if (!manager)
            return res.status(404).json({ error: 'Manager not found' });
        // Manager must have higher rank than employee (or equal for peer relationships)
        const empRank = (0, auth_middleware_1.getRoleRank)(employee.role);
        const mgrRank = (0, auth_middleware_1.getRoleRank)(manager.role);
        if (mgrRank < empRank && type === 'DIRECT') {
            return res.status(400).json({ error: `Manager rank (${manager.role}) must be >= employee rank (${employee.role}) for DIRECT reporting lines` });
        }
        // If setting as primary, unset any existing primary
        if (isPrimary) {
            await client_1.default.employeeReporting.updateMany({
                where: { organizationId: orgId, employeeId, isPrimary: true, effectiveTo: null },
                data: { isPrimary: false },
            });
        }
        const line = await client_1.default.employeeReporting.upsert({
            where: { employeeId_managerId_type: { employeeId, managerId, type } },
            update: { isPrimary, effectiveTo: null, effectiveFrom: new Date() },
            create: { organizationId: orgId, employeeId, managerId, type, isPrimary, effectiveFrom: new Date() },
            include: {
                manager: { select: { id: true, fullName: true, jobTitle: true } },
            },
        });
        // Also update the simple supervisorId on User if this is a primary direct line
        if (isPrimary && type === 'DIRECT') {
            await client_1.default.user.update({ where: { id: employeeId }, data: { supervisorId: managerId } });
        }
        res.status(201).json(line);
    }
    catch (err) {
        if (err.code === 'P2002')
            return res.status(409).json({ error: 'This reporting line already exists' });
        res.status(500).json({ error: err.message });
    }
};
exports.addReportingLine = addReportingLine;
// PATCH /reporting/:id
const updateReportingLine = async (req, res) => {
    try {
        const orgId = getOrgId(req);
        const { id } = req.params;
        const { type, isPrimary, effectiveTo } = req.body;
        const line = await client_1.default.employeeReporting.findUnique({ where: { id } });
        if (!line || line.organizationId !== orgId)
            return res.status(404).json({ error: 'Reporting line not found' });
        if (isPrimary) {
            await client_1.default.employeeReporting.updateMany({
                where: { organizationId: orgId, employeeId: line.employeeId, isPrimary: true, effectiveTo: null, id: { not: id } },
                data: { isPrimary: false },
            });
        }
        const updated = await client_1.default.employeeReporting.update({
            where: { id },
            data: {
                ...(type !== undefined && { type }),
                ...(isPrimary !== undefined && { isPrimary }),
                ...(effectiveTo !== undefined && { effectiveTo: effectiveTo ? new Date(effectiveTo) : null }),
            },
            include: { manager: { select: { id: true, fullName: true, jobTitle: true } } },
        });
        res.json(updated);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.updateReportingLine = updateReportingLine;
// DELETE /reporting/:id (soft-delete by setting effectiveTo = now)
const removeReportingLine = async (req, res) => {
    try {
        const orgId = getOrgId(req);
        const { id } = req.params;
        const line = await client_1.default.employeeReporting.findUnique({ where: { id } });
        if (!line || line.organizationId !== orgId)
            return res.status(404).json({ error: 'Reporting line not found' });
        const updated = await client_1.default.employeeReporting.update({
            where: { id },
            data: { effectiveTo: new Date() },
        });
        res.json({ success: true, line: updated });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.removeReportingLine = removeReportingLine;
