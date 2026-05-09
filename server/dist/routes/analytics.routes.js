"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const analytics_controller_1 = require("../controllers/analytics.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
// New Analytics Engine Routes
router.get('/metrics', analytics_controller_1.AnalyticsController.getDashboardMetrics);
router.get('/signals', analytics_controller_1.AnalyticsController.getSignals);
// Executive & Other Analytics Routes
router.get('/executive', (0, auth_middleware_1.requireRole)(70), analytics_controller_1.AnalyticsController.getExecutiveStats); // Manager+
router.get('/executive/board-report/pdf', (0, auth_middleware_1.requireRole)(80), analytics_controller_1.AnalyticsController.downloadBoardReportPDF); // Director+
router.get('/dept-growth', (0, auth_middleware_1.requireRole)(80), analytics_controller_1.AnalyticsController.getDepartmentGrowth); // Director+
router.get('/personal', analytics_controller_1.AnalyticsController.getPersonalStats); // Any authenticated user (Staff)
exports.default = router;
