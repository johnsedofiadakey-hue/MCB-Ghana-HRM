"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const continuous_performance_controller_1 = require("../controllers/continuous-performance.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_middleware_1.authenticate);
// Check-ins
router.post('/check-ins', continuous_performance_controller_1.ContinuousPerformanceController.scheduleCheckIn);
router.patch('/check-ins/:id/complete', continuous_performance_controller_1.ContinuousPerformanceController.completeCheckIn);
router.get('/check-ins', continuous_performance_controller_1.ContinuousPerformanceController.getCheckIns);
// 360 Feedback
router.post('/feedback', continuous_performance_controller_1.ContinuousPerformanceController.submitFeedback);
router.get('/feedback', continuous_performance_controller_1.ContinuousPerformanceController.getFeedback);
exports.default = router;
