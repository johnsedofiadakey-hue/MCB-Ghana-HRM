import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { sendEmail } from '../services/email.service';
import crypto from 'crypto';
import { logAction } from '../services/audit.service';
import { notify } from '../services/websocket.service';
import { GoogleWorkspaceService } from '../services/workspace.service';

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
export const itCreateEmployee = async (req: Request, res: Response) => {
  return res.status(405).json({
    error: 'HR must create the preboarding employee record. IT provisions and activates the resulting account.',
  });
};

// Force password reset — sends a one-time link to the user's email.
export const itResetPassword = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    // @ts-ignore
    const actorId = req.user?.id;

    const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
    const user = await prisma.user.findFirst({ where: { id: userId, organizationId }, select: { id: true, email: true, fullName: true } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const rawToken = crypto.randomBytes(32).toString('hex');
    const token = crypto.createHash('sha256').update(rawToken).digest('hex');
    await prisma.$transaction([
      prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
      prisma.passwordResetToken.create({ data: { userId: user.id, token, expiresAt: new Date(Date.now() + 60 * 60 * 1000) } }),
    ]);
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${rawToken}`;
    const sent = await sendEmail({
      to: user.email,
      subject: 'MCB HRM password reset invitation',
      html: `<p>Hello ${user.fullName},</p><p>IT initiated a secure password reset. This link expires in one hour.</p><p><a href="${resetUrl}">Choose a new password</a></p>`,
    });
    if (!sent) {
      return res.status(503).json({ error: 'Password-reset email could not be delivered. Verify SMTP settings and retry.' });
    }

    await prisma.$transaction([
      prisma.refreshToken.updateMany({ where: { userId: user.id, organizationId, revokedAt: null }, data: { revokedAt: new Date() } }),
      prisma.user.update({ where: { id: user.id }, data: { mustChangePassword: true } }),
    ]);

    await notify(user.id, 'Password Reset Requested', 'IT sent a secure password-reset link to your email.', 'WARNING');
    await logAction(actorId, 'IT_PASSWORD_RESET_INVITED', 'User', userId, { email: user.email }, req.ip);

    res.json({ success: true, message: `Password-reset invitation sent to ${user.email}` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Get system overview for IT dashboard
export const itSystemOverview = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';

    const requesterRank = (req as any).user?.rank || 0;
    const devFilter = requesterRank < 100 ? { role: { not: 'DEV' }, rank: { lt: 100 } } : {};

    const [
      totalUsers, 
      activeUsers, 
      assets, 
      availableAssets, 
      assignedAssets, 
      vaultStatus,
      totalAuditLogs,
      biometricLogCount
    ] = await Promise.all([
      prisma.user.count({ where: { organizationId, ...devFilter } }),
      prisma.user.count({ where: { status: 'ACTIVE', organizationId, ...devFilter } }),
      prisma.asset.count({ where: { organizationId } }),
      prisma.asset.count({ where: { status: 'AVAILABLE', organizationId } }),
      prisma.asset.count({ where: { status: 'ASSIGNED', organizationId } }),
      GoogleWorkspaceService.checkHealth(),
      prisma.auditLog.count({ where: { organizationId } }),
      prisma.attendanceLog.count({ where: { organizationId, source: 'BIOMETRIC' } })
    ]);

    const recentAccounts = await prisma.user.findMany({
      where: { organizationId, ...devFilter },
      orderBy: { createdAt: 'desc' }, 
      take: 10,
      select: { id: true, fullName: true, email: true, role: true, status: true, createdAt: true, jobTitle: true }
    });

    const nodes = await prisma.asset.findMany({
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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Get all users (no salary data) for IT management
export const itGetUsers = async (req: Request, res: Response) => {
  try {
    const requesterRank = (req as any).user?.rank || 0;
    const devFilter = requesterRank < 100 ? { role: { not: 'DEV' }, rank: { lt: 100 } } : {};

    const organizationId = (req as any).user?.organizationId || 'mcb-ghana-tenant';
    const users = await prisma.user.findMany({
      where: { organizationId, ...devFilter },
      orderBy: { fullName: 'asc' },
      select: {
        id: true, fullName: true, email: true, role: true, status: true,
        jobTitle: true, employeeCode: true, departmentObj: { select: { name: true } },
        createdAt: true, avatarUrl: true, contactNumber: true
      }
    });
  res.json(users);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
};

// Deactivate account (IT can disable, not delete)
export const itDeactivateUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    // @ts-ignore
    const actorId = req.user?.id;

    const user = await prisma.user.update({
      where: { id: userId },
      data: { status: 'TERMINATED' }
    });

    await logAction(actorId, 'IT_ACCOUNT_DEACTIVATED', 'User', userId, { email: user.email }, req.ip);
    await notify(userId, 'Account Deactivated', 'Your account has been deactivated. Contact HR for more information.', 'WARNING');

    res.json({ success: true, message: `Account for ${user.fullName} has been deactivated` });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

// System Maintenance: Cleanup old logs
export const itCleanupLogs = async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 90;
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - days);

    const deletedAudit = await prisma.auditLog.deleteMany({
      where: { createdAt: { lt: thresholdDate } }
    });

    const deletedHistory = await prisma.employeeHistory.deleteMany({
      where: { createdAt: { lt: thresholdDate } }
    });

    res.json({ 
      success: true, 
      message: `System maintenance complete. Purged logs older than ${days} days.`,
      purged: { audit: deletedAudit.count, history: deletedHistory.count }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// ── OBSERVABILITY: LIVE AUDIT LOGS ───────────────────────────────────────────
export const getLiveLogs = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
    const logs = await prisma.auditLog.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { user: { select: { fullName: true, role: true } } }
    });
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// ── SECURITY: THREAT DETECTION MATRIX ────────────────────────────────────────
export const getSecurityThreats = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // 1. Check for rapid password resets
    const suspiciousResets = await prisma.auditLog.count({
      where: {
        organizationId,
        action: 'IT_PASSWORD_RESET',
        createdAt: { gte: hourAgo }
      }
    });

    // 2. Check for bulk deactivations
    const suspiciousDeactivations = await prisma.auditLog.count({
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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
