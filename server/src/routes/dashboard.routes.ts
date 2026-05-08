import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getDashboardStats, getDashboardPerformance } from '../controllers/dashboard.controller';

const router = Router();

router.get('/stats', authenticate, getDashboardStats);
router.get('/performance', authenticate, getDashboardPerformance);

export default router;
