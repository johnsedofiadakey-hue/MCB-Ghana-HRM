import { Router } from 'express';
import { ContinuousPerformanceController } from '../controllers/continuous-performance.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Check-ins
router.post('/check-ins', ContinuousPerformanceController.scheduleCheckIn);
router.patch('/check-ins/:id/complete', ContinuousPerformanceController.completeCheckIn);
router.get('/check-ins', ContinuousPerformanceController.getCheckIns);

// 360 Feedback
router.post('/feedback', ContinuousPerformanceController.submitFeedback);
router.get('/feedback', ContinuousPerformanceController.getFeedback);

export default router;
