"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const payment_controller_1 = require("../controllers/payment.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Public webhook
router.post('/webhook', payment_controller_1.handleWebhook);
// Protected routes
router.get('/status', auth_middleware_1.authenticate, payment_controller_1.getPaymentStatus);
router.post('/initialize', auth_middleware_1.authenticate, payment_controller_1.initializePayment);
router.get('/receipt/:id', auth_middleware_1.authenticate, payment_controller_1.downloadReceipt);
router.post('/manual-override', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(['DEV']), payment_controller_1.manualBillingOverride);
exports.default = router;
