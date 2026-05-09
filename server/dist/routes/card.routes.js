"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const card_controller_1 = require("../controllers/card.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_middleware_1.authenticate);
router.post('/cards', card_controller_1.CardController.requestCard);
router.patch('/cards/:id/activate', card_controller_1.CardController.activateCard);
router.patch('/cards/:id/suspend', card_controller_1.CardController.suspendCard);
router.patch('/cards/:id/revoke', card_controller_1.CardController.revokeCard);
router.get('/cards', card_controller_1.CardController.getCards);
router.get('/cards/:id/history', card_controller_1.CardController.getCardHistory);
exports.default = router;
