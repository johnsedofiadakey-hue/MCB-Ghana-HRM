import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';
import { authenticate, requireRole, requireSpecificRole } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// New Analytics Engine Routes
router.get('/metrics', requireSpecificRole(['HR_DIRECTOR', 'HR_MANAGER', 'MD', 'DEV']), AnalyticsController.getDashboardMetrics);
router.get('/signals', requireSpecificRole(['HR_DIRECTOR', 'HR_MANAGER', 'MD', 'DEV']), AnalyticsController.getSignals);

// Executive & Other Analytics Routes
router.get('/executive', requireRole(70), AnalyticsController.getExecutiveStats); // Manager+
router.get('/executive/board-report/pdf', requireSpecificRole(['HR_DIRECTOR', 'MD', 'DIRECTOR', 'DEV']), AnalyticsController.downloadBoardReportPDF);
router.get('/dept-growth', requireRole(80), AnalyticsController.getDepartmentGrowth); // Director+
router.get('/personal', AnalyticsController.getPersonalStats); // Any authenticated user (Staff)

export default router;
