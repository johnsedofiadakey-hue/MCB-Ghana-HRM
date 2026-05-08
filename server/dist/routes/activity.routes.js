"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const activity_controller_1 = require("../controllers/activity.controller");
const router = (0, express_1.Router)();
router.get('/logs', auth_middleware_1.authenticate, activity_controller_1.getActivityLogs);
exports.default = router;
