import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../prisma/client';
import { sendEmail } from '../services/email.service';
import { ROLE_RANK_MAP } from '../types/roles';

const getRoleRank = (role?: string): number => {
  if (!role) return 0;
  return ROLE_RANK_MAP[role.toUpperCase()] ?? 0;
};

if (!process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET is not set.');
}
const JWT_SECRET = process.env.JWT_SECRET;
const ACCESS_TOKEN_TTL = '1h';
const REFRESH_TOKEN_WINDOW_HOURS = 24; // Standard 24-hour workday session

// Corporate Password Guard: 8+ chars, 1 number, 1 special char
const isStrongPassword = (pass: string) => 
  /^(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})/.test(pass);

const signAccessToken = (payload: { id: string; role: string; name: string; status: string; organizationId: string }) =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });

const hashToken = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

const getClientMeta = (req: Request) => ({
  ipAddress: req.ip || req.socket.remoteAddress || null,
  userAgent: req.get('user-agent') || null,
});

const safeLogSecurityEvent = async (params: {
  email: string;
  success: boolean;
  organizationId: string;
  reason?: string;
  req: Request;
}) => {
  try {
    const { email, success, organizationId, reason, req } = params;
    const meta = getClientMeta(req);
    await prisma.loginSecurityEvent.create({
      data: {
        organizationId: organizationId || 'default-tenant',
        email: email.toLowerCase().trim(),
        success,
        reason,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      },
    });
  } catch {
    // Intentionally non-blocking
  }
};

const issueRefreshToken = async (userId: string, organizationId: string, req: Request) => {
  const raw = crypto.randomBytes(48).toString('hex');
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_WINDOW_HOURS * 60 * 60 * 1000);
  const meta = getClientMeta(req);

  await prisma.refreshToken.create({
    data: {
      userId,
      organizationId: organizationId || 'default-tenant',
      tokenHash,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      expiresAt,
    },
  });

  return raw;
};

// ─── LOGIN ────────────────────────────────────────────────────────────────
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ 
      where: { email: normalizedEmail },
      select: { id: true, email: true, fullName: true, role: true, status: true, 
                passwordHash: true, avatarUrl: true, organizationId: true, jobTitle: true,
                departmentId: true }
    });

    if (!user) {
      await safeLogSecurityEvent({ email: normalizedEmail, success: false, organizationId: 'default-tenant', reason: 'USER_NOT_FOUND', req });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.status === 'TERMINATED') {
      await safeLogSecurityEvent({ email: normalizedEmail, success: false, organizationId: user.organizationId || 'default-tenant', reason: 'ACCOUNT_TERMINATED', req });
      return res.status(403).json({ error: 'This account has been deactivated. Contact HR.' });
    }

    const orgId = user.organizationId || 'default-tenant';
    // CROSS-TENANT VALIDATION DISABLED FOR STANDALONE MODE

    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      await safeLogSecurityEvent({ email: normalizedEmail, success: false, organizationId: orgId, reason: 'BAD_PASSWORD', req });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signAccessToken({
      id: user.id,
      role: user.role,
      name: user.fullName,
      status: user.status || 'ACTIVE',
      organizationId: orgId
    });
    let refreshToken;
    try {
      refreshToken = await issueRefreshToken(user.id, orgId, req);
    } catch (tokenErr: any) {
      console.error('[Auth] Refresh token issuance failed:', tokenErr.message);
      // We still allow login but without a refresh token? No, better to fail and log.
      throw new Error(`Session security initialization failed: ${tokenErr.message}`);
    }

    await safeLogSecurityEvent({ email: normalizedEmail, success: true, organizationId: orgId, reason: 'LOGIN_OK', req });

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
      },
      tokenMeta: {
        accessExpiresIn: ACCESS_TOKEN_TTL,
        refreshExpiresInHours: REFRESH_TOKEN_WINDOW_HOURS,
      },
    });
  } catch (error: any) {
    console.error('[Auth] Login CRITICAL error:', error.message, error.stack);
    return res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

// ─── SSO LOGIN (Google / Microsoft via Identity Token) ─────────────────────
import { admin } from '../services/firebase-admin';

export const ssoLogin = async (req: Request, res: Response) => {
  try {
    const { idToken, provider } = req.body as { idToken?: string; provider?: string };

    if (!idToken) {
      return res.status(400).json({ error: 'OAuth ID token is required' });
    }

    let decodedToken;
    try {
       decodedToken = await admin.auth().verifyIdToken(idToken);
    } catch (firebaseErr: any) {
       console.error('[Auth] SSO Firebase Token Verification failed:', firebaseErr);
       return res.status(401).json({ error: 'Invalid or expired SSO identity token' });
    }

    const email = decodedToken.email;
    if (!email) {
       return res.status(401).json({ error: 'No email address embedded in SSO token.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ 
      where: { email: normalizedEmail },
      select: { id: true, email: true, fullName: true, role: true, status: true, 
                avatarUrl: true, organizationId: true, jobTitle: true,
                departmentId: true }
    });

    if (!user) {
      await safeLogSecurityEvent({ email: normalizedEmail, success: false, organizationId: 'default-tenant', reason: 'SSO_USER_NOT_FOUND', req });
      return res.status(401).json({ error: `The SSO email (${normalizedEmail}) is not registered in our HR records.` });
    }

    if (user.status === 'TERMINATED') {
      await safeLogSecurityEvent({ email: normalizedEmail, success: false, organizationId: user.organizationId || 'default-tenant', reason: 'SSO_ACCOUNT_TERMINATED', req });
      return res.status(403).json({ error: 'This account has been deactivated. Contact HR.' });
    }

    const orgId = user.organizationId || 'default-tenant';

    const token = signAccessToken({
      id: user.id,
      role: user.role,
      name: user.fullName,
      status: user.status || 'ACTIVE',
      organizationId: orgId
    });
    
    // In SSO, we also issue our Native Refresh token so they don't have to keep doing the OAuth popup.
    const refreshToken = await issueRefreshToken(user.id, orgId, req);

    await safeLogSecurityEvent({ email: normalizedEmail, success: true, organizationId: orgId, reason: `LOGIN_OK_${provider?.toUpperCase() || 'SSO'}`, req });

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
      },
      tokenMeta: {
        accessExpiresIn: ACCESS_TOKEN_TTL,
        refreshExpiresInHours: REFRESH_TOKEN_WINDOW_HOURS,
      },
    });
  } catch (error) {
    console.error('[Auth] SSO Login error:', error);
    return res.status(500).json({ error: 'Internal Server Error during SSO authentication' });
  }
};

// ─── REFRESH ACCESS TOKEN ────────────────────────────────────────────────
export const refreshAccessToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body as { refreshToken?: string };
    if (!refreshToken) {
      return res.status(400).json({ error: 'refreshToken is required' });
    }

    const tokenHash = hashToken(refreshToken);
    const found = await prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!found || found.revokedAt || found.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const user = await prisma.user.findUnique({
      where: { id: found.userId },
      select: { id: true, fullName: true, role: true, status: true, email: true, avatarUrl: true, organizationId: true, jobTitle: true },
    });

    if (!user || user.status === 'TERMINATED') {
      return res.status(403).json({ error: 'Account unavailable' });
    }

    const orgId = user.organizationId || 'default-tenant';

    // Rotate refresh token for security
    await prisma.refreshToken.update({ where: { id: found.id }, data: { revokedAt: new Date() } });
    const nextRefreshToken = await issueRefreshToken(user.id, orgId, req);
    const token = signAccessToken({
      id: user.id,
      role: user.role,
      name: user.fullName,
      status: user.status || 'ACTIVE',
      organizationId: orgId
    });

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
      },
      tokenMeta: {
        accessExpiresIn: ACCESS_TOKEN_TTL,
        refreshExpiresInHours: REFRESH_TOKEN_WINDOW_HOURS,
      },
    });
  } catch (error) {
    console.error('[Auth] Refresh error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ─── LOGOUT / REVOKE REFRESH TOKEN ───────────────────────────────────────
export const revokeRefreshToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken, revokeAll } = req.body as { refreshToken?: string; revokeAll?: boolean };

    if (revokeAll) {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      await prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
      return res.json({ success: true });
    }

    if (!refreshToken) return res.status(400).json({ error: 'refreshToken is required' });

    const tokenHash = hashToken(refreshToken);
    await prisma.refreshToken.updateMany({ where: { tokenHash, revokedAt: null }, data: { revokedAt: new Date() } });

    return res.json({ success: true });
  } catch (error) {
    console.error('[Auth] Revoke refresh token error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ─── GET CURRENT USER ─────────────────────────────────────────────────────
export const getMe = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, fullName: true, email: true, role: true,
        status: true, avatarUrl: true, jobTitle: true,
        organizationId: true,
        departmentObj: { select: { name: true } },
      },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.status === 'TERMINATED') return res.status(403).json({ error: 'Account deactivated' });

    return res.json(user);
  } catch {
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ─── CHANGE PASSWORD (authenticated) ─────────────────────────────────────
export const changePassword = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'currentPassword and newPassword are required' });
    }
    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({ error: 'New password must be at least 8 characters and include at least one number and one special character (!@#$%^&*)' });
    }
    if (newPassword.length > 128) return res.status(400).json({ error: 'Password too long' });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) return res.status(401).json({ error: 'Current password is incorrect' });

    const newHash = await bcrypt.hash(newPassword, 12);
    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { passwordHash: newHash } }),
      prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);

    return res.json({ success: true, message: 'Password updated successfully. Please login again.' });
  } catch {
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ─── FORGOT PASSWORD ──────────────────────────────────────────────────────
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body as { email?: string };
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const GENERIC_OK = { success: true, message: 'If that email exists, a reset link has been sent.' };

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true, fullName: true, email: true, status: true },
    });

    if (!user || user.status === 'TERMINATED') {
      return res.json(GENERIC_OK);
    }

    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.passwordResetToken.create({ data: { userId: user.id, token: hashedToken, expiresAt } });

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${rawToken}`;

    await sendEmail({
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
  } catch (error) {
    console.error('[Auth] Forgot password error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ─── RESET PASSWORD ───────────────────────────────────────────────────────
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body as { token?: string; newPassword?: string };

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }
    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({ error: 'Password must be at least 8 characters and include at least one number and one special character (!@#$%^&*)' });
    }
    if (newPassword.length > 128) return res.status(400).json({ error: 'Password too long' });

    const hashedToken = hashToken(token);

    const resetRecord = await prisma.passwordResetToken.findUnique({
      where: { token: hashedToken },
      include: { user: { select: { id: true, status: true } } },
    });

    if (!resetRecord) return res.status(400).json({ error: 'Invalid or expired reset link' });

    if (resetRecord.expiresAt < new Date()) {
      await prisma.passwordResetToken.delete({ where: { id: resetRecord.id } });
      return res.status(400).json({ error: 'Reset link has expired. Please request a new one.' });
    }

    if (resetRecord.usedAt) return res.status(400).json({ error: 'This reset link has already been used' });
    if (resetRecord.user.status === 'TERMINATED') return res.status(403).json({ error: 'Account is deactivated' });

    const newHash = await bcrypt.hash(newPassword, 12);

    await prisma.$transaction([
      prisma.user.update({ where: { id: resetRecord.userId }, data: { passwordHash: newHash } }),
      prisma.passwordResetToken.update({ where: { id: resetRecord.id }, data: { usedAt: new Date() } }),
      prisma.refreshToken.updateMany({ where: { userId: resetRecord.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);

    return res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
  } catch (error) {
    console.error('[Auth] Reset password error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ─── TENANT SIGNUP ────────────────────────────────────────────────────────
export const signup = async (req: Request, res: Response) => {
  try {
    const { fullName, email, password, companyName, phone, city, country } = req.body;

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({ error: 'Password must be at least 8 characters and include at least one number and one special character (!@#$%^&*)' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Atomic transaction: Create Org + Create MD User
    const result = await prisma.$transaction(async (tx) => {
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
      organizationId: result.org.id
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

  } catch (error: any) {
    console.error('[Auth] Signup error:', error);
    return res.status(500).json({ error: 'Tenant registration failed. Please try again.' });
  }
};

export const impersonateTenant = async (req: Request, res: Response) => {
  try {
    const adminUser = (req as any).user;
    if (adminUser.role !== 'DEV') return res.status(403).json({ error: 'Unauthorized override' });

    const { organizationId } = req.body;
    if (!organizationId) return res.status(400).json({ error: 'Target tenant ID required' });

    // Verify tenant exists
    const organization = await prisma.organization.findUnique({ where: { id: organizationId } });
    if (!organization) return res.status(404).json({ error: 'Tenant not found' });

    // Generate a temporary impersonation token
    const token = jwt.sign(
      { 
        id: `impersonated-${adminUser.id}`, 
        email: adminUser.email, 
        role: 'MD', // Default to MD for the tenant
        organizationId: organizationId,
        isImpersonating: true,
        realAdminId: adminUser.id
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ token, user: { name: `Impersonating: ${organization.name}`, role: 'MD', organizationId, isImpersonating: true } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * SANDBOX AUTO-LOGIN (Zero-Click Demo)
 * Issues a temporary simulation session for prospective clients.
 */
export const sandboxLogin = async (req: Request, res: Response) => {
  try {
    // 1. Establish Sandbox Context
    const SANDBOX_ORG_ID = 'sandbox-org-001';
    
    let organization = await prisma.organization.findUnique({ where: { id: SANDBOX_ORG_ID } });
    
    if (!organization) {
      organization = await prisma.organization.create({
        data: {
          id: SANDBOX_ORG_ID,
          name: 'Stormglide Corporate Simulation',
          subtitle: 'Nexus HR Sandbox',
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
      
      const { DemoSeederService } = await import('../services/demo-seeder.service');
      await DemoSeederService.seedTenantData(SANDBOX_ORG_ID);
    }

    // 2. Resolve a Real User from the Sandbox for the token
    // We fetch the MD user seeded by DemoSeederService
    const sandboxMD = await prisma.user.findFirst({
      where: { organizationId: SANDBOX_ORG_ID, role: 'MD' }
    });

    if (!sandboxMD) {
        // Fail-safe: if seeder somehow missed it, re-seed
        const { DemoSeederService } = await import('../services/demo-seeder.service');
        await DemoSeederService.seedTenantData(SANDBOX_ORG_ID);
    }

    const targetUser = sandboxMD || { id: 'fallback-md', fullName: 'Sandbox Director', role: 'MD', email: 'md@demo-sand.com' };

    // 3. Issue Token using the REAL database ID
    const token = signAccessToken({
      id: targetUser.id,
      role: 'MD',
      name: targetUser.fullName || 'Sandbox Operator',
      status: 'ACTIVE',
      organizationId: SANDBOX_ORG_ID
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
  } catch (error: any) {
    console.error('[Auth] Sandbox login failed:', error);
    return res.status(500).json({ error: 'Simulation engine fail. Please try again soon.' });
  }
};
