"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const card_controller_1 = require("../controllers/card.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_middleware_1.authenticate);
const itRoles = ['IT_MANAGER', 'IT_ADMIN', 'MD', 'DEV'];
router.post('/cards', (0, auth_middleware_1.requireSpecificRole)(itRoles), card_controller_1.CardController.requestCard);
router.patch('/cards/:id/activate', (0, auth_middleware_1.requireSpecificRole)(itRoles), card_controller_1.CardController.activateCard);
router.patch('/cards/:id/suspend', (0, auth_middleware_1.requireSpecificRole)(itRoles), card_controller_1.CardController.suspendCard);
router.patch('/cards/:id/revoke', (0, auth_middleware_1.requireSpecificRole)(itRoles), card_controller_1.CardController.revokeCard);
router.put('/cards/:id', (0, auth_middleware_1.requireSpecificRole)(itRoles), card_controller_1.CardController.updateCard);
router.get('/cards', card_controller_1.CardController.getCards);
router.get('/cards/:id/history', (0, auth_middleware_1.requireSpecificRole)(itRoles), card_controller_1.CardController.getCardHistory);
exports.default = router;
