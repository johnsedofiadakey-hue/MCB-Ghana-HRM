"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = __importDefault(require("../prisma/client"));
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const policy_service_1 = require("../services/policy.service");
const permissions_1 = require("../types/permissions");
const finance_controller_1 = require("../controllers/finance.controller");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
// Root: combined loans + expenses view
router.get('/', async (req, res) => {
    try {
        const user = req.user;
        const orgId = user.organizationId || 'mcb-ghana-tenant';
        const [loanAccess, expenseAccess] = await Promise.all([
            policy_service_1.PolicyService.evaluatePolicy(user.id, permissions_1.Permission.LOAN_MANAGE),
            policy_service_1.PolicyService.evaluatePolicy(user.id, permissions_1.Permission.EXPENSE_MANAGE),
        ]);
        const canSeeLoans = loanAccess.allowed;
        const canSeeExpenses = expenseAccess.allowed;
        const [loans, expenses] = await Promise.all([
            client_1.default.loan.findMany({
                where: { organizationId: orgId, ...(canSeeLoans ? {} : { employeeId: user.id }) },
                include: { employee: { select: { fullName: true, jobTitle: true, avatarUrl: true } } },
                take: 50, orderBy: { requestedAt: 'desc' }
            }),
            client_1.default.expenseClaim.findMany({
                where: { organizationId: orgId, ...(canSeeExpenses ? {} : { employeeId: user.id }) },
                include: { employee: { select: { fullName: true, jobTitle: true, avatarUrl: true } } },
                take: 50, orderBy: { submittedAt: 'desc' }
            }),
        ]);
        res.json({ loans, expenses });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Employee self-service
router.post('/loans', finance_controller_1.requestLoan);
router.get('/loans/me', finance_controller_1.getMyLoans);
router.post('/expenses', finance_controller_1.submitExpense);
router.get('/expenses/me', finance_controller_1.getMyExpenses);
// Finance operations endpoints
router.get('/loans', (0, auth_middleware_1.requirePermission)(permissions_1.Permission.LOAN_MANAGE), finance_controller_1.getAllLoans);
router.post('/loans/:id/approve', (0, auth_middleware_1.requirePermission)(permissions_1.Permission.LOAN_MANAGE), finance_controller_1.approveLoan);
router.post('/loans/:id/reject', (0, auth_middleware_1.requirePermission)(permissions_1.Permission.LOAN_MANAGE), finance_controller_1.rejectLoan);
router.get('/expenses', (0, auth_middleware_1.requirePermission)(permissions_1.Permission.EXPENSE_MANAGE), finance_controller_1.getAllExpenses);
router.post('/expenses/:id/approve', (0, auth_middleware_1.requirePermission)(permissions_1.Permission.EXPENSE_MANAGE), finance_controller_1.approveExpense);
router.post('/expenses/:id/reject', (0, auth_middleware_1.requirePermission)(permissions_1.Permission.EXPENSE_MANAGE), finance_controller_1.rejectExpense);
exports.default = router;
