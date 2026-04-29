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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.itCleanupLogs = exports.itDeactivateUser = exports.itGetUsers = exports.itSystemOverview = exports.itResetPassword = exports.itCreateEmployee = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const userService = __importStar(require("../services/user.service"));
const email_service_1 = require("../services/email.service");
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
    try {
        // Strip salary/compensation fields — IT Admin should not set these
        const { salary, currency, ...safeData } = req.body;
        const tempPassword = safeData.password || 'SecureInit!';
        const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
        const user = await userService.createUser(organizationId, { ...safeData, password: tempPassword });
        const { passwordHash, ...safeUser } = user;
        // Send welcome email asynchronously
        const settings = await client_1.default.systemSettings.findFirst();
        (0, email_service_1.sendWelcomeEmail)(user.email, user.fullName, tempPassword, settings?.companyName || 'HRM Engine').catch(console.error);
        // Audit log
        // @ts-ignore
        await (0, audit_service_1.logAction)(req.user?.id, 'IT_ADMIN_CREATE_ACCOUNT', 'User', user.id, { email: user.email, role: user.role }, req.ip);
        // Notify HR and IT leadership
        const leadership = await client_1.default.user.findMany({
            where: { role: { in: ['MD', 'DIRECTOR', 'HR_OFFICER', 'IT_MANAGER'] } },
            select: { id: true }
        });
        for (const admin of leadership) {
            await (0, websocket_service_1.notify)(admin.id, 'New Account Created', `IT Admin created account for ${user.fullName} (${user.email})`, 'INFO', '/employees');
        }
        res.status(201).json({ ...safeUser, message: `Account created. Welcome email sent to ${user.email}.` });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.itCreateEmployee = itCreateEmployee;
// Force password reset — sends a new temp password to the user's email
const itResetPassword = async (req, res) => {
    try {
        const { userId } = req.params;
        // @ts-ignore
        const actorId = req.user?.id;
        const user = await client_1.default.user.findUnique({ where: { id: userId }, select: { id: true, email: true, fullName: true } });
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        const bcrypt = await Promise.resolve().then(() => __importStar(require('bcryptjs')));
        const tempPassword = `MCB${Math.random().toString(36).slice(-6).toUpperCase()}!`;
        const passwordHash = await bcrypt.default.hash(tempPassword, 12);
        await client_1.default.user.update({ where: { id: userId }, data: { passwordHash } });
        const settings = await client_1.default.systemSettings.findFirst();
        (0, email_service_1.sendWelcomeEmail)(user.email, user.fullName, tempPassword, settings?.companyName || 'MCB-HRM Ghana').catch(console.error);
        await (0, websocket_service_1.notify)(user.id, 'Password Reset', 'Your password has been reset by IT. Check your email for the temporary password.', 'WARNING');
        await (0, audit_service_1.logAction)(actorId, 'IT_PASSWORD_RESET', 'User', userId, { email: user.email }, req.ip);
        res.json({ success: true, message: `Temporary password sent to ${user.email}` });
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
            recentAccounts, systemHealth, vaultStatus
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
