import { Router } from 'express';
import { PolicyController } from '../controllers/policy.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();

// Only admins/HR Managers (rank 88+) can simulate policies
router.post('/simulate', authenticate, requireRole(88), PolicyController.simulate);

export default router;
