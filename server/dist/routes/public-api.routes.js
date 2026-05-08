"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const apiAuth_middleware_1 = require("../middleware/apiAuth.middleware");
const public_api_controller_1 = require("../controllers/public-api.controller");
const router = (0, express_1.Router)();
// Secure all public API routes with API Key auth
router.use(apiAuth_middleware_1.apiAuthMiddleware);
router.get('/employees', public_api_controller_1.getEmployees);
router.get('/attendance', public_api_controller_1.getAttendance);
router.get('/payroll', public_api_controller_1.getPayroll);
router.get('/appraisals', public_api_controller_1.getAppraisals);
router.get('/targets', public_api_controller_1.getTargets);
exports.default = router;
