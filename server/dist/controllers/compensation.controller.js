"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addCompensationRecord = exports.getCompensationHistory = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const getCompensationHistory = async (req, res) => {
    try {
        const userReq = req.user;
        const organizationId = userReq.organizationId || 'mcb-ghana-tenant';
        const { employeeId } = req.params;
        const history = await client_1.default.compensationHistory.findMany({
            where: { employeeId, organizationId },
            orderBy: { effectiveDate: 'desc' }
        });
        // Also fetch the current salary to return alongside history
        const user = await client_1.default.user.findFirst({
            where: { id: employeeId, organizationId },
            select: { salary: true, currency: true }
        });
        if (!user)
            return res.status(404).json({ error: 'Employee not found' });
        res.json({ currentSalary: user.salary || 0, currency: user.currency || 'GHS', history });
    }
    catch (error) {
        console.error('[Get Compensation]', error);
        res.status(500).json({ error: 'Failed to fetch compensation history' });
    }
};
exports.getCompensationHistory = getCompensationHistory;
const addCompensationRecord = async (req, res) => {
    try {
        const { employeeId } = req.params;
        const { type, newSalary, currency, reason, effectiveDate } = req.body;
        const numericSalary = Number(newSalary);
        if (!type || !Number.isFinite(numericSalary) || numericSalary < 0) {
            return res.status(400).json({ error: 'Missing required compensation data' });
        }
        const userReq = req.user;
        const organizationId = userReq.organizationId || 'mcb-ghana-tenant';
        const authorizedById = userReq.id;
        const employee = await client_1.default.user.findFirst({
            where: { id: employeeId, organizationId },
            select: { id: true, salary: true, currency: true }
        });
        if (!employee)
            return res.status(404).json({ error: 'Employee not found' });
        const effective = new Date(effectiveDate || Date.now());
        if (Number.isNaN(effective.getTime()))
            return res.status(400).json({ error: 'Invalid effective date' });
        const previousSalary = Number(employee.salary || 0);
        const transaction = await client_1.default.$transaction(async (tx) => {
            // 1. Update the user's current salary
            const updatedUser = await tx.user.update({
                where: { id: employee.id },
                data: { salary: numericSalary, currency: currency || employee.currency || 'GHS' }
            });
            // 2. Create the historical ledger record
            const record = await tx.compensationHistory.create({
                data: {
                    organizationId,
                    employeeId,
                    type,
                    previousSalary: previousSalary || 0,
                    newSalary: numericSalary,
                    currency: currency || employee.currency || 'GHS',
                    reason,
                    effectiveDate: effective,
                    authorizedById
                }
            });
            // 3. Log the audit
            await tx.auditLog.create({
                data: {
                    organizationId,
                    action: `COMPENSATION_${type}`,
                    entity: 'Salary',
                    entityId: employeeId,
                    userId: authorizedById || employeeId,
                    details: `Salary adjusted from ${previousSalary} to ${numericSalary}`
                }
            });
            return { user: updatedUser, record };
        });
        res.status(201).json(transaction);
    }
    catch (error) {
        console.error('[Add Compensation]', error);
        res.status(500).json({ error: 'Failed to add compensation record' });
    }
};
exports.addCompensationRecord = addCompensationRecord;
