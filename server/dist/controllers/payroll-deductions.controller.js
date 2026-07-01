"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteDeductionTemplate = exports.updateDeductionTemplate = exports.createDeductionTemplate = exports.listDeductionTemplates = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const getOrgId = (req) => req.user?.organizationId;
const getActorId = (req) => req.user?.id;
const listDeductionTemplates = async (req, res) => {
    try {
        const organizationId = getOrgId(req) || 'mcb-ghana-tenant';
        const { employeeId, scope } = req.query;
        const templates = await client_1.default.payrollDeductionTemplate.findMany({
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
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.listDeductionTemplates = listDeductionTemplates;
const createDeductionTemplate = async (req, res) => {
    try {
        const organizationId = getOrgId(req) || 'mcb-ghana-tenant';
        const createdById = getActorId(req);
        const { name, type, scope, employeeId, basis, amount, taxTreatment, notes } = req.body;
        if (!name?.trim())
            return res.status(400).json({ error: 'Name is required' });
        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0)
            return res.status(400).json({ error: 'Amount must be a positive number' });
        const template = await client_1.default.payrollDeductionTemplate.create({
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
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
};
exports.createDeductionTemplate = createDeductionTemplate;
const updateDeductionTemplate = async (req, res) => {
    try {
        const organizationId = getOrgId(req) || 'mcb-ghana-tenant';
        const { id } = req.params;
        const existing = await client_1.default.payrollDeductionTemplate.findFirst({ where: { id, organizationId } });
        if (!existing)
            return res.status(404).json({ error: 'Deduction rule not found' });
        const { name, type, scope, employeeId, basis, amount, taxTreatment, isActive, notes } = req.body;
        const template = await client_1.default.payrollDeductionTemplate.update({
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
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
};
exports.updateDeductionTemplate = updateDeductionTemplate;
const deleteDeductionTemplate = async (req, res) => {
    try {
        const organizationId = getOrgId(req) || 'mcb-ghana-tenant';
        const { id } = req.params;
        const existing = await client_1.default.payrollDeductionTemplate.findFirst({ where: { id, organizationId } });
        if (!existing)
            return res.status(404).json({ error: 'Deduction rule not found' });
        await client_1.default.payrollDeductionTemplate.delete({ where: { id } });
        res.json({ message: 'Deduction rule deleted' });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
};
exports.deleteDeductionTemplate = deleteDeductionTemplate;
