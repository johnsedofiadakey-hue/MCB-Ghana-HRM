export const RoleRank = {
    DEV: 100,
    MD: 95,
    HR_DIRECTOR: 92,
    DIRECTOR: 90,
    HR_MANAGER: 88,
    FINANCE_MANAGER: 87,
    MARKETING_HEAD: 86,
    IT_MANAGER: 85,
    IT_ADMIN: 85,
    HR_OFFICER: 80,
    MANAGER: 75,
    MID_MANAGER: 65,
    SUPERVISOR: 65,
    STAFF: 50,
    CASUAL: 40
} as const;

export type RoleName = keyof typeof RoleRank;
export type RoleRankType = typeof RoleRank[RoleName];

export const ROLE_RANK_MAP: Record<string, number> = {
    ...RoleRank,
    ADMIN: RoleRank.IT_ADMIN,
    SUPER_ADMIN: RoleRank.DEV,
    'MANAGING DIRECTOR': RoleRank.MD,
    MANAGING_DIRECTOR: RoleRank.MD,
    'SYSTEM DEVELOPER': RoleRank.DEV,
    SYSTEM_DEVELOPER: RoleRank.DEV,
    'HR DIRECTOR': RoleRank.HR_DIRECTOR,
    HR: RoleRank.HR_OFFICER,
    'IT MANAGER': RoleRank.IT_MANAGER,
    'HR MANAGER': RoleRank.HR_MANAGER,
    'FINANCE MANAGER': RoleRank.FINANCE_MANAGER,
    'FIANANCE MANAGER': RoleRank.FINANCE_MANAGER,
    FINANCE: RoleRank.FINANCE_MANAGER,
    'MARKETING HEAD': RoleRank.MARKETING_HEAD,
    'IT ADMINISTRATOR': RoleRank.IT_ADMIN,
    'HR OFFICER': RoleRank.HR_OFFICER,
    TEAM_LEAD: RoleRank.SUPERVISOR,
    'TEAM LEAD': RoleRank.SUPERVISOR,
    EMPLOYEE: RoleRank.STAFF,
    EMPLOYEE_MEMBER: RoleRank.STAFF,
    'EMPLOYEE MEMBER': RoleRank.STAFF,
    'STAFF MEMBER': RoleRank.STAFF,
    'CASUAL WORKER': RoleRank.CASUAL,
    'MID MANAGER': RoleRank.MID_MANAGER
};

export const ROLE_LABELS: Record<string, string> = {
  DEV: 'System Developer',
  MD: 'Managing Director',
  HR_DIRECTOR: 'HR Director',
  DIRECTOR: 'Director',
  HR_MANAGER: 'HR Manager',
  FINANCE_MANAGER: 'Finance Manager',
  MARKETING_HEAD: 'Marketing Manager',
  IT_MANAGER: 'IT Manager',
  IT_ADMIN: 'IT Administrator',
  HR_OFFICER: 'HR Officer',
  MANAGER: 'Manager',
  MID_MANAGER: 'Mid Manager',
  SUPERVISOR: 'Mid Manager',
  STAFF: 'Staff',
  CASUAL: 'Casual Worker',
};

// Roles to exclude from UI selection (legacy aliases)
const HIDDEN_ROLES: string[] = ['SUPERVISOR', 'DEV'];

// Returns a sorted list of roles by rank (descending), excluding hidden/alias roles
export const GET_ORDERED_ROLES = (): RoleName[] => {
    return (Object.keys(RoleRank) as RoleName[])
        .filter(r => !HIDDEN_ROLES.includes(r))
        .sort((a, b) => RoleRank[b] - RoleRank[a]);
};
