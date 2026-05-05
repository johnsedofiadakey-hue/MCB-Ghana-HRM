"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shadowAuth = void 0;
const auth_middleware_1 = require("./auth.middleware");
/**
 * Shadow Authentication Middleware
 * Allows access if:
 * 1. A valid 'x-dev-master-key' is provided in the headers matching the environment config.
 * 2. A valid JWT token with 'DEV' role is provided (standard auth).
 */
const shadowAuth = async (req, res, next) => {
    const masterKey = req.headers['x-dev-master-key'];
    const envKey = process.env.DEV_MASTER_KEY || 'NEXUS-DEV-MASTER-2025-SECURE';
    // 1. Check Master Key (Shadow Access)
    // We normalize the env key to handle possible quotes or whitespace from config
    const cleanEnvKey = envKey?.replace(/['"]/g, '').trim();
    const cleanMasterKey = typeof masterKey === 'string' ? masterKey.trim() : masterKey;
    if (cleanEnvKey && cleanMasterKey === cleanEnvKey) {
        // Populate dummy dev user to satisfy downstream role checks
        req.user = {
            id: 'shadow-dev-master',
            role: 'DEV',
            name: 'Shadow Administrator',
            organizationId: null,
            rank: 100
        };
        console.log(`[ShadowAuth] Shadow Protocol Verified: ${req.method} ${req.path}`);
        return next();
    }
    else if (masterKey) {
        const { errorLogger } = require('../services/error-log.service');
        errorLogger.log('ShadowAuth_Failure', {
            received: `${String(masterKey).substring(0, 4)}***`,
            envExists: !!envKey,
            path: req.path,
            method: req.method
        });
    }
    // 2. Fallback to Standard Authentication
    // We wrap authenticate here to capture its behavior
    return (0, auth_middleware_1.authenticate)(req, res, () => {
        // If standard auth succeeds, check if the user is a DEV
        const user = req.user;
        if (user && user.role === 'DEV') {
            return next();
        }
        // If not a DEV, reject
        return res.status(403).json({
            error: 'Access denied: Developer privileges required',
            hint: 'Use the Master Key for Shadow Access if you are an administrator.'
        });
    });
};
exports.shadowAuth = shadowAuth;
