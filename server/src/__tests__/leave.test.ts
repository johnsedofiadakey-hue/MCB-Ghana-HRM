import { describe, it, expect, vi } from 'vitest';

// ── Mocking Data Structures ─────────────────────────

const ROLE_RANK_MAP: Record<string, number> = {
  DEV: 100,
  MD: 90,
  DIRECTOR: 85,
  HR_OFFICER: 85,
  MANAGER: 70,
  MID_MANAGER: 75,
  SUPERVISOR: 60,
  STAFF: 50,
};

const getRoleRank = (role?: string): number => {
  if (!role) return 0;
  const normalized = String(role).toUpperCase();
  return ROLE_RANK_MAP[normalized] ?? 0;
};

// ── Replicating Leave Logic for Unit Testing ────────

describe('Leave Approval Logic (Resilience Layer)', () => {

  const determineNextStatus = (leave: any, actorRole: string, approve: boolean): string => {
    const rank = getRoleRank(actorRole);
    const employeeRank = getRoleRank(leave.employeeRole);
    const isManager = employeeRank >= 70;

    if (!approve) {
        if (rank >= 80) return 'MD_REJECTED';
        return 'MANAGER_REJECTED';
    }

    // Role-based Terminal Approval Logic (Refactored)
    if (rank >= 85) {
        return 'APPROVED'; // Directors and above can terminal-approve
    }

    if (isManager) {
        return 'APPROVED'; // Manager's leave only needs one level
    }

    return 'MD_REVIEW'; // Staff leave needs MD sign-off
  };

  it('should allow Director (85) to terminal-approve Staff leave', () => {
    const leave = { employeeRole: 'STAFF', status: 'MANAGER_REVIEW' };
    const nextStatus = determineNextStatus(leave, 'DIRECTOR', true);
    expect(nextStatus).toBe('APPROVED');
  });

  it('should allow MD (90) to terminal-approve Staff leave', () => {
    const leave = { employeeRole: 'STAFF', status: 'MANAGER_REVIEW' };
    const nextStatus = determineNextStatus(leave, 'MD', true);
    expect(nextStatus).toBe('APPROVED');
  });

  it('should move Staff (50) leave to MD_REVIEW if approved by Manager (70)', () => {
    const leave = { employeeRole: 'STAFF', status: 'MANAGER_REVIEW' };
    const nextStatus = determineNextStatus(leave, 'MANAGER', true);
    expect(nextStatus).toBe('MD_REVIEW');
  });

  it('should terminal-approve Manager (70) leave if approved by Director (85)', () => {
    const leave = { employeeRole: 'MANAGER', status: 'MANAGER_REVIEW' };
    const nextStatus = determineNextStatus(leave, 'DIRECTOR', true);
    expect(nextStatus).toBe('APPROVED');
  });

  it('should correctly reject leave at MD level', () => {
    const leave = { employeeRole: 'STAFF', status: 'MD_REVIEW' };
    const nextStatus = determineNextStatus(leave, 'MD', false);
    expect(nextStatus).toBe('MD_REJECTED');
  });

  it('should correctly reject leave at Manager level', () => {
    const leave = { employeeRole: 'STAFF', status: 'MANAGER_REVIEW' };
    const nextStatus = determineNextStatus(leave, 'MANAGER', false);
    expect(nextStatus).toBe('MANAGER_REJECTED');
  });
});
