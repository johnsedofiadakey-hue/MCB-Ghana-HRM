"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkBilling = exports.requirePermission = exports.authorizeMinimumRole = exports.requireSpecificRole = exports.requireRole = exports.authorize = exports.authenticate = exports.invalidateUserCache = exports.getRoleRank = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = __importDefault(require("../prisma/client"));
const policy_service_1 = require("../services/policy.service");
if (!process.env.JWT_SECRET) {
    throw new Error('FATAL: JWT_SECRET environment variable is not set. Server cannot start safely.');
}
const JWT_SECRET = process.env.JWT_SECRET;
const roles_1 = require("../types/roles");
const normalizeRole = (role) => {
    if (!role)
        return '';
    return String(role).toUpperCase();
};
const getRoleRank = (role) => {
    const normalized = normalizeRole(role);
    if (!normalized)
        return 0;
    return roles_1.ROLE_RANK_MAP[normalized] ?? 0;
};
exports.getRoleRank = getRoleRank;
const context_1 = require("../utils/context");
// Short-lived in-memory cache to avoid a DB hit on every authenticated request.
// TTL of 30s means a terminated user can still make requests for up to 30s after
// termination — acceptable for this use-case. Cache is keyed by userId.
const _userCache = new Map();
const _USER_CACHE_TTL = 30000;
const _getCachedUser = (id) => {
    const entry = _userCache.get(id);
    if (!entry)
        return null;
    if (Date.now() - entry.at > _USER_CACHE_TTL) {
        _userCache.delete(id);
        return null;
    }
    return entry.data;
};
const _setCachedUser = (id, data) => {
    _userCache.set(id, { data, at: Date.now() });
};
// Expose for cache invalidation on role/status changes (called from user.controller etc.)
const invalidateUserCache = (id) => _userCache.delete(id);
exports.invalidateUserCache = invalidateUserCache;
const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    let token = '';
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    }
    if (!token) {
        console.warn(`[Auth Middleware] No token provided for: ${req.method} ${req.path}`);
        return res.status(401).json({ error: 'No token provided' });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        // ── DEMO SAFETY GUARD ──
        // Intercept destructive actions for demo sessions
        const isDestructive = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
        if (decoded.isDemo && isDestructive) {
            // Allow only essential paths (e.g., self-audit, UI preferences)
            const allowedPaths = ['/api/audit/heartbeat', '/api/user/prefs'];
            if (!allowedPaths.includes(req.path)) {
                return res.status(403).json({
                    error: 'Demo Mode: Modification restricted.',
                    message: 'This action is disabled in the public showroom to maintain data integrity for other visitors.',
                    isDemo: true
                });
            }
        }
        // ── S2 SECURITY FIX: Hardened Sandbox Bypass (Validate existence in DB) ──
        // If this is a sandbox token, we still perform a DB lookup to ensure account hasn't been nuked
        if (decoded.organizationId === 'sandbox-org-001') {
            const sandboxUser = await client_1.default.user.findFirst({
                where: { id: decoded.id, organizationId: 'sandbox-org-001' },
                select: { id: true, role: true, status: true, fullName: true, organizationId: true, departmentId: true }
            });
            if (!sandboxUser) {
                console.warn(`[Auth Middleware] Sandbox Account not found for ID: ${decoded.id}`);
                return res.status(401).json({ error: 'Sandbox account expired or deleted.' });
            }
            req.user = {
                id: sandboxUser.id,
                role: sandboxUser.role || 'MD',
                name: sandboxUser.fullName || 'Sandbox Operator',
                organizationId: 'sandbox-org-001',
                rank: (0, exports.getRoleRank)(sandboxUser.role || 'MD'),
            };
            return context_1.tenantContext.run({
                organizationId: 'sandbox-org-001',
                userId: sandboxUser.id,
                role: sandboxUser.role || 'MD'
            }, () => {
                next();
            });
        }
        let user = _getCachedUser(decoded.id);
        if (!user) {
            user = await client_1.default.user.findUnique({
                where: { id: decoded.id },
                select: { id: true, role: true, status: true, fullName: true, organizationId: true, departmentId: true },
            }).catch(err => {
                console.error('[Auth Middleware] Database Error:', err.message);
                throw err;
            });
            if (user)
                _setCachedUser(decoded.id, user);
        }
        if (!user) {
            console.warn(`[Auth Middleware] Account not found for ID: ${decoded.id}`);
            return res.status(401).json({ error: 'Account not found' });
        }
        if (user.status === 'TERMINATED') {
            console.warn(`[Auth Middleware] Terminated user attempting access: ${user.id}`);
            return res.status(403).json({ error: 'Your account has been deactivated. Contact HR.' });
        }
        if (user.role !== 'DEV' && !user.organizationId) {
            console.error(`[Auth Middleware] Misconfigured user (no organizationId): ${user.id}`);
            return res.status(403).json({ error: 'Account configuration error: missing organization affiliation.' });
        }
        req.user = {
            id: user.id,
            role: user.role,
            name: user.fullName,
            organizationId: user.organizationId || null,
            rank: (0, exports.getRoleRank)(user.role),
            departmentId: user.departmentId || null,
            isDemo: decoded.isDemo || false,
        };
        // Run the rest of the request within the tenant context
        context_1.tenantContext.run({
            organizationId: user.organizationId || null,
            userId: user.id,
            role: user.role || null
        }, () => {
            next();
        });
    }
    catch (error) {
        if (error.name === 'TokenExpiredError') {
            console.log(`[Auth Middleware] Token expired for: ${req.path}`);
            return res.status(401).json({ error: 'Session expired. Please log in again.' });
        }
        if (error.name === 'JsonWebTokenError') {
            console.warn(`[Auth Middleware] Invalid token for: ${req.path} - ${error.message}`);
            return res.status(401).json({ error: 'Invalid token' });
        }
        console.error('[Auth Middleware] Critical Error:', error.message);
        return res.status(500).json({ error: 'Internal Authentication Error' });
    }
};
exports.authenticate = authenticate;
const authorize = (allowedRoles) => {
    return (req, res, next) => {
        const userRole = req.user?.role;
        const userRank = (0, exports.getRoleRank)(userRole);
        // DEV bypass
        if (normalizeRole(userRole) === 'DEV')
            return next();
        // Map allowed roles to their required ranks
        const allowedRanks = allowedRoles.map(r => (0, exports.getRoleRank)(r));
        if (allowedRanks.includes(userRank)) {
            return next();
        }
        console.warn(`[Auth] Access denied for role: ${userRole} (Rank: ${userRank}). Required ranks: ${allowedRanks.join(', ')}`);
        return res.status(403).json({ error: 'Access denied: insufficient permissions' });
    };
};
exports.authorize = authorize;
// New middleware required by directive: requireRole(rank)
const requireRole = (rank) => {
    return (req, res, next) => {
        const userRole = req.user?.role;
        const userRank = (0, exports.getRoleRank)(userRole);
        if (userRank >= rank) {
            return next();
        }
        return res.status(403).json({
            error: `Access denied: requires role rank ${rank}+`,
            debug: { userRole, userRank, requiredRank: rank }
        });
    };
};
exports.requireRole = requireRole;
const requireSpecificRole = (allowedRoles) => {
    return (req, res, next) => {
        const userRole = req.user?.role;
        const normalizedUserRole = userRole ? String(userRole).toUpperCase() : '';
        // DEV bypass
        if (normalizedUserRole === 'DEV')
            return next();
        // Normalize allowed roles
        const normalizedAllowedRoles = allowedRoles.map(r => String(r).toUpperCase());
        if (normalizedAllowedRoles.includes(normalizedUserRole)) {
            return next();
        }
        return res.status(403).json({ error: 'Access denied: insufficient permissions' });
    };
};
exports.requireSpecificRole = requireSpecificRole;
const authorizeMinimumRole = (minimumRole) => {
    const requiredRank = (0, exports.getRoleRank)(minimumRole);
    if (!requiredRank) {
        return (_req, res) => res.status(500).json({ error: `[Config] authorizeMinimumRole: unknown role "${minimumRole}"` });
    }
    return (0, exports.requireRole)(requiredRank);
};
exports.authorizeMinimumRole = authorizeMinimumRole;
const requirePermission = (permission, getContext) => {
    return async (req, res, next) => {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const context = getContext ? getContext(req) : {};
        // Add default context if missing
        if (!context.targetUserId && req.params.userId)
            context.targetUserId = req.params.userId;
        if (!context.departmentId && req.params.departmentId)
            context.departmentId = parseInt(req.params.departmentId);
        const result = await policy_service_1.PolicyService.evaluatePolicy(user.id, permission, context);
        if (!result.allowed) {
            return res.status(403).json({ error: `Forbidden: ${result.reason}` });
        }
        next();
    };
};
exports.requirePermission = requirePermission;
const checkBilling = async (req, res, next) => {
    const user = req.user;
    if (!user || user.role === 'DEV')
        return next();
    try {
        const org = await client_1.default.organization.findUnique({
            where: { id: user.organizationId || 'mcb-ghana-tenant' },
            select: {
                billingStatus: true,
                trialStartDate: true,
                trialEndsAt: true,
                isSuspended: true,
            }
        });
        if (!org)
            return next();
        // 1. Check if manually suspended
        if (org.isSuspended || org.billingStatus === 'SUSPENDED') {
            return res.status(403).json({
                error: 'Subscription suspended.',
                code: 'BILLING_SUSPENDED'
            });
        }
        // 2. Check 14-day trial window
        const now = new Date();
        const trialStart = new Date(org.trialStartDate);
        const trialDays = 14;
        const expiryDate = new Date(trialStart.getTime() + trialDays * 24 * 60 * 60 * 1000);
        if (org.billingStatus === 'FREE' || !org.billingStatus) {
            if (now > expiryDate) {
                return res.status(402).json({
                    error: 'Trial period has expired. Please upgrade to continue.',
                    code: 'TRIAL_EXPIRED'
                });
            }
        }
        next();
    }
    catch (error) {
        console.error('[Billing Guard] Error:', error.message);
        next(); // Fail open for billing to avoid lockouts on DB issues, but log it
    }
};
exports.checkBilling = checkBilling;
