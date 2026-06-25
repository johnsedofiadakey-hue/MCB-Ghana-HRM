import prisma from '../prisma/client';
import { getEffectiveLeaveMetrics } from '../utils/leave.utils';

const monthsBetween = (from: Date, to: Date) => {
  const yearDiff = to.getFullYear() - from.getFullYear();
  const monthDiff = to.getMonth() - from.getMonth();
  return Math.max(0, yearDiff * 12 + monthDiff);
};

/**
 * Accrue leave balances for all active users based on their allowance.
 * Optimized for production: Batch processing and atomic updates.
 */
export const accrueLeaveBalances = async () => {
  const now = new Date();
  
  // 1. Fetch users who are due for accrual
  const users = await prisma.user.findMany({
    where: { 
      isArchived: false,
      OR: [
        { leaveAccruedAt: { lt: new Date(now.getFullYear(), now.getMonth(), 1) } },
        { leaveAccruedAt: null }
      ]
    },
    select: { 
      id: true, 
      leaveBalance: true, 
      leaveAllowance: true, 
      leaveAccruedAt: true, 
      organizationId: true,
      hasManualLeaveOverride: true,
      organization: { select: { defaultLeaveAllowance: true } }
    }
  });

  if (users.length === 0) return 0;

  // Pre-fetch all distinct orgs in one query to avoid N+1 inside the transaction
  const orgIds = [...new Set(users.map(u => u.organizationId || 'mcb-ghana-tenant'))];
  const orgRows = await prisma.organization.findMany({
    where: { id: { in: orgIds } },
    select: { id: true, allowLeaveCarryForward: true, carryForwardLimit: true },
  });
  const orgMap = new Map(orgRows.map(o => [o.id, o]));

  let updatedCount = 0;

  await prisma.$transaction(async (tx) => {
    for (const user of users) {
      const org = orgMap.get(user.organizationId || 'mcb-ghana-tenant') || { allowLeaveCarryForward: true, carryForwardLimit: 10 };

      const lastAccruedAt = user.leaveAccruedAt || new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const monthsToAccrue = monthsBetween(lastAccruedAt, now);

      if (monthsToAccrue <= 0) continue;

      const metrics = getEffectiveLeaveMetrics(user);
      let balance = metrics.balance;
      const allowance = metrics.allowance;
      const monthlyAccrual = allowance / 12;

      // ── CARRY FORWARD LOGIC: If a year has passed since last accrual ────────
      const lastYear = lastAccruedAt.getFullYear();
      const currentYear = now.getFullYear();

      if (currentYear > lastYear && (org?.allowLeaveCarryForward ?? true) && !user.hasManualLeaveOverride) {
        const limit = Number(org?.carryForwardLimit ?? 10);
        console.log(`[LeaveAccrued] Year transition for ${user.id}. Capping carry forward to ${limit}. Old Balance: ${balance}`);
        balance = Math.min(balance, limit);
      }

      // Round at each step to prevent floating-point compounding drift
      const accrued = Math.round(monthlyAccrual * monthsToAccrue * 100) / 100;
      const newBalance = Math.round((balance + accrued) * 100) / 100;

      await tx.user.update({
        where: { id: user.id },
        data: {
          leaveBalance: newBalance,
          leaveAccruedAt: now
        }
      });

      updatedCount += 1;
    }
  });

  return updatedCount;
};
