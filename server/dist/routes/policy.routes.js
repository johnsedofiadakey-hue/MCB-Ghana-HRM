"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const policy_controller_1 = require("../controllers/policy.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Only admins/HR Managers (rank 88+) can simulate policies
router.post('/simulate', auth_middleware_1.authenticate, (0, auth_middleware_1.requireSpecificRole)(['HR_DIRECTOR', 'HR_MANAGER', 'MD', 'DEV']), policy_controller_1.PolicyController.simulate);
exports.default = router;
