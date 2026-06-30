"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSubUnit = exports.updateSubUnit = exports.createSubUnit = exports.getSubUnits = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const enterprise_controller_1 = require("./enterprise.controller");
const getSubUnits = async (req, res) => {
    try {
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const { departmentId } = req.query;
        const whereClause = {
            organizationId: orgId || 'mcb-ghana-tenant'
        };
        if (departmentId) {
            whereClause.departmentId = Number(departmentId);
        }
        const subUnits = await client_1.default.subUnit.findMany({
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
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getSubUnits = getSubUnits;
const createSubUnit = async (req, res) => {
    try {
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const organizationId = orgId || 'mcb-ghana-tenant';
        const { name, departmentId, managerId } = req.body;
        if (!name?.trim())
            return res.status(400).json({ error: 'Sub-unit name is required' });
        if (!departmentId)
            return res.status(400).json({ error: 'Department ID is required' });
        const deptId = Number(departmentId);
        if (isNaN(deptId)) {
            return res.status(400).json({ error: 'Invalid Department ID format' });
        }
        const [department, manager] = await Promise.all([
            client_1.default.department.findFirst({ where: { id: deptId, organizationId }, select: { id: true } }),
            managerId ? client_1.default.user.findFirst({ where: { id: managerId, organizationId }, select: { id: true } }) : Promise.resolve(null),
        ]);
        if (!department)
            return res.status(404).json({ error: 'Department not found in this organization' });
        if (managerId && !manager)
            return res.status(404).json({ error: 'Manager not found in this organization' });
        console.log(`[SubUnit] Creating unit "${name}" for Department ${deptId} in Org ${organizationId}`);
        const subUnit = await client_1.default.subUnit.create({
            data: {
                name: name.trim(),
                departmentId: deptId,
                organizationId,
                ...(managerId ? { managerId } : {})
            }
        });
        res.status(201).json(subUnit);
    }
    catch (err) {
        console.error('[SubUnit] Creation error:', err);
        res.status(500).json({ error: err.message || 'Failed to create sub-unit' });
    }
};
exports.createSubUnit = createSubUnit;
const updateSubUnit = async (req, res) => {
    try {
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const organizationId = orgId || 'mcb-ghana-tenant';
        const { name, managerId } = req.body;
        if (managerId) {
            const manager = await client_1.default.user.findFirst({ where: { id: managerId, organizationId }, select: { id: true } });
            if (!manager)
                return res.status(404).json({ error: 'Manager not found in this organization' });
        }
        const subUnit = await client_1.default.subUnit.update({
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
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.updateSubUnit = updateSubUnit;
// ─── DELETE SUB-UNIT ──────────────────────────────────────────────────────────
const deleteSubUnit = async (req, res) => {
    try {
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const subUnitId = req.params.id;
        // Prisma relation (onDelete: SetNull) will handle the employees automatically.
        // We use deleteMany to stay consistent with multi-tenancy safe deletions.
        await client_1.default.subUnit.deleteMany({
            where: {
                id: subUnitId,
                organizationId: orgId || 'mcb-ghana-tenant'
            }
        });
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.deleteSubUnit = deleteSubUnit;
