import prisma from '../prisma/client';
import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth.middleware';
import { PolicyService } from '../services/policy.service';
import { Permission } from '../types/permissions';
import {
  requestLoan, getMyLoans, getAllLoans, approveLoan, rejectLoan,
  submitExpense, getMyExpenses, getAllExpenses, approveExpense, rejectExpense
} from '../controllers/finance.controller';

const router = Router();
router.use(authenticate);

// Root: combined loans + expenses view
router.get('/', async (req, res) => {
  try {
    const user = (req as any).user;
    const orgId = user.organizationId || 'mcb-ghana-tenant';
    const [loanAccess, expenseAccess] = await Promise.all([
      PolicyService.evaluatePolicy(user.id, Permission.LOAN_MANAGE),
      PolicyService.evaluatePolicy(user.id, Permission.EXPENSE_MANAGE),
    ]);
    const canSeeLoans = loanAccess.allowed;
    const canSeeExpenses = expenseAccess.allowed;
    const [loans, expenses] = await Promise.all([
      prisma.loan.findMany({
        where: { organizationId: orgId, ...(canSeeLoans ? {} : { employeeId: user.id }) },
        include: { employee: { select: { fullName: true, jobTitle: true, avatarUrl: true } } },
        take: 50, orderBy: { requestedAt: 'desc' }
      }),
      prisma.expenseClaim.findMany({
        where: { organizationId: orgId, ...(canSeeExpenses ? {} : { employeeId: user.id }) },
        include: { employee: { select: { fullName: true, jobTitle: true, avatarUrl: true } } },
        take: 50, orderBy: { submittedAt: 'desc' }
      }),
    ]);
    res.json({ loans, expenses });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Employee self-service
router.post('/loans', requestLoan);
router.get('/loans/me', getMyLoans);
router.post('/expenses', submitExpense);
router.get('/expenses/me', getMyExpenses);

// Finance operations endpoints
router.get('/loans', requirePermission(Permission.LOAN_MANAGE), getAllLoans);
router.post('/loans/:id/approve', requirePermission(Permission.LOAN_MANAGE), approveLoan);
router.post('/loans/:id/reject', requirePermission(Permission.LOAN_MANAGE), rejectLoan);

router.get('/expenses', requirePermission(Permission.EXPENSE_MANAGE), getAllExpenses);
router.post('/expenses/:id/approve', requirePermission(Permission.EXPENSE_MANAGE), approveExpense);
router.post('/expenses/:id/reject', requirePermission(Permission.EXPENSE_MANAGE), rejectExpense);

export default router;
