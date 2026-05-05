"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = require("../controllers/user.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// GET /api/team/list?supervisorId=...
router.get('/list', auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)(70), user_controller_1.getMyTeam);
exports.default = router;
