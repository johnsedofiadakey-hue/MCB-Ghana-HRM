import { describe, expect, it } from 'vitest';
import { determineHrReviewStatus, determineInitialLeaveStatus, determineMdReviewStatus } from '../services/leave.service';
import { getRoleDefaultPermissions, Permission } from '../types/permissions';

describe('leave approval contract', () => {
  it('routes ordinary employees and non-director department heads to terminal HR approval', () => {
    ['CASUAL', 'STAFF', 'MANAGER', 'IT_MANAGER', 'FINANCE_MANAGER', 'MARKETING_HEAD'].forEach((role) => {
      expect(determineHrReviewStatus(role, true)).toBe('APPROVED');
    });
  });

  it('routes directors, the HR Director and MD through MD final review', () => {
    expect(determineHrReviewStatus('DIRECTOR', true)).toBe('MD_REVIEW');
    expect(determineHrReviewStatus('HR_DIRECTOR', true)).toBe('MD_REVIEW');
    expect(determineHrReviewStatus('MD', true)).toBe('MD_REVIEW');
  });

  it('sends the HR Director own request directly to MD when no reliever is required, never to HR_REVIEW (self-approval guard)', () => {
    expect(determineInitialLeaveStatus('HR_DIRECTOR', false)).toBe('MD_REVIEW');
    expect(determineInitialLeaveStatus('HR_DIRECTOR', true)).toBe('SUBMITTED');
  });

  it('routes regular staff through their direct manager first', () => {
    expect(determineInitialLeaveStatus('STAFF', false)).toBe('MANAGER_REVIEW');
    expect(determineInitialLeaveStatus('CASUAL', false)).toBe('MANAGER_REVIEW');
  });

  it('routes manager-tier employees (rank 65-91) straight to HR_REVIEW, skipping peer manager review', () => {
    expect(determineInitialLeaveStatus('SUPERVISOR', false)).toBe('HR_REVIEW');
    expect(determineInitialLeaveStatus('MANAGER', false)).toBe('HR_REVIEW');
    expect(determineInitialLeaveStatus('DIRECTOR', false)).toBe('HR_REVIEW');
  });

  it('uses explicit HR and MD permissions rather than numeric rank inheritance', () => {
    expect(getRoleDefaultPermissions('HR_DIRECTOR')).toContain(Permission.LEAVE_HR_APPROVE);
    expect(getRoleDefaultPermissions('MARKETING_HEAD')).not.toContain(Permission.LEAVE_HR_APPROVE);
    expect(getRoleDefaultPermissions('FINANCE_MANAGER')).not.toContain(Permission.LEAVE_HR_APPROVE);
    expect(getRoleDefaultPermissions('IT_MANAGER')).not.toContain(Permission.LEAVE_HR_APPROVE);
    expect(getRoleDefaultPermissions('MD')).toContain(Permission.LEAVE_MD_APPROVE);
  });

  it('records rejections at the stage that performed them', () => {
    expect(determineHrReviewStatus('STAFF', false)).toBe('HR_REJECTED');
    expect(determineMdReviewStatus(false)).toBe('MD_REJECTED');
    expect(determineMdReviewStatus(true)).toBe('APPROVED');
  });
});
