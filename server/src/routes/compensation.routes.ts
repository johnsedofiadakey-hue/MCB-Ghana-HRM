import { Router } from 'express';
import { authenticate, requireAnyPermission, requirePermission } from '../middleware/auth.middleware';
import { getCompensationHistory, addCompensationRecord } from '../controllers/compensation.controller';
import { Permission } from '../types/permissions';

const router = Router();

router.get('/:employeeId', authenticate, requireAnyPermission([Permission.COMPENSATION_MANAGE, Permission.EMPLOYEE_READ]), getCompensationHistory);
router.post('/:employeeId', authenticate, requirePermission(Permission.COMPENSATION_MANAGE), addCompensationRecord);

export default router;
