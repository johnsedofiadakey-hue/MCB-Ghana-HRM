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
exports.updateSettings = exports.getSettings = void 0;
const settingsService = __importStar(require("../services/settings.service"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const getSettings = async (req, res) => {
    try {
        const user = req.user;
        const resolvedOrgId = req.organizationId;
        // CRITICAL: Prioritize the ID resolved from the domain/subdomain context
        const orgId = resolvedOrgId || user?.organizationId || 'mcb-ghana-tenant';
        const isAdmin = user ? (0, auth_middleware_1.getRoleRank)(user.role) >= 85 : false;
        const settings = await settingsService.getSettings(orgId, isAdmin);
        res.json(settings || {});
    }
    catch (error) {
        console.error('[SettingsController] Critical failure fetching settings:', error);
        res.json({
            companyName: 'MC-BAUCHEMIE GHANA',
            name: 'MC-BAUCHEMIE GHANA',
            subtitle: 'Enterprise Portal',
            logoUrl: '',
            primaryColor: '#4F46E5',
            themePreset: 'premium-canvas',
            bgMain: '#f9fafb',
            textPrimary: '#0f172a'
        });
    }
};
exports.getSettings = getSettings;
const updateSettings = async (req, res) => {
    try {
        const user = req.user;
        const resolvedOrgId = req.organizationId;
        if ((0, auth_middleware_1.getRoleRank)(user.role) < 85) {
            return res.status(403).json({ error: 'Only IT/HR Managers or MD can update admin settings' });
        }
        const orgId = resolvedOrgId || user?.organizationId || 'mcb-ghana-tenant';
        const settings = await settingsService.updateSettings(orgId, req.body);
        res.json(settings);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.updateSettings = updateSettings;
