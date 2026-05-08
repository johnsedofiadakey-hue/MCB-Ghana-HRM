import { Router } from 'express';
import { authenticate, authorizeMinimumRole } from '../middleware/auth.middleware';
import { getCompensationHistory, addCompensationRecord } from '../controllers/compensation.controller';

const router = Router();

// Only HR_ADMIN, DIRECTOR, and MD can view/edit salaries
router.get('/:employeeId', authenticate, authorizeMinimumRole('DIRECTOR'), getCompensationHistory);
router.post('/:employeeId', authenticate, authorizeMinimumRole('DIRECTOR'), addCompensationRecord);

export default router;
