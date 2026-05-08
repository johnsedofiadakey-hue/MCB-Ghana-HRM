"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const compensation_controller_1 = require("../controllers/compensation.controller");
const router = (0, express_1.Router)();
// Only HR_ADMIN, DIRECTOR, and MD can view/edit salaries
router.get('/:employeeId', auth_middleware_1.authenticate, (0, auth_middleware_1.authorizeMinimumRole)('DIRECTOR'), compensation_controller_1.getCompensationHistory);
router.post('/:employeeId', auth_middleware_1.authenticate, (0, auth_middleware_1.authorizeMinimumRole)('DIRECTOR'), compensation_controller_1.addCompensationRecord);
exports.default = router;
