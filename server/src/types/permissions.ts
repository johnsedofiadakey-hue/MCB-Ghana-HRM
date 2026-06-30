export const Permission = {
  EMPLOYEE_READ: 'employee.read',
  EMPLOYEE_WRITE: 'employee.write',
  EMPLOYEE_HISTORY_READ: 'employee.history.read',
  EMPLOYEE_HISTORY_WRITE: 'employee.history.write',
  COMPENSATION_MANAGE: 'compensation.manage',
  ONBOARDING_MANAGE: 'onboarding.manage',
  ONBOARDING_VERIFY: 'onboarding.verify',
  ACCOUNT_PROVISION: 'account.provision',
  ACCOUNT_ACTIVATE: 'account.activate',
  ASSET_MANAGE: 'asset.manage',
  CARD_PRODUCTION: 'card.production',
  CARD_DESIGN: 'card.design',
  CARD_ACCESS: 'card.access',
  CALL_CARD_MANAGE: 'callcard.manage',
  PAYROLL_PREPARE: 'payroll.prepare',
  PAYROLL_SUBMIT: 'payroll.submit',
  PAYROLL_HR_APPROVE: 'payroll.hr.approve',
  PAYROLL_RELEASE: 'payroll.release',
  PAYROLL_EXPORT: 'payroll.export',
  LOAN_MANAGE: 'finance.loan.manage',
  EXPENSE_MANAGE: 'finance.expense.manage',
  HELPDESK_IT: 'helpdesk.it.manage',
  HELPDESK_HR: 'helpdesk.hr.manage',
  HELPDESK_FINANCE: 'helpdesk.finance.manage',
  HELPDESK_MARKETING: 'helpdesk.marketing.manage',
  HELPDESK_FACILITIES: 'helpdesk.facilities.manage',
  HELPDESK_OTHER: 'helpdesk.other.manage',
  LEAVE_HR_APPROVE: 'leave.hr.approve',
  LEAVE_MD_APPROVE: 'leave.md.approve',
} as const;

export type PermissionName = typeof Permission[keyof typeof Permission];

export const PERMISSION_BUNDLES = {
  HR_PEOPLE_ADMIN: [
    Permission.EMPLOYEE_READ,
    Permission.EMPLOYEE_WRITE,
    Permission.EMPLOYEE_HISTORY_READ,
    Permission.EMPLOYEE_HISTORY_WRITE,
    Permission.COMPENSATION_MANAGE,
    Permission.ONBOARDING_MANAGE,
    Permission.ONBOARDING_VERIFY,
    Permission.HELPDESK_HR,
  ],
  FINANCE_PAYROLL_ADMIN: [
    Permission.PAYROLL_PREPARE,
    Permission.PAYROLL_SUBMIT,
    Permission.PAYROLL_EXPORT,
    Permission.LOAN_MANAGE,
    Permission.EXPENSE_MANAGE,
    Permission.HELPDESK_FINANCE,
  ],
  IT_OPERATIONS_ADMIN: [
    Permission.ACCOUNT_PROVISION,
    Permission.ACCOUNT_ACTIVATE,
    Permission.ASSET_MANAGE,
    Permission.CARD_ACCESS,
    Permission.HELPDESK_IT,
  ],
  MARKETING_CARD_ADMIN: [
    Permission.CARD_PRODUCTION,
    Permission.CARD_DESIGN,
    Permission.CALL_CARD_MANAGE,
    Permission.HELPDESK_MARKETING,
  ],
  OPERATIONS_FACILITIES_ADMIN: [
    Permission.HELPDESK_FACILITIES,
    Permission.HELPDESK_OTHER,
  ],
  MD_FINAL_APPROVER: [
    Permission.EMPLOYEE_READ,
    Permission.EMPLOYEE_HISTORY_READ,
    Permission.PAYROLL_RELEASE,
    Permission.LOAN_MANAGE,
    Permission.EXPENSE_MANAGE,
    Permission.LEAVE_MD_APPROVE,
  ],
} as const;

export const ROLE_DEFAULT_BUNDLES: Record<string, Array<keyof typeof PERMISSION_BUNDLES>> = {
  HR_DIRECTOR: ['HR_PEOPLE_ADMIN'],
  HR_MANAGER: ['HR_PEOPLE_ADMIN'],
  FINANCE_MANAGER: ['FINANCE_PAYROLL_ADMIN'],
  IT_MANAGER: ['IT_OPERATIONS_ADMIN'],
  IT_ADMIN: ['IT_OPERATIONS_ADMIN'],
  MARKETING_HEAD: ['MARKETING_CARD_ADMIN'],
  DIRECTOR: ['OPERATIONS_FACILITIES_ADMIN'],
  MD: ['MD_FINAL_APPROVER'],
};

export const getRoleDefaultPermissions = (role?: string): string[] => {
  const normalizedRole = String(role || '').toUpperCase();
  const bundles = ROLE_DEFAULT_BUNDLES[normalizedRole] || [];
  const roleSpecific = normalizedRole === 'HR_DIRECTOR'
    ? [Permission.PAYROLL_HR_APPROVE, Permission.LEAVE_HR_APPROVE]
    : [];
  return [...new Set([...bundles.flatMap((name) => [...PERMISSION_BUNDLES[name]]), ...roleSpecific])];
};
