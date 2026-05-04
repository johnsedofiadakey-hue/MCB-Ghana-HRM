export const RoleRank = {
    DEV: 100,
    MD: 95,
    DIRECTOR: 90,
    HR_MANAGER: 88,
    FINANCE_MANAGER: 87,
    IT_MANAGER: 85,
    IT_ADMIN: 85,
    HR_OFFICER: 80,
    MANAGER: 75,
    SUPERVISOR: 65,
    STAFF: 50,
    CASUAL: 40
} as const;

export type RoleName = keyof typeof RoleRank;
export type RoleRankType = typeof RoleRank[RoleName];

export const ROLE_RANK_MAP: Record<string, number> = {
    ...RoleRank,
    'MANAGING DIRECTOR': RoleRank.MD,
    'SYSTEM DEVELOPER': RoleRank.DEV
};

export const ROLE_LABELS: Record<string, string> = {
  DEV: 'System Developer',
  MD: 'Managing Director',
  DIRECTOR: 'Director',
  HR_MANAGER: 'HR Manager',
  FINANCE_MANAGER: 'Finance Manager',
  IT_MANAGER: 'IT Manager',
  IT_ADMIN: 'IT Administrator',
  HR_OFFICER: 'HR Officer',
  MANAGER: 'Manager',
  SUPERVISOR: 'Supervisor',
  STAFF: 'Staff Member',
  CASUAL: 'Casual Worker',
};

// Returns a sorted list of roles by rank (descending)
export const GET_ORDERED_ROLES = (): RoleName[] => {
    return (Object.keys(RoleRank) as RoleName[]).sort((a, b) => RoleRank[b] - RoleRank[a]);
};
