import { describe, expect, it } from 'vitest';
import { getRoleDefaultPermissions, Permission } from '../types/permissions';
import { calculateGhanaPayroll, calculateGhanaSSNIT } from '../services/payroll.service';
import { addBusinessHours, addBusinessMinutes, businessMinutesBetween } from '../controllers/support.controller';
import { canViewOrganizationDashboard } from '../controllers/dashboard.controller';

describe('department permission matrix', () => {
  it('does not grant Marketing payroll, salary, IT or settings permissions', () => {
    const permissions = getRoleDefaultPermissions('MARKETING_HEAD');
    expect(permissions).toContain(Permission.CARD_PRODUCTION);
    expect(permissions).toContain(Permission.CARD_DESIGN);
    expect(permissions).toContain(Permission.CALL_CARD_MANAGE);
    expect(permissions).not.toContain(Permission.PAYROLL_PREPARE);
    expect(permissions).not.toContain(Permission.COMPENSATION_MANAGE);
    expect(permissions).not.toContain(Permission.CARD_ACCESS);
    expect(permissions).not.toContain(Permission.ACCOUNT_ACTIVATE);
  });

  it('keeps IT, Finance, HR and Operations within their departmental boundaries', () => {
    const it = getRoleDefaultPermissions('IT_MANAGER');
    expect(it).toEqual(expect.arrayContaining([Permission.ACCOUNT_PROVISION, Permission.ASSET_MANAGE, Permission.CARD_ACCESS, Permission.HELPDESK_IT]));
    [Permission.EMPLOYEE_WRITE, Permission.COMPENSATION_MANAGE, Permission.PAYROLL_PREPARE, Permission.CARD_PRODUCTION].forEach((permission) => expect(it).not.toContain(permission));

    const finance = getRoleDefaultPermissions('FINANCE_MANAGER');
    expect(finance).toEqual(expect.arrayContaining([Permission.PAYROLL_PREPARE, Permission.PAYROLL_SUBMIT, Permission.PAYROLL_EXPORT, Permission.LOAN_MANAGE, Permission.EXPENSE_MANAGE]));
    [Permission.EMPLOYEE_WRITE, Permission.CARD_DESIGN, Permission.ACCOUNT_ACTIVATE].forEach((permission) => expect(finance).not.toContain(permission));

    const hr = getRoleDefaultPermissions('HR_DIRECTOR');
    expect(hr).toEqual(expect.arrayContaining([Permission.EMPLOYEE_WRITE, Permission.EMPLOYEE_HISTORY_READ, Permission.EMPLOYEE_HISTORY_WRITE, Permission.COMPENSATION_MANAGE, Permission.ONBOARDING_VERIFY]));
    [Permission.PAYROLL_PREPARE, Permission.PAYROLL_RELEASE, Permission.CARD_ACCESS].forEach((permission) => expect(hr).not.toContain(permission));

    const operations = getRoleDefaultPermissions('DIRECTOR');
    expect(operations).toEqual(expect.arrayContaining([Permission.HELPDESK_FACILITIES, Permission.HELPDESK_OTHER]));
    [Permission.PAYROLL_PREPARE, Permission.EMPLOYEE_WRITE, Permission.ACCOUNT_PROVISION].forEach((permission) => expect(operations).not.toContain(permission));
  });

  it('keeps sensitive employee history with HR and MD oversight only', () => {
    expect(getRoleDefaultPermissions('HR_DIRECTOR')).toEqual(expect.arrayContaining([
      Permission.EMPLOYEE_HISTORY_READ,
      Permission.EMPLOYEE_HISTORY_WRITE,
    ]));
    expect(getRoleDefaultPermissions('MD')).toContain(Permission.EMPLOYEE_HISTORY_READ);
    expect(getRoleDefaultPermissions('MD')).not.toContain(Permission.EMPLOYEE_HISTORY_WRITE);
    ['MARKETING_HEAD', 'FINANCE_MANAGER', 'IT_MANAGER', 'DIRECTOR'].forEach((role) => {
      expect(getRoleDefaultPermissions(role)).not.toContain(Permission.EMPLOYEE_HISTORY_READ);
      expect(getRoleDefaultPermissions(role)).not.toContain(Permission.EMPLOYEE_HISTORY_WRITE);
    });
  });

  it('does not turn department-head rank into organization-wide analytics access', () => {
    expect(canViewOrganizationDashboard('MARKETING_HEAD')).toBe(false);
    expect(canViewOrganizationDashboard('FINANCE_MANAGER')).toBe(false);
    expect(canViewOrganizationDashboard('IT_MANAGER')).toBe(false);
    expect(canViewOrganizationDashboard('HR_DIRECTOR')).toBe(true);
    expect(canViewOrganizationDashboard('MD')).toBe(true);
  });

  it('keeps payroll preparation, HR validation and MD release separate', () => {
    expect(getRoleDefaultPermissions('FINANCE_MANAGER')).toContain(Permission.PAYROLL_SUBMIT);
    expect(getRoleDefaultPermissions('FINANCE_MANAGER')).not.toContain(Permission.PAYROLL_RELEASE);
    expect(getRoleDefaultPermissions('HR_DIRECTOR')).toContain(Permission.PAYROLL_HR_APPROVE);
    expect(getRoleDefaultPermissions('HR_MANAGER')).not.toContain(Permission.PAYROLL_HR_APPROVE);
    expect(getRoleDefaultPermissions('HR_DIRECTOR')).not.toContain(Permission.PAYROLL_PREPARE);
    expect(getRoleDefaultPermissions('MD')).toContain(Permission.PAYROLL_RELEASE);
    expect(getRoleDefaultPermissions('MD')).not.toContain(Permission.PAYROLL_PREPARE);
    expect(getRoleDefaultPermissions('MD')).toEqual(expect.arrayContaining([Permission.LOAN_MANAGE, Permission.EXPENSE_MANAGE]));
  });

  it('reserves leave policy approval for the HR Director and final sign-off for the MD', () => {
    expect(getRoleDefaultPermissions('HR_DIRECTOR')).toContain(Permission.LEAVE_HR_APPROVE);
    expect(getRoleDefaultPermissions('HR_MANAGER')).not.toContain(Permission.LEAVE_HR_APPROVE);
    expect(getRoleDefaultPermissions('MD')).toContain(Permission.LEAVE_MD_APPROVE);
    expect(getRoleDefaultPermissions('MD')).not.toContain(Permission.LEAVE_HR_APPROVE);
  });
});

describe('Ghana payroll calculation contract', () => {
  it('calculates SSNIT from basic salary and applies 2026 insurable limits', () => {
    expect(calculateGhanaSSNIT(100_000, 0.055, 0.13, 587.8, 69_000)).toEqual({
      employeeSSNIT: 3795,
      employerSSNIT: 8970,
    });
  });

  it('keeps expense reimbursements outside taxable gross', () => {
    const withoutExpense = calculateGhanaPayroll({ grossSalary: 5_000, payeBands: [{ limit: Infinity, rate: 0.2 }] });
    const withExpense = calculateGhanaPayroll({ grossSalary: 5_000, expenseReimbursements: 800, payeBands: [{ limit: Infinity, rate: 0.2 }] });
    expect(withExpense.grossPay).toBe(withoutExpense.grossPay);
    expect(withExpense.payeTax).toBe(withoutExpense.payeTax);
    expect(withExpense.netPay - withoutExpense.netPay).toBe(800);
  });
});

describe('help-desk SLA contract', () => {
  it('counts only the 09:00-17:00 weekday service window', () => {
    const fridayAtFour = new Date(2026, 5, 26, 16, 0, 0);
    const due = addBusinessHours(fridayAtFour, 4);
    expect(due.getDay()).toBe(1);
    expect(due.getHours()).toBe(12);
  });

  it('maps a normal 24-hour SLA to three business days', () => {
    const mondayMorning = new Date(2026, 5, 22, 9, 0, 0);
    const due = addBusinessHours(mondayMorning, 24);
    expect(due.getDay()).toBe(3);
    expect(due.getHours()).toBe(17);
  });

  it('does not extend an SLA for nights or weekends while waiting on the requester', () => {
    const pausedAt = new Date(2026, 5, 26, 16, 0, 0);
    const resumedAt = new Date(2026, 5, 29, 10, 0, 0);
    const pausedMinutes = businessMinutesBetween(pausedAt, resumedAt);
    expect(pausedMinutes).toBe(120);
    const originalDue = new Date(2026, 5, 29, 12, 0, 0);
    expect(addBusinessMinutes(originalDue, pausedMinutes).getHours()).toBe(14);
  });
});
