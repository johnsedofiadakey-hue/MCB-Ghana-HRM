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
exports.sandboxLogin = exports.impersonateTenant = exports.signup = exports.resetPassword = exports.forgotPassword = exports.changePassword = exports.getMe = exports.revokeRefreshToken = exports.refreshAccessToken = exports.ssoLogin = exports.login = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const client_1 = __importDefault(require("../prisma/client"));
const email_service_1 = require("../services/email.service");
const roles_1 = require("../types/roles");
const policy_service_1 = require("../services/policy.service");
const getRoleRank = (role) => {
    if (!role)
        return 0;
    return roles_1.ROLE_RANK_MAP[role.toUpperCase()] ?? 0;
};
if (!process.env.JWT_SECRET) {
    throw new Error('FATAL: JWT_SECRET is not set.');
}
const JWT_SECRET = process.env.JWT_SECRET;
const ACCESS_TOKEN_TTL = '1h';
const REFRESH_TOKEN_WINDOW_HOURS = 24; // Standard 24-hour workday session
// Corporate Password Guard: 8+ chars, 1 number, 1 special char
const isStrongPassword = (pass) => /^(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})/.test(pass);
const signAccessToken = (payload) => jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
const hashToken = (value) => crypto_1.default.createHash('sha256').update(value).digest('hex');
const getClientMeta = (req) => ({
    ipAddress: req.ip || req.socket.remoteAddress || null,
    userAgent: req.get('user-agent') || null,
});
const safeLogSecurityEvent = async (params) => {
    try {
        const { email, success, organizationId, reason, req } = params;
        const meta = getClientMeta(req);
        await client_1.default.loginSecurityEvent.create({
            data: {
                organizationId: organizationId || 'mcb-ghana-tenant',
                email: email.toLowerCase().trim(),
                success,
                reason,
                ipAddress: meta.ipAddress,
                userAgent: meta.userAgent,
            },
        });
    }
    catch {
        // Intentionally non-blocking
    }
};
const issueRefreshToken = async (userId, organizationId, req) => {
    const raw = crypto_1.default.randomBytes(48).toString('hex');
    const tokenHash = hashToken(raw);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_WINDOW_HOURS * 60 * 60 * 1000);
    const meta = getClientMeta(req);
    await client_1.default.refreshToken.create({
        data: {
            userId,
            organizationId: organizationId || 'mcb-ghana-tenant',
            tokenHash,
            ipAddress: meta.ipAddress,
            userAgent: meta.userAgent,
            expiresAt,
        },
    });
    return raw;
};
// ─── LOGIN ────────────────────────────────────────────────────────────────
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        const normalizedEmail = email.toLowerCase().trim();
        const user = await client_1.default.user.findUnique({
            where: { email: normalizedEmail },
            select: { id: true, email: true, fullName: true, role: true, status: true,
                passwordHash: true, avatarUrl: true, organizationId: true, jobTitle: true,
                departmentId: true, rank: true, loginEnabled: true, mustChangePassword: true }
        });
        if (!user) {
            await safeLogSecurityEvent({ email: normalizedEmail, success: false, organizationId: 'mcb-ghana-tenant', reason: 'USER_NOT_FOUND', req });
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        if (user.status === 'TERMINATED') {
            await safeLogSecurityEvent({ email: normalizedEmail, success: false, organizationId: user.organizationId || 'mcb-ghana-tenant', reason: 'ACCOUNT_TERMINATED', req });
            return res.status(403).json({ error: 'This account has been deactivated. Contact HR.' });
        }
        if (!user.loginEnabled) {
            await safeLogSecurityEvent({ email: normalizedEmail, success: false, organizationId: user.organizationId || 'mcb-ghana-tenant', reason: 'LOGIN_NOT_PROVISIONED', req });
            return res.status(403).json({ error: 'Login is not active yet. IT must complete account provisioning.' });
        }
        const orgId = user.organizationId || 'mcb-ghana-tenant';
        // CROSS-TENANT VALIDATION DISABLED FOR STANDALONE MODE
        const isMatch = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!isMatch) {
            await safeLogSecurityEvent({ email: normalizedEmail, success: false, organizationId: orgId, reason: 'BAD_PASSWORD', req });
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const token = signAccessToken({
            id: user.id,
            role: user.role,
            name: user.fullName,
            status: user.status || 'ACTIVE',
            organizationId: orgId,
            rank: user.rank || getRoleRank(user.role)
        });
        let refreshToken;
        try {
            refreshToken = await issueRefreshToken(user.id, orgId, req);
        }
        catch (tokenErr) {
            console.error('[Auth] Refresh token issuance failed:', tokenErr.message);
            // We still allow login but without a refresh token? No, better to fail and log.
            throw new Error(`Session security initialization failed: ${tokenErr.message}`);
        }
        await safeLogSecurityEvent({ email: normalizedEmail, success: true, organizationId: orgId, reason: 'LOGIN_OK', req });
        const permissions = await policy_service_1.PolicyService.getEffectivePermissions(user.id);
        return res.status(200).json({
            token,
            refreshToken,
            user: {
                id: user.id,
                name: user.fullName,
                email: user.email,
                role: user.role,
                jobTitle: user.jobTitle,
                rank: user.rank || getRoleRank(user.role),
                organizationId: orgId,
                avatar: user.avatarUrl,
                departmentId: user.departmentId,
                permissions,
                mustChangePassword: user.mustChangePassword,
            },
            tokenMeta: {
                accessExpiresIn: ACCESS_TOKEN_TTL,
                refreshExpiresInHours: REFRESH_TOKEN_WINDOW_HOURS,
            },
        });
    }
    catch (error) {
        console.error('[Auth] Login CRITICAL error:', error.message, error.stack);
        return res.status(500).json({
            error: 'Internal Server Error',
            message: error.message
        });
    }
};
exports.login = login;
// ─── SSO LOGIN (Google / Microsoft via Identity Token) ─────────────────────
const firebase_admin_1 = require("../services/firebase-admin");
const ssoLogin = async (req, res) => {
    try {
        const { idToken, provider } = req.body;
        if (!idToken) {
            return res.status(400).json({ error: 'OAuth ID token is required' });
        }
        let decodedToken;
        try {
            decodedToken = await firebase_admin_1.admin.auth().verifyIdToken(idToken);
        }
        catch (firebaseErr) {
            console.error('[Auth] SSO Firebase Token Verification failed:', firebaseErr);
            return res.status(401).json({ error: 'Invalid or expired SSO identity token' });
        }
        const email = decodedToken.email;
        if (!email) {
            return res.status(401).json({ error: 'No email address embedded in SSO token.' });
        }
        const normalizedEmail = email.toLowerCase().trim();
        const user = await client_1.default.user.findUnique({
            where: { email: normalizedEmail },
            select: { id: true, email: true, fullName: true, role: true, status: true,
                avatarUrl: true, organizationId: true, jobTitle: true,
                departmentId: true, loginEnabled: true, mustChangePassword: true }
        });
        if (!user) {
            await safeLogSecurityEvent({ email: normalizedEmail, success: false, organizationId: 'mcb-ghana-tenant', reason: 'SSO_USER_NOT_FOUND', req });
            return res.status(401).json({ error: `The SSO email (${normalizedEmail}) is not registered in our HR records.` });
        }
        if (user.status === 'TERMINATED') {
            await safeLogSecurityEvent({ email: normalizedEmail, success: false, organizationId: user.organizationId || 'mcb-ghana-tenant', reason: 'SSO_ACCOUNT_TERMINATED', req });
            return res.status(403).json({ error: 'This account has been deactivated. Contact HR.' });
        }
        if (!user.loginEnabled) {
            return res.status(403).json({ error: 'Login is not active yet. IT must complete account provisioning.' });
        }
        const orgId = user.organizationId || 'mcb-ghana-tenant';
        const token = signAccessToken({
            id: user.id,
            role: user.role,
            name: user.fullName,
            status: user.status || 'ACTIVE',
            organizationId: orgId,
            rank: user.rank || getRoleRank(user.role)
        });
        // In SSO, we also issue our Native Refresh token so they don't have to keep doing the OAuth popup.
        const refreshToken = await issueRefreshToken(user.id, orgId, req);
        await safeLogSecurityEvent({ email: normalizedEmail, success: true, organizationId: orgId, reason: `LOGIN_OK_${provider?.toUpperCase() || 'SSO'}`, req });
        const permissions = await policy_service_1.PolicyService.getEffectivePermissions(user.id);
        return res.status(200).json({
            token,
            refreshToken,
            user: {
                id: user.id,
                name: user.fullName,
                email: user.email,
                role: user.role,
                jobTitle: user.jobTitle,
                rank: getRoleRank(user.role),
                organizationId: orgId,
                avatar: user.avatarUrl,
                departmentId: user.departmentId,
                permissions,
                mustChangePassword: user.mustChangePassword,
            },
            tokenMeta: {
                accessExpiresIn: ACCESS_TOKEN_TTL,
                refreshExpiresInHours: REFRESH_TOKEN_WINDOW_HOURS,
            },
        });
    }
    catch (error) {
        console.error('[Auth] SSO Login error:', error);
        return res.status(500).json({ error: 'Internal Server Error during SSO authentication' });
    }
};
exports.ssoLogin = ssoLogin;
// ─── REFRESH ACCESS TOKEN ────────────────────────────────────────────────
const refreshAccessToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ error: 'refreshToken is required' });
        }
        const tokenHash = hashToken(refreshToken);
        const found = await client_1.default.refreshToken.findUnique({ where: { tokenHash } });
        if (!found || found.revokedAt || found.expiresAt < new Date()) {
            return res.status(401).json({ error: 'Invalid or expired refresh token' });
        }
        const user = await client_1.default.user.findUnique({
            where: { id: found.userId },
            select: { id: true, fullName: true, role: true, status: true, email: true, avatarUrl: true, organizationId: true, jobTitle: true, loginEnabled: true, mustChangePassword: true },
        });
        if (!user || user.status === 'TERMINATED' || !user.loginEnabled) {
            return res.status(403).json({ error: 'Account unavailable' });
        }
        const orgId = user.organizationId || 'mcb-ghana-tenant';
        // Rotate refresh token for security
        await client_1.default.refreshToken.update({ where: { id: found.id }, data: { revokedAt: new Date() } });
        const nextRefreshToken = await issueRefreshToken(user.id, orgId, req);
        const token = signAccessToken({
            id: user.id,
            role: user.role,
            name: user.fullName,
            status: user.status || 'ACTIVE',
            organizationId: orgId,
            rank: user.rank || getRoleRank(user.role)
        });
        const permissions = await policy_service_1.PolicyService.getEffectivePermissions(user.id);
        return res.json({
            token,
            refreshToken: nextRefreshToken,
            user: {
                id: user.id,
                name: user.fullName,
                email: user.email,
                role: user.role,
                jobTitle: user.jobTitle,
                rank: getRoleRank(user.role),
                organizationId: orgId,
                avatar: user.avatarUrl,
                permissions,
                mustChangePassword: user.mustChangePassword,
            },
            tokenMeta: {
                accessExpiresIn: ACCESS_TOKEN_TTL,
                refreshExpiresInHours: REFRESH_TOKEN_WINDOW_HOURS,
            },
        });
    }
    catch (error) {
        console.error('[Auth] Refresh error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.refreshAccessToken = refreshAccessToken;
// ─── LOGOUT / REVOKE REFRESH TOKEN ───────────────────────────────────────
const revokeRefreshToken = async (req, res) => {
    try {
        const { refreshToken, revokeAll } = req.body;
        if (revokeAll) {
            const userId = req.user?.id;
            if (!userId)
                return res.status(401).json({ error: 'Unauthorized' });
            await client_1.default.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
            return res.json({ success: true });
        }
        if (!refreshToken)
            return res.status(400).json({ error: 'refreshToken is required' });
        const tokenHash = hashToken(refreshToken);
        await client_1.default.refreshToken.updateMany({ where: { tokenHash, revokedAt: null }, data: { revokedAt: new Date() } });
        return res.json({ success: true });
    }
    catch (error) {
        console.error('[Auth] Revoke refresh token error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.revokeRefreshToken = revokeRefreshToken;
// ─── GET CURRENT USER ─────────────────────────────────────────────────────
const getMe = async (req, res) => {
    try {
        const userId = req.user?.id;
        const today = new Date();
        // Single query: fetch user + active leave in one round trip
        const [user, activeLeave, permissions] = await Promise.all([
            client_1.default.user.findUnique({
                where: { id: userId },
                select: {
                    id: true, fullName: true, email: true, role: true,
                    status: true, avatarUrl: true, jobTitle: true,
                    organizationId: true, loginEnabled: true, mustChangePassword: true, employeeLifecycleStage: true,
                    departmentObj: { select: { name: true } },
                },
            }),
            client_1.default.leaveRequest.findFirst({
                where: {
                    employeeId: userId,
                    status: 'APPROVED',
                    startDate: { lte: today },
                    endDate: { gte: today },
                },
                select: { id: true },
            }),
            policy_service_1.PolicyService.getEffectivePermissions(userId || ''),
        ]);
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        if (user.status === 'TERMINATED')
            return res.status(403).json({ error: 'Account deactivated' });
        if (!user.loginEnabled)
            return res.status(403).json({ error: 'Login is not active yet. Contact IT.' });
        return res.json({ ...user, permissions, isOnLeave: !!activeLeave });
    }
    catch {
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.getMe = getMe;
// ─── CHANGE PASSWORD (authenticated) ─────────────────────────────────────
const changePassword = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'currentPassword and newPassword are required' });
        }
        if (!isStrongPassword(newPassword)) {
            return res.status(400).json({ error: 'New password must be at least 8 characters and include at least one number and one special character (!@#$%^&*)' });
        }
        if (newPassword.length > 128)
            return res.status(400).json({ error: 'Password too long' });
        const user = await client_1.default.user.findUnique({ where: { id: userId } });
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        const isMatch = await bcryptjs_1.default.compare(currentPassword, user.passwordHash);
        if (!isMatch)
            return res.status(401).json({ error: 'Current password is incorrect' });
        const newHash = await bcryptjs_1.default.hash(newPassword, 12);
        await client_1.default.$transaction([
            client_1.default.user.update({ where: { id: userId }, data: { passwordHash: newHash, mustChangePassword: false } }),
            client_1.default.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }),
        ]);
        return res.json({ success: true, message: 'Password updated successfully. Please login again.' });
    }
    catch {
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.changePassword = changePassword;
// ─── FORGOT PASSWORD ──────────────────────────────────────────────────────
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email)
            return res.status(400).json({ error: 'Email is required' });
        const GENERIC_OK = { success: true, message: 'If that email exists, a reset link has been sent.' };
        const user = await client_1.default.user.findUnique({
            where: { email: email.toLowerCase().trim() },
            select: { id: true, fullName: true, email: true, status: true },
        });
        if (!user || user.status === 'TERMINATED') {
            return res.json(GENERIC_OK);
        }
        await client_1.default.passwordResetToken.deleteMany({ where: { userId: user.id } });
        const rawToken = crypto_1.default.randomBytes(32).toString('hex');
        const hashedToken = hashToken(rawToken);
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
        await client_1.default.passwordResetToken.create({ data: { userId: user.id, token: hashedToken, expiresAt } });
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${rawToken}`;
        await (0, email_service_1.sendEmail)({
            to: user.email,
            subject: 'Password Reset Request',
            html: `
        <h2 style="color:#f1f5f9;margin:0 0 16px">Password Reset</h2>
        <p>Hi ${user.fullName}, you requested a password reset. Click the button below to set a new password.</p>
        <p>This link expires in <strong>1 hour</strong>.</p>
        <div style="text-align:center;margin:28px 0">
          <a href="${resetUrl}" style="background:linear-gradient(135deg,#6366f1,#4f46e5);color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:600;display:inline-block">
            Reset My Password
          </a>
        </div>
        <p style="font-size:12px;color:#64748b">If you didn't request this, ignore this email. Your password will not change.</p>
      `,
        });
        return res.json(GENERIC_OK);
    }
    catch (error) {
        console.error('[Auth] Forgot password error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.forgotPassword = forgotPassword;
// ─── RESET PASSWORD ───────────────────────────────────────────────────────
const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            return res.status(400).json({ error: 'Token and new password are required' });
        }
        if (!isStrongPassword(newPassword)) {
            return res.status(400).json({ error: 'Password must be at least 8 characters and include at least one number and one special character (!@#$%^&*)' });
        }
        if (newPassword.length > 128)
            return res.status(400).json({ error: 'Password too long' });
        const hashedToken = hashToken(token);
        const resetRecord = await client_1.default.passwordResetToken.findUnique({
            where: { token: hashedToken },
            include: { user: { select: { id: true, status: true } } },
        });
        if (!resetRecord)
            return res.status(400).json({ error: 'Invalid or expired reset link' });
        if (resetRecord.expiresAt < new Date()) {
            await client_1.default.passwordResetToken.delete({ where: { id: resetRecord.id } });
            return res.status(400).json({ error: 'Reset link has expired. Please request a new one.' });
        }
        if (resetRecord.usedAt)
            return res.status(400).json({ error: 'This reset link has already been used' });
        if (resetRecord.user.status === 'TERMINATED')
            return res.status(403).json({ error: 'Account is deactivated' });
        const newHash = await bcryptjs_1.default.hash(newPassword, 12);
        await client_1.default.$transaction([
            client_1.default.user.update({ where: { id: resetRecord.userId }, data: { passwordHash: newHash, mustChangePassword: false } }),
            client_1.default.passwordResetToken.update({ where: { id: resetRecord.id }, data: { usedAt: new Date() } }),
            client_1.default.refreshToken.updateMany({ where: { userId: resetRecord.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
        ]);
        return res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
    }
    catch (error) {
        console.error('[Auth] Reset password error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.resetPassword = resetPassword;
// ─── TENANT SIGNUP ────────────────────────────────────────────────────────
const signup = async (req, res) => {
    try {
        const { fullName, email, password, companyName, phone, city, country } = req.body;
        const normalizedEmail = email.toLowerCase().trim();
        const existingUser = await client_1.default.user.findUnique({ where: { email: normalizedEmail } });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already in use' });
        }
        if (!isStrongPassword(password)) {
            return res.status(400).json({ error: 'Password must be at least 8 characters and include at least one number and one special character (!@#$%^&*)' });
        }
        const passwordHash = await bcryptjs_1.default.hash(password, 12);
        // Atomic transaction: Create Org + Create MD User
        const result = await client_1.default.$transaction(async (tx) => {
            const org = await tx.organization.create({
                data: {
                    name: companyName,
                    email: normalizedEmail,
                    phone,
                    city,
                    country,
                    billingStatus: 'FREE',
                    subscriptionPlan: 'FREE',
                    trialStartDate: new Date(),
                    trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
                    settings: {
                        create: {
                            trialDays: 14
                        }
                    }
                }
            });
            const user = await tx.user.create({
                data: {
                    organizationId: org.id,
                    fullName: fullName.trim().replace(/\./g, ' '),
                    email: normalizedEmail,
                    passwordHash,
                    role: 'MD',
                    jobTitle: 'Managing Director',
                    status: 'ACTIVE',
                    leaveBalance: null,
                    leaveAllowance: null
                }
            });
            return { org, user };
        });
        const token = signAccessToken({
            id: result.user.id,
            role: result.user.role,
            name: result.user.fullName,
            status: result.user.status,
            organizationId: result.org.id,
            rank: result.user.rank || getRoleRank(result.user.role)
        });
        const refreshToken = await issueRefreshToken(result.user.id, result.org.id, req);
        return res.status(201).json({
            message: 'Registration successful',
            token,
            refreshToken,
            user: {
                id: result.user.id,
                name: result.user.fullName,
                email: result.user.email,
                role: result.user.role,
                organizationId: result.org.id
            }
        });
    }
    catch (error) {
        console.error('[Auth] Signup error:', error);
        return res.status(500).json({ error: 'Tenant registration failed. Please try again.' });
    }
};
exports.signup = signup;
const impersonateTenant = async (req, res) => {
    try {
        const adminUser = req.user;
        if (adminUser.role !== 'DEV')
            return res.status(403).json({ error: 'Unauthorized override' });
        const { organizationId } = req.body;
        if (!organizationId)
            return res.status(400).json({ error: 'Target tenant ID required' });
        const organization = await client_1.default.organization.findUnique({ where: { id: organizationId } });
        if (!organization)
            return res.status(404).json({ error: 'Tenant not found' });
        // Find a real MD user in the target org so the token has a valid DB user ID
        const targetMD = await client_1.default.user.findFirst({
            where: { organizationId, role: { in: ['MD', 'DIRECTOR', 'HR_MANAGER'] }, status: 'ACTIVE' },
            orderBy: { rank: 'desc' },
            select: { id: true, fullName: true, role: true },
        });
        if (!targetMD) {
            return res.status(404).json({ error: 'No active admin user found in target organisation.' });
        }
        const token = jsonwebtoken_1.default.sign({
            id: targetMD.id,
            role: targetMD.role,
            name: targetMD.fullName,
            organizationId,
            isImpersonating: true,
            realAdminId: adminUser.id,
        }, JWT_SECRET, { expiresIn: '1h' });
        // Write an audit trail so impersonation is never silent
        await client_1.default.auditLog.create({
            data: {
                organizationId,
                userId: adminUser.id,
                action: 'IMPERSONATE_TENANT',
                entity: 'Organization',
                entityId: organizationId,
                details: `DEV user ${adminUser.id} impersonated tenant "${organization.name}" (${organizationId}) as user ${targetMD.id} (${targetMD.role})`,
                ipAddress: req.ip || null,
            },
        }).catch(() => { }); // Non-blocking
        res.json({ token, user: { id: targetMD.id, name: targetMD.fullName, role: targetMD.role, organizationId, isImpersonating: true } });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.impersonateTenant = impersonateTenant;
/**
 * SANDBOX AUTO-LOGIN (Zero-Click Demo)
 * Issues a temporary simulation session for prospective clients.
 */
const sandboxLogin = async (req, res) => {
    try {
        // 1. Establish Sandbox Context
        const SANDBOX_ORG_ID = 'sandbox-org-001';
        let organization = await client_1.default.organization.findUnique({ where: { id: SANDBOX_ORG_ID } });
        if (!organization) {
            organization = await client_1.default.organization.create({
                data: {
                    id: SANDBOX_ORG_ID,
                    name: 'MCB-HRM Ghana Sandbox',
                    subtitle: 'Institutional HR Simulation',
                    city: 'Global',
                    country: 'Cloud',
                    themePreset: 'nexus-dark',
                    isAiEnabled: true,
                    billingStatus: 'ENTERPRISE',
                    subscriptionPlan: 'ENTERPRISE',
                    primaryColor: '#00D2FF',
                    secondaryColor: '#004FF9'
                }
            });
            const { DemoSeederService } = await Promise.resolve().then(() => __importStar(require('../services/demo-seeder.service')));
            await DemoSeederService.seedTenantData(SANDBOX_ORG_ID);
        }
        // 2. Resolve a Real User from the Sandbox for the token
        // We fetch the MD user seeded by DemoSeederService
        const sandboxMD = await client_1.default.user.findFirst({
            where: { organizationId: SANDBOX_ORG_ID, role: 'MD' }
        });
        if (!sandboxMD) {
            try {
                const { DemoSeederService } = await Promise.resolve().then(() => __importStar(require('../services/demo-seeder.service')));
                await DemoSeederService.seedTenantData(SANDBOX_ORG_ID);
            }
            catch (seedErr) {
                console.error('[Auth] Sandbox seeder failed:', seedErr);
                return res.status(503).json({ error: 'Sandbox environment is being initialised. Please try again in a moment.' });
            }
        }
        const targetUser = sandboxMD || await client_1.default.user.findFirst({ where: { organizationId: SANDBOX_ORG_ID, role: 'MD' } });
        if (!targetUser) {
            return res.status(503).json({ error: 'Sandbox environment failed to initialise. Please try again.' });
        }
        // 3. Issue Token using the REAL database ID
        const token = signAccessToken({
            id: targetUser.id,
            role: 'MD',
            name: targetUser.fullName || 'Sandbox Operator',
            status: 'ACTIVE',
            organizationId: SANDBOX_ORG_ID,
            rank: getRoleRank('MD')
        });
        const refreshToken = await issueRefreshToken(targetUser.id, SANDBOX_ORG_ID, req);
        return res.status(200).json({
            token,
            refreshToken,
            isSandbox: true,
            user: {
                id: targetUser.id,
                name: targetUser.fullName,
                email: targetUser.email,
                role: 'MD',
                jobTitle: 'Simulation Lead',
                rank: getRoleRank('MD'),
                organizationId: SANDBOX_ORG_ID,
                isSandbox: true,
                avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sandbox',
            },
            tokenMeta: {
                accessExpiresIn: ACCESS_TOKEN_TTL,
                refreshExpiresInHours: REFRESH_TOKEN_WINDOW_HOURS,
            },
        });
    }
    catch (error) {
        console.error('[Auth] Sandbox login failed:', error);
        return res.status(500).json({ error: 'Simulation engine fail. Please try again soon.' });
    }
};
exports.sandboxLogin = sandboxLogin;
