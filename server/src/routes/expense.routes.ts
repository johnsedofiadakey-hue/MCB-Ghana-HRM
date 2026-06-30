import { Router } from 'express';
import * as expenseController from '../controllers/expense.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { validate, ExpenseClaimSchema } from '../middleware/validate.middleware';

const router = Router();

// Employee endpoints
router.post('/claims', authenticate, validate(ExpenseClaimSchema), expenseController.createExpenseClaim);
router.post('/', authenticate, validate(ExpenseClaimSchema), expenseController.createExpenseClaim);
router.get('/my', authenticate, expenseController.getMyExpenses);
router.get('/my-claims', authenticate, expenseController.getMyExpenses);

// Manager / HR endpoints
router.get('/approvals', authenticate, requireRole(65), expenseController.getPendingApprovals);
router.get('/pending', authenticate, requireRole(65), expenseController.getPendingApprovals);
router.patch('/claims/:id/approve', authenticate, requireRole(65), expenseController.approveExpense);
router.patch('/:id/approve', authenticate, requireRole(65), expenseController.approveExpense);
router.patch('/claims/:id/reject', authenticate, requireRole(65), expenseController.rejectExpense);
router.patch('/:id/reject', authenticate, requireRole(65), expenseController.rejectExpense);

export default router;
