import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/metrics', AnalyticsController.getDashboardMetrics);
router.get('/signals', AnalyticsController.getSignals);

export default router;
