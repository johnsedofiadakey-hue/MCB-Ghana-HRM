"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSecurityThreats = exports.getLiveLogs = exports.itCleanupLogs = exports.itDeactivateUser = exports.itGetUsers = exports.itSystemOverview = exports.itResetPassword = exports.itCreateEmployee = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const email_service_1 = require("../services/email.service");
const crypto_1 = __importDefault(require("crypto"));
const audit_service_1 = require("../services/audit.service");
const websocket_service_1 = require("../services/websocket.service");
const workspace_service_1 = require("../services/workspace.service");
/**
 * IT Admin specific controller.
 * IT Admins can:
 *   - Create and manage user accounts (not salary/payroll)
 *   - Manage asset inventory and assignment
 *   - Reset employee passwords (force reset flag)
 *   - View system users (no salary data)
 *   - Manage onboarding IT tasks
 */
// Create employee account (IT Admin version — no salary fields exposed)
const itCreateEmployee = async (req, res) => {
    return res.status(405).json({
        error: 'HR must create the preboarding employee record. IT provisions and activates the resulting account.',
    });
};
exports.itCreateEmployee = itCreateEmployee;
// Force password reset — sends a one-time link to the user's email.
const itResetPassword = async (req, res) => {
    try {
        const { userId } = req.params;
        // @ts-ignore
        const actorId = req.user?.id;
        const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
        const user = await client_1.default.user.findFirst({ where: { id: userId, organizationId }, select: { id: true, email: true, fullName: true } });
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        const rawToken = crypto_1.default.randomBytes(32).toString('hex');
        const token = crypto_1.default.createHash('sha256').update(rawToken).digest('hex');
        await client_1.default.$transaction([
            client_1.default.passwordResetToken.deleteMany({ where: { userId: user.id } }),
            client_1.default.passwordResetToken.create({ data: { userId: user.id, token, expiresAt: new Date(Date.now() + 60 * 60 * 1000) } }),
        ]);
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${rawToken}`;
        const sent = await (0, email_service_1.sendEmail)({
            to: user.email,
            subject: 'MCB HRM password reset invitation',
            html: `<p>Hello ${user.fullName},</p><p>IT initiated a secure password reset. This link expires in one hour.</p><p><a href="${resetUrl}">Choose a new password</a></p>`,
        });
        if (!sent) {
            return res.status(503).json({ error: 'Password-reset email could not be delivered. Verify SMTP settings and retry.' });
        }
        await client_1.default.$transaction([
            client_1.default.refreshToken.updateMany({ where: { userId: user.id, organizationId, revokedAt: null }, data: { revokedAt: new Date() } }),
            client_1.default.user.update({ where: { id: user.id }, data: { mustChangePassword: true } }),
        ]);
        await (0, websocket_service_1.notify)(user.id, 'Password Reset Requested', 'IT sent a secure password-reset link to your email.', 'WARNING');
        await (0, audit_service_1.logAction)(actorId, 'IT_PASSWORD_RESET_INVITED', 'User', userId, { email: user.email }, req.ip);
        res.json({ success: true, message: `Password-reset invitation sent to ${user.email}` });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.itResetPassword = itResetPassword;
// Get system overview for IT dashboard
const itSystemOverview = async (req, res) => {
    try {
        const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
        const requesterRank = req.user?.rank || 0;
        const devFilter = requesterRank < 100 ? { role: { not: 'DEV' }, rank: { lt: 100 } } : {};
        const [totalUsers, activeUsers, assets, availableAssets, assignedAssets, vaultStatus, totalAuditLogs, biometricLogCount] = await Promise.all([
            client_1.default.user.count({ where: { organizationId, ...devFilter } }),
            client_1.default.user.count({ where: { status: 'ACTIVE', organizationId, ...devFilter } }),
            client_1.default.asset.count({ where: { organizationId } }),
            client_1.default.asset.count({ where: { status: 'AVAILABLE', organizationId } }),
            client_1.default.asset.count({ where: { status: 'ASSIGNED', organizationId } }),
            workspace_service_1.GoogleWorkspaceService.checkHealth(),
            client_1.default.auditLog.count({ where: { organizationId } }),
            client_1.default.attendanceLog.count({ where: { organizationId, source: 'BIOMETRIC' } })
        ]);
        const recentAccounts = await client_1.default.user.findMany({
            where: { organizationId, ...devFilter },
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: { id: true, fullName: true, email: true, role: true, status: true, createdAt: true, jobTitle: true }
        });
        const nodes = await client_1.default.asset.findMany({
            where: { organizationId, type: { contains: 'BIOMETRIC', mode: 'insensitive' } },
            select: { id: true, name: true, description: true, status: true }
        });
        const systemHealth = {
            nodeVersion: process.version,
            platform: process.platform,
            uptime: Math.floor(process.uptime()),
            dbConnectivity: true,
            totalAuditLogs,
            biometricLogCount,
            syncState: biometricLogCount > 0 ? 'ACTIVE' : 'IDLE'
        };
        res.json({
            totalUsers, activeUsers, assets, availableAssets, assignedAssets,
            recentAccounts, systemHealth, vaultStatus, nodes
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.itSystemOverview = itSystemOverview;
// Get all users (no salary data) for IT management
const itGetUsers = async (req, res) => {
    try {
        const requesterRank = req.user?.rank || 0;
        const devFilter = requesterRank < 100 ? { role: { not: 'DEV' }, rank: { lt: 100 } } : {};
        const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
        const users = await client_1.default.user.findMany({
            where: { organizationId, ...devFilter },
            orderBy: { fullName: 'asc' },
            select: {
                id: true, fullName: true, email: true, role: true, status: true,
                jobTitle: true, employeeCode: true, departmentObj: { select: { name: true } },
                createdAt: true, avatarUrl: true, contactNumber: true
            }
        });
        res.json(users);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.itGetUsers = itGetUsers;
// Deactivate account (IT can disable, not delete)
const itDeactivateUser = async (req, res) => {
    try {
        const { userId } = req.params;
        // @ts-ignore
        const actorId = req.user?.id;
        const user = await client_1.default.user.update({
            where: { id: userId },
            data: { status: 'TERMINATED' }
        });
        await (0, audit_service_1.logAction)(actorId, 'IT_ACCOUNT_DEACTIVATED', 'User', userId, { email: user.email }, req.ip);
        await (0, websocket_service_1.notify)(userId, 'Account Deactivated', 'Your account has been deactivated. Contact HR for more information.', 'WARNING');
        res.json({ success: true, message: `Account for ${user.fullName} has been deactivated` });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
exports.itDeactivateUser = itDeactivateUser;
// System Maintenance: Cleanup old logs
const itCleanupLogs = async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 90;
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() - days);
        const deletedAudit = await client_1.default.auditLog.deleteMany({
            where: { createdAt: { lt: thresholdDate } }
        });
        const deletedHistory = await client_1.default.employeeHistory.deleteMany({
            where: { createdAt: { lt: thresholdDate } }
        });
        res.json({
            success: true,
            message: `System maintenance complete. Purged logs older than ${days} days.`,
            purged: { audit: deletedAudit.count, history: deletedHistory.count }
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.itCleanupLogs = itCleanupLogs;
// ── OBSERVABILITY: LIVE AUDIT LOGS ───────────────────────────────────────────
const getLiveLogs = async (req, res) => {
    try {
        const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
        const logs = await client_1.default.auditLog.findMany({
            where: { organizationId },
            orderBy: { createdAt: 'desc' },
            take: 50,
            include: { user: { select: { fullName: true, role: true } } }
        });
        res.json(logs);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getLiveLogs = getLiveLogs;
// ── SECURITY: THREAT DETECTION MATRIX ────────────────────────────────────────
const getSecurityThreats = async (req, res) => {
    try {
        const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
        const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
        // 1. Check for rapid password resets
        const suspiciousResets = await client_1.default.auditLog.count({
            where: {
                organizationId,
                action: 'IT_PASSWORD_RESET',
                createdAt: { gte: hourAgo }
            }
        });
        // 2. Check for bulk deactivations
        const suspiciousDeactivations = await client_1.default.auditLog.count({
            where: {
                organizationId,
                action: 'IT_ACCOUNT_DEACTIVATED',
                createdAt: { gte: hourAgo }
            }
        });
        res.json({
            threatLevel: suspiciousResets > 5 || suspiciousDeactivations > 3 ? 'CRITICAL' : 'STABLE',
            alerts: [
                suspiciousResets > 5 ? 'Rapid password reset activity detected (5+ in 1hr)' : null,
                suspiciousDeactivations > 3 ? 'Unusual bulk deactivation activity detected' : null
            ].filter(Boolean),
            metrics: { suspiciousResets, suspiciousDeactivations }
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getSecurityThreats = getSecurityThreats;
