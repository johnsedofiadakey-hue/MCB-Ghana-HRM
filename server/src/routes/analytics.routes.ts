import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// New Analytics Engine Routes
router.get('/metrics', AnalyticsController.getDashboardMetrics);
router.get('/signals', AnalyticsController.getSignals);

// Executive & Other Analytics Routes
router.get('/executive', requireRole(70), AnalyticsController.getExecutiveStats); // Manager+
router.get('/executive/board-report/pdf', requireRole(80), AnalyticsController.downloadBoardReportPDF); // Director+
router.get('/dept-growth', requireRole(80), AnalyticsController.getDepartmentGrowth); // Director+
router.get('/personal', AnalyticsController.getPersonalStats); // Any authenticated user (Staff)

export default router;
