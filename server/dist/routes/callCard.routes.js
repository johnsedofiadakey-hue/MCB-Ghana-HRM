"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const callCard_controller_1 = require("../controllers/callCard.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const permissions_1 = require("../types/permissions");
const router = (0, express_1.Router)();
// Public unauthenticated route accessed via physical QR or NFC tag
router.get('/public/call-cards/:id', callCard_controller_1.getPublicCallCard);
router.post('/public/call-cards/:id/connect', callCard_controller_1.submitConnection);
// Marketing manages call cards; employees may read only their own card.
router.post('/call-cards', auth_middleware_1.authenticate, (0, auth_middleware_1.requirePermission)(permissions_1.Permission.CALL_CARD_MANAGE), callCard_controller_1.upsertCallCard);
router.post('/call-cards/upsert', auth_middleware_1.authenticate, (0, auth_middleware_1.requirePermission)(permissions_1.Permission.CALL_CARD_MANAGE), callCard_controller_1.upsertCallCard);
router.get('/call-cards/employee/:employeeId', auth_middleware_1.authenticate, callCard_controller_1.getCallCardByEmployee);
router.get('/call-cards/connections', auth_middleware_1.authenticate, callCard_controller_1.getEmployeeConnections);
exports.default = router;
