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
  expenseReimbursements?: number | any;
  tax: number | any;
  ssnit: number | any;
  tier2Pension?: number | any;
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

export interface PdfEmployeeDossierContent {
  id: string;
  fullName: string;
  employeeCode?: string | null;
  jobTitle?: string | null;
  role?: string | null;
  status?: string | null;
  avatarUrl?: string | null;
  email: string;
  contactNumber?: string | null;
  address?: string | null;
  gender?: string | null;
  dob?: string | Date | null;
  nationality?: string | null;
  countryOfOrigin?: string | null;
  maritalStatus?: string | null;
  nationalId?: string | null;
  departmentObj?: { name: string } | null;
  employmentType?: string | null;
  joinDate?: string | Date | null;
  supervisor?: { fullName: string } | null;
  leaveBalance?: number | any;
  leaveAllowance?: number | any;
  salary?: number | any;
  currency?: string | null;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  bankBranch?: string | null;
  ssnitNumber?: string | null;
  nextOfKinName?: string | null;
  nextOfKinRelation?: string | null;
  nextOfKinContact?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  education?: string | null;
  certifications?: string | null;
  appraisalPackets?: {
    id: string;
    status: string;
    finalScore?: number | any;
    cycle?: { title: string; period?: string } | null;
    reviews?: { reviewStage: string; overallRating?: number | any }[] | null;
  }[] | null;
  targetsAssignedToMe?: { title: string; progress: number | any; status: string }[] | null;
}
