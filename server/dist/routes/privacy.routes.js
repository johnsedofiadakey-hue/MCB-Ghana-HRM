"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const privacy_controller_1 = require("../controllers/privacy.controller");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
// Any employee can export their own data
router.get('/my-data-export', privacy_controller_1.exportMyData);
// Admin only
router.post('/anonymise/:employeeId', (0, auth_middleware_1.requireRole)(80), privacy_controller_1.anonymiseEmployee);
router.get('/retention-report', (0, auth_middleware_1.requireRole)(80), privacy_controller_1.getDataRetentionReport);
exports.default = router;
