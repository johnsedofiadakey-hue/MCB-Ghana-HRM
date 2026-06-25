"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiLimiter = exports.devLimiter = exports.exportLimiter = exports.generalLimiter = exports.passwordResetLimiter = exports.loginLimiter = void 0;
const express_rate_limit_1 = require("express-rate-limit");
const jsonResponse = (res, status, message) => res.status(status).json({ error: message });
/**
 * Strict limiter for login — 10 attempts per 15 minutes per IP.
 * After 10 failures the attacker must wait 15 min.
 */
exports.loginLimiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 10,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many login attempts. Please wait 15 minutes and try again.' },
    skipSuccessfulRequests: true, // Only counts failed attempts
});
/**
 * Password reset — 5 requests per hour per IP (prevents email spam).
 */
exports.passwordResetLimiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: 60 * 60 * 1000, // 1 hour
    limit: 5,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many password reset requests. Please try again in an hour.' },
});
/**
 * General API limiter — 300 requests per minute per identifier.
 * Uses userId if authenticated, fallback to IP.
 */
exports.generalLimiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: 60 * 1000,
    limit: 300, // Hardened from 2000 to prevent automated bombardment
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req) => {
        // Prefer userId so shared office IPs don't share a single bucket.
        // auth middleware hasn't run yet at this point, so we decode the JWT
        // payload directly (no verification needed — this is only for key selection).
        if (req.user?.id)
            return req.user.id;
        try {
            const authHeader = req.headers.authorization;
            if (authHeader?.startsWith('Bearer ')) {
                const payloadB64 = authHeader.split('.')[1];
                if (payloadB64) {
                    const decoded = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
                    if (decoded?.id)
                        return decoded.id;
                }
            }
        }
        catch { }
        return req.ip || 'anonymous';
    },
    message: { error: 'Too many requests. Please slow down.' },
    skip: (req) => req.originalUrl?.startsWith('/api/dev'), // Robust DEV bypass
});
/**
 * Export limiter — exports are expensive, limit to 20 per 5 minutes.
 */
exports.exportLimiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: 5 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.id || req.ip,
    message: { error: 'Too many export requests. Please wait a few minutes.' },
});
/**
 * DEV limiter — very high limit for DEV command center telemetry.
 */
exports.devLimiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: 60 * 1000,
    limit: 1000,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many DEV requests.' },
});
/**
 * AI/Bot limiter — protects the Cortex intelligence engine from token incineration.
 */
exports.aiLimiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: 60 * 1000,
    limit: 20, // Strict limit for expensive AI operations
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.id || req.ip,
    message: { error: 'Cortex is processing too many requests. Please wait a minute.' },
});
