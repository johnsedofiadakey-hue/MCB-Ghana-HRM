"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const integrations_controller_1 = require("../controllers/integrations.controller");
const router = (0, express_1.Router)();
// Only top level tenant admins (Rank 90+) can manage integrations
router.use(auth_middleware_1.authenticate);
router.use((0, auth_middleware_1.requireRole)(90));
// API Keys
router.get('/keys', integrations_controller_1.listApiKeys);
router.post('/keys', integrations_controller_1.createApiKey);
router.delete('/keys/:id', integrations_controller_1.revokeApiKey);
// Webhooks
router.get('/webhooks', integrations_controller_1.listWebhooks);
router.post('/webhooks', integrations_controller_1.createWebhook);
router.delete('/webhooks/:id', integrations_controller_1.deleteWebhook);
exports.default = router;
