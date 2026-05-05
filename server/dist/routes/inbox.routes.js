"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const inbox_controller_1 = require("../controllers/inbox.controller");
const router = (0, express_1.Router)();
router.get('/', auth_middleware_1.authenticate, inbox_controller_1.getInboxActions);
exports.default = router;
