import { Request, Response } from 'express';
import prisma from '../prisma/client';
import * as userService from '../services/user.service';
import { sendWelcomeEmail } from '../services/email.service';
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
  try {
    // Strip salary/compensation fields — IT Admin should not set these
    const { salary, currency, ...safeData } = req.body;

    const tempPassword = safeData.password || 'SecureInit!';
    const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
    const user = await userService.createUser(organizationId, { ...safeData, password: tempPassword });
    const { passwordHash, ...safeUser } = user;

    // Send welcome email asynchronously
    const settings = await prisma.systemSettings.findFirst();
    sendWelcomeEmail(user.email, user.fullName, tempPassword, (settings as any)?.companyName || 'HRM Engine').catch(console.error);

    // Audit log
    // @ts-ignore
    await logAction(req.user?.id, 'IT_ADMIN_CREATE_ACCOUNT', 'User', user.id, { email: user.email, role: user.role }, req.ip);

    // Notify HR and IT leadership
    const leadership = await prisma.user.findMany({ 
      where: { role: { in: ['MD', 'DIRECTOR', 'HR_OFFICER', 'IT_MANAGER'] } }, 
      select: { id: true } 
    });
    for (const admin of leadership) {
      await notify(admin.id, 'New Account Created', `IT Admin created account for ${user.fullName} (${user.email})`, 'INFO', '/employees');
    }

    res.status(201).json({ ...safeUser, message: `Account created. Welcome email sent to ${user.email}.` });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// Force password reset — sends a new temp password to the user's email
export const itResetPassword = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    // @ts-ignore
    const actorId = req.user?.id;

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, fullName: true } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const bcrypt = await import('bcryptjs');
    const tempPassword = `MCB${Math.random().toString(36).slice(-6).toUpperCase()}!`;
    const passwordHash = await bcrypt.default.hash(tempPassword, 12);

    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

    const settings = await prisma.systemSettings.findFirst();
    sendWelcomeEmail(user.email, user.fullName, tempPassword, (settings as any)?.companyName || 'MCB-HRM Ghana').catch(console.error);

    await notify(user.id, 'Password Reset', 'Your password has been reset by IT. Check your email for the temporary password.', 'WARNING');
    await logAction(actorId, 'IT_PASSWORD_RESET', 'User', userId, { email: user.email }, req.ip);

    res.json({ success: true, message: `Temporary password sent to ${user.email}` });
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
