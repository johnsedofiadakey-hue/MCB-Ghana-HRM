"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.maintenanceMiddleware = exports.invalidateMaintenanceCache = void 0;
const client_1 = __importDefault(require("../prisma/client"));
// FIX: In-memory cache to avoid hitting DB on every request
let cachedSettings = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 30000; // Refresh cache every 30 seconds
const invalidateMaintenanceCache = () => {
    cachedSettings = null;
    cacheTimestamp = 0;
};
exports.invalidateMaintenanceCache = invalidateMaintenanceCache;
const maintenanceMiddleware = async (req, res, next) => {
    if (req.path.startsWith('/api/dev'))
        return next();
    if (req.path.startsWith('/api/auth'))
        return next(); // Never block login
    if (req.path.startsWith('/api/settings'))
        return next(); // Never block branding
    const devKey = req.headers['x-dev-master-key'];
    if (devKey && devKey === process.env.DEV_MASTER_KEY)
        return next();
    try {
        const now = Date.now();
        if (cachedSettings === null || now - cacheTimestamp > CACHE_TTL_MS) {
            cachedSettings = await client_1.default.systemSettings.findFirst() || {};
            cacheTimestamp = now;
        }
        // 1. Security Lockdown - Block everyone but DEV
        if (cachedSettings.securityLockdown) {
            const userRole = req.user?.role;
            if (userRole !== 'DEV') {
                return res.status(403).json({
                    message: 'Platform Security Lockdown',
                    info: cachedSettings.securityLockdownMessage || 'The platform is currently under security lockdown. All non-developer access is suspended.'
                });
            }
        }
        // 2. Standard Maintenance Mode
        if (cachedSettings.isMaintenanceMode) {
            const userRole = req.user?.role;
            if (userRole !== 'DEV') {
                return res.status(503).json({
                    message: 'System Under Maintenance',
                    info: cachedSettings.maintenanceNotice || 'The system is currently undergoing scheduled maintenance. Please try again shortly.'
                });
            }
        }
        next();
    }
    catch (error) {
        console.error('Maintenance Check Failed:', error);
        next(); // Fail open
    }
};
exports.maintenanceMiddleware = maintenanceMiddleware;
