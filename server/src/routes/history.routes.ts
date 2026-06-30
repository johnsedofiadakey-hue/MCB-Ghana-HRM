import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth.middleware';
import * as historyController from '../controllers/history.controller';
import { Permission } from '../types/permissions';

const router = Router();

router.post('/', authenticate, requirePermission(Permission.EMPLOYEE_HISTORY_WRITE), historyController.createRecord);

// Employees may read the safe subset of their own record. Broader access is
// enforced against the employee-history permission in the controller.
router.get('/:employeeId', authenticate, historyController.getEmployeeRecords);

router.put('/:id/status', authenticate, requirePermission(Permission.EMPLOYEE_HISTORY_WRITE), historyController.updateStatus);

export default router;
