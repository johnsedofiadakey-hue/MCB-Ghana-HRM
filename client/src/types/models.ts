/**
 * CORE DATA MODELS (Enterprise Type Safety Layer)
 */

export type UserStatus = 'ACTIVE' | 'ON_LEAVE' | 'SUSPENDED' | 'TERMINATED';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  employeeCode?: string;
  status: UserStatus;
  position?: string;
  departmentId?: number;
  jobTitle: string;
  joinDate?: string;
  avatarUrl?: string;
  leaveBalance?: number;
  leaveAllowance?: number;
  organizationId?: string;
  supervisorId?: string;
}

export type LeaveStatus = 
  | 'DRAFT' 
  | 'SUBMITTED' 
  | 'RELIEVER_ACCEPTED' 
  | 'RELIEVER_DECLINED' 
  | 'MANAGER_REVIEW' 
  | 'MANAGER_APPROVED' 
  | 'MANAGER_REJECTED' 
  | 'MD_REVIEW' 
  | 'APPROVED' 
  | 'MD_REJECTER' 
  | 'CANCELLED';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  leaveDays: number;
  reason: string;
  status: LeaveStatus;
  leaveType: string;
  relieverId?: string;
  managerId?: string;
  hrReviewerId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  createdById: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  targetAudience: 'ALL' | 'DEPARTMENT' | 'MANAGERS' | 'EXECUTIVES';
  createdAt: string;
  createdBy?: { fullName: string; role: string };
  departmentId?: number;
}

export interface Department {
  id: number;
  name: string;
  managerId?: string;
  organizationId?: string;
}

export interface OrganizationSettings {
  id: string;
  companyName: string;
  logoUrl?: string;
  companyLogoUrl?: string; // Legacy field
  subtitle?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
}
