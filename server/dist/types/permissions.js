"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRoleDefaultPermissions = exports.ROLE_DEFAULT_BUNDLES = exports.PERMISSION_BUNDLES = exports.Permission = void 0;
exports.Permission = {
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
};
exports.PERMISSION_BUNDLES = {
    HR_PEOPLE_ADMIN: [
        exports.Permission.EMPLOYEE_READ,
        exports.Permission.EMPLOYEE_WRITE,
        exports.Permission.EMPLOYEE_HISTORY_READ,
        exports.Permission.EMPLOYEE_HISTORY_WRITE,
        exports.Permission.COMPENSATION_MANAGE,
        exports.Permission.ONBOARDING_MANAGE,
        exports.Permission.ONBOARDING_VERIFY,
        exports.Permission.HELPDESK_HR,
    ],
    FINANCE_PAYROLL_ADMIN: [
        exports.Permission.PAYROLL_PREPARE,
        exports.Permission.PAYROLL_SUBMIT,
        exports.Permission.PAYROLL_EXPORT,
        exports.Permission.LOAN_MANAGE,
        exports.Permission.EXPENSE_MANAGE,
        exports.Permission.HELPDESK_FINANCE,
    ],
    IT_OPERATIONS_ADMIN: [
        exports.Permission.ACCOUNT_PROVISION,
        exports.Permission.ACCOUNT_ACTIVATE,
        exports.Permission.ONBOARDING_MANAGE,
        exports.Permission.ASSET_MANAGE,
        exports.Permission.CARD_ACCESS,
        exports.Permission.CARD_PRODUCTION,
        exports.Permission.CARD_DESIGN,
        exports.Permission.HELPDESK_IT,
    ],
    MARKETING_CARD_ADMIN: [
        exports.Permission.CARD_PRODUCTION,
        exports.Permission.CARD_DESIGN,
        exports.Permission.CALL_CARD_MANAGE,
        exports.Permission.HELPDESK_MARKETING,
    ],
    OPERATIONS_FACILITIES_ADMIN: [
        exports.Permission.HELPDESK_FACILITIES,
        exports.Permission.HELPDESK_OTHER,
    ],
    MD_FINAL_APPROVER: [
        exports.Permission.EMPLOYEE_READ,
        exports.Permission.EMPLOYEE_HISTORY_READ,
        exports.Permission.PAYROLL_RELEASE,
        exports.Permission.LOAN_MANAGE,
        exports.Permission.EXPENSE_MANAGE,
        exports.Permission.LEAVE_MD_APPROVE,
    ],
};
exports.ROLE_DEFAULT_BUNDLES = {
    HR_DIRECTOR: ['HR_PEOPLE_ADMIN'],
    HR_MANAGER: ['HR_PEOPLE_ADMIN'],
    FINANCE_MANAGER: ['FINANCE_PAYROLL_ADMIN'],
    IT_MANAGER: ['IT_OPERATIONS_ADMIN'],
    IT_ADMIN: ['IT_OPERATIONS_ADMIN'],
    MARKETING_HEAD: ['MARKETING_CARD_ADMIN'],
    DIRECTOR: ['OPERATIONS_FACILITIES_ADMIN'],
    MD: ['MD_FINAL_APPROVER'],
};
const getRoleDefaultPermissions = (role) => {
    const normalizedRole = String(role || '').toUpperCase();
    const bundles = exports.ROLE_DEFAULT_BUNDLES[normalizedRole] || [];
    const roleSpecific = normalizedRole === 'HR_DIRECTOR'
        ? [exports.Permission.PAYROLL_HR_APPROVE, exports.Permission.LEAVE_HR_APPROVE]
        : [];
    return [...new Set([...bundles.flatMap((name) => [...exports.PERMISSION_BUNDLES[name]]), ...roleSpecific])];
};
exports.getRoleDefaultPermissions = getRoleDefaultPermissions;
