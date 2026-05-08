"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiGuard = void 0;
const client_1 = __importDefault(require("../prisma/client"));
/**
 * AI Guard Middleware
 *
 * Intercepts AI-related requests and verifies if the organization has
 * enabled Cortex AI features in their global settings.
 */
const aiGuard = async (req, res, next) => {
    try {
        const organizationId = req.organizationId || req.user?.organizationId || 'mcb-ghana-tenant';
        // Check if it's a DEV account (Rank 100) - they bypass guards for testing
        if (req.user?.role === 'DEV') {
            return next();
        }
        const org = await client_1.default.organization.findUnique({
            where: { id: organizationId },
            select: { isAiEnabled: true }
        });
        if (!org || !org.isAiEnabled) {
            return res.status(403).json({
                error: 'AI_DISABLED',
                message: 'Strategic Cortex AI features are currently deactivated by your institutional administrator. Contact IT/HR to enable AI intelligence.'
            });
        }
        next();
    }
    catch (err) {
        console.error('[AIGuard] Critical failure:', err);
        // Fail closed for security/privacy
        res.status(500).json({ error: 'AI_VERIFICATION_FAILURE', message: 'Could not verify institutional AI compliance status.' });
    }
};
exports.aiGuard = aiGuard;
