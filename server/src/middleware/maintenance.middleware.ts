import { Request, Response, NextFunction } from 'express';
import prisma from '../prisma/client';

// FIX: In-memory cache to avoid hitting DB on every request
let cachedSettings: any | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 30_000; // Refresh cache every 30 seconds

export const invalidateMaintenanceCache = () => {
    cachedSettings = null;
    cacheTimestamp = 0;
};

export const maintenanceMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api/dev')) return next();
    if (req.path.startsWith('/api/auth')) return next(); // Never block login
    if (req.path.startsWith('/api/settings')) return next(); // Never block branding

    const devKey = req.headers['x-dev-master-key'];
    if (devKey && devKey === process.env.DEV_MASTER_KEY) return next();

    try {
        const now = Date.now();
        if (cachedSettings === null || now - cacheTimestamp > CACHE_TTL_MS) {
            cachedSettings = await prisma.systemSettings.findFirst() || {};
            cacheTimestamp = now;
        }

        // 1. Security Lockdown - Block everyone but DEV
        if (cachedSettings.securityLockdown) {
            const userRole = (req as any).user?.role;
            if (userRole !== 'DEV') {
                return res.status(403).json({
                    message: 'Platform Security Lockdown',
                    info: cachedSettings.securityLockdownMessage || 'The platform is currently under security lockdown. All non-developer access is suspended.'
                });
            }
        }

        // 2. Standard Maintenance Mode
        if (cachedSettings.isMaintenanceMode) {
            const userRole = (req as any).user?.role;
            if (userRole !== 'DEV') {
                return res.status(503).json({
                    message: 'System Under Maintenance',
                    info: cachedSettings.maintenanceNotice || 'The system is currently undergoing scheduled maintenance. Please try again shortly.'
                });
            }
        }

        next();
    } catch (error) {
        console.error('Maintenance Check Failed:', error);
        next(); // Fail open
    }
};
