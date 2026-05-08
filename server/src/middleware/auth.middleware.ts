import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: string;
        name: string;
        organizationId: string | null;
        rank: number;
        isDemo?: boolean;
      };
    }
  }
}
import jwt from 'jsonwebtoken';
import prisma from '../prisma/client';
<<<<<<< HEAD
import { PolicyService } from '../services/policy.service';
=======
>>>>>>> 430a1da1a47c271c0801ba6d3e2fad6da5b864e7

if (!process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is not set. Server cannot start safely.');
}
const JWT_SECRET = process.env.JWT_SECRET;

import { RoleRank, ROLE_RANK_MAP } from '../types/roles';

const normalizeRole = (role?: string): string => {
  if (!role) return '';
  return String(role).toUpperCase();
};

export const getRoleRank = (role?: string): number => {
  const normalized = normalizeRole(role);
  if (!normalized) return 0;
  return ROLE_RANK_MAP[normalized] ?? 0;
};

import { tenantContext } from '../utils/context';

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  let token = '';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
<<<<<<< HEAD
=======
  } else if (req.query.token) {
    token = req.query.token as string;
>>>>>>> 430a1da1a47c271c0801ba6d3e2fad6da5b864e7
  }

  if (!token) {
    console.warn(`[Auth Middleware] No token provided for: ${req.method} ${req.path}`);
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role?: string; name?: string; organizationId?: string; isDemo?: boolean };

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
       const sandboxUser = await prisma.user.findFirst({
         where: { id: decoded.id, organizationId: 'sandbox-org-001' },
         select: { id: true, role: true, status: true, fullName: true, organizationId: true, departmentId: true }
       });

       if (!sandboxUser) {
          console.warn(`[Auth Middleware] Sandbox Account not found for ID: ${decoded.id}`);
          return res.status(401).json({ error: 'Sandbox account expired or deleted.' });
       }

      (req as any).user = {
        id: sandboxUser.id,
        role: sandboxUser.role || 'MD',
        name: sandboxUser.fullName || 'Sandbox Operator',
        organizationId: 'sandbox-org-001',
        rank: getRoleRank(sandboxUser.role || 'MD'),
      };

      return tenantContext.run({
        organizationId: 'sandbox-org-001',
        userId: sandboxUser.id,
        role: sandboxUser.role || 'MD'
      }, () => {
        next();
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, role: true, status: true, fullName: true, organizationId: true, departmentId: true },
    }).catch(err => {
      console.error('[Auth Middleware] Database Error:', err.message);
      throw err;
    });

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

    (req as any).user = {
      id: user.id,
      role: user.role,
      name: user.fullName,
      organizationId: user.organizationId || null,
      rank: getRoleRank(user.role),
      departmentId: user.departmentId || null,
      isDemo: decoded.isDemo || false,
    };

    // Run the rest of the request within the tenant context
    tenantContext.run({
      organizationId: user.organizationId || null,
      userId: user.id,
      role: user.role || null
    }, () => {
      next();
    });

  } catch (error: any) {
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

export const authorize = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = (req as any).user?.role;
    const userRank = getRoleRank(userRole);
    
    // DEV bypass
    if (normalizeRole(userRole) === 'DEV') return next();

    // Map allowed roles to their required ranks
    const allowedRanks = allowedRoles.map(r => getRoleRank(r));

    if (allowedRanks.includes(userRank)) {
      return next();
    }
    
    console.warn(`[Auth] Access denied for role: ${userRole} (Rank: ${userRank}). Required ranks: ${allowedRanks.join(', ')}`);
    return res.status(403).json({ error: 'Access denied: insufficient permissions' });
  };
};

// New middleware required by directive: requireRole(rank)
export const requireRole = (rank: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = (req as any).user?.role;
    const userRank = getRoleRank(userRole);
    if (userRank >= rank) {
      return next();
    }
    return res.status(403).json({ 
      error: `Access denied: requires role rank ${rank}+`, 
      debug: { userRole, userRank, requiredRank: rank } 
    });
  };
};

export const authorizeMinimumRole = (minimumRole: string) => {
  const requiredRank = getRoleRank(minimumRole);
  return requireRole(requiredRank || 999);
};

<<<<<<< HEAD
export const requirePermission = (permission: string, getContext?: (req: Request) => any) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const context = getContext ? getContext(req) : {};
    
    // Add default context if missing
    if (!context.targetUserId && req.params.userId) context.targetUserId = req.params.userId;
    if (!context.departmentId && req.params.departmentId) context.departmentId = parseInt(req.params.departmentId);

    const result = await PolicyService.evaluatePolicy(user.id, permission, context);

    if (!result.allowed) {
      return res.status(403).json({ error: `Forbidden: ${result.reason}` });
    }

    next();
  };
};

=======
>>>>>>> 430a1da1a47c271c0801ba6d3e2fad6da5b864e7
export const checkBilling = async (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  if (!user || user.role === 'DEV') return next();

  try {
    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId || 'mcb-ghana-tenant' },
      select: {
        billingStatus: true,
        trialStartDate: true,
        trialEndsAt: true,
        isSuspended: true,
      }
    });

    if (!org) return next();

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
  } catch (error: any) {
    console.error('[Billing Guard] Error:', error.message);
    next(); // Fail open for billing to avoid lockouts on DB issues, but log it
  }
};
