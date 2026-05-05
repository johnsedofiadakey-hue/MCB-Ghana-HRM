"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const dashboard_controller_1 = require("../controllers/dashboard.controller");
const router = (0, express_1.Router)();
router.get('/stats', auth_middleware_1.authenticate, dashboard_controller_1.getDashboardStats);
router.get('/performance', auth_middleware_1.authenticate, dashboard_controller_1.getDashboardPerformance);
exports.default = router;
