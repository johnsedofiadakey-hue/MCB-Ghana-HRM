"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.subscriptionGuard = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const subscriptionGuard = async (req, res, next) => {
    // Bypass for auth, settings, and dev routes to prevent lockouts
    if (req.path.startsWith('/api/auth') || req.path.startsWith('/api/dev') || req.path.startsWith('/api/settings')) {
        return next();
    }
    const userRole = req.user?.role;
    const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
    // Developers completely bypass billing lockdowns
    if (userRole === 'DEV') {
        return next();
    }
    try {
        const [settings, org] = await Promise.all([
            client_1.default.systemSettings.findFirst({ where: { organizationId } }),
            client_1.default.organization.findUnique({
                where: { id: organizationId },
                select: {
                    billingStatus: true,
                    isSuspended: true,
                    trialStartDate: true,
                }
            })
        ]);
        // 1. Global Maintenance Switch
        if (settings?.isMaintenanceMode) {
            return res.status(503).json({ error: 'System is currently undergoing maintenance. Please try again later.' });
        }
        if (!org)
            return next();
        // 2. SaaS Expiration Lockout — check org billing status
        if (org.isSuspended || org.billingStatus === 'SUSPENDED') {
            return res.status(402).json({
                error: 'System Subscription Expired',
                message: 'Your SaaS subscription has lapsed. Please renew access.'
            });
        }
        // 3. 14-Day Trial Logic
        if (org.billingStatus === 'FREE' || !org.billingStatus) {
            const now = new Date();
            const trialStart = new Date(org.trialStartDate);
            const trialDays = 14;
            const expiryDate = new Date(trialStart.getTime() + trialDays * 24 * 60 * 60 * 1000);
            if (now > expiryDate) {
                return res.status(402).json({
                    error: 'Trial period has expired.',
                    message: 'Your 14-day trial has ended. Please upgrade to a paid plan to continue using the platform.'
                });
            }
        }
        next();
    }
    catch (error) {
        console.error('Failed to verify subscription status:', error);
        next();
    }
};
exports.subscriptionGuard = subscriptionGuard;
