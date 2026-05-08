import { Request, Response, NextFunction } from 'express';
import prisma from '../prisma/client';

export const subscriptionGuard = async (req: Request, res: Response, next: NextFunction) => {
    // Bypass for auth, settings, and dev routes to prevent lockouts
    if (req.path.startsWith('/api/auth') || req.path.startsWith('/api/dev') || req.path.startsWith('/api/settings')) {
        return next();
    }

    const userRole = (req as any).user?.role;
    const organizationId = (req as any).user?.organizationId || 'mcb-ghana-tenant';

    // Developers completely bypass billing lockdowns
    if (userRole === 'DEV') {
        return next();
    }

    try {
        const [settings, org] = await Promise.all([
            prisma.systemSettings.findFirst({ where: { organizationId } }),
            prisma.organization.findUnique({
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

        if (!org) return next();

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
    } catch (error) {
        console.error('Failed to verify subscription status:', error);
        next();
    }
};
