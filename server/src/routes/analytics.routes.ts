import { Router } from 'express';
<<<<<<< HEAD
import { AnalyticsController } from '../controllers/analytics.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/metrics', AnalyticsController.getDashboardMetrics);
router.get('/signals', AnalyticsController.getSignals);
=======
import * as analyticsController from '../controllers/analytics.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/executive', requireRole(70), analyticsController.getExecutiveStats); // Manager+
router.get('/executive/board-report/pdf', requireRole(80), analyticsController.downloadBoardReportPDF); // Director+
router.get('/dept-growth', requireRole(80), analyticsController.getDepartmentGrowth); // Director+
router.get('/personal', analyticsController.getPersonalStats); // Any authenticated user (Staff)
>>>>>>> 430a1da1a47c271c0801ba6d3e2fad6da5b864e7

export default router;
