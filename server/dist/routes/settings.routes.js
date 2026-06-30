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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const crypto_1 = __importDefault(require("crypto"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const settingsController = __importStar(require("../controllers/settings.controller"));
const purge_service_1 = require("../services/purge.service");
const client_1 = __importDefault(require("../prisma/client"));
const router = (0, express_1.Router)();
// Public — branding loads on login page before auth
router.get('/', settingsController.getSettings);
router.get('/organization', settingsController.getSettings);
router.get('/admin', auth_middleware_1.authenticate, (0, auth_middleware_1.requireSpecificRole)(['IT_MANAGER', 'IT_ADMIN', 'MD', 'DEV']), settingsController.getSettings);
// Admin Only Update
router.put('/', auth_middleware_1.authenticate, (0, auth_middleware_1.requireSpecificRole)(['IT_MANAGER', 'IT_ADMIN', 'MD', 'DEV']), settingsController.updateSettings);
router.patch('/organization', auth_middleware_1.authenticate, (0, auth_middleware_1.requireSpecificRole)(['IT_MANAGER', 'IT_ADMIN', 'MD', 'DEV']), settingsController.updateSettings);
router.put('/organization', auth_middleware_1.authenticate, (0, auth_middleware_1.requireSpecificRole)(['IT_MANAGER', 'IT_ADMIN', 'MD', 'DEV']), settingsController.updateSettings);
// ── ATTENDANCE HARDWARE ──────────────────────────────────────────────────────
// Generate / rotate the hardware attendance API key (returned once, then masked)
router.post('/rotate-attendance-key', auth_middleware_1.authenticate, (0, auth_middleware_1.requireSpecificRole)(['MD', 'HR_DIRECTOR', 'DEV']), async (req, res) => {
    try {
        const orgId = req.user?.organizationId || 'mcb-ghana-tenant';
        const newKey = crypto_1.default.randomBytes(32).toString('hex');
        await client_1.default.organization.update({
            where: { id: orgId },
            data: { attendanceApiKey: newKey }
        });
        // Only time the full key is returned — store it immediately
        res.json({ attendanceApiKey: newKey });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Toggle attendance scanning on/off
router.patch('/attendance-scanning', auth_middleware_1.authenticate, (0, auth_middleware_1.requireSpecificRole)(['MD', 'HR_DIRECTOR', 'DEV']), async (req, res) => {
    try {
        const orgId = req.user?.organizationId || 'mcb-ghana-tenant';
        const { enabled } = req.body;
        if (typeof enabled !== 'boolean')
            return res.status(400).json({ error: 'enabled must be a boolean' });
        const updated = await client_1.default.organization.update({
            where: { id: orgId },
            data: { attendanceScanningEnabled: enabled }
        });
        res.json({ attendanceScanningEnabled: updated.attendanceScanningEnabled });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Toggle Tier 2 pension and update rate
router.patch('/tier2-pension', auth_middleware_1.authenticate, (0, auth_middleware_1.requireSpecificRole)(['MD', 'HR_DIRECTOR', 'FINANCE_MANAGER', 'DEV']), async (req, res) => {
    try {
        const orgId = req.user?.organizationId || 'mcb-ghana-tenant';
        const { enabled, rate } = req.body;
        const data = {};
        if (typeof enabled === 'boolean')
            data.tier2PensionEnabled = enabled;
        if (typeof rate === 'number' && rate >= 0 && rate <= 0.20)
            data.tier2PensionRate = rate;
        if (!Object.keys(data).length)
            return res.status(400).json({ error: 'Provide enabled (boolean) or rate (0–0.20)' });
        const updated = await client_1.default.organization.update({ where: { id: orgId }, data });
        res.json({ tier2PensionEnabled: updated.tier2PensionEnabled, tier2PensionRate: Number(updated.tier2PensionRate) });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// DANGER: Purge all transactional data (MD/DEV only — production onboarding)
router.post('/purge-data', auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)(95), async (req, res) => {
    const provided = String(req.body?.recoverySecret || '');
    const configured = String(process.env.PURGE_RECOVERY_SECRET || '');
    const valid = configured.length >= 16
        && provided.length === configured.length
        && crypto_1.default.timingSafeEqual(Buffer.from(provided), Buffer.from(configured));
    if (!valid) {
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
