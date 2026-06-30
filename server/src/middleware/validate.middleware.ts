import { z, ZodSchema } from 'zod';
import { Request, Response, NextFunction } from 'express';

// ── Reusable Primitives ───────────────────────────────────────────────────
const str = (max = 255) => z.string().trim().min(1, 'This field is required').max(max);
const optStr = (max = 255) => z.string().trim().max(max).optional().or(z.literal(''));
const email = z.string().email('Invalid email address').trim().toLowerCase().max(255);
const password = z.string().min(8, 'Password must be at least 8 characters').max(128);
const uuid = z.string().uuid('Invalid ID format');
const optUuid = z.string().uuid().optional().or(z.literal(''));
const positiveInt = z.coerce.number().int().positive();
const nonNegativeNum = z.coerce.number().min(0);
const dateStr = z.string().min(1, 'Date is required').refine(
  (v) => !isNaN(Date.parse(v)),
  { message: 'Invalid date format' }
);
const optDateStr = z.string().refine((v) => !v || !isNaN(Date.parse(v)), { message: 'Invalid date format' }).optional().or(z.literal(''));
const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ── Middleware Factory ────────────────────────────────────────────────────

/**
 * Validates req.body against a Zod schema.
 */
export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
        code: e.code,
      }));
      return res.status(400).json({
        error: 'Validation failed',
        details: errors,
      });
    }
    req.body = result.data;
    next();
  };
};

/**
 * Validates req.query against a Zod schema.
 */
export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const errors = result.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return res.status(400).json({ error: 'Invalid query parameters', details: errors });
    }
    (req as any).validatedQuery = result.data;
    next();
  };
};

/**
 * Validates req.params against a Zod schema.
 */
export const validateParams = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid URL parameters' });
    }
    next();
  };
};

// ══════════════════════════════════════════════════════════════════════════
//  SCHEMAS — organized by domain
// ══════════════════════════════════════════════════════════════════════════

// ── Auth ──────────────────────────────────────────────────────────────────

export const LoginSchema = z.object({
  email: email,
  password: z.string().min(1, 'Password is required').max(128),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: password,
});

export const ForgotPasswordSchema = z.object({
  email: email,
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1).max(512),
  newPassword: password,
});

export const TenantSignupSchema = z.object({
  fullName: str(100),
  email: email,
  password: password,
  companyName: str(200),
  phone: optStr(20),
  city: optStr(100),
  country: optStr(100),
});

export const DevPinSchema = z.object({
  pin: z.string().min(4).max(20),
});

// ── User / Employee ──────────────────────────────────────────────────────

const ROLES = ['DEV', 'MD', 'HR_DIRECTOR', 'DIRECTOR', 'HR_MANAGER', 'FINANCE_MANAGER', 'MARKETING_HEAD', 'MANAGER', 'MID_MANAGER', 'SUPERVISOR', 'IT_MANAGER', 'IT_ADMIN', 'HR_OFFICER', 'STAFF', 'CASUAL'] as const;
const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'] as const;
const USER_STATUSES = ['ACTIVE', 'PROBATION', 'NOTICE_PERIOD', 'TERMINATED', 'SUSPENDED'] as const;
const CURRENCIES = ['GHS', 'USD', 'EUR', 'GBP', 'GNF', 'NGN', 'KES', 'XOF'] as const;

export const CreateUserSchema = z.object({
  email: email,
  fullName: str(100),
  role: z.enum(ROLES),
  jobTitle: str(100),
  department: optStr(100),
  departmentId: z.coerce.number().int().positive().optional().nullable().or(z.literal('')),
  employeeCode: optStr(30),
  password: optStr(128),
  status: z.enum(USER_STATUSES).optional(),
  joinDate: optDateStr,
  supervisorId: optUuid,
  gender: z.enum(GENDERS).optional().or(z.literal('')),
  nationalId: optStr(30),
  contactNumber: optStr(20),
  address: optStr(300),
  nextOfKinName: optStr(100),
  nextOfKinRelation: optStr(50),
  nextOfKinContact: optStr(20),
  salary: nonNegativeNum.max(999999999).optional().nullable(),
  currency: z.enum(CURRENCIES).optional().or(z.literal('')),
  dob: optDateStr,
  subUnitId: z.coerce.number().int().positive().optional().nullable().or(z.literal('')),
});

export const UpdateUserSchema = CreateUserSchema.partial();

// ── Leave ─────────────────────────────────────────────────────────────────

const LEAVE_TYPES = ['Annual', 'Sick', 'Maternity', 'Paternity', 'Emergency', 'Unpaid', 'Compassionate', 'Study', 'Other'] as const;

export const LeaveRequestSchema = z.object({
  startDate: dateStr,
  endDate: dateStr,
  reason: str(500),
  leaveType: z.enum(LEAVE_TYPES).optional().default('Annual'),
  relieverId: optUuid,
  handoverNotes: optStr(2000),
  relieverAcceptanceRequired: z.boolean().optional().default(false),
});

export const LeaveActionSchema = z.object({
  id: uuid,
  action: z.enum(['APPROVE', 'REJECT', 'APPROVED', 'REJECTED']).transform((value) =>
    value === 'APPROVED' ? 'APPROVE' : value === 'REJECTED' ? 'REJECT' : value
  ),
  role: z.enum(['RELIEVER', 'MANAGER', 'HR', 'MD']).optional(),
  comment: optStr(500),
});

// ── Payroll ───────────────────────────────────────────────────────────────

export const PayrollRunSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2020).max(2100),
  employeeIds: z.array(z.string().uuid()).optional(),
  adjustments: z.array(z.object({
    employeeId: z.string().uuid(),
    overtime: nonNegativeNum.optional(),
    bonus: nonNegativeNum.optional(),
    allowances: nonNegativeNum.optional(),
    otherDeductions: nonNegativeNum.optional(),
    notes: optStr(500),
  })).optional(),
});

export const PayrollItemUpdateSchema = z.object({
  overtime: nonNegativeNum.optional(),
  bonus: nonNegativeNum.optional(),
  allowances: nonNegativeNum.optional(),
  otherDeductions: nonNegativeNum.optional(),
  notes: optStr(500),
});

// ── Department ────────────────────────────────────────────────────────────

export const DepartmentSchema = z.object({
  name: str(100),
  description: optStr(300),
  managerId: optUuid,
  code: optStr(20),
});

// ── Announcements ─────────────────────────────────────────────────────────

export const AnnouncementSchema = z.object({
  title: str(200),
  content: str(5000),
  priority: z.enum(['LOW', 'NORMAL', 'MEDIUM', 'HIGH', 'URGENT']).optional().default('NORMAL'),
  targetAudience: z.enum(['ALL', 'DEPARTMENT', 'MANAGERS', 'EXECUTIVES']).optional().default('ALL'),
  departmentId: z.coerce.number().int().positive().optional().nullable().or(z.literal('')),
  expirationDate: optDateStr,
});

// ── Appraisals ────────────────────────────────────────────────────────────

export const AppraisalReviewSchema = z.object({
  strengths: optStr(2000),
  weaknesses: optStr(2000),
  achievements: optStr(2000),
  developmentNeeds: optStr(2000),
  overallRating: z.coerce.number().min(0).max(100).optional(),
  comments: optStr(2000),
});

export const AppraisalCycleSchema = z.object({
  name: str(100),
  startDate: dateStr,
  endDate: dateStr,
  description: optStr(500),
});

// ── Assets ────────────────────────────────────────────────────────────────

export const AssetSchema = z.object({
  name: str(200),
  serialNumber: str(100),
  type: str(100),
  make: optStr(100),
  model: optStr(100),
  description: optStr(500),
  isCompanyProperty: z.boolean().optional().default(true),
  purchaseDate: optDateStr,
  warrantyExpiry: optDateStr,
});

export const AssetAssignSchema = z.object({
  assetId: uuid,
  userId: uuid,
  condition: optStr(100),
  signature: optStr(2_000_000),
});

// ── Training ──────────────────────────────────────────────────────────────

export const TrainingProgramSchema = z.object({
  title: str(200),
  description: optStr(2000),
  provider: optStr(200),
  startDate: optDateStr,
  endDate: optDateStr,
  durationHours: z.preprocess((value) => value === '' ? undefined : value, z.coerce.number().int().min(0).max(10000).optional()),
  maxSeats: z.preprocess((value) => value === '' ? undefined : value, z.coerce.number().int().min(1).max(10000).optional()),
  cost: z.preprocess((value) => value === '' ? undefined : value, nonNegativeNum.optional()),
});

// ── Recruitment ───────────────────────────────────────────────────────────

export const JobPositionSchema = z.object({
  title: str(200),
  departmentId: z.coerce.number().int().positive().optional().nullable(),
  description: optStr(5000),
  location: optStr(200),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP']).optional().default('FULL_TIME'),
});

export const CandidateApplicationSchema = z.object({
  jobPositionId: z.string().uuid(),
  fullName: str(100),
  email: email,
  phone: optStr(20),
  resumeUrl: optStr(500),
  source: optStr(100),
  notes: optStr(1000),
});

export const InterviewScheduleSchema = z.object({
  candidateId: z.string().uuid(),
  stage: str(100),
  scheduledAt: dateStr,
  interviewerId: optUuid,
});

// ── Expenses ──────────────────────────────────────────────────────────────

export const ExpenseClaimSchema = z.object({
  title: str(200),
  description: str(500),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than zero'),
  category: optStr(100),
  currency: z.enum(CURRENCIES).optional().default('GHS'),
  receiptUrl: optStr(500),
});

// ── Onboarding ────────────────────────────────────────────────────────────

export const OnboardingTemplateSchema = z.object({
  name: str(100),
  description: optStr(500),
  tasks: z.array(z.object({
    title: str(200),
    description: optStr(500),
    category: z.enum(['HR', 'IT', 'Admin', 'Manager', 'General']).default('General'),
    dueAfterDays: z.coerce.number().int().min(0).max(365).default(1),
    isRequired: z.boolean().default(true),
  })).optional(),
});

// ── Holiday ───────────────────────────────────────────────────────────────

export const HolidaySchema = z.object({
  name: str(100),
  date: dateStr,
  type: z.enum(['PUBLIC', 'COMPANY', 'OPTIONAL']).optional().default('PUBLIC'),
  recurring: z.boolean().optional().default(false),
});

// ── Settings ──────────────────────────────────────────────────────────────

export const SystemSettingsSchema = z.object({
  monthlyPrice: nonNegativeNum.optional(),
  annualPrice: nonNegativeNum.optional(),
  currency: z.enum(CURRENCIES).optional(),
  trialDays: z.coerce.number().int().min(0).max(365).optional(),
  isMaintenanceMode: z.boolean().optional(),
  securityLockdown: z.boolean().optional(),
}).passthrough(); // Allow additional settings fields

// ── Dev / Provisioning ────────────────────────────────────────────────────

export const ProvisionSchema = z.object({
  companyName: str(200),
  subdomain: optStr(50),
  country: optStr(100),
  adminFullName: str(100),
  adminEmail: email,
  adminPassword: optStr(128),
});

export const TenantFeatureToggleSchema = z.object({
  organizationId: z.string().uuid(),
  feature: str(50),
  enabled: z.boolean(),
});

export const TrialExtensionSchema = z.object({
  organizationId: z.string().uuid(),
  days: z.coerce.number().int().min(1).max(365),
});

export const BankAccessSchema = z.object({
  organizationId: z.string().uuid(),
  plan: z.enum(['MONTHLY', 'ANNUALLY']),
  paymentReference: str(100),
  amount: nonNegativeNum.optional(),
  notes: optStr(500),
});

// ── Pagination Query ──────────────────────────────────────────────────────

export const PaginationSchema = paginationQuery;

// ── KPI / Targets ─────────────────────────────────────────────────────────

export const TargetSchema = z.object({
  title: str(200),
  description: optStr(2000),
  assigneeId: optUuid,
  departmentId: z.coerce.number().int().positive().optional().nullable(),
  startDate: optDateStr,
  endDate: optDateStr,
  targetValue: nonNegativeNum.optional(),
  unit: optStr(50),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional().default('MEDIUM'),
});

export const TargetUpdateSchema = z.object({
  value: z.coerce.number(),
  notes: optStr(500),
});

// ── Support ───────────────────────────────────────────────────────────────

export const SupportTicketSchema = z.object({
  subject: str(200),
  description: str(5000),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().default('MEDIUM'),
  category: optStr(100),
});

export const TicketCommentSchema = z.object({
  content: str(2000),
});
