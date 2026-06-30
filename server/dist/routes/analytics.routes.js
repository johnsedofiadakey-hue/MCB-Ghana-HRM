"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const analytics_controller_1 = require("../controllers/analytics.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
// New Analytics Engine Routes
router.get('/metrics', (0, auth_middleware_1.requireSpecificRole)(['HR_DIRECTOR', 'HR_MANAGER', 'MD', 'DEV']), analytics_controller_1.AnalyticsController.getDashboardMetrics);
router.get('/signals', (0, auth_middleware_1.requireSpecificRole)(['HR_DIRECTOR', 'HR_MANAGER', 'MD', 'DEV']), analytics_controller_1.AnalyticsController.getSignals);
// Executive & Other Analytics Routes
router.get('/executive', (0, auth_middleware_1.requireRole)(70), analytics_controller_1.AnalyticsController.getExecutiveStats); // Manager+
router.get('/executive/board-report/pdf', (0, auth_middleware_1.requireSpecificRole)(['HR_DIRECTOR', 'MD', 'DIRECTOR', 'DEV']), analytics_controller_1.AnalyticsController.downloadBoardReportPDF);
router.get('/dept-growth', (0, auth_middleware_1.requireRole)(80), analytics_controller_1.AnalyticsController.getDepartmentGrowth); // Director+
router.get('/personal', analytics_controller_1.AnalyticsController.getPersonalStats); // Any authenticated user (Staff)
exports.default = router;
