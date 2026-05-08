"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rejectExpense = exports.approveExpense = exports.getAllExpenses = exports.getMyExpenses = exports.submitExpense = exports.rejectLoan = exports.approveLoan = exports.getAllLoans = exports.getMyLoans = exports.requestLoan = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const requestLoan = async (req, res) => {
    try {
        const { employeeId, type, principalAmount, monthsDuration, purpose } = req.body;
        const loan = await client_1.default.loan.create({
            data: {
                employeeId,
                type: type || 'ADVANCE',
                principalAmount: Number(principalAmount),
                totalRepayment: Number(principalAmount), // Zero interest for now
                installmentAmount: Number(principalAmount) / Number(monthsDuration),
                monthsDuration: Number(monthsDuration),
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
        const loans = await client_1.default.loan.findMany({
            where: { employeeId: req.user.id },
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
        const loans = await client_1.default.loan.findMany({
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
        const adminId = req.user.id;
        const loan = await client_1.default.loan.findUnique({ where: { id } });
        if (!loan)
            return res.status(404).json({ error: 'Loan not found' });
        // Create installments
        const installmentsData = [];
        const date = new Date();
        for (let i = 1; i <= loan.monthsDuration; i++) {
            date.setMonth(date.getMonth() + 1);
            installmentsData.push({
                loanId: loan.id,
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
        const adminId = req.user.id;
        const loan = await client_1.default.loan.update({
            where: { id },
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
        const { employeeId, title, description, amount, category } = req.body;
        const expense = await client_1.default.expenseClaim.create({
            data: {
                employeeId,
                title,
                description,
                amount: Number(amount),
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
        const expenses = await client_1.default.expenseClaim.findMany({
            where: { employeeId: req.user.id },
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
        const expenses = await client_1.default.expenseClaim.findMany({
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
        const adminId = req.user.id;
        const expense = await client_1.default.expenseClaim.update({
            where: { id },
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
        const adminId = req.user.id;
        const expense = await client_1.default.expenseClaim.update({
            where: { id },
            data: { status: 'REJECTED', approvedById: adminId, approvedAt: new Date() }
        });
        res.json(expense);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
exports.rejectExpense = rejectExpense;
