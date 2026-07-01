import { getRoleRank, invalidateUserCache } from '../middleware/auth.middleware';
import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { getEffectiveLeaveMetrics } from '../utils/leave.utils';
import * as userService from '../services/user.service';
import * as riskService from '../services/risk.service';
import { logAction } from '../services/audit.service';
import { notify } from '../services/websocket.service';
import { sendEmail } from '../services/email.service';
import crypto from 'crypto';
import { PolicyService } from '../services/policy.service';
import { Permission } from '../types/permissions';

import { HierarchyService } from '../services/hierarchy.service';

/**
 * 🚀 HARDENED PROD URL DETECTION
 * Returns the most accurate public base URL for imagery.
 */
const getPublicBaseUrl = (req: Request) => {
  // 1. Manual Overrule (Highest priority)
  if (process.env.API_BASE_URL && !process.env.API_BASE_URL.includes('localhost')) {
    return process.env.API_BASE_URL.replace(/\/$/, '');
  }
  
  // 2. Render Direct Environment Context
  if (process.env.RENDER_EXTERNAL_URL) {
    return process.env.RENDER_EXTERNAL_URL.replace(/\/$/, '');
  }
  
  // 3. Proxy Protocol & Host detection
  const forwardedProto = req.headers['x-forwarded-proto'] as string;
  const forwardedHost = req.headers['x-forwarded-host'] as string;
  
  const protocol = forwardedProto || req.protocol || 'https';
  let host = forwardedHost || req.get('host') || '';
  
  // 4. DEFENSIVE FAIL-SAFE: If we are on Render but host is missing or localhost
  const isOnRender = !!process.env.RENDER_SERVICE_ID;
  if (isOnRender && (host.includes('localhost') || !host)) {
     // Force the known production API domain
     return 'https://mcb-ghana-hrm-api.onrender.com';
  }

  // Fallback for local dev
  if (!host) host = 'localhost:5000';

  return `${protocol}://${host}`;
};

import { decryptValue } from '../utils/encryption';

// ─── Field filter by role ─────────────────────────────────────────────────
const getSafeUser = (user: any, requestorRole: string) => {
  const { passwordHash, ...safe } = user;
  const normalizedRole = String(requestorRole || '').toUpperCase();

  // 🔄 Leave Allowance Inheritance: Prioritize user-specific allowance, then organization default, then system default.
  // We use the centralized utility to ensure consistency across the platform.
  const metrics = getEffectiveLeaveMetrics(user);
  safe.leaveAllowance = metrics.allowance;
  safe.leaveBalance = metrics.balance;

  // Decrypt sensitive fields if authorized (HR/MD (>= 85))
  // 🛡️ REFINEMENT: Always try to decrypt if the Enc field exists, to ensure fresh plain text for the frontend.
  if (['DEV', 'MD', 'HR_DIRECTOR', 'HR_MANAGER'].includes(normalizedRole)) {
    if (safe.bankAccountEnc) {
        const dec = decryptValue(safe.bankAccountEnc);
        if (dec) safe.bankAccountNumber = dec;
    }
    if (safe.ghanaCardEnc) {
        const dec = decryptValue(safe.ghanaCardEnc);
        if (dec) safe.nationalId = dec;
    }
    if (safe.ssnitEnc) {
        const dec = decryptValue(safe.ssnitEnc);
        if (dec) safe.ssnitNumber = dec;
    }
    if (safe.salaryEnc) {
      const dec = decryptValue(safe.salaryEnc);
      if (dec) safe.salary = parseFloat(dec);
    }
  }
  else {
    delete safe.salary;
    delete safe.salaryEnc;
    delete safe.bankAccountNumber;
    delete safe.bankAccountEnc;
    delete safe.nationalId;
    delete safe.ghanaCardEnc;
    delete safe.ssnitNumber;
    delete safe.ssnitEnc;
    delete safe.nationalIdDocUrl;
  }

  // Parse certifications if stringified JSON
  if (typeof safe.certifications === 'string' && safe.certifications.startsWith('[')) {
    try {
      safe.certifications = JSON.parse(safe.certifications);
    } catch (e) {
      safe.certifications = [];
    }
  }

  return safe;
};

const withDepartment = (u: any) => {
  return { ...u, department: u.departmentObj?.name };
};

// ─── GET MY TEAM ──────────────────────────────────────────────────────────
export const getMyTeam = async (req: Request, res: Response) => {
  try {
    const userReq = (req as any).user;
    const isDev = userReq.role === 'DEV';
    const organizationId = isDev ? undefined : (userReq.organizationId || 'mcb-ghana-tenant');
    const whereOrg = organizationId ? { organizationId } : {};
    const { id: userId, role } = userReq;
    const requestedId = req.query.supervisorId as string;

    let supervisorId = userId;
    if (getRoleRank(role) >= 80 && requestedId) supervisorId = requestedId;

    const take = parseInt(req.query.take as string) || 50;
    const skip = parseInt(req.query.skip as string) || 0;
    const search = req.query.search as string;

    const where: any = { supervisorId, ...whereOrg };
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { jobTitle: { contains: search, mode: 'insensitive' } }
      ];
    }

    const team = await prisma.user.findMany({
      where,
      orderBy: { fullName: 'asc' },
      take, skip,
      include: {
        kpiSheets: {
          where: whereOrg,
          orderBy: { createdAt: 'desc' }, take: 1,
          select: { id: true, totalScore: true, status: true, isLocked: true }
        }
      }
    });

    return res.json(team.map(emp => ({
      id: emp.id, 
      name: emp.fullName, 
      fullName: emp.fullName, // For consistency with TargetCascadeModal
      role: emp.jobTitle,
      jobTitle: emp.jobTitle,  // For consistency with TargetCascadeModal
      email: emp.email, 
      avatar: emp.avatarUrl, 
      avatarUrl: emp.avatarUrl,
      status: emp.status,
      kpiSheets: emp.kpiSheets,
      lastSheetId: emp.kpiSheets[0]?.id,
      lastScore: Number(emp.kpiSheets[0]?.totalScore || 0),
      performance: Number(emp.kpiSheets[0]?.totalScore || 0) > 80 ? 'On Track' : 'Needs Attention'
    })));
  } catch (err) {
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ─── CREATE EMPLOYEE ──────────────────────────────────────────────────────
export const createEmployee = async (req: Request, res: Response) => {
  try {
    const userReq = (req as any).user;
    const organizationId = userReq.organizationId || 'mcb-ghana-tenant';
    const actorRank = userReq.rank;
    const actorRole = userReq.role;
    const actorId = userReq.id;

    // Role rank remains display metadata; route permissions determine access.
    const targetRank = getRoleRank(req.body.role);
    if (actorRank < 85) {
      delete req.body.salary;
      delete req.body.currency;
    }
    if (actorRank < 85 && targetRank >= 85 && actorRole !== 'DEV') {
        return res.status(403).json({ error: 'Access denied: Only managers can create administrative accounts.' });
    }

    delete req.body.password;
    
    // 🛡️ Validate SubUnit/Department pairing
    if (req.body.subUnitId && req.body.departmentId) {
      const subUnit = await prisma.subUnit.findUnique({ where: { id: req.body.subUnitId } });
      if (subUnit && subUnit.departmentId !== Number(req.body.departmentId)) {
        return res.status(400).json({ error: 'The selected sub-unit does not belong to the selected department.' });
      }
    }

    const user = await userService.createUser(organizationId, req.body);
    const { passwordHash, ...safeUser } = user;

    // 🚀 AUTO-ONBOARDING: Attach default template if exists
    try {
      const defaultTemplate = await prisma.onboardingTemplate.findFirst({
        where: { organizationId, isDefault: true },
        include: { tasks: { orderBy: { order: 'asc' } } }
      });

      if (defaultTemplate && defaultTemplate.tasks.length > 0) {
        await prisma.onboardingSession.create({
          data: {
            employeeId: user.id,
            organizationId,
            templateId: defaultTemplate.id,
            progress: 0,
            items: {
              create: defaultTemplate.tasks.map(task => ({
                taskId: task.id,
                organizationId,
                title: task.title,
                category: task.category,
                ownerRole: task.ownerRole,
                assignedToId: task.ownerRole === 'MANAGER' ? user.supervisorId : null,
                status: 'PENDING',
                autoCompleteEvent: task.autoCompleteEvent,
                isRequired: task.isRequired,
                dueDate: new Date(Date.now() + task.dueAfterDays * 24 * 60 * 60 * 1000)
              }))
            }
          }
        });
      }
    } catch (onboardErr) {
      console.error('[Onboarding Trigger Error]:', onboardErr);
    }

    // Self-onboarding invite
    if (req.body.sendOnboardingInvite && user.email) {
      try {
        const rawToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await (prisma as any).onboardingInviteToken.upsert({
          where: { userId: user.id },
          create: { userId: user.id, token: rawToken, expiresAt },
          update: { token: rawToken, expiresAt, usedAt: null },
        });
        const frontendUrl = process.env.FRONTEND_URL || 'https://mcb-hrm-ghana.web.app';
        const inviteUrl = `${frontendUrl}/onboard/complete-profile?token=${rawToken}`;
        await sendEmail({
          to: user.email,
          subject: 'Complete Your MCB Ghana HRM Profile',
          html: `<p>Hi <strong>${user.fullName}</strong>,</p>
<p>Your HR team has created your employee account. Please click the link below to complete your profile details. This link expires in 7 days.</p>
<p><a href="${inviteUrl}" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">Complete My Profile</a></p>
<p style="color:#64748b;font-size:12px">If the button doesn't work, copy this link: ${inviteUrl}</p>`,
        });
      } catch (inviteErr) {
        console.error('[Self-Onboarding invite error]:', inviteErr);
      }
    }

    res.status(201).json(withDepartment(getSafeUser(safeUser, actorRole)));
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const activateEmployeeLogin = async (req: Request, res: Response) => {
  try {
    const actor = (req as any).user;
    const organizationId = actor.organizationId || 'mcb-ghana-tenant';
    const employee = await prisma.user.findFirst({
      where: { id: req.params.id, organizationId },
      select: { id: true, email: true, fullName: true, loginEnabled: true },
    });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const requiredIT = await prisma.onboardingItem.findMany({
      where: {
        organizationId,
        session: { employeeId: employee.id },
        ownerRole: 'IT',
        isRequired: true,
      },
      select: { status: true },
    });
    if (!requiredIT.length) {
      return res.status(409).json({ error: 'No mandatory IT onboarding checklist is configured for this employee.' });
    }
    const outstandingIT = requiredIT.filter((task) => !['COMPLETED', 'VERIFIED'].includes(task.status)).length;
    if (outstandingIT > 0) {
      return res.status(409).json({ error: `${outstandingIT} mandatory IT onboarding task(s) are incomplete.` });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const token = crypto.createHash('sha256').update(rawToken).digest('hex');
    await prisma.$transaction([
      prisma.passwordResetToken.deleteMany({ where: { userId: employee.id } }),
      prisma.passwordResetToken.create({
        data: { userId: employee.id, token, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
      }),
    ]);

    const inviteUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${rawToken}`;
    const sent = await sendEmail({
      to: employee.email,
      subject: 'Your MCB HRM account is ready',
      html: `<p>Hello ${employee.fullName},</p><p>IT has completed your account setup. Use this secure link within 24 hours to choose your password.</p><p><a href="${inviteUrl}">Activate my account</a></p>`,
    });
    if (!sent) {
      return res.status(503).json({ error: 'Invitation email could not be delivered. Verify SMTP settings and retry; login remains disabled.' });
    }
    await prisma.user.update({
      where: { id: employee.id },
      data: { loginEnabled: true, mustChangePassword: true, employeeLifecycleStage: 'ONBOARDING' },
    });
    invalidateUserCache(employee.id);
    return res.json({ success: true, loginEnabled: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Could not activate employee login' });
  }
};

// ─── GET ALL EMPLOYEES (Hardened for Managers) ───────────────────────────
export const getAllEmployees = async (req: Request, res: Response) => {
  try {
    const userReq = (req as any).user;
    const organizationId = userReq.organizationId || 'mcb-ghana-tenant';
    const filters: any = { organizationId };
    const showArchived = req.query.archived === 'true';

    if (showArchived) {
      filters.isArchived = true;
    } else {
      filters.isArchived = false;
    }

    if (req.query.department) filters.departmentId = parseInt(req.query.department as string);
    if (req.query.role) filters.role = req.query.role as any;
    if (req.query.status) filters.status = req.query.status as any;

    const search = req.query.search as string;
    if (search) {
      filters.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { employeeCode: { contains: search, mode: 'insensitive' } },
        { jobTitle: { contains: search, mode: 'insensitive' } }
      ];
    }

    const userRole = userReq.role;
    const userRank = getRoleRank(userRole);
    const userId = userReq.id;

    // 🛡️ DEV ISOLATION: Always exclude DEV role from staff lists
    // Only users with Rank 100 (DEV) can see other DEVs.
    const isDevRequestor = userRole === 'DEV' || userRank === 100;
    
    if (isDevRequestor) {
      if (req.query.role) filters.role = req.query.role as any;
    } else {
      // Non-devs can never see DEV accounts
      filters.role = { not: 'DEV' };
      filters.rank = { lt: 100 };
    }

    console.log(`[User Ledger] Fetching with filters:`, JSON.stringify(filters));

    // 🛡️ DEPARTMENTAL & HIERARCHY ISOLATION: 
    // - MD/Director/HR/IT (>= 80) can see all.
    // - Managers/Supervisors (< 80) see their department PLUS their reporting chain.
    if (userRank < 80 && userRole !== 'DEV') {
      const managedIds = await HierarchyService.getManagedEmployeeIds(userId, organizationId);
      filters.OR = [
        { departmentId: userReq.departmentId },
        { id: { in: managedIds } }
      ];
    }

    const take = parseInt(req.query.take as string) || 100;
    const skip = parseInt(req.query.skip as string) || 0;

    const sortBy = req.query.sortBy as string || 'fullName';
    const sortOrder = sortBy === 'createdAt' ? 'desc' : 'asc';

    const users = await prisma.user.findMany({
      where: filters,
      take,
      skip,
      orderBy: { [sortBy]: sortOrder },
      include: {
        departmentObj: { select: { name: true } },
        organization: { select: { defaultLeaveAllowance: true } },
        leaves: {
          where: {
            status: 'APPROVED',
            startDate: { lte: new Date() },
            endDate: { gte: new Date() }
          },
          take: 1
        }
      }
    });

    res.json(users.map(u => {
      const safe = getSafeUser(u, userRole);
      return {
        ...withDepartment(safe),
        isOnLeave: u.leaves.length > 0
      };
    }));
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// ─── GET SINGLE EMPLOYEE (Hardened) ──────────────────────────────────────
export const getEmployee = async (req: Request, res: Response) => {
  try {
    const userReq = (req as any).user;
    const organizationId = userReq.organizationId || 'mcb-ghana-tenant';
    const targetId = req.params.id;
    const user = await userService.getUserById(organizationId, targetId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const userRole = userReq.role;
    const actorId = userReq.id;

    const [peopleAccess, historyAccess, isSubordinate] = await Promise.all([
      PolicyService.evaluatePolicy(actorId, Permission.EMPLOYEE_READ, { targetUserId: targetId }),
      PolicyService.evaluatePolicy(actorId, Permission.EMPLOYEE_HISTORY_READ, { targetUserId: targetId }),
      actorId === targetId ? Promise.resolve(false) : HierarchyService.isSubordinate(actorId, targetId, organizationId),
    ]);

    // The basic employee directory is visible to colleagues in the same
    // department, authorized people teams, card operations, and reporting
    // managers. Sensitive nested records are redacted separately below.
    if (actorId !== targetId && !peopleAccess.allowed && !isSubordinate && user.departmentId !== userReq.departmentId) {
      const [cardProduction, cardAccess] = await Promise.all([
        PolicyService.evaluatePolicy(actorId, Permission.CARD_PRODUCTION, { targetUserId: targetId }),
        PolicyService.evaluatePolicy(actorId, Permission.CARD_ACCESS, { targetUserId: targetId }),
      ]);
      if (!cardProduction.allowed && !cardAccess.allowed) {
        return res.status(403).json({ message: 'Access denied: employee is outside your permitted directory scope.' });
      }
    }

    const safe = withDepartment(getSafeUser(user, userRole));
    if (actorId === targetId) {
      safe.historyLogs = (safe.historyLogs || []).filter((record: any) => ['COMMENDATION', 'GENERAL_NOTE'].includes(record.type));
    } else if (!historyAccess.allowed) {
      safe.historyLogs = [];
    }
    if (actorId !== targetId && !peopleAccess.allowed && !isSubordinate) {
      safe.appraisalPackets = [];
      safe.targetsAssignedToMe = [];
      safe.subordinates = [];
      safe.employeeReportingLines = [];
    }

    res.json(safe);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// ─── UPDATE EMPLOYEE (Hardened) ──────────────────────────────────────────
export const updateEmployee = async (req: Request, res: Response) => {
  try {
    console.log('[Update Employee Payload]', req.params.id, req.body);
    const userReq = (req as any).user;
    const organizationId = userReq.organizationId || 'mcb-ghana-tenant';
    const rank = getRoleRank(userReq.role);
    const privilegedRoles = [
      'MD', 'DIRECTOR', 'HR_DIRECTOR', 'HR DIRECTOR', 
      'HR_MANAGER', 'HR MANAGER', 'IT_MANAGER', 'IT MANAGER', 
      'IT_ADMIN', 'IT ADMIN', 'HR_OFFICER', 'HR OFFICER'
    ];

    const actorId = userReq.id;
    const actorRole = (userReq.role || '').toUpperCase().replace(/_/g, ' ').trim();
    const actorRank = getRoleRank(actorRole);
    const targetId = req.params.id;

    // 🛡️ REQUISITE: Only MD, HR, or IT can update employee details
    // 🔄 SELF-SERVICE OVERRIDE: Allow any user to update their own contact/bank details
    const isSelfUpdate = actorId === targetId;
    const canManagePeople = ['DEV', 'MD', 'HR DIRECTOR', 'HR MANAGER', 'HR OFFICER'].includes(actorRole);
    const allowedSelfFields = [
      'contactNumber', 'bankName', 'bankAccountNumber', 'bankBranch', 
      'address', 'nextOfKinName', 'nextOfKinRelation', 'nextOfKinContact', 
      'emergencyContactName', 'emergencyContactPhone', 'gender', 'maritalStatus', 'bloodGroup'
    ];

    if (isSelfUpdate && !canManagePeople) {
      const filteredBody: any = {};
      Object.keys(req.body).forEach(field => {
        if (allowedSelfFields.includes(field)) filteredBody[field] = req.body[field];
      });
      if (Object.keys(filteredBody).length === 0) return res.status(400).json({ error: 'No permitted fields provided for self-service update.' });
      req.body = filteredBody;
    } else if (!privilegedRoles.includes(actorRole) && actorRank < 70) {
      if (!isSelfUpdate) {
        return res.status(403).json({ message: 'Access denied: Only Managers, HR, or IT can update personnel profiles.' });
      }

      // Filter body to only allowed self-service fields
      const filteredBody: any = {};
      let hasForbiddenFields = false;
      
      Object.keys(req.body).forEach(field => {
        if (allowedSelfFields.includes(field)) {
          filteredBody[field] = req.body[field];
        } else {
          hasForbiddenFields = true;
        }
      });

      if (Object.keys(filteredBody).length === 0) {
        return res.status(400).json({ error: 'No permitted fields provided for self-service update.' });
      }

      // Replace body with filtered version to prevent unauthorized field injection
      req.body = filteredBody;
    }

    // Fetch target to check hierarchy
    const targetUser = await prisma.user.findUnique({ where: { id: targetId, organizationId } });
    if (!targetUser) return res.status(404).json({ message: 'User not found' });

    // 🛡️ ACCESS CONTROL: 
    // - MD/HR/Director (>= 80) can manage all.
    // - Manager (< 80 and >= 70) can manage their department reports.
    // - Staff (< 70) cannot manage others.
    if (actorRank < 80 && actorRole !== 'DEV' && actorId !== targetId) {
      if (targetUser.departmentId !== userReq.departmentId) {
        return res.status(403).json({ message: 'Access denied: You can only manage employees in your department.' });
      }
      // Staff cannot manage others at all
      if (actorRank < 70) {
        return res.status(403).json({ message: 'Access denied: Only managers can update employee records.' });
      }
      // Cannot edit someone with equal or higher rank
      if (getRoleRank(targetUser.role) >= actorRank) {
        return res.status(403).json({ message: 'Access denied: You cannot manage users with equal or higher rank.' });
      }
    }

    // Only HR/MD (>= 85) can change salary/currency
    // 🛡️ SENSITIVE DATA PROTECTION: Rank < 85 (Managers/Officers) cannot modify payroll/SSNIT data
    if (!['DEV', 'MD', 'HR DIRECTOR', 'HR MANAGER'].includes(actorRole)) {
      delete req.body.salary;
      delete req.body.currency;
      delete req.body.bankName;
      delete req.body.bankAccountNumber;
      delete req.body.bankBranch;
      delete req.body.ssnitNumber;
      delete req.body.nationalId;
      delete req.body.ghanaCardNumber;
      delete req.body.tin;
    }
    // 🛡️ GLOBAL CONTROLLER ACCESS (IT/HR Managers >= 85)
    // They are fully responsible for the app and can manage all roles including HR_MANAGER.
    // However, the MD account (Rank 95) is protected from non-DEV status/role changes.
    const targetRank = req.body.role ? getRoleRank(req.body.role) : undefined;
    const currentTargetRank = getRoleRank(targetUser.role);
    
    if (actorRank < 85 && actorRole !== 'DEV') {
      // Protect Administrative Roles from lower ranks (staff, supervisors, etc)
      if ((targetRank && targetRank >= 85) || currentTargetRank >= 85) {
          return res.status(403).json({ message: 'Access denied: Only managers can manage administrative roles.' });
      }
    }

    // 🛡️ MD PROTECTION: Only the MD or DEV can change the role/status of the MD account
    if (currentTargetRank >= 95 && actorId !== targetId && actorRole !== 'DEV') {
       if (req.body.role || req.body.status) {
         return res.status(403).json({ message: 'Access denied: The Managing Director account can only be modified by the MD or a System Architect.' });
       }
    }

    // 🛡️ Validate SubUnit/Department pairing
    const newDeptId = req.body.departmentId ? Number(req.body.departmentId) : targetUser.departmentId;
    const newSubUnitId = req.body.subUnitId !== undefined ? req.body.subUnitId : targetUser.subUnitId;

    // 🛡️ SUB-UNIT INTEGRITY CHECK: 
    // If the department was changed but subUnitId was not provided, or if both are provided,
    // ensure the subUnit belongs to the department. If not, we clear the subUnit instead of failing.
    if (newSubUnitId && newDeptId) {
      const subUnit = await prisma.subUnit.findUnique({ where: { id: newSubUnitId } });
      if (subUnit && subUnit.departmentId !== newDeptId) {
        // Only clear if the department was explicitly changed in this request
        if (req.body.departmentId) {
          req.body.subUnitId = null;
        } else {
           return res.status(400).json({ message: 'The selected sub-unit does not belong to this department.' });
        }
      }
    }

    const user = await userService.updateUser(organizationId, targetId, req.body, userReq.id);
    const { passwordHash, ...safe } = user;
    await logAction(actorId, 'EMPLOYEE_UPDATED', 'User', targetId, { fields: Object.keys(req.body) }, req.ip);
    res.json(withDepartment(getSafeUser(safe, actorRole)));
  } catch (err: any) {
    console.error('[Update Employee Error]', err);
    res.status(500).json({ message: err.message });
  }
};

// ─── DELETE EMPLOYEE (MD/HR only — hard delete with cascade) ─────────────
export const deleteEmployee = async (req: Request, res: Response) => {
  try {
    const userReq = (req as any).user;
    const organizationId = userReq.organizationId || 'mcb-ghana-tenant';
    const actorId = userReq.id;
    const targetId = req.params.id;

    // Prevent self-deletion
    if (actorId === targetId) return res.status(400).json({ message: 'Cannot delete your own account.' });

    // Check if target is MD (cannot delete MD via API)
    const target = await prisma.user.findFirst({
      where: { id: targetId, organizationId },
      select: { role: true, fullName: true }
    });
    if (!target) return res.status(404).json({ message: 'User not found' });
    if (getRoleRank(target.role) >= 90) {
      return res.status(403).json({ message: 'Cannot delete MD or System Admin accounts.' });
    }

    await userService.deleteUser(organizationId, targetId);
    await logAction(actorId, 'EMPLOYEE_ARCHIVED', 'User', targetId, { name: target.fullName, role: target.role }, req.ip);
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// ─── HARD DELETE EMPLOYEE (MD/HR only — destructive) ─────────────
export const hardDeleteEmployee = async (req: Request, res: Response) => {
  try {
    const userReq = (req as any).user;
    const organizationId = userReq.organizationId || 'mcb-ghana-tenant';
    const actorId = userReq.id;
    const targetId = req.params.id;

    if (actorId === targetId) return res.status(400).json({ message: 'Cannot delete your own account.' });

    // Restrict HARD DELETE to MD/DEV only (Rank 90+)
    if (userReq.rank < 90 && userReq.role !== 'DEV') {
        return res.status(403).json({ message: 'Access denied: Only the MD or System Admin can perform destructive hard deletions.' });
    }

    const target = await prisma.user.findFirst({
      where: { id: targetId, organizationId },
      select: { role: true, fullName: true }
    });
    if (!target) return res.status(404).json({ message: 'User not found' });
    if (getRoleRank(target.role) >= 90) {
      return res.status(403).json({ message: 'Cannot delete MD or System Admin accounts.' });
    }

    await userService.hardDeleteUser(organizationId, targetId);
    await logAction(actorId, 'EMPLOYEE_HARD_DELETED', 'User', targetId, { name: target.fullName, role: target.role }, req.ip);
    res.status(204).send();
  } catch (err: any) {
    console.error('[HARD_DELETE_ERROR]', err);
    res.status(500).json({ 
      error: 'Constraint violation or database error during hard delete.',
      message: err.message,
      code: err.code,
      meta: err.meta
    });
  }
};

// ─── ASSIGN ROLE (MD only) ────────────────────────────────────────────────
export const assignRole = async (req: Request, res: Response) => {
  try {
    const userReq = (req as any).user;
    const organizationId = userReq.organizationId || 'mcb-ghana-tenant';
    const actorId = userReq.id;
    const actorRole = (userReq.role || '').toUpperCase().replace(/_/g, ' ').trim();
    const actorRank = getRoleRank(actorRole);
    const { userId, role, supervisorId } = req.body;
    
    const roleAdministrators = ['DEV', 'MD', 'HR DIRECTOR', 'SUPER ADMIN'];
    if (!roleAdministrators.includes(actorRole)) {
       return res.status(403).json({ message: 'Access denied: Only the HR Director or Managing Director can assign roles.' });
    }

    const validRoles = ['DEV', 'MD', 'HR_DIRECTOR', 'HR_MANAGER', 'HR_OFFICER', 'FINANCE_MANAGER', 'MARKETING_HEAD', 'IT_MANAGER', 'IT_ADMIN', 'DIRECTOR', 'MANAGER', 'MID_MANAGER', 'SUPERVISOR', 'STAFF', 'CASUAL'];
    const normalizedTargetRole = String(role || '').toUpperCase().replace(/\s+/g, '_');
    if (!validRoles.includes(normalizedTargetRole)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    
    // 🛡️ Hierarchy Guard: Only MD/DEV (90+) or Admin Managers (85+) can assign roles >= 85 (HR/IT Manager)
    const targetRoleRank = getRoleRank(normalizedTargetRole);
    if (actorRank < 85 && actorRole !== 'DEV' && targetRoleRank >= 85) {
        return res.status(403).json({ error: 'Access denied: Only the MD or Administrative Managers can assign administrative roles.' });
    }

    // 🛡️ Cannot promote someone to a rank higher than yourself
    if (actorRank < targetRoleRank && actorRole !== 'DEV') {
        return res.status(403).json({ error: 'Access denied: You cannot assign a role with a higher rank than your own.' });
    }

    // 🛡️ Hierarchy Guard: Anti-Recursion check
    const targetUser = await prisma.user.findFirst({ where: { id: userId, organizationId }, select: { id: true } });
    if (!targetUser) return res.status(404).json({ error: 'Employee not found in this organization' });
    if (supervisorId) {
      const supervisor = await prisma.user.findFirst({ where: { id: supervisorId, organizationId }, select: { id: true } });
      if (!supervisor) return res.status(404).json({ error: 'Supervisor not found in this organization' });
      const isCycle = await HierarchyService.detectCycle(userId, supervisorId);
      if (isCycle) {
        return res.status(400).json({ error: 'Circular reporting detected: An employee cannot report to their own subordinate.' });
      }
    }

    const updateData: any = { role: normalizedTargetRole, rank: targetRoleRank };
    // Use syncPrimaryReporting to keep both layers (User & Matrix) in sync
    await HierarchyService.syncPrimaryReporting(organizationId, userId, supervisorId || null);

    const user = await prisma.user.update({
      where: { id: userId, organizationId },
      data: updateData,
      select: { id: true, fullName: true, role: true, supervisorId: true }
    });

    // Force the next request from this user to re-derive permissions from DB
    invalidateUserCache(userId);

    await notify(userId, 'Your Role Has Been Updated',
      `Your role has been changed to ${normalizedTargetRole}.`, 'INFO');
    await logAction(actorId, 'ROLE_ASSIGNED', 'User', userId, { role: normalizedTargetRole, supervisorId }, req.ip);
    res.json({ success: true, user });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

// ─── UPLOAD AVATAR ────────────────────────────────────────────────────────
export const uploadImage = async (req: Request, res: Response) => {
  try {
    const userReq = (req as any).user;
    const organizationId = userReq.organizationId || 'mcb-ghana-tenant';
    const { role: rawRole, id: actorId } = userReq;
    const actorRole = (rawRole || '').toUpperCase().replace(/_/g, ' ').trim();
    const targetId = req.params.id;
    const rank = getRoleRank(actorRole);
    const privilegedRoles = [
      'MD', 'DIRECTOR', 'HR_DIRECTOR', 'HR DIRECTOR', 
      'HR_MANAGER', 'HR MANAGER', 'IT_MANAGER', 'IT MANAGER', 
      'IT_ADMIN', 'IT ADMIN', 'HR_OFFICER', 'HR OFFICER'
    ];

    // 🛡️ REQUISITE: Only MD, HR, or IT can upload images (unless it's the user's own profile, but even then, policies might differ)
    // User requested "IT, HR, MD" specifically.
    if (rank < 80 || !privilegedRoles.includes(actorRole)) {
      if (actorId !== targetId) {
        return res.status(403).json({ message: 'Access denied: Profile imagery can only be managed by MD, HR, or IT.' });
      }
    }

    let publicUrl: string | null = null;
    const sharp = (await import('sharp')).default;
    const fs = (await import('fs')).default;
    const path = (await import('path')).default;
    const { storageService } = await import('../services/firebase-storage.service');

    // A: Multipart file upload (Multer)
    if (req.file) {
      try {
        const webpBuffer = await sharp(req.file.path)
          .resize(400, 400, { fit: 'cover' })
          .webp({ quality: 85 })
          .toBuffer();

        try {
          publicUrl = await storageService.uploadFile(webpBuffer, `${targetId}-avatar.webp`, 'avatars');
          console.log(`[UploadAvatar] Cloud persist successful for ${targetId}`);
        } catch (cloudErr) {
          console.warn('[UploadAvatar] Cloud fallback to Base64 persistence:', cloudErr);
          
          // 🛡️ SURVIVAL VECTOR: Conver to data URI for permanent DB storage if Cloud is down
          const b64 = webpBuffer.toString('base64');
          publicUrl = `data:image/webp;base64,${b64}`;

          // Extra layer: Attempt local write just in case persistent disk exists
          try {
            const filename = `avatar-${targetId}-${Date.now()}.webp`;
            const uploadDir = path.join(process.cwd(), 'public', 'uploads');
            if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
            const filepath = path.join(uploadDir, filename);
            await sharp(webpBuffer).toFile(filepath);
          } catch(e) {}
        } finally {
          try { fs.unlinkSync(req.file.path); } catch { }
        }
      } catch (sharpErr: any) {
        console.error('[UploadAvatar] Multipart Sharp Failure:', sharpErr);
        throw new Error(`Multipart processing failed: ${sharpErr.message}`);
      }
    }

    // B: Base64
    if (!publicUrl && req.body.image) {
      try {
        const base64 = req.body.image.replace(/^data:image\/\w+;base64,/, '');
        const buf = Buffer.from(base64, 'base64');
        const webpBuffer = await sharp(buf)
          .resize(400, 400, { fit: 'cover' })
          .webp({ quality: 85 })
          .toBuffer();

        try {
          publicUrl = await storageService.uploadFile(webpBuffer, `${targetId}-avatar.webp`, 'avatars');
        } catch (cloudErr) {
          console.warn('[UploadAvatar] Cloud (Base64) fallback to Base64 persistence:', cloudErr);
          const b64 = webpBuffer.toString('base64');
          publicUrl = `data:image/webp;base64,${b64}`;

          try {
            const filename = `avatar-${targetId}-${Date.now()}.webp`;
            const uploadDir = path.join(process.cwd(), 'public', 'uploads');
            if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
            const filepath = path.join(uploadDir, filename);
            await sharp(webpBuffer).toFile(filepath);
          } catch(e) {}
        }
      } catch (sharpErr: any) {
        console.error('[UploadAvatar] Base64 Sharp Failure:', sharpErr);
        throw new Error(`Base64 processing failed: ${sharpErr.message}`);
      }
    }

    // C: URL string provided directly
    if (!publicUrl && req.body.avatarUrl) {
      publicUrl = req.body.avatarUrl;
    }

    if (!publicUrl) return res.status(400).json({ message: 'No image provided.' });

    await userService.updateUser(organizationId, targetId, { avatarUrl: publicUrl } as any, userReq.id);
    await logAction(actorId, 'AVATAR_UPDATED', 'User', targetId, {}, req.ip);
    res.json({ url: publicUrl, message: 'Avatar updated successfully' });
  } catch (err: any) {
    console.error('[UploadAvatar] Crash:', err);
    res.status(500).json({ 
      error: 'Internal Server Error', 
      details: err.message,
      success: false 
    });
  }
};

// ─── UPLOAD SIGNATURE ─────────────────────────────────────────────────────
export const uploadSignature = async (req: Request, res: Response) => {
  try {
    const userReq = (req as any).user;
    const organizationId = userReq.organizationId || 'mcb-ghana-tenant';
    const { id: actorId } = userReq;
    const targetId = req.params.id || actorId;

    // 🛡️ REQUISITE: Only self-upload or MD/HR/IT
    const actorRole = userReq.role;
    const rank = getRoleRank(actorRole);
    if (rank < 80 && actorId !== targetId) {
      return res.status(403).json({ message: 'Access denied: You can only manage your own digital signature.' });
    }

    if (!req.body.image) return res.status(400).json({ message: 'No signature image provided.' });

    // 🗑️ DELETION LOGIC: If 'none', clear the signature
    if (req.body.image === 'none') {
      await userService.updateUser(organizationId, targetId, { signatureUrl: null } as any, userReq.id);
      await logAction(actorId, 'SIGNATURE_DELETED', 'User', targetId, {}, req.ip);
      return res.json({ message: 'Signature deleted successfully', url: null });
    }

    const sharp = (await import('sharp')).default;
    const { storageService } = await import('../services/firebase-storage.service');

    let publicUrl: string | null = null;
    const base64 = req.body.image.replace(/^data:image\/\w+;base64,/, '');
    const buf = Buffer.from(base64, 'base64');
    
    // Process signature: keep transparency, moderate quality
    const webpBuffer = await sharp(buf)
      .resize(600, 300, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 90, lossless: true })
      .toBuffer();

    try {
      publicUrl = await storageService.uploadFile(webpBuffer, `${targetId}-signature.webp`, 'signatures');
    } catch (cloudErr) {
      // Fallback to base64 persistence
      publicUrl = `data:image/webp;base64,${webpBuffer.toString('base64')}`;
    }

    await userService.updateUser(organizationId, targetId, { signatureUrl: publicUrl } as any, userReq.id);
    await logAction(actorId, 'SIGNATURE_UPDATED', 'User', targetId, {}, req.ip);
    res.json({ url: publicUrl, message: 'Digital signature updated successfully' });
  } catch (err: any) {
    console.error('[UploadSignature] Error:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
};

// ─── GET SUPERVISORS LIST (for dropdowns) ────────────────────────────────
export const getSupervisors = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const organizationId = user.organizationId || 'mcb-ghana-tenant';
  const supervisors = await prisma.user.findMany({
    where: { 
      organizationId, 
      role: { in: ['MD', 'HR_DIRECTOR', 'DIRECTOR', 'HR_MANAGER', 'FINANCE_MANAGER', 'MARKETING_HEAD', 'IT_MANAGER', 'IT_ADMIN', 'MANAGER', 'MID_MANAGER', 'SUPERVISOR', 'HR_OFFICER'] },
      status: 'ACTIVE',
      NOT: { role: 'DEV' }
    },
    select: { id: true, fullName: true, role: true, jobTitle: true, departmentObj: { select: { name: true } } },
    orderBy: { fullName: 'asc' },
    take: 100
  });
  res.json(supervisors);
};

// ─── CASUAL WORKER OVERSIGHT ──────────────────────────────────────────────
// Org-wide summary of casual/factory workers grouped by their supervisor, so
// HR Director can see at a glance who's managing how many casual staff.
export const getCasualWorkerSummary = async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId || 'mcb-ghana-tenant';

    const groups = await prisma.user.groupBy({
      by: ['supervisorId'],
      where: { organizationId, role: 'CASUAL', isArchived: false },
      _count: { _all: true },
    });

    const totalCasualWorkers = groups.reduce((sum, g) => sum + g._count._all, 0);
    const supervisorIds = groups.map(g => g.supervisorId).filter(Boolean) as string[];
    const supervisors = supervisorIds.length
      ? await prisma.user.findMany({
          where: { id: { in: supervisorIds } },
          select: { id: true, fullName: true, jobTitle: true },
        })
      : [];
    const supervisorById = new Map(supervisors.map(s => [s.id, s]));

    const bySupervisor = groups.map(g => ({
      supervisorId: g.supervisorId,
      supervisorName: g.supervisorId ? (supervisorById.get(g.supervisorId)?.fullName || 'Unknown') : 'Unassigned',
      supervisorJobTitle: g.supervisorId ? supervisorById.get(g.supervisorId)?.jobTitle || null : null,
      count: g._count._all,
    })).sort((a, b) => b.count - a.count);

    res.json({ totalCasualWorkers, bySupervisor });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load casual worker summary' });
  }
};

// ─── RISK PROFILE ─────────────────────────────────────────────────────────
// ─── ARCHIVE EMPLOYEE (Soft Delete) ──────────────────────────────────────
export const archiveEmployee = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const organizationId = user.organizationId || 'mcb-ghana-tenant';
    const { id } = req.params;
    await prisma.user.update({
      where: { id, organizationId },
      data: { isArchived: true, status: 'ARCHIVED', archivedDate: new Date() }
    });
    await logAction(user.id, 'EMPLOYEE_ARCHIVED', 'User', id, {}, req.ip);
    res.json({ message: 'Employee archived successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ─── RESTORE EMPLOYEE ─────────────────────────────────────────────────────
export const restoreEmployee = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const organizationId = user.organizationId || 'mcb-ghana-tenant';
    const { id } = req.params;
    await prisma.user.update({
      where: { id, organizationId },
      data: { isArchived: false, status: 'ACTIVE', archivedDate: null }
    });
    await logAction(user.id, 'EMPLOYEE_RESTORED', 'User', id, {}, req.ip);
    res.json({ message: 'Employee restored successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ─── TRANSFER DEPARTMENT ──────────────────────────────────────────────────
export const transferEmployee = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const organizationId = user.organizationId || 'mcb-ghana-tenant';
    const { id } = req.params;
    const { departmentId, reason } = req.body;
    await prisma.user.update({
      where: { id, organizationId },
      data: { departmentId: parseInt(departmentId) }
    });
    await logAction(user.id, 'EMPLOYEE_TRANSFERRED', 'User', id, { departmentId, reason }, req.ip);
    res.json({ message: 'Employee transferred successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ─── PROMOTE EMPLOYEE ─────────────────────────────────────────────────────
export const promoteEmployee = async (req: Request, res: Response) => {
  try {
    const userReq = (req as any).user;
    const organizationId = userReq.organizationId || 'mcb-ghana-tenant';
    const { id } = req.params;
    const { jobTitle, role, salary, reason } = req.body;
    const updateData: any = { jobTitle, role };
    if (salary) updateData.salary = salary;

    await prisma.user.update({
      where: { id, organizationId },
      data: updateData
    });

    invalidateUserCache(id);

    // Optionally log in history
    await prisma.employeeHistory.create({
      data: {
        organizationId,
        employeeId: id,
        title: 'Promotion',
        description: `Promoted to ${jobTitle} (${role}). Reason: ${reason || 'N/A'}`,
        type: 'PROMOTION',
        createdById: userReq.id
      }
    });

    await logAction(userReq.id, 'EMPLOYEE_PROMOTED', 'User', id, { jobTitle, role, reason }, req.ip);
    res.json({ message: 'Employee promoted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getUserRiskProfile = async (req: Request, res: Response) => {
  try {
    const userReq = (req as any).user;
    const organizationId = userReq.organizationId || 'mcb-ghana-tenant';
    const profile = await riskService.getRiskProfile(organizationId, req.params.id);
    res.json(profile);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const resetEmployeePassword = async (req: Request, res: Response) => {
  try {
    const userReq = (req as any).user;
    const organizationId = userReq.organizationId || 'mcb-ghana-tenant';
    const actorId = userReq.id;
    const targetId = req.params.id;
    const targetUser = await prisma.user.findUnique({ where: { id: targetId, organizationId } });
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    // Hierarchy Guard: IT/HR Managers (Rank 85+) can reset all accounts.
    // However, the MD account (Rank 95) can only be reset by the MD or DEV.
    const targetRank = getRoleRank(targetUser.role);
    if (userReq.rank < 85 && userReq.role !== 'DEV') {
      return res.status(403).json({ error: 'Access denied: Only managers can reset passwords.' });
    }

    if (targetRank >= 95 && actorId !== targetId && userReq.role !== 'DEV') {
      return res.status(403).json({ error: 'Access denied: The Managing Director password can only be reset by the MD or a System Architect.' });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const token = crypto.createHash('sha256').update(rawToken).digest('hex');
    await prisma.$transaction([
      prisma.passwordResetToken.deleteMany({ where: { userId: targetId, usedAt: null } }),
      prisma.passwordResetToken.create({
        data: { userId: targetId, token, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
      }),
    ]);

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${rawToken}`;
    const sent = await sendEmail({
      to: targetUser.email,
      subject: 'MCB HRM password reset invitation',
      html: `<p>Hello ${targetUser.fullName},</p><p>An administrator initiated a secure password reset. This link expires in one hour.</p><p><a href="${resetUrl}">Choose a new password</a></p>`,
    });
    if (!sent) {
      return res.status(503).json({ error: 'Password-reset email could not be delivered. Verify SMTP settings and retry.' });
    }

    await prisma.$transaction([
      prisma.refreshToken.updateMany({ where: { userId: targetId, organizationId, revokedAt: null }, data: { revokedAt: new Date() } }),
      prisma.user.update({ where: { id: targetId, organizationId }, data: { mustChangePassword: true } }),
    ]);
    await logAction(actorId, 'PWD_RESET_INVITED', 'User', targetId, { adminId: actorId }, req.ip);
    
    res.json({ success: true, message: `Password-reset invitation sent to ${targetUser.email}. All active sessions were revoked.` });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// Legacy alias
export const createEmployeeWithNotifications = createEmployee;

// ---------- Self-Onboarding Public Endpoints (no auth) ----------

const ONBOARD_ALLOWED_FIELDS = [
  'contactNumber', 'bankAccountNumber', 'bankBranch', 'bankName', 'address',
  'nextOfKinName', 'nextOfKinRelation', 'nextOfKinContact',
  'emergencyContactName', 'emergencyContactPhone',
  'gender', 'maritalStatus', 'bloodGroup', 'dob', 'nationalId',
  'education', 'ssnitNumber', 'nationality',
];

const resolveInviteToken = async (rawToken: string) => {
  const record = await (prisma as any).onboardingInviteToken.findUnique({
    where: { token: rawToken },
    include: {
      user: {
        select: {
          id: true, fullName: true, email: true, jobTitle: true,
          departmentObj: { select: { name: true } },
        }
      }
    }
  });
  if (!record) return { error: 'Invalid invite link.', status: 400 };
  if (record.usedAt) return { error: 'This invite link has already been used.', status: 410 };
  if (record.expiresAt < new Date()) return { error: 'This invite link has expired. Contact HR for a new one.', status: 410 };
  return { record };
};

export const getOnboardingProfileForm = async (req: Request, res: Response) => {
  const { token } = req.params;
  const { error, status, record } = await resolveInviteToken(token);
  if (error) return res.status(status!).json({ error });
  const { id, fullName, email, jobTitle, departmentObj } = record!.user;
  return res.json({ id, fullName, email, jobTitle, department: departmentObj?.name });
};

export const submitOnboardingProfileForm = async (req: Request, res: Response) => {
  const { token } = req.params;
  const { error, status, record } = await resolveInviteToken(token);
  if (error) return res.status(status!).json({ error });

  const userId = record!.user.id;
  const data: Record<string, any> = {};
  for (const field of ONBOARD_ALLOWED_FIELDS) {
    if (req.body[field] !== undefined) data[field] = req.body[field];
  }
  if (data.dob) data.dob = new Date(data.dob);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { ...data, employeeLifecycleStage: 'PENDING_HR_REVIEW' },
    }),
    (prisma as any).onboardingInviteToken.update({
      where: { id: record!.id },
      data: { usedAt: new Date() },
    }),
  ]);

  // Notify HR Directors
  const hrDirectors = await prisma.user.findMany({
    where: { role: 'HR_DIRECTOR', isArchived: false },
    select: { id: true },
  });
  await Promise.all(
    hrDirectors.map(hr =>
      notify(hr.id, 'Profile Review Required', `${record!.user.fullName} has completed their self-onboarding profile and is awaiting HR review.`, 'INFO', `/employees/${userId}`)
    )
  );

  return res.json({ success: true, message: 'Profile submitted successfully. HR will review and activate your account.' });
};

export const hrApproveOnboarding = async (req: Request, res: Response) => {
  try {
    const actor = (req as any).user;
    const organizationId = actor.organizationId || 'mcb-ghana-tenant';
    const employee = await prisma.user.findFirst({
      where: { id: req.params.id, organizationId },
      select: { id: true, email: true, fullName: true, employeeLifecycleStage: true },
    });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    if (employee.employeeLifecycleStage !== 'PENDING_HR_REVIEW') {
      return res.status(409).json({ error: 'Employee is not pending HR review.' });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    await prisma.$transaction([
      prisma.passwordResetToken.deleteMany({ where: { userId: employee.id } }),
      prisma.passwordResetToken.create({
        data: { userId: employee.id, token: tokenHash, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
      }),
      prisma.user.update({
        where: { id: employee.id },
        data: { loginEnabled: true, mustChangePassword: true, employeeLifecycleStage: 'ONBOARDING' },
      }),
    ]);

    const frontendUrl = process.env.FRONTEND_URL || 'https://mcb-hrm-ghana.web.app';
    const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;
    if (employee.email) {
      await sendEmail({
        to: employee.email,
        subject: 'Your MCB Ghana HRM Account is Ready',
        html: `<p>Hi <strong>${employee.fullName}</strong>,</p>
<p>Your profile has been reviewed and your account is now active. Click below to set your password and log in.</p>
<p><a href="${resetUrl}" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">Set My Password</a></p>
<p style="color:#64748b;font-size:12px">This link expires in 24 hours.</p>`,
      });
    }

    await logAction(actor.id, 'EMPLOYEE_ONBOARDING_APPROVED', 'User', employee.id, {}, req.ip);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// ─── GET ONBOARDING INVITE LINK ───────────────────────────────────────────
export const getOnboardingInvite = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = (req as any).user?.organizationId || 'mcb-ghana-tenant';
    const employee = await prisma.user.findFirst({
      where: { id, organizationId: orgId },
      select: { id: true, fullName: true, email: true, employeeLifecycleStage: true },
    });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const token = await (prisma as any).onboardingInviteToken.findUnique({ where: { userId: id } });
    if (!token) return res.json({ inviteUrl: null, expiresAt: null, usedAt: null, isExpired: false, employeeLifecycleStage: employee.employeeLifecycleStage });

    const frontendUrl = process.env.FRONTEND_URL || 'https://mcb-hrm-ghana.web.app';
    const inviteUrl = `${frontendUrl}/onboard/complete-profile?token=${token.token}`;
    return res.json({
      inviteUrl,
      expiresAt: token.expiresAt,
      usedAt: token.usedAt,
      isExpired: new Date(token.expiresAt) < new Date(),
      employeeLifecycleStage: employee.employeeLifecycleStage,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// ─── TOGGLE ONBOARDING INVITE LINK ON / OFF ──────────────────────────────
// enabled=true  → generate a fresh 7-day token (profile unlocked for employee)
// enabled=false → expire the token (profile locked; employee must ticket HR to reopen)
export const toggleOnboardingInvite = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { enabled } = req.body as { enabled: boolean };
    const orgId = (req as any).user?.organizationId || 'mcb-ghana-tenant';

    const employee = await prisma.user.findFirst({
      where: { id, organizationId: orgId },
      select: { id: true, fullName: true },
    });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const frontendUrl = process.env.FRONTEND_URL || 'https://mcb-hrm-ghana.web.app';

    if (enabled) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await (prisma as any).onboardingInviteToken.upsert({
        where: { userId: id },
        create: { userId: id, token: rawToken, expiresAt },
        update: { token: rawToken, expiresAt, usedAt: null },
      });
      await logAction((req as any).user.id, 'ONBOARDING_LINK_ENABLED', 'User', id, {}, req.ip);
      const inviteUrl = `${frontendUrl}/onboard/complete-profile?token=${rawToken}`;
      return res.json({ enabled: true, inviteUrl, expiresAt });
    } else {
      // Disable by expiring the token (no token deletion — preserves audit trail)
      await (prisma as any).onboardingInviteToken.upsert({
        where: { userId: id },
        create: { userId: id, token: crypto.randomBytes(32).toString('hex'), expiresAt: new Date('2000-01-01') },
        update: { expiresAt: new Date('2000-01-01') },
      });
      await prisma.user.update({
        where: { id },
        data: { employeeLifecycleStage: 'PROFILE_LOCKED' as any },
      });
      await logAction((req as any).user.id, 'ONBOARDING_LINK_DISABLED', 'User', id, {}, req.ip);
      return res.json({ enabled: false });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// ─── REGENERATE ONBOARDING INVITE LINK ───────────────────────────────────
export const regenerateOnboardingInvite = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = (req as any).user?.organizationId || 'mcb-ghana-tenant';
    const employee = await prisma.user.findFirst({
      where: { id, organizationId: orgId },
      select: { id: true, fullName: true, email: true },
    });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const rawToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await (prisma as any).onboardingInviteToken.upsert({
      where: { userId: id },
      create: { userId: id, token: rawToken, expiresAt },
      update: { token: rawToken, expiresAt, usedAt: null },
    });

    const frontendUrl = process.env.FRONTEND_URL || 'https://mcb-hrm-ghana.web.app';
    const inviteUrl = `${frontendUrl}/onboard/complete-profile?token=${rawToken}`;
    await logAction((req as any).user.id, 'ONBOARDING_INVITE_REGENERATED', 'User', id, {}, req.ip);
    return res.json({ inviteUrl, expiresAt });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};
