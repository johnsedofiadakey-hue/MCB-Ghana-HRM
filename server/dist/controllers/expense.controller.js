"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rejectExpense = exports.approveExpense = exports.getPendingApprovals = exports.getMyExpenses = exports.createExpenseClaim = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const audit_service_1 = require("../services/audit.service");
const websocket_service_1 = require("../services/websocket.service");
const policy_service_1 = require("../services/policy.service");
const permissions_1 = require("../types/permissions");
/**
 * EXPENSE & REIMBURSEMENT CONTROLLER
 */
const createExpenseClaim = async (req, res) => {
    try {
        const { title, category, amount, currency, description, receiptUrl } = req.body;
        const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
        const employeeId = req.user?.id;
        const claim = await client_1.default.expenseClaim.create({
            data: {
                organizationId,
                employeeId,
                title: title || 'Expense Claim',
                category: category || 'OTHER',
                amount,
                currency: currency || 'GHS',
                description,
                receiptUrl,
                status: 'PENDING'
            }
        });
        await (0, audit_service_1.logAction)(employeeId, 'CREATE_EXPENSE_CLAIM', 'ExpenseClaim', claim.id, { amount, currency }, req.ip);
        // Notify Direct Supervisor or HR
        const user = await client_1.default.user.findUnique({ where: { id: employeeId }, select: { supervisorId: true, fullName: true } });
        if (user?.supervisorId) {
            await (0, websocket_service_1.notify)(user.supervisorId, 'New Expense Claim 💰', `${user.fullName} submitted a claim for ${currency} ${amount}`, 'INFO', '/expenses/approvals');
        }
        res.status(201).json(claim);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
exports.createExpenseClaim = createExpenseClaim;
const getMyExpenses = async (req, res) => {
    try {
        const employeeId = req.user?.id;
        const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
        const claims = await client_1.default.expenseClaim.findMany({
            where: { employeeId, organizationId },
            orderBy: { submittedAt: 'desc' }
        });
        res.json(claims);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getMyExpenses = getMyExpenses;
const getPendingApprovals = async (req, res) => {
    try {
        const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
        const supervisorId = req.user?.id;
        const financeAccess = await policy_service_1.PolicyService.evaluatePolicy(supervisorId, permissions_1.Permission.EXPENSE_MANAGE);
        // Finance operations can review the organization queue. Other managers see
        // only claims submitted by their direct reports.
        const claims = await client_1.default.expenseClaim.findMany({
            where: {
                organizationId,
                status: 'PENDING',
                ...(financeAccess.allowed ? {} : { employee: { supervisorId } })
            },
            include: {
                employee: { select: { fullName: true, departmentObj: { select: { name: true } } } }
            },
            orderBy: { submittedAt: 'desc' }
        });
        res.json(claims);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getPendingApprovals = getPendingApprovals;
const approveExpense = async (req, res) => {
    try {
        const { id } = req.params;
        const approvedById = req.user?.id;
        const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
        const financeAccess = await policy_service_1.PolicyService.evaluatePolicy(approvedById, permissions_1.Permission.EXPENSE_MANAGE);
        const existing = await client_1.default.expenseClaim.findFirst({
            where: { id, organizationId, status: 'PENDING' },
            include: { employee: { select: { supervisorId: true } } },
        });
        if (!existing)
            return res.status(404).json({ error: 'Pending expense claim not found' });
        if (!financeAccess.allowed && existing.employee.supervisorId !== approvedById) {
            return res.status(403).json({ error: 'Only the employee\'s supervisor or Finance may approve this claim' });
        }
        const claim = await client_1.default.expenseClaim.update({
            where: { id },
            data: {
                status: 'APPROVED',
                approvedById,
                approvedAt: new Date()
            }
        });
        await (0, audit_service_1.logAction)(approvedById, 'APPROVE_EXPENSE', 'ExpenseClaim', id, {}, req.ip);
        await (0, websocket_service_1.notify)(claim.employeeId, 'Expense Approved ✅', `Your expense claim for ${claim.amount} has been approved.`, 'SUCCESS', '/expenses');
        res.json(claim);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
exports.approveExpense = approveExpense;
const rejectExpense = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const rejectedById = req.user?.id;
        const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
        const financeAccess = await policy_service_1.PolicyService.evaluatePolicy(rejectedById, permissions_1.Permission.EXPENSE_MANAGE);
        if (!reason || String(reason).trim().length < 3) {
            return res.status(400).json({ error: 'A rejection reason is required' });
        }
        const existing = await client_1.default.expenseClaim.findFirst({
            where: { id, organizationId, status: 'PENDING' },
            include: { employee: { select: { supervisorId: true } } },
        });
        if (!existing)
            return res.status(404).json({ error: 'Pending expense claim not found' });
        if (!financeAccess.allowed && existing.employee.supervisorId !== rejectedById) {
            return res.status(403).json({ error: 'Only the employee\'s supervisor or Finance may reject this claim' });
        }
        const claim = await client_1.default.expenseClaim.update({
            where: { id },
            data: {
                status: 'REJECTED',
                rejectionReason: reason
            }
        });
        await (0, audit_service_1.logAction)(rejectedById, 'REJECT_EXPENSE', 'ExpenseClaim', id, { reason }, req.ip);
        await (0, websocket_service_1.notify)(claim.employeeId, 'Expense Rejected ❌', `Your expense claim for ${claim.amount} was rejected. Reason: ${reason}`, 'ERROR', '/expenses');
        res.json(claim);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
exports.rejectExpense = rejectExpense;
