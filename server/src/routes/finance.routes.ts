import prisma from '../prisma/client';
import { Router } from 'express';
import { authenticate, authorizeMinimumRole } from '../middleware/auth.middleware';
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
    const isAdmin = (user.rank || 0) >= 70;
    const [loans, expenses] = await Promise.all([
      prisma.loan.findMany({
        where: { organizationId: orgId, ...(isAdmin ? {} : { employeeId: user.id }) },
        include: { employee: { select: { fullName: true, jobTitle: true, avatarUrl: true } } },
        take: 50, orderBy: { requestedAt: 'desc' }
      }),
      prisma.expenseClaim.findMany({
        where: { organizationId: orgId, ...(isAdmin ? {} : { employeeId: user.id }) },
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

// Admin endpoints
router.get('/loans', authorizeMinimumRole('MANAGER'), getAllLoans);
router.post('/loans/:id/approve', authorizeMinimumRole('DIRECTOR'), approveLoan);
router.post('/loans/:id/reject', authorizeMinimumRole('DIRECTOR'), rejectLoan);

router.get('/expenses', authorizeMinimumRole('MANAGER'), getAllExpenses);
router.post('/expenses/:id/approve', authorizeMinimumRole('MANAGER'), approveExpense);
router.post('/expenses/:id/reject', authorizeMinimumRole('MANAGER'), rejectExpense);

export default router;
