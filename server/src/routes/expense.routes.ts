import { Router } from 'express';
import * as expenseController from '../controllers/expense.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { validate, ExpenseClaimSchema } from '../middleware/validate.middleware';

const router = Router();

// Employee endpoints
router.post('/claims', authenticate, validate(ExpenseClaimSchema), expenseController.createExpenseClaim);
router.get('/my', authenticate, expenseController.getMyExpenses);
router.get('/my-claims', authenticate, expenseController.getMyExpenses);

// Manager / HR endpoints
router.get('/approvals', authenticate, expenseController.getPendingApprovals);
router.get('/pending', authenticate, expenseController.getPendingApprovals);
router.patch('/claims/:id/approve', authenticate, expenseController.approveExpense);
router.patch('/:id/approve', authenticate, expenseController.approveExpense);
router.patch('/claims/:id/reject', authenticate, expenseController.rejectExpense);
router.patch('/:id/reject', authenticate, expenseController.rejectExpense);

export default router;
