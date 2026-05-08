"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const settingsController = __importStar(require("../controllers/settings.controller"));
const purge_service_1 = require("../services/purge.service");
const router = (0, express_1.Router)();
// Public — branding loads on login page before auth
router.get('/', settingsController.getSettings);
router.get('/organization', settingsController.getSettings);
// Admin Only Update
router.put('/', auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)(85), settingsController.updateSettings);
router.patch('/organization', auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)(85), settingsController.updateSettings);
router.put('/organization', auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)(85), settingsController.updateSettings);
// DANGER: Purge all transactional data (MD/DEV only — production onboarding)
router.post('/purge-data', auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)(95), async (req, res) => {
    const { pin } = req.body;
    if (pin !== '5646') {
        return res.status(403).json({ error: 'Security PIN verification failed. Access denied.' });
    }
    try {
        const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
        const result = await purge_service_1.PurgeService.purgeTransactionalData(organizationId);
        res.json({ success: true, message: 'All transactional data has been permanently wiped.', ...result });
    }
    catch (err) {
        console.error('[PURGE] Error:', err);
        res.status(500).json({ error: err.message || 'Purge failed' });
    }
});
exports.default = router;
