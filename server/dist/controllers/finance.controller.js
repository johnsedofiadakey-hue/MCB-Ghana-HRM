"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rejectExpense = exports.approveExpense = exports.getAllExpenses = exports.getMyExpenses = exports.submitExpense = exports.rejectLoan = exports.approveLoan = exports.getAllLoans = exports.getMyLoans = exports.requestLoan = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const requestLoan = async (req, res) => {
    try {
        const { type, principalAmount, monthsDuration, purpose } = req.body;
        const employeeId = req.user?.id;
        const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
        const amount = Number(principalAmount);
        const duration = Number(monthsDuration);
        if (!Number.isFinite(amount) || amount <= 0 || !Number.isInteger(duration) || duration < 1 || duration > 24) {
            return res.status(400).json({ error: 'Enter a positive amount and a repayment duration from 1 to 24 months' });
        }
        const loan = await client_1.default.loan.create({
            data: {
                organizationId,
                employeeId,
                type: type || 'ADVANCE',
                principalAmount: amount,
                totalRepayment: amount, // Zero interest for now
                installmentAmount: amount / duration,
                monthsDuration: duration,
                purpose
            }
        });
        res.status(201).json(loan);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
exports.requestLoan = requestLoan;
const getMyLoans = async (req, res) => {
    try {
        const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
        const loans = await client_1.default.loan.findMany({
            where: { employeeId: req.user?.id, organizationId },
            include: { installments: true },
            orderBy: { requestedAt: 'desc' }
        });
        res.json(loans);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getMyLoans = getMyLoans;
const getAllLoans = async (req, res) => {
    try {
        const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
        const loans = await client_1.default.loan.findMany({
            where: { organizationId },
            include: { employee: { select: { fullName: true, email: true, departmentObj: true } } },
            orderBy: { requestedAt: 'desc' }
        });
        res.json(loans);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getAllLoans = getAllLoans;
const approveLoan = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.user?.id;
        const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
        const loan = await client_1.default.loan.findFirst({ where: { id, organizationId, status: 'PENDING' } });
        if (!loan)
            return res.status(404).json({ error: 'Loan not found' });
        // Create installments
        const installmentsData = [];
        const date = new Date();
        for (let i = 1; i <= loan.monthsDuration; i++) {
            date.setMonth(date.getMonth() + 1);
            installmentsData.push({
                loanId: loan.id,
                organizationId,
                amount: loan.installmentAmount,
                month: date.getMonth() + 1,
                year: date.getFullYear()
            });
        }
        const updatedLoan = await client_1.default.$transaction([
            client_1.default.loan.update({
                where: { id },
                data: { status: 'APPROVED', approvedById: adminId, approvedAt: new Date() }
            }),
            client_1.default.loanInstallment.createMany({ data: installmentsData })
        ]);
        res.json(updatedLoan[0]);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
exports.approveLoan = approveLoan;
const rejectLoan = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.user?.id;
        const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
        const existing = await client_1.default.loan.findFirst({ where: { id, organizationId, status: 'PENDING' }, select: { id: true } });
        if (!existing)
            return res.status(404).json({ error: 'Pending loan not found' });
        const loan = await client_1.default.loan.update({
            where: { id: existing.id },
            data: { status: 'REJECTED', approvedById: adminId, approvedAt: new Date() }
        });
        res.json(loan);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
exports.rejectLoan = rejectLoan;
// --- EXPENSES ---
const submitExpense = async (req, res) => {
    try {
        const { title, description, amount, category } = req.body;
        const employeeId = req.user?.id;
        const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
        const numericAmount = Number(amount);
        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
            return res.status(400).json({ error: 'Expense amount must be positive' });
        }
        const expense = await client_1.default.expenseClaim.create({
            data: {
                organizationId,
                employeeId,
                title,
                description,
                amount: numericAmount,
                category
            }
        });
        res.status(201).json(expense);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
exports.submitExpense = submitExpense;
const getMyExpenses = async (req, res) => {
    try {
        const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
        const expenses = await client_1.default.expenseClaim.findMany({
            where: { employeeId: req.user?.id, organizationId },
            orderBy: { submittedAt: 'desc' }
        });
        res.json(expenses);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getMyExpenses = getMyExpenses;
const getAllExpenses = async (req, res) => {
    try {
        const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
        const expenses = await client_1.default.expenseClaim.findMany({
            where: { organizationId },
            include: { employee: { select: { fullName: true, email: true, departmentObj: true } } },
            orderBy: { submittedAt: 'desc' }
        });
        res.json(expenses);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getAllExpenses = getAllExpenses;
const approveExpense = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.user?.id;
        const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
        const existing = await client_1.default.expenseClaim.findFirst({ where: { id, organizationId, status: 'PENDING' }, select: { id: true } });
        if (!existing)
            return res.status(404).json({ error: 'Pending expense not found' });
        const expense = await client_1.default.expenseClaim.update({
            where: { id: existing.id },
            data: { status: 'APPROVED', approvedById: adminId, approvedAt: new Date() }
        });
        res.json(expense);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
exports.approveExpense = approveExpense;
const rejectExpense = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.user?.id;
        const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
        const existing = await client_1.default.expenseClaim.findFirst({ where: { id, organizationId, status: 'PENDING' }, select: { id: true } });
        if (!existing)
            return res.status(404).json({ error: 'Pending expense not found' });
        const expense = await client_1.default.expenseClaim.update({
            where: { id: existing.id },
            data: { status: 'REJECTED', approvedById: adminId, approvedAt: new Date() }
        });
        res.json(expense);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
exports.rejectExpense = rejectExpense;
