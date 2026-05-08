/**
 * PDF Export Service DTOs and Interfaces
 * Ensures type safety for institutional document generation.
 */

export interface PdfOrganization {
  name: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  country?: string | null;
}

export interface PdfAssignable {
  fullName: string;
  employeeCode?: string | null;
  jobTitle?: string | null;
  departmentObj?: { name: string } | null;
  signatureUrl?: string | null;
}

export interface PdfTargetMetric {
  title: string;
  targetValue: number | any;
  currentValue: number | any;
  unit?: string | null;
}

export interface PdfTargetContent {
  title: string;
  description?: string | null;
  progress: number | any;
  assignee?: PdfAssignable | null;
  department?: { name: string } | null;
  metrics?: PdfTargetMetric[] | null;
}

export interface PdfReview {
  reviewStage: string;
  reviewer?: PdfAssignable | null;
  overallRating?: number | any;
  summary?: string | null;
  strengths?: string | null;
  achievements?: string | null;
  weaknesses?: string | null;
  developmentNeeds?: string | null;
  responses?: any; // JSON string or object
}

export interface PdfAppraisalContent {
  employee?: PdfAssignable | null;
  cycle?: { title: string } | null;
  finalScore?: number | string | any;
  reviews?: PdfReview[] | null;
  finalVerdict?: string | null;
  arbitrationLogic?: string | null;
  finalReviewer?: PdfAssignable | null;
}

export interface PdfLeaveContent {
  id: string;
  employee?: PdfAssignable | null;
  leaveType: string | null;
  startDate: string | Date;
  endDate: string | Date;
  leaveDays: number | any;
  reason?: string | null;
  reliever?: PdfAssignable | null;
  relieverStatus?: string | null;
  handoverAcknowledged?: boolean | null;
  hrReviewer?: PdfAssignable | null;
  manager?: PdfAssignable | null;
}

export interface PdfPayslipContent {
  id: string;
  currency?: string | null;
  baseSalary: number | any;
  overtime: number | any;
  bonus: number | any;
  allowances: number | any;
  tax: number | any;
  ssnit: number | any;
  otherDeductions: number | any;
  grossPay: number | any;
  netPay: number | any;
  notes?: string | null;
  employee?: PdfAssignable | null;
  run?: {
    period: string;
    updatedAt: string | Date;
  } | null;
}

export interface PdfBoardReportContent {
  totalEmployees: number;
  pendingLeaves: number;
  pendingAppraisals: number;
  payrollTotal: number;
  insights?: { label: string; description: string }[];
}
