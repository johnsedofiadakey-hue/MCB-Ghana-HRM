export enum RoleRank {
    DEV = 100,
    MD = 95,
    HR_DIRECTOR = 92,
    DIRECTOR = 90,
    HR_MANAGER = 88,
    FINANCE_MANAGER = 87,
    IT_MANAGER = 85,
    HR_OFFICER = 80,
    MANAGER = 75,
    SUPERVISOR = 65,
    STAFF = 50,
    CASUAL = 40
}

export const ROLE_RANK_MAP: Record<string, number> = {
    DEV: RoleRank.DEV,
    MD: RoleRank.MD,
    HR_DIRECTOR: RoleRank.HR_DIRECTOR,
    HR_MANAGER: RoleRank.HR_MANAGER,
    DIRECTOR: RoleRank.DIRECTOR,
    FINANCE_MANAGER: RoleRank.FINANCE_MANAGER,
    IT_MANAGER: RoleRank.IT_MANAGER,
    HR_OFFICER: RoleRank.HR_OFFICER,
    MANAGER: RoleRank.MANAGER,
    SUPERVISOR: RoleRank.SUPERVISOR,
    STAFF: RoleRank.STAFF,
    CASUAL: RoleRank.CASUAL,

    HR: RoleRank.HR_OFFICER,
    HR_ADMIN: RoleRank.HR_MANAGER,
    IT_ADMIN: RoleRank.IT_MANAGER,
    EMPLOYEE: RoleRank.STAFF,
    SUPER_ADMIN: RoleRank.MD,
    
    // Alias Support for DB display roles
    'MANAGING DIRECTOR': RoleRank.MD,
    'SYSTEM DEVELOPER': RoleRank.DEV,
    'HR DIRECTOR': RoleRank.HR_DIRECTOR,
    'HR OFFICER': RoleRank.HR_OFFICER,
    'HR MANAGER': RoleRank.HR_MANAGER,
    'FINANCE MANAGER': RoleRank.FINANCE_MANAGER,
    'IT MANAGER': RoleRank.IT_MANAGER,
    'IT ADMIN': RoleRank.IT_MANAGER,
};
