import { Router } from 'express';
import { PolicyController } from '../controllers/policy.controller';
import { authenticate, requireSpecificRole } from '../middleware/auth.middleware';

const router = Router();

// Only admins/HR Managers (rank 88+) can simulate policies
router.post('/simulate', authenticate, requireSpecificRole(['HR_DIRECTOR', 'HR_MANAGER', 'MD', 'DEV']), PolicyController.simulate);

export default router;
