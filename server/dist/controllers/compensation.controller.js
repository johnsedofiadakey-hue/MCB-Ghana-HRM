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
        res.json({ currentSalary: user?.salary || 0, currency: user?.currency || 'GHS', history });
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
        const { type, previousSalary, newSalary, currency, reason, effectiveDate } = req.body;
        const authorizedById = req.user?.id;
        if (!type || typeof newSalary !== 'number') {
            return res.status(400).json({ error: 'Missing required compensation data' });
        }
        const transaction = await client_1.default.$transaction(async (tx) => {
            const userReq = req.user;
            const organizationId = userReq.organizationId || 'mcb-ghana-tenant';
            const authorizedById = userReq.id;
            // 1. Update the user's current salary
            const updatedUser = await tx.user.updateMany({
                where: { id: employeeId, organizationId },
                data: { salary: newSalary, currency: currency || 'GHS' }
            });
            // 2. Create the historical ledger record
            const record = await tx.compensationHistory.create({
                data: {
                    organizationId,
                    employeeId,
                    type,
                    previousSalary: previousSalary || 0,
                    newSalary,
                    currency: currency || 'GHS',
                    reason,
                    effectiveDate: new Date(effectiveDate || Date.now()),
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
                    details: `Salary adjusted from ${previousSalary} to ${newSalary}`
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
