/**
 * Leave Management Utilities
 * Standardizes hierarchical inheritance for leave allowance and balance.
 */

export interface LeaveMetrics {
  allowance: number;
  balance: number;
}

/**
 * Calculates effective leave allowance and balance for a user.
 * Hierarchy:
 * 1. User-specific override (from user record)
 * 2. Organization-level default (from joined organization record)
 * 3. Global system fallback (24)
 * 
 * @param user - User object potentially containing leaveAllowance, leaveBalance, and organization
 * @returns Object containing effective allowance and balance as numbers
 */
export const getEffectiveLeaveMetrics = (user: any): LeaveMetrics => {
  const org = user.organization || {};
  
  // 1. Allowance: User Specific -> Org Default -> System Fallback (30)
  const allowance = Number(
    user.leaveAllowance ?? 
    org.defaultLeaveAllowance ?? 
    30
  );

  // 2. Balance Logic
  let balance = Number(user.leaveBalance ?? allowance);

  // Apply Carry Forward Logic if enabled
  if (org.allowLeaveCarryForward) {
    const limit = Number(org.carryForwardLimit || 0);
    // This is a simplified check; in a full system we'd track last year's leftover
    // For now, we assume current balance can include up to 'limit' carry forward
  }

  return { allowance, balance };
};

/**
 * Checks if a user is allowed to borrow leave based on organization settings.
 */
export const canBorrowLeave = (user: any, requestedDays: number, availableBalance: number): boolean => {
  const org = user.organization || {};
  if (!org.allowLeaveBorrowing) return false;

  const limit = Number(org.borrowingLimit || 0);
  const negativeBalanceAllowed = limit;
  
  return (availableBalance + negativeBalanceAllowed) >= requestedDays;
};
