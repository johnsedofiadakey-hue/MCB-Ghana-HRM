"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TicketCommentSchema = exports.SupportTicketSchema = exports.TargetUpdateSchema = exports.TargetSchema = exports.PaginationSchema = exports.BankAccessSchema = exports.TrialExtensionSchema = exports.TenantFeatureToggleSchema = exports.ProvisionSchema = exports.SystemSettingsSchema = exports.HolidaySchema = exports.OnboardingTemplateSchema = exports.ExpenseClaimSchema = exports.InterviewScheduleSchema = exports.CandidateApplicationSchema = exports.JobPositionSchema = exports.TrainingProgramSchema = exports.AssetAssignSchema = exports.AssetSchema = exports.AppraisalCycleSchema = exports.AppraisalReviewSchema = exports.AnnouncementSchema = exports.DepartmentSchema = exports.PayrollItemUpdateSchema = exports.PayrollRunSchema = exports.LeaveActionSchema = exports.LeaveRequestSchema = exports.UpdateUserSchema = exports.CreateUserSchema = exports.DevPinSchema = exports.TenantSignupSchema = exports.ResetPasswordSchema = exports.ForgotPasswordSchema = exports.ChangePasswordSchema = exports.LoginSchema = exports.validateParams = exports.validateQuery = exports.validate = void 0;
const zod_1 = require("zod");
// ── Reusable Primitives ───────────────────────────────────────────────────
const str = (max = 255) => zod_1.z.string().trim().min(1, 'This field is required').max(max);
const optStr = (max = 255) => zod_1.z.string().trim().max(max).optional().or(zod_1.z.literal(''));
const email = zod_1.z.string().email('Invalid email address').trim().toLowerCase().max(255);
const password = zod_1.z.string().min(8, 'Password must be at least 8 characters').max(128);
const uuid = zod_1.z.string().uuid('Invalid ID format');
const optUuid = zod_1.z.string().uuid().optional().or(zod_1.z.literal(''));
const positiveInt = zod_1.z.coerce.number().int().positive();
const nonNegativeNum = zod_1.z.coerce.number().min(0);
const dateStr = zod_1.z.string().min(1, 'Date is required').refine((v) => !isNaN(Date.parse(v)), { message: 'Invalid date format' });
const optDateStr = zod_1.z.string().refine((v) => !v || !isNaN(Date.parse(v)), { message: 'Invalid date format' }).optional().or(zod_1.z.literal(''));
const paginationQuery = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
});
// ── Middleware Factory ────────────────────────────────────────────────────
/**
 * Validates req.body against a Zod schema.
 */
const validate = (schema) => {
    return (req, res, next) => {
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
exports.validate = validate;
/**
 * Validates req.query against a Zod schema.
 */
const validateQuery = (schema) => {
    return (req, res, next) => {
        const result = schema.safeParse(req.query);
        if (!result.success) {
            const errors = result.error.errors.map(e => ({
                field: e.path.join('.'),
                message: e.message,
            }));
            return res.status(400).json({ error: 'Invalid query parameters', details: errors });
        }
        req.validatedQuery = result.data;
        next();
    };
};
exports.validateQuery = validateQuery;
/**
 * Validates req.params against a Zod schema.
 */
const validateParams = (schema) => {
    return (req, res, next) => {
        const result = schema.safeParse(req.params);
        if (!result.success) {
            return res.status(400).json({ error: 'Invalid URL parameters' });
        }
        next();
    };
};
exports.validateParams = validateParams;
// ══════════════════════════════════════════════════════════════════════════
//  SCHEMAS — organized by domain
// ══════════════════════════════════════════════════════════════════════════
// ── Auth ──────────────────────────────────────────────────────────────────
exports.LoginSchema = zod_1.z.object({
    email: email,
    password: zod_1.z.string().min(1, 'Password is required').max(128),
});
exports.ChangePasswordSchema = zod_1.z.object({
    currentPassword: zod_1.z.string().min(1).max(128),
    newPassword: password,
});
exports.ForgotPasswordSchema = zod_1.z.object({
    email: email,
});
exports.ResetPasswordSchema = zod_1.z.object({
    token: zod_1.z.string().min(1).max(512),
    newPassword: password,
});
exports.TenantSignupSchema = zod_1.z.object({
    fullName: str(100),
    email: email,
    password: password,
    companyName: str(200),
    phone: optStr(20),
    city: optStr(100),
    country: optStr(100),
});
exports.DevPinSchema = zod_1.z.object({
    pin: zod_1.z.string().min(4).max(20),
});
// ── User / Employee ──────────────────────────────────────────────────────
const ROLES = ['DEV', 'MD', 'DIRECTOR', 'MANAGER', 'MID_MANAGER', 'SUPERVISOR', 'IT_MANAGER', 'IT_ADMIN', 'HR_OFFICER', 'STAFF', 'CASUAL'];
const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'];
const USER_STATUSES = ['ACTIVE', 'PROBATION', 'NOTICE_PERIOD', 'TERMINATED', 'SUSPENDED'];
const CURRENCIES = ['GHS', 'USD', 'EUR', 'GBP', 'GNF', 'NGN', 'KES', 'XOF'];
exports.CreateUserSchema = zod_1.z.object({
    email: email,
    fullName: str(100),
    role: zod_1.z.enum(ROLES),
    jobTitle: str(100),
    department: optStr(100),
    departmentId: zod_1.z.coerce.number().int().positive().optional().nullable().or(zod_1.z.literal('')),
    employeeCode: optStr(30),
    password: optStr(128),
    status: zod_1.z.enum(USER_STATUSES).optional(),
    joinDate: optDateStr,
    supervisorId: optUuid,
    gender: zod_1.z.enum(GENDERS).optional().or(zod_1.z.literal('')),
    nationalId: optStr(30),
    contactNumber: optStr(20),
    address: optStr(300),
    nextOfKinName: optStr(100),
    nextOfKinRelation: optStr(50),
    nextOfKinContact: optStr(20),
    salary: nonNegativeNum.max(999999999).optional().nullable(),
    currency: zod_1.z.enum(CURRENCIES).optional().or(zod_1.z.literal('')),
    dob: optDateStr,
    subUnitId: zod_1.z.coerce.number().int().positive().optional().nullable().or(zod_1.z.literal('')),
});
exports.UpdateUserSchema = exports.CreateUserSchema.partial();
// ── Leave ─────────────────────────────────────────────────────────────────
const LEAVE_TYPES = ['Annual', 'Sick', 'Maternity', 'Paternity', 'Emergency', 'Unpaid', 'Compassionate', 'Study', 'Other'];
exports.LeaveRequestSchema = zod_1.z.object({
    startDate: dateStr,
    endDate: dateStr,
    reason: str(500),
    leaveType: zod_1.z.enum(LEAVE_TYPES).optional().default('Annual'),
    relieverId: optUuid,
});
exports.LeaveActionSchema = zod_1.z.object({
    status: zod_1.z.enum(['APPROVED', 'REJECTED']),
    managerComment: optStr(500),
});
// ── Payroll ───────────────────────────────────────────────────────────────
exports.PayrollRunSchema = zod_1.z.object({
    month: zod_1.z.coerce.number().int().min(1).max(12),
    year: zod_1.z.coerce.number().int().min(2020).max(2100),
    employeeIds: zod_1.z.array(zod_1.z.string().uuid()).optional(),
    adjustments: zod_1.z.array(zod_1.z.object({
        employeeId: zod_1.z.string().uuid(),
        overtime: nonNegativeNum.optional(),
        bonus: nonNegativeNum.optional(),
        allowances: nonNegativeNum.optional(),
        otherDeductions: nonNegativeNum.optional(),
        notes: optStr(500),
    })).optional(),
});
exports.PayrollItemUpdateSchema = zod_1.z.object({
    overtime: nonNegativeNum.optional(),
    bonus: nonNegativeNum.optional(),
    allowances: nonNegativeNum.optional(),
    otherDeductions: nonNegativeNum.optional(),
    notes: optStr(500),
});
// ── Department ────────────────────────────────────────────────────────────
exports.DepartmentSchema = zod_1.z.object({
    name: str(100),
    description: optStr(300),
    managerId: optUuid,
    code: optStr(20),
});
// ── Announcements ─────────────────────────────────────────────────────────
exports.AnnouncementSchema = zod_1.z.object({
    title: str(200),
    content: str(5000),
    priority: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().default('MEDIUM'),
    targetRoles: zod_1.z.array(zod_1.z.string()).optional(),
    expiresAt: optDateStr,
});
// ── Appraisals ────────────────────────────────────────────────────────────
exports.AppraisalReviewSchema = zod_1.z.object({
    strengths: optStr(2000),
    weaknesses: optStr(2000),
    achievements: optStr(2000),
    developmentNeeds: optStr(2000),
    overallRating: zod_1.z.coerce.number().min(0).max(100).optional(),
    comments: optStr(2000),
});
exports.AppraisalCycleSchema = zod_1.z.object({
    name: str(100),
    startDate: dateStr,
    endDate: dateStr,
    description: optStr(500),
});
// ── Assets ────────────────────────────────────────────────────────────────
exports.AssetSchema = zod_1.z.object({
    name: str(200),
    assetTag: optStr(50),
    category: optStr(100),
    serialNumber: optStr(100),
    purchaseDate: optDateStr,
    purchasePrice: nonNegativeNum.optional(),
    condition: zod_1.z.enum(['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED']).optional().default('NEW'),
    notes: optStr(500),
});
exports.AssetAssignSchema = zod_1.z.object({
    employeeId: zod_1.z.string().uuid(),
    assignedDate: optDateStr,
    notes: optStr(500),
});
// ── Training ──────────────────────────────────────────────────────────────
exports.TrainingProgramSchema = zod_1.z.object({
    title: str(200),
    description: optStr(2000),
    startDate: optDateStr,
    endDate: optDateStr,
    capacity: zod_1.z.coerce.number().int().min(1).max(10000).optional(),
    location: optStr(200),
    trainer: optStr(100),
    type: zod_1.z.enum(['INTERNAL', 'EXTERNAL', 'ONLINE', 'WORKSHOP']).optional().default('INTERNAL'),
});
// ── Recruitment ───────────────────────────────────────────────────────────
exports.JobPositionSchema = zod_1.z.object({
    title: str(200),
    departmentId: zod_1.z.coerce.number().int().positive().optional().nullable(),
    description: optStr(5000),
    location: optStr(200),
    employmentType: zod_1.z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP']).optional().default('FULL_TIME'),
});
exports.CandidateApplicationSchema = zod_1.z.object({
    jobPositionId: zod_1.z.string().uuid(),
    fullName: str(100),
    email: email,
    phone: optStr(20),
    resumeUrl: optStr(500),
    source: optStr(100),
    notes: optStr(1000),
});
exports.InterviewScheduleSchema = zod_1.z.object({
    candidateId: zod_1.z.string().uuid(),
    stage: str(100),
    scheduledAt: dateStr,
    interviewerId: optUuid,
});
// ── Expenses ──────────────────────────────────────────────────────────────
exports.ExpenseClaimSchema = zod_1.z.object({
    description: str(500),
    amount: zod_1.z.coerce.number().min(0.01, 'Amount must be greater than zero'),
    category: optStr(100),
    receiptUrl: optStr(500),
    date: optDateStr,
});
// ── Onboarding ────────────────────────────────────────────────────────────
exports.OnboardingTemplateSchema = zod_1.z.object({
    name: str(100),
    description: optStr(500),
    tasks: zod_1.z.array(zod_1.z.object({
        title: str(200),
        description: optStr(500),
        category: zod_1.z.enum(['HR', 'IT', 'Admin', 'Manager', 'General']).default('General'),
        dueAfterDays: zod_1.z.coerce.number().int().min(0).max(365).default(1),
        isRequired: zod_1.z.boolean().default(true),
    })).optional(),
});
// ── Holiday ───────────────────────────────────────────────────────────────
exports.HolidaySchema = zod_1.z.object({
    name: str(100),
    date: dateStr,
    type: zod_1.z.enum(['PUBLIC', 'COMPANY', 'OPTIONAL']).optional().default('PUBLIC'),
    recurring: zod_1.z.boolean().optional().default(false),
});
// ── Settings ──────────────────────────────────────────────────────────────
exports.SystemSettingsSchema = zod_1.z.object({
    monthlyPrice: nonNegativeNum.optional(),
    annualPrice: nonNegativeNum.optional(),
    currency: zod_1.z.enum(CURRENCIES).optional(),
    trialDays: zod_1.z.coerce.number().int().min(0).max(365).optional(),
    isMaintenanceMode: zod_1.z.boolean().optional(),
    securityLockdown: zod_1.z.boolean().optional(),
}).passthrough(); // Allow additional settings fields
// ── Dev / Provisioning ────────────────────────────────────────────────────
exports.ProvisionSchema = zod_1.z.object({
    companyName: str(200),
    subdomain: optStr(50),
    country: optStr(100),
    adminFullName: str(100),
    adminEmail: email,
    adminPassword: optStr(128),
});
exports.TenantFeatureToggleSchema = zod_1.z.object({
    organizationId: zod_1.z.string().uuid(),
    feature: str(50),
    enabled: zod_1.z.boolean(),
});
exports.TrialExtensionSchema = zod_1.z.object({
    organizationId: zod_1.z.string().uuid(),
    days: zod_1.z.coerce.number().int().min(1).max(365),
});
exports.BankAccessSchema = zod_1.z.object({
    organizationId: zod_1.z.string().uuid(),
    plan: zod_1.z.enum(['MONTHLY', 'ANNUALLY']),
    paymentReference: str(100),
    amount: nonNegativeNum.optional(),
    notes: optStr(500),
});
// ── Pagination Query ──────────────────────────────────────────────────────
exports.PaginationSchema = paginationQuery;
// ── KPI / Targets ─────────────────────────────────────────────────────────
exports.TargetSchema = zod_1.z.object({
    title: str(200),
    description: optStr(2000),
    assigneeId: optUuid,
    departmentId: zod_1.z.coerce.number().int().positive().optional().nullable(),
    startDate: optDateStr,
    endDate: optDateStr,
    targetValue: nonNegativeNum.optional(),
    unit: optStr(50),
    priority: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional().default('MEDIUM'),
});
exports.TargetUpdateSchema = zod_1.z.object({
    value: zod_1.z.coerce.number(),
    notes: optStr(500),
});
// ── Support ───────────────────────────────────────────────────────────────
exports.SupportTicketSchema = zod_1.z.object({
    subject: str(200),
    description: str(5000),
    priority: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().default('MEDIUM'),
    category: optStr(100),
});
exports.TicketCommentSchema = zod_1.z.object({
    content: str(2000),
});
