"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const callCard_controller_1 = require("../controllers/callCard.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
const itRoles = ['IT_MANAGER', 'IT_ADMIN', 'MD', 'DEV'];
// Public unauthenticated route accessed via physical QR or NFC tag
router.get('/public/call-cards/:id', callCard_controller_1.getPublicCallCard);
router.post('/public/call-cards/:id/connect', callCard_controller_1.submitConnection);
// Secure endpoints for employees & IT managers to manage call cards
router.post('/call-cards', auth_middleware_1.authenticate, (0, auth_middleware_1.requireSpecificRole)(itRoles), callCard_controller_1.upsertCallCard);
router.post('/call-cards/upsert', auth_middleware_1.authenticate, (0, auth_middleware_1.requireSpecificRole)(itRoles), callCard_controller_1.upsertCallCard);
router.get('/call-cards/employee/:employeeId', auth_middleware_1.authenticate, callCard_controller_1.getCallCardByEmployee);
router.get('/call-cards/connections', auth_middleware_1.authenticate, callCard_controller_1.getEmployeeConnections);
exports.default = router;
