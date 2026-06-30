-- CreateTable
CREATE TABLE "KpiSheet" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT DEFAULT 'mcb-ghana-tenant',
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "lockedAt" TIMESTAMP(3),
    "title" TEXT NOT NULL,
    "employeeId" TEXT,
    "reviewerId" TEXT,
    "totalScore" DECIMAL(65,30),
    "status" TEXT DEFAULT 'DRAFT',
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "targetDepartmentId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KpiSheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KpiItem" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT DEFAULT 'mcb-ghana-tenant',
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'General',
    "type" TEXT NOT NULL DEFAULT 'LAGGING',
    "metricType" TEXT NOT NULL DEFAULT 'NUMERIC',
    "targetValue" DECIMAL(65,30) NOT NULL,
    "actualValue" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "weight" DECIMAL(65,30) NOT NULL DEFAULT 1.0,
    "score" DECIMAL(65,30),
    "frequency" TEXT NOT NULL DEFAULT 'MONTHLY',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "lastEntryDate" TIMESTAMP(3),
    "sheetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KpiItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Target" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT DEFAULT 'mcb-ghana-tenant',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "level" TEXT NOT NULL DEFAULT 'INDIVIDUAL',
    "type" TEXT NOT NULL DEFAULT 'SINGLE',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "dueDate" TIMESTAMP(3),
    "weight" DECIMAL(65,30) NOT NULL DEFAULT 1.0,
    "progress" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "contributionWeight" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "confidenceLevel" TEXT NOT NULL DEFAULT 'ON_TRACK',
    "blockers" TEXT,
    "parentTargetId" TEXT,
    "departmentId" INTEGER,
    "assigneeId" TEXT,
    "originatorId" TEXT NOT NULL,
    "lineManagerId" TEXT,
    "reviewerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Target_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TargetMetric" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT DEFAULT 'mcb-ghana-tenant',
    "targetId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "metricType" TEXT NOT NULL DEFAULT 'NUMERICAL',
    "targetValue" DECIMAL(65,30),
    "currentValue" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "unit" TEXT,
    "currency" TEXT DEFAULT 'GHS',
    "weight" DECIMAL(65,30) NOT NULL DEFAULT 1.0,
    "isAutomated" BOOLEAN NOT NULL DEFAULT false,
    "automationSource" TEXT,
    "qualitativePrompt" TEXT,

    CONSTRAINT "TargetMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TargetAcknowledgement" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT DEFAULT 'mcb-ghana-tenant',
    "targetId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACKNOWLEDGED',
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TargetAcknowledgement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TargetUpdate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT DEFAULT 'mcb-ghana-tenant',
    "targetId" TEXT NOT NULL,
    "metricId" TEXT,
    "submittedById" TEXT NOT NULL,
    "value" DECIMAL(65,30),
    "comment" TEXT,
    "attachmentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TargetUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT DEFAULT 'mcb-ghana-tenant',
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isCompanyProperty" BOOLEAN NOT NULL DEFAULT true,
    "serialNumber" TEXT NOT NULL,
    "make" TEXT,
    "model" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "purchaseDate" TIMESTAMP(3),
    "warrantyExpiry" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT DEFAULT 'mcb-ghana-tenant',
    "userId" TEXT,
    "action" TEXT,
    "entity" TEXT,
    "entityId" TEXT,
    "details" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeHistory" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT DEFAULT 'mcb-ghana-tenant',
    "employeeId" TEXT,
    "createdById" TEXT,
    "title" TEXT,
    "description" TEXT,
    "change" TEXT,
    "type" TEXT,
    "severity" TEXT,
    "status" TEXT DEFAULT 'OPEN',
    "loggedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiUsage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT DEFAULT 'mcb-ghana-tenant',
    "path" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetAssignment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT DEFAULT 'mcb-ghana-tenant',
    "returnedAt" TIMESTAMP(3),
    "details" TEXT,
    "status" TEXT DEFAULT 'OPEN',
    "conditionOnAssign" TEXT,
    "conditionOnReturn" TEXT,
    "loggedById" TEXT,
    "userId" TEXT,
    "assetId" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "handoverSignature" TEXT,
    "returnSignature" TEXT,

    CONSTRAINT "AssetAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'STAFF',
    "rank" INTEGER NOT NULL DEFAULT 40,
    "employeeCode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "position" TEXT,
    "departmentId" INTEGER,
    "subUnitId" TEXT,
    "jobTitle" TEXT NOT NULL,
    "joinDate" TIMESTAMP(3),
    "employmentType" TEXT,
    "dob" TIMESTAMP(3),
    "gender" TEXT,
    "education" TEXT,
    "nationalId" TEXT,
    "contactNumber" TEXT,
    "address" TEXT,
    "profilePhoto" TEXT,
    "nextOfKinName" TEXT,
    "nextOfKinRelation" TEXT,
    "nextOfKinContact" TEXT,
    "maritalStatus" TEXT,
    "bloodGroup" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "certifications" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "salary" DECIMAL(65,30),
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "bankName" TEXT,
    "bankAccountNumber" TEXT,
    "bankBranch" TEXT,
    "ssnitNumber" TEXT,
    "bankAccountEnc" TEXT,
    "ghanaCardEnc" TEXT,
    "ssnitEnc" TEXT,
    "salaryEnc" TEXT,
    "nationalIdDocUrl" TEXT,
    "leaveBalance" DECIMAL(65,30) DEFAULT 30,
    "leaveAllowance" DECIMAL(65,30) DEFAULT 30,
    "leaveAccruedAt" TIMESTAMP(3),
    "supervisorId" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedDate" TIMESTAMP(3),
    "organizationId" TEXT DEFAULT 'mcb-ghana-tenant',
    "biometricId" TEXT,
    "countryOfOrigin" TEXT,
    "hasManualLeaveOverride" BOOLEAN NOT NULL DEFAULT false,
    "lastManualLeaveAdjustmentAt" TIMESTAMP(3),
    "nationality" TEXT,
    "signatureUrl" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromotionRequest" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT DEFAULT 'mcb-ghana-tenant',
    "employeeId" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "targetRole" TEXT NOT NULL,
    "targetJobTitle" TEXT,
    "proposedSalary" DECIMAL(65,30),
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "hrComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromotionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompensationHistory" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT DEFAULT 'mcb-ghana-tenant',
    "employeeId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "previousSalary" DECIMAL(65,30) NOT NULL,
    "newSalary" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "reason" TEXT,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "authorizedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompensationHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT DEFAULT 'mcb-ghana-tenant',
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeDocument" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT DEFAULT 'mcb-ghana-tenant',
    "employeeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeQuery" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT DEFAULT 'mcb-ghana-tenant',
    "employeeId" TEXT NOT NULL,
    "issuedById" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeQuery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" SERIAL NOT NULL,
    "organizationId" TEXT DEFAULT 'mcb-ghana-tenant',
    "name" TEXT NOT NULL,
    "managerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubUnit" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT DEFAULT 'mcb-ghana-tenant',
    "name" TEXT NOT NULL,
    "departmentId" INTEGER NOT NULL,
    "managerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveRequest" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT DEFAULT 'mcb-ghana-tenant',
    "employeeId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "leaveDays" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "leaveType" TEXT NOT NULL DEFAULT 'Annual',
    "reason" TEXT NOT NULL,
    "relieverId" TEXT,
    "relieverStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "relieverRespondedAt" TIMESTAMP(3),
    "relieverComment" TEXT,
    "handoverNotes" TEXT,
    "relieverAcceptanceRequired" BOOLEAN NOT NULL DEFAULT false,
    "handoverAcknowledged" BOOLEAN NOT NULL DEFAULT false,
    "managerId" TEXT,
    "managerComment" TEXT,
    "hrReviewerId" TEXT,
    "hrComment" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HandoverRecord" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT DEFAULT 'mcb-ghana-tenant',
    "leaveRequestId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "relieverId" TEXT NOT NULL,
    "handoverNotes" TEXT,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'ACCEPTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HandoverRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cycle" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT DEFAULT 'mcb-ghana-tenant',
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewCycle" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT DEFAULT 'mcb-ghana-tenant',
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "targetAudience" TEXT NOT NULL,
    "departmentId" INTEGER,
    "publishDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expirationDate" TIMESTAMP(3),
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppraisalCycle" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT DEFAULT 'mcb-ghana-tenant',
    "title" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppraisalCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppraisalPacket" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT DEFAULT 'mcb-ghana-tenant',
    "cycleId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "currentStage" TEXT NOT NULL DEFAULT 'SELF_REVIEW',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "supervisorId" TEXT,
    "matrixSupervisorId" TEXT,
    "managerId" TEXT,
    "hrReviewerId" TEXT,
    "finalReviewerId" TEXT,
    "gapDetected" BOOLEAN NOT NULL DEFAULT false,
    "isDisputed" BOOLEAN NOT NULL DEFAULT false,
    "disputeReason" TEXT,
    "disputeResolution" TEXT,
    "disputeResolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "finalScore" DECIMAL(65,30),
    "finalVerdict" TEXT,
    "kpiScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "arbitrationLogic" TEXT,

    CONSTRAINT "AppraisalPacket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppraisalReview" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT DEFAULT 'mcb-ghana-tenant',
    "packetId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "reviewStage" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3),
    "overallRating" DECIMAL(65,30),
    "summary" TEXT,
    "strengths" TEXT,
    "weaknesses" TEXT,
    "achievements" TEXT,
    "developmentNeeds" TEXT,
    "aiCalibrationScore" INTEGER,
    "responses" TEXT DEFAULT '{}',

    CONSTRAINT "AppraisalReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "country" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "subscriptionPlan" TEXT NOT NULL DEFAULT 'FREE',
    "subscriptionAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "billingStatus" TEXT NOT NULL DEFAULT 'FREE',
    "isEnterprise" BOOLEAN NOT NULL DEFAULT false,
    "features" TEXT NOT NULL DEFAULT '{}',
    "isSuspended" BOOLEAN NOT NULL DEFAULT false,
    "trialStartDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trialEndsAt" TIMESTAMP(3),
    "nextBillingDate" TIMESTAMP(3),
    "customDomain" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#4F46E5',
    "secondaryColor" TEXT NOT NULL DEFAULT '#1E293B',
    "accentColor" TEXT NOT NULL DEFAULT '#F59E0B',
    "textColor" TEXT NOT NULL DEFAULT '#FFFFFF',
    "sidebarColor" TEXT NOT NULL DEFAULT '#080c16',
    "bgMain" TEXT DEFAULT '#f8fafc',
    "bgCard" TEXT DEFAULT '#ffffff',
    "textPrimary" TEXT DEFAULT '#0f172a',
    "textSecondary" TEXT DEFAULT '#475569',
    "textMuted" TEXT DEFAULT '#94a3b8',
    "sidebarBg" TEXT DEFAULT '#080c16',
    "sidebarActive" TEXT DEFAULT '#1e293b',
    "sidebarText" TEXT DEFAULT '#ffffff',
    "subtitle" TEXT NOT NULL DEFAULT 'HRM OS',
    "themePreset" TEXT NOT NULL DEFAULT 'premium-monolith',
    "lightMode" BOOLEAN NOT NULL DEFAULT false,
    "language" TEXT NOT NULL DEFAULT 'en',
    "discountPercentage" DECIMAL(65,30) DEFAULT 0,
    "discountFixed" DECIMAL(65,30) DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "allowLeaveBorrowing" BOOLEAN NOT NULL DEFAULT false,
    "allowLeaveCarryForward" BOOLEAN NOT NULL DEFAULT true,
    "allowCallCard" BOOLEAN NOT NULL DEFAULT false,
    "bgElevated" TEXT DEFAULT '#f1f5f9',
    "bgInput" TEXT DEFAULT '#ffffff',
    "borderSubtle" TEXT DEFAULT '#e2e8f0',
    "borrowingLimit" DECIMAL(65,30) NOT NULL DEFAULT 5,
    "carryForwardLimit" DECIMAL(65,30) NOT NULL DEFAULT 10,
    "defaultLeaveAllowance" DECIMAL(65,30) NOT NULL DEFAULT 30,
    "domainStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "errorColor" TEXT DEFAULT '#ef4444',
    "infoColor" TEXT DEFAULT '#06b6d4',
    "isAiEnabled" BOOLEAN NOT NULL DEFAULT false,
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "subdomain" TEXT,
    "successColor" TEXT DEFAULT '#10b981',
    "textInverse" TEXT DEFAULT '#ffffff',
    "warningColor" TEXT DEFAULT '#f59e0b',
    "employerSsnitRate" DECIMAL(65,30) NOT NULL DEFAULT 0.13,
    "payeBands" TEXT DEFAULT '[{"rate": 0, "limit": 490}, {"rate": 0.05, "limit": 110}, {"rate": 0.10, "limit": 130}, {"rate": 0.175, "limit": 3166.67}, {"rate": 0.25, "limit": 16000}, {"rate": 0.30, "limit": 30520}, {"rate": 0.35, "limit": 999999999}]',
    "ssnitRate" DECIMAL(65,30) NOT NULL DEFAULT 0.055,
    "vatRate" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "idCardPrimaryColor" TEXT DEFAULT '#009EE3',
    "idCardAccentColor" TEXT DEFAULT '#EE7100',
    "idCardShowLogo" BOOLEAN NOT NULL DEFAULT true,
    "idCardShowQrCode" BOOLEAN NOT NULL DEFAULT true,
    "idCardOrientation" TEXT DEFAULT 'VERTICAL',
    "idCardTheme" TEXT DEFAULT 'DARK',
    "idCardBackMessage" TEXT,
    "idCardSecurityText" TEXT DEFAULT 'Terms of Use',
    "attendanceScanningEnabled" BOOLEAN NOT NULL DEFAULT false,
    "attendanceApiKey" TEXT,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSettings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "aiEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastAiPulseAt" TIMESTAMP(3),
    "isMaintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "maintenanceNotice" TEXT,
    "securityLockdown" BOOLEAN NOT NULL DEFAULT false,
    "securityLockdownMessage" TEXT,
    "smtpHost" TEXT,
    "smtpPort" INTEGER,
    "smtpUser" TEXT,
    "smtpPass" TEXT,
    "smtpFrom" TEXT,
    "paystackPublicKey" TEXT,
    "paystackSecretKey" TEXT,
    "paystackPayLink" TEXT,
    "monthlyPriceGHS" DECIMAL(65,30),
    "annualPriceGHS" DECIMAL(65,30),
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "monthlyPrice" DECIMAL(65,30),
    "annualPrice" DECIMAL(65,30),
    "trialDays" INTEGER NOT NULL DEFAULT 14,
    "loginNotice" TEXT,
    "loginSubtitle" TEXT,
    "loginBullets" TEXT,
    "backupFrequencyDays" INTEGER NOT NULL DEFAULT 7,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "databaseExpiryDate" TIMESTAMP(3),
    "domainExpiryDate" TIMESTAMP(3),
    "googleDriveFolderId" TEXT,

    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT DEFAULT 'mcb-ghana-tenant',
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'INFO',
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollRun" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT DEFAULT 'mcb-ghana-tenant',
    "period" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "totalGross" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalNet" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approvedById" TEXT,
    "mdApprovedAt" TIMESTAMP(3),
    "mdApprovedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,

    CONSTRAINT "PayrollRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollItem" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT DEFAULT 'mcb-ghana-tenant',
    "runId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "baseSalary" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "overtime" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "bonus" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "allowances" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "tax" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "ssnit" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "otherDeductions" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "grossPay" DECIMAL(65,30) NOT NULL,
    "netPay" DECIMAL(65,30) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayrollItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingTemplate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT DEFAULT 'mcb-ghana-tenant',
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OnboardingTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingTask" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT DEFAULT 'mcb-ghana-tenant',
    "templateId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'General',
    "dueAfterDays" INTEGER NOT NULL DEFAULT 1,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "OnboardingTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingSession" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT DEFAULT 'mcb-ghana-tenant',
    "employeeId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "progress" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OnboardingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingItem" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT DEFAULT 'mcb-ghana-tenant',
    "sessionId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,
    "notes" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "OnboardingItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingProgram" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT DEFAULT 'mcb-ghana-tenant',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "provider" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "durationHours" INTEGER,
    "cost" DECIMAL(65,30),
    "maxSeats" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingEnrollment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT DEFAULT 'mcb-ghana-tenant',
    "programId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "score" DECIMAL(65,30),
    "certificate" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ENROLLED',

    CONSTRAINT "TrainingEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicHoliday" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT DEFAULT 'mcb-ghana-tenant',
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'GH',
    "isRecurring" BOOLEAN NOT NULL DEFAULT true,
    "year" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicHoliday_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT DEFAULT 'mcb-ghana-tenant',
    "clientId" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'MONTHLY',
    "priceGHS" DECIMAL(65,30),
    "price" DECIMAL(65,30),
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "status" TEXT NOT NULL DEFAULT 'TRIAL',
    "orgName" TEXT,
    "contactEmail" TEXT,
    "paystackRef" TEXT,
    "paystackSubCode" TEXT,
    "trialEndsAt" TIMESTAMP(3),
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Loan" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT DEFAULT 'mcb-ghana-tenant',
    "employeeId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'ADVANCE',
    "principalAmount" DECIMAL(65,30) NOT NULL,
    "interestRate" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalRepayment" DECIMAL(65,30) NOT NULL,
    "installmentAmount" DECIMAL(65,30) NOT NULL,
    "monthsDuration" INTEGER NOT NULL,
    "purpose" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Loan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanInstallment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT DEFAULT 'mcb-ghana-tenant',
    "loanId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "deductedRunId" TEXT,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "LoanInstallment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseClaim" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT DEFAULT 'mcb-ghana-tenant',
    "employeeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "category" TEXT NOT NULL,
    "receiptUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "rejectionReason" TEXT,
    "paidInRunId" TEXT,

    CONSTRAINT "ExpenseClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT DEFAULT 'mcb-ghana-tenant',
    "employeeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "clockIn" TIMESTAMP(3),
    "clockOut" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PRESENT',
    "source" TEXT NOT NULL DEFAULT 'WEB',
    "notes" TEXT,
    "locationIn" TEXT,
    "locationOut" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaasSubscription" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT DEFAULT 'mcb-ghana-tenant',
    "clientId" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'MONTHLY',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "amount" DECIMAL(65,30) NOT NULL DEFAULT 50.00,
    "nextBillingDate" TIMESTAMP(3) NOT NULL,
    "lastPaymentDate" TIMESTAMP(3),
    "paystackRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SaasSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BackupLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT DEFAULT 'mcb-ghana-tenant',
    "filename" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BackupLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginSecurityEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginSecurityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DepartmentKPI" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "departmentId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "metricType" TEXT NOT NULL,
    "targetValue" DECIMAL(65,30) NOT NULL,
    "measurementPeriod" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "assignedToId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DepartmentKPI_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamTarget" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "departmentKpiId" TEXT NOT NULL,
    "originKPIId" TEXT,
    "managerId" TEXT NOT NULL,
    "teamName" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "metricType" TEXT NOT NULL,
    "targetValue" DECIMAL(65,30) NOT NULL,
    "measurementPeriod" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeTarget" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "teamTargetId" TEXT NOT NULL,
    "originKPIId" TEXT,
    "managerId" TEXT,
    "employeeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "metricType" TEXT NOT NULL,
    "targetValue" DECIMAL(65,30) NOT NULL,
    "measurementPeriod" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "assignedToId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceReviewV2" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "managerId" TEXT,
    "directorId" TEXT,
    "cycle" TEXT NOT NULL,
    "selfReview" TEXT,
    "managerReview" TEXT,
    "directorReview" TEXT,
    "selfScore" DECIMAL(65,30),
    "managerScore" DECIMAL(65,30),
    "directorScore" DECIMAL(65,30),
    "finalScore" DECIMAL(65,30),
    "cycleId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "validatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PerformanceReviewV2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceScore" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "performanceReviewId" TEXT NOT NULL,
    "kpiTitle" TEXT NOT NULL,
    "metricType" TEXT NOT NULL,
    "targetValue" DECIMAL(65,30),
    "achievedValue" DECIMAL(65,30),
    "weightedScore" DECIMAL(65,30),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PerformanceScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobPosition" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "departmentId" INTEGER,
    "description" TEXT,
    "location" TEXT,
    "employmentType" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "openedById" TEXT,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobPosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Candidate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "jobPositionId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "resumeUrl" TEXT,
    "source" TEXT,
    "status" TEXT NOT NULL DEFAULT 'APPLIED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Candidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewStage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "interviewerId" TEXT,
    "outcome" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'APPLIED',

    CONSTRAINT "InterviewStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewFeedback" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "interviewStageId" TEXT,
    "reviewerId" TEXT NOT NULL,
    "rating" DECIMAL(65,30),
    "feedback" TEXT,
    "recommendation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterviewFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfferLetter" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "fileUrl" TEXT,
    "salaryOffered" DECIMAL(65,30),
    "currency" TEXT DEFAULT 'GHS',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "sentAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfferLetter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingChecklist" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "source" TEXT DEFAULT 'ATS',
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingChecklistTask" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT DEFAULT 'GENERAL',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "completedById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingChecklistTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OffboardingProcess" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "triggeredById" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'INITIATED',
    "effectiveDate" TIMESTAMP(3),
    "accountDisabledAt" TIMESTAMP(3),
    "finalPayrollRunId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "templateId" TEXT,

    CONSTRAINT "OffboardingProcess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExitInterview" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "offboardingId" TEXT NOT NULL,
    "interviewerId" TEXT,
    "interviewDate" TIMESTAMP(3),
    "reason" TEXT,
    "feedback" TEXT,
    "rehireEligible" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExitInterview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetReturn" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "offboardingId" TEXT NOT NULL,
    "assetId" TEXT,
    "assetName" TEXT,
    "returned" BOOLEAN NOT NULL DEFAULT false,
    "returnedAt" TIMESTAMP(3),
    "conditionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetReturn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OffboardingTemplate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT DEFAULT 'mcb-ghana-tenant',
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OffboardingTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OffboardingTask" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT DEFAULT 'mcb-ghana-tenant',
    "templateId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'General',
    "dueAfterDays" INTEGER NOT NULL DEFAULT 1,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "OffboardingTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OffboardingItem" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT DEFAULT 'mcb-ghana-tenant',
    "offboardingId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,
    "notes" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "OffboardingItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BenefitPlan" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "employerAmount" DECIMAL(65,30) DEFAULT 0,
    "employeeAmount" DECIMAL(65,30) DEFAULT 0,
    "taxable" BOOLEAN NOT NULL DEFAULT false,
    "payrollCode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BenefitPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeBenefitEnrollment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "benefitPlanId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "employeeAmount" DECIMAL(65,30) DEFAULT 0,
    "employerAmount" DECIMAL(65,30) DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeBenefitEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shift" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Accra',
    "gracePeriodMins" INTEGER NOT NULL DEFAULT 10,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeShift" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "assignedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeShift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftAttendanceRule" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "lateAfterMins" INTEGER NOT NULL DEFAULT 10,
    "halfDayAfterMins" INTEGER NOT NULL DEFAULT 240,
    "absentAfterMins" INTEGER NOT NULL DEFAULT 480,
    "requiresGeoFence" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftAttendanceRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxRule" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "taxType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "appliesTo" TEXT DEFAULT 'PAYROLL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxBracket" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "taxRuleId" TEXT NOT NULL,
    "minAmount" DECIMAL(65,30) NOT NULL,
    "maxAmount" DECIMAL(65,30),
    "rate" DECIMAL(65,30) NOT NULL,
    "fixedAmount" DECIMAL(65,30) DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxBracket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT DEFAULT 'mcb-ghana-tenant',
    "type" TEXT,
    "message" TEXT,
    "action" TEXT,
    "details" TEXT,
    "source" TEXT,
    "operatorId" TEXT,
    "operatorEmail" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeReporting" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT DEFAULT 'mcb-ghana-tenant',
    "employeeId" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'DIRECT',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeReporting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KpiUpdate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT DEFAULT 'mcb-ghana-tenant',
    "kpiItemId" TEXT NOT NULL,
    "value" DECIMAL(65,30) NOT NULL,
    "comment" TEXT,
    "submittedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KpiUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT DEFAULT 'mcb-ghana-tenant',
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "employeeId" TEXT NOT NULL,
    "assignedToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketComment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT DEFAULT 'mcb-ghana-tenant',
    "ticketId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "attachmentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company" TEXT,
    "phone" TEXT,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "organizationId" TEXT DEFAULT 'stormglide-corp',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisciplinaryCase" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT DEFAULT 'mcb-ghana-tenant',
    "employeeId" TEXT NOT NULL,
    "issuedById" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'CONDUCT',
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "evidence" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "outcome" TEXT,
    "hearingDate" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DisciplinaryCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyDocument" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT DEFAULT 'mcb-ghana-tenant',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT,
    "fileUrl" TEXT,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "version" TEXT NOT NULL DEFAULT '1.0',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "targetRoles" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PolicyDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyAcknowledgment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT DEFAULT 'mcb-ghana-tenant',
    "policyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "acknowledgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,

    CONSTRAINT "PolicyAcknowledgment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProbationRecord" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT DEFAULT 'mcb-ghana-tenant',
    "employeeId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "period" INTEGER NOT NULL DEFAULT 90,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "reviewDate" TIMESTAMP(3),
    "reviewedById" TEXT,
    "outcome" TEXT,
    "goals" TEXT,
    "notes" TEXT,
    "alertSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProbationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookSubscription" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "events" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "secret" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PermissionBundle" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT DEFAULT 'mcb-ghana-tenant',
    "name" TEXT NOT NULL,
    "permissions" TEXT[],
    "scope" TEXT NOT NULL,
    "conditions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PermissionBundle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Delegation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT DEFAULT 'mcb-ghana-tenant',
    "granterId" TEXT NOT NULL,
    "delegateId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Delegation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckIn" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT DEFAULT 'mcb-ghana-tenant',
    "employeeId" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feedback360" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT DEFAULT 'mcb-ghana-tenant',
    "providerId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "rating" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback360_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT DEFAULT 'mcb-ghana-tenant',
    "userId" TEXT NOT NULL,
    "cardNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardLifecycleEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT DEFAULT 'mcb-ghana-tenant',
    "cardId" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "reason" TEXT,
    "performedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CardLifecycleEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallCard" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT DEFAULT 'mcb-ghana-tenant',
    "employeeId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "department" TEXT,
    "bio" TEXT DEFAULT '',
    "email" TEXT NOT NULL,
    "phone" TEXT DEFAULT '',
    "whatsapp" TEXT DEFAULT '',
    "linkedin" TEXT DEFAULT '',
    "github" TEXT DEFAULT '',
    "website" TEXT DEFAULT '',
    "theme" TEXT NOT NULL DEFAULT 'MCB_GOLD',
    "logoUrl" TEXT DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "enableContactCollection" BOOLEAN NOT NULL DEFAULT false,
    "views" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CallCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallCardConnection" (
    "id" TEXT NOT NULL,
    "callCardId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT DEFAULT '',
    "company" TEXT DEFAULT '',
    "notes" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CallCardConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_UserPermissionBundles" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "KpiSheet_organizationId_employeeId_idx" ON "KpiSheet"("organizationId", "employeeId");

-- CreateIndex
CREATE INDEX "KpiSheet_organizationId_reviewerId_idx" ON "KpiSheet"("organizationId", "reviewerId");

-- CreateIndex
CREATE INDEX "KpiSheet_organizationId_targetDepartmentId_idx" ON "KpiSheet"("organizationId", "targetDepartmentId");

-- CreateIndex
CREATE INDEX "KpiSheet_organizationId_month_year_idx" ON "KpiSheet"("organizationId", "month", "year");

-- CreateIndex
CREATE INDEX "KpiItem_organizationId_sheetId_idx" ON "KpiItem"("organizationId", "sheetId");

-- CreateIndex
CREATE INDEX "Target_organizationId_assigneeId_idx" ON "Target"("organizationId", "assigneeId");

-- CreateIndex
CREATE INDEX "Target_organizationId_departmentId_idx" ON "Target"("organizationId", "departmentId");

-- CreateIndex
CREATE INDEX "Target_organizationId_status_idx" ON "Target"("organizationId", "status");

-- CreateIndex
CREATE INDEX "TargetMetric_organizationId_targetId_idx" ON "TargetMetric"("organizationId", "targetId");

-- CreateIndex
CREATE INDEX "TargetAcknowledgement_organizationId_targetId_idx" ON "TargetAcknowledgement"("organizationId", "targetId");

-- CreateIndex
CREATE INDEX "TargetUpdate_organizationId_targetId_idx" ON "TargetUpdate"("organizationId", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_serialNumber_key" ON "Asset"("serialNumber");

-- CreateIndex
CREATE INDEX "Asset_organizationId_idx" ON "Asset"("organizationId");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_createdAt_idx" ON "AuditLog"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_createdAt_idx" ON "AuditLog"("entity", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "EmployeeHistory_organizationId_employeeId_idx" ON "EmployeeHistory"("organizationId", "employeeId");

-- CreateIndex
CREATE INDEX "ApiUsage_organizationId_createdAt_idx" ON "ApiUsage"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "ApiUsage_path_createdAt_idx" ON "ApiUsage"("path", "createdAt");

-- CreateIndex
CREATE INDEX "AssetAssignment_organizationId_userId_idx" ON "AssetAssignment"("organizationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_status_idx" ON "User"("role", "status");

-- CreateIndex
CREATE INDEX "User_departmentId_isArchived_status_idx" ON "User"("departmentId", "isArchived", "status");

-- CreateIndex
CREATE INDEX "User_supervisorId_idx" ON "User"("supervisorId");

-- CreateIndex
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");

-- CreateIndex
CREATE INDEX "User_jobTitle_idx" ON "User"("jobTitle");

-- CreateIndex
CREATE INDEX "User_fullName_idx" ON "User"("fullName");

-- CreateIndex
CREATE UNIQUE INDEX "User_employeeCode_organizationId_key" ON "User"("employeeCode", "organizationId");

-- CreateIndex
CREATE INDEX "PromotionRequest_organizationId_status_idx" ON "PromotionRequest"("organizationId", "status");

-- CreateIndex
CREATE INDEX "CompensationHistory_organizationId_employeeId_idx" ON "CompensationHistory"("organizationId", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_organizationId_userId_idx" ON "PasswordResetToken"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "EmployeeDocument_organizationId_employeeId_idx" ON "EmployeeDocument"("organizationId", "employeeId");

-- CreateIndex
CREATE INDEX "EmployeeQuery_organizationId_employeeId_idx" ON "EmployeeQuery"("organizationId", "employeeId");

-- CreateIndex
CREATE INDEX "Department_organizationId_idx" ON "Department"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_organizationId_key" ON "Department"("name", "organizationId");

-- CreateIndex
CREATE INDEX "SubUnit_organizationId_idx" ON "SubUnit"("organizationId");

-- CreateIndex
CREATE INDEX "SubUnit_departmentId_idx" ON "SubUnit"("departmentId");

-- CreateIndex
CREATE INDEX "SubUnit_managerId_idx" ON "SubUnit"("managerId");

-- CreateIndex
CREATE UNIQUE INDEX "SubUnit_name_departmentId_key" ON "SubUnit"("name", "departmentId");

-- CreateIndex
CREATE INDEX "LeaveRequest_organizationId_employeeId_status_idx" ON "LeaveRequest"("organizationId", "employeeId", "status");

-- CreateIndex
CREATE INDEX "LeaveRequest_organizationId_relieverId_status_idx" ON "LeaveRequest"("organizationId", "relieverId", "status");

-- CreateIndex
CREATE INDEX "HandoverRecord_organizationId_leaveRequestId_idx" ON "HandoverRecord"("organizationId", "leaveRequestId");

-- CreateIndex
CREATE INDEX "HandoverRecord_relieverId_organizationId_status_idx" ON "HandoverRecord"("relieverId", "organizationId", "status");

-- CreateIndex
CREATE INDEX "Cycle_organizationId_idx" ON "Cycle"("organizationId");

-- CreateIndex
CREATE INDEX "Announcement_organizationId_targetAudience_expirationDate_idx" ON "Announcement"("organizationId", "targetAudience", "expirationDate");

-- CreateIndex
CREATE INDEX "AppraisalCycle_organizationId_status_idx" ON "AppraisalCycle"("organizationId", "status");

-- CreateIndex
CREATE INDEX "AppraisalPacket_organizationId_employeeId_idx" ON "AppraisalPacket"("organizationId", "employeeId");

-- CreateIndex
CREATE INDEX "AppraisalPacket_organizationId_currentStage_idx" ON "AppraisalPacket"("organizationId", "currentStage");

-- CreateIndex
CREATE UNIQUE INDEX "AppraisalPacket_cycleId_employeeId_key" ON "AppraisalPacket"("cycleId", "employeeId");

-- CreateIndex
CREATE INDEX "AppraisalReview_organizationId_packetId_idx" ON "AppraisalReview"("organizationId", "packetId");

-- CreateIndex
CREATE INDEX "AppraisalReview_reviewerId_idx" ON "AppraisalReview"("reviewerId");

-- CreateIndex
CREATE UNIQUE INDEX "AppraisalReview_packetId_reviewStage_key" ON "AppraisalReview"("packetId", "reviewStage");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_customDomain_key" ON "Organization"("customDomain");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_subdomain_key" ON "Organization"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_attendanceApiKey_key" ON "Organization"("attendanceApiKey");

-- CreateIndex
CREATE UNIQUE INDEX "SystemSettings_organizationId_key" ON "SystemSettings"("organizationId");

-- CreateIndex
CREATE INDEX "Notification_organizationId_userId_isRead_idx" ON "Notification"("organizationId", "userId", "isRead");

-- CreateIndex
CREATE INDEX "PayrollRun_organizationId_year_month_status_idx" ON "PayrollRun"("organizationId", "year", "month", "status");

-- CreateIndex
CREATE INDEX "PayrollRun_period_status_idx" ON "PayrollRun"("period", "status");

-- CreateIndex
CREATE INDEX "PayrollItem_organizationId_idx" ON "PayrollItem"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollItem_runId_employeeId_key" ON "PayrollItem"("runId", "employeeId");

-- CreateIndex
CREATE INDEX "OnboardingTemplate_organizationId_idx" ON "OnboardingTemplate"("organizationId");

-- CreateIndex
CREATE INDEX "OnboardingTask_organizationId_templateId_idx" ON "OnboardingTask"("organizationId", "templateId");

-- CreateIndex
CREATE INDEX "OnboardingSession_organizationId_employeeId_idx" ON "OnboardingSession"("organizationId", "employeeId");

-- CreateIndex
CREATE INDEX "OnboardingItem_organizationId_sessionId_idx" ON "OnboardingItem"("organizationId", "sessionId");

-- CreateIndex
CREATE INDEX "TrainingProgram_organizationId_status_idx" ON "TrainingProgram"("organizationId", "status");

-- CreateIndex
CREATE INDEX "TrainingProgram_organizationId_idx" ON "TrainingProgram"("organizationId");

-- CreateIndex
CREATE INDEX "TrainingEnrollment_organizationId_employeeId_idx" ON "TrainingEnrollment"("organizationId", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingEnrollment_programId_employeeId_key" ON "TrainingEnrollment"("programId", "employeeId");

-- CreateIndex
CREATE INDEX "PublicHoliday_organizationId_country_date_idx" ON "PublicHoliday"("organizationId", "country", "date");

-- CreateIndex
CREATE INDEX "Subscription_organizationId_idx" ON "Subscription"("organizationId");

-- CreateIndex
CREATE INDEX "Loan_organizationId_employeeId_idx" ON "Loan"("organizationId", "employeeId");

-- CreateIndex
CREATE INDEX "LoanInstallment_organizationId_loanId_idx" ON "LoanInstallment"("organizationId", "loanId");

-- CreateIndex
CREATE INDEX "ExpenseClaim_organizationId_employeeId_status_idx" ON "ExpenseClaim"("organizationId", "employeeId", "status");

-- CreateIndex
CREATE INDEX "AttendanceLog_organizationId_date_status_idx" ON "AttendanceLog"("organizationId", "date", "status");

-- CreateIndex
CREATE INDEX "AttendanceLog_employeeId_clockIn_clockOut_idx" ON "AttendanceLog"("employeeId", "clockIn", "clockOut");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceLog_employeeId_date_key" ON "AttendanceLog"("employeeId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "SaasSubscription_paystackRef_key" ON "SaasSubscription"("paystackRef");

-- CreateIndex
CREATE INDEX "SaasSubscription_organizationId_idx" ON "SaasSubscription"("organizationId");

-- CreateIndex
CREATE INDEX "BackupLog_organizationId_idx" ON "BackupLog"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_organizationId_userId_idx" ON "RefreshToken"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");

-- CreateIndex
CREATE INDEX "LoginSecurityEvent_organizationId_email_createdAt_idx" ON "LoginSecurityEvent"("organizationId", "email", "createdAt");

-- CreateIndex
CREATE INDEX "LoginSecurityEvent_ipAddress_createdAt_idx" ON "LoginSecurityEvent"("ipAddress", "createdAt");

-- CreateIndex
CREATE INDEX "DepartmentKPI_organizationId_departmentId_measurementPeriod_idx" ON "DepartmentKPI"("organizationId", "departmentId", "measurementPeriod");

-- CreateIndex
CREATE INDEX "DepartmentKPI_organizationId_assignedToId_idx" ON "DepartmentKPI"("organizationId", "assignedToId");

-- CreateIndex
CREATE INDEX "DepartmentKPI_assignedById_idx" ON "DepartmentKPI"("assignedById");

-- CreateIndex
CREATE INDEX "TeamTarget_organizationId_departmentKpiId_idx" ON "TeamTarget"("organizationId", "departmentKpiId");

-- CreateIndex
CREATE INDEX "TeamTarget_organizationId_managerId_measurementPeriod_idx" ON "TeamTarget"("organizationId", "managerId", "measurementPeriod");

-- CreateIndex
CREATE INDEX "EmployeeTarget_organizationId_employeeId_measurementPeriod_idx" ON "EmployeeTarget"("organizationId", "employeeId", "measurementPeriod");

-- CreateIndex
CREATE INDEX "EmployeeTarget_organizationId_teamTargetId_idx" ON "EmployeeTarget"("organizationId", "teamTargetId");

-- CreateIndex
CREATE INDEX "EmployeeTarget_assignedById_idx" ON "EmployeeTarget"("assignedById");

-- CreateIndex
CREATE INDEX "PerformanceReviewV2_organizationId_employeeId_cycleId_idx" ON "PerformanceReviewV2"("organizationId", "employeeId", "cycleId");

-- CreateIndex
CREATE INDEX "PerformanceReviewV2_organizationId_status_idx" ON "PerformanceReviewV2"("organizationId", "status");

-- CreateIndex
CREATE INDEX "PerformanceReviewV2_managerId_directorId_idx" ON "PerformanceReviewV2"("managerId", "directorId");

-- CreateIndex
CREATE INDEX "PerformanceScore_organizationId_performanceReviewId_idx" ON "PerformanceScore"("organizationId", "performanceReviewId");

-- CreateIndex
CREATE INDEX "JobPosition_organizationId_status_createdAt_idx" ON "JobPosition"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Candidate_organizationId_jobPositionId_status_idx" ON "Candidate"("organizationId", "jobPositionId", "status");

-- CreateIndex
CREATE INDEX "Candidate_email_phone_idx" ON "Candidate"("email", "phone");

-- CreateIndex
CREATE INDEX "InterviewStage_organizationId_candidateId_stage_idx" ON "InterviewStage"("organizationId", "candidateId", "stage");

-- CreateIndex
CREATE INDEX "InterviewFeedback_organizationId_candidateId_idx" ON "InterviewFeedback"("organizationId", "candidateId");

-- CreateIndex
CREATE INDEX "InterviewFeedback_organizationId_reviewerId_idx" ON "InterviewFeedback"("organizationId", "reviewerId");

-- CreateIndex
CREATE INDEX "InterviewFeedback_interviewStageId_idx" ON "InterviewFeedback"("interviewStageId");

-- CreateIndex
CREATE UNIQUE INDEX "OfferLetter_candidateId_key" ON "OfferLetter"("candidateId");

-- CreateIndex
CREATE INDEX "OfferLetter_organizationId_candidateId_status_idx" ON "OfferLetter"("organizationId", "candidateId", "status");

-- CreateIndex
CREATE INDEX "OnboardingChecklist_organizationId_employeeId_status_idx" ON "OnboardingChecklist"("organizationId", "employeeId", "status");

-- CreateIndex
CREATE INDEX "OnboardingChecklistTask_organizationId_checklistId_status_idx" ON "OnboardingChecklistTask"("organizationId", "checklistId", "status");

-- CreateIndex
CREATE INDEX "OffboardingProcess_organizationId_employeeId_status_idx" ON "OffboardingProcess"("organizationId", "employeeId", "status");

-- CreateIndex
CREATE INDEX "ExitInterview_organizationId_offboardingId_idx" ON "ExitInterview"("organizationId", "offboardingId");

-- CreateIndex
CREATE INDEX "AssetReturn_organizationId_offboardingId_returned_idx" ON "AssetReturn"("organizationId", "offboardingId", "returned");

-- CreateIndex
CREATE INDEX "OffboardingTemplate_organizationId_idx" ON "OffboardingTemplate"("organizationId");

-- CreateIndex
CREATE INDEX "OffboardingTask_organizationId_templateId_idx" ON "OffboardingTask"("organizationId", "templateId");

-- CreateIndex
CREATE INDEX "OffboardingItem_organizationId_offboardingId_idx" ON "OffboardingItem"("organizationId", "offboardingId");

-- CreateIndex
CREATE INDEX "BenefitPlan_organizationId_status_category_idx" ON "BenefitPlan"("organizationId", "status", "category");

-- CreateIndex
CREATE INDEX "EmployeeBenefitEnrollment_organizationId_employeeId_status_idx" ON "EmployeeBenefitEnrollment"("organizationId", "employeeId", "status");

-- CreateIndex
CREATE INDEX "EmployeeBenefitEnrollment_benefitPlanId_idx" ON "EmployeeBenefitEnrollment"("benefitPlanId");

-- CreateIndex
CREATE INDEX "Shift_organizationId_status_idx" ON "Shift"("organizationId", "status");

-- CreateIndex
CREATE INDEX "EmployeeShift_organizationId_employeeId_effectiveFrom_idx" ON "EmployeeShift"("organizationId", "employeeId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "EmployeeShift_shiftId_idx" ON "EmployeeShift"("shiftId");

-- CreateIndex
CREATE INDEX "ShiftAttendanceRule_organizationId_shiftId_idx" ON "ShiftAttendanceRule"("organizationId", "shiftId");

-- CreateIndex
CREATE INDEX "TaxRule_organizationId_countryCode_taxType_isActive_idx" ON "TaxRule"("organizationId", "countryCode", "taxType", "isActive");

-- CreateIndex
CREATE INDEX "TaxBracket_organizationId_taxRuleId_idx" ON "TaxBracket"("organizationId", "taxRuleId");

-- CreateIndex
CREATE INDEX "SystemLog_organizationId_createdAt_idx" ON "SystemLog"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "SystemLog_type_createdAt_idx" ON "SystemLog"("type", "createdAt");

-- CreateIndex
CREATE INDEX "EmployeeReporting_organizationId_employeeId_idx" ON "EmployeeReporting"("organizationId", "employeeId");

-- CreateIndex
CREATE INDEX "EmployeeReporting_organizationId_managerId_idx" ON "EmployeeReporting"("organizationId", "managerId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeReporting_employeeId_managerId_type_key" ON "EmployeeReporting"("employeeId", "managerId", "type");

-- CreateIndex
CREATE INDEX "KpiUpdate_organizationId_kpiItemId_idx" ON "KpiUpdate"("organizationId", "kpiItemId");

-- CreateIndex
CREATE INDEX "KpiUpdate_createdAt_idx" ON "KpiUpdate"("createdAt");

-- CreateIndex
CREATE INDEX "SupportTicket_organizationId_status_idx" ON "SupportTicket"("organizationId", "status");

-- CreateIndex
CREATE INDEX "SupportTicket_employeeId_idx" ON "SupportTicket"("employeeId");

-- CreateIndex
CREATE INDEX "TicketComment_organizationId_ticketId_idx" ON "TicketComment"("organizationId", "ticketId");

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt");

-- CreateIndex
CREATE INDEX "DisciplinaryCase_organizationId_employeeId_idx" ON "DisciplinaryCase"("organizationId", "employeeId");

-- CreateIndex
CREATE INDEX "DisciplinaryCase_organizationId_status_idx" ON "DisciplinaryCase"("organizationId", "status");

-- CreateIndex
CREATE INDEX "DisciplinaryCase_organizationId_type_idx" ON "DisciplinaryCase"("organizationId", "type");

-- CreateIndex
CREATE INDEX "PolicyDocument_organizationId_status_idx" ON "PolicyDocument"("organizationId", "status");

-- CreateIndex
CREATE INDEX "PolicyDocument_organizationId_category_idx" ON "PolicyDocument"("organizationId", "category");

-- CreateIndex
CREATE INDEX "PolicyAcknowledgment_organizationId_policyId_idx" ON "PolicyAcknowledgment"("organizationId", "policyId");

-- CreateIndex
CREATE INDEX "PolicyAcknowledgment_organizationId_employeeId_idx" ON "PolicyAcknowledgment"("organizationId", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "PolicyAcknowledgment_policyId_employeeId_key" ON "PolicyAcknowledgment"("policyId", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "ProbationRecord_employeeId_key" ON "ProbationRecord"("employeeId");

-- CreateIndex
CREATE INDEX "ProbationRecord_organizationId_status_idx" ON "ProbationRecord"("organizationId", "status");

-- CreateIndex
CREATE INDEX "ProbationRecord_organizationId_endDate_idx" ON "ProbationRecord"("organizationId", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "ApiKey_organizationId_idx" ON "ApiKey"("organizationId");

-- CreateIndex
CREATE INDEX "WebhookSubscription_organizationId_idx" ON "WebhookSubscription"("organizationId");

-- CreateIndex
CREATE INDEX "PermissionBundle_organizationId_idx" ON "PermissionBundle"("organizationId");

-- CreateIndex
CREATE INDEX "Delegation_organizationId_granterId_idx" ON "Delegation"("organizationId", "granterId");

-- CreateIndex
CREATE INDEX "Delegation_organizationId_delegateId_idx" ON "Delegation"("organizationId", "delegateId");

-- CreateIndex
CREATE INDEX "CheckIn_organizationId_employeeId_idx" ON "CheckIn"("organizationId", "employeeId");

-- CreateIndex
CREATE INDEX "CheckIn_organizationId_managerId_idx" ON "CheckIn"("organizationId", "managerId");

-- CreateIndex
CREATE INDEX "Feedback360_organizationId_providerId_idx" ON "Feedback360"("organizationId", "providerId");

-- CreateIndex
CREATE INDEX "Feedback360_organizationId_receiverId_idx" ON "Feedback360"("organizationId", "receiverId");

-- CreateIndex
CREATE UNIQUE INDEX "Card_cardNumber_key" ON "Card"("cardNumber");

-- CreateIndex
CREATE INDEX "Card_organizationId_userId_idx" ON "Card"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "CardLifecycleEvent_organizationId_cardId_idx" ON "CardLifecycleEvent"("organizationId", "cardId");

-- CreateIndex
CREATE UNIQUE INDEX "CallCard_employeeId_key" ON "CallCard"("employeeId");

-- CreateIndex
CREATE INDEX "CallCard_organizationId_employeeId_idx" ON "CallCard"("organizationId", "employeeId");

-- CreateIndex
CREATE INDEX "CallCardConnection_callCardId_idx" ON "CallCardConnection"("callCardId");

-- CreateIndex
CREATE UNIQUE INDEX "_UserPermissionBundles_AB_unique" ON "_UserPermissionBundles"("A", "B");

-- CreateIndex
CREATE INDEX "_UserPermissionBundles_B_index" ON "_UserPermissionBundles"("B");

-- AddForeignKey
ALTER TABLE "KpiSheet" ADD CONSTRAINT "KpiSheet_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiSheet" ADD CONSTRAINT "KpiSheet_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiItem" ADD CONSTRAINT "KpiItem_sheetId_fkey" FOREIGN KEY ("sheetId") REFERENCES "KpiSheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Target" ADD CONSTRAINT "Target_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Target" ADD CONSTRAINT "Target_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Target" ADD CONSTRAINT "Target_lineManagerId_fkey" FOREIGN KEY ("lineManagerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Target" ADD CONSTRAINT "Target_originatorId_fkey" FOREIGN KEY ("originatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Target" ADD CONSTRAINT "Target_parentTargetId_fkey" FOREIGN KEY ("parentTargetId") REFERENCES "Target"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Target" ADD CONSTRAINT "Target_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TargetMetric" ADD CONSTRAINT "TargetMetric_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Target"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TargetAcknowledgement" ADD CONSTRAINT "TargetAcknowledgement_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Target"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TargetAcknowledgement" ADD CONSTRAINT "TargetAcknowledgement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TargetUpdate" ADD CONSTRAINT "TargetUpdate_metricId_fkey" FOREIGN KEY ("metricId") REFERENCES "TargetMetric"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TargetUpdate" ADD CONSTRAINT "TargetUpdate_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TargetUpdate" ADD CONSTRAINT "TargetUpdate_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Target"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeHistory" ADD CONSTRAINT "EmployeeHistory_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeHistory" ADD CONSTRAINT "EmployeeHistory_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeHistory" ADD CONSTRAINT "EmployeeHistory_loggedById_fkey" FOREIGN KEY ("loggedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetAssignment" ADD CONSTRAINT "AssetAssignment_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetAssignment" ADD CONSTRAINT "AssetAssignment_loggedById_fkey" FOREIGN KEY ("loggedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetAssignment" ADD CONSTRAINT "AssetAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_subUnitId_fkey" FOREIGN KEY ("subUnitId") REFERENCES "SubUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionRequest" ADD CONSTRAINT "PromotionRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionRequest" ADD CONSTRAINT "PromotionRequest_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompensationHistory" ADD CONSTRAINT "CompensationHistory_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeDocument" ADD CONSTRAINT "EmployeeDocument_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeQuery" ADD CONSTRAINT "EmployeeQuery_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeQuery" ADD CONSTRAINT "EmployeeQuery_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubUnit" ADD CONSTRAINT "SubUnit_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubUnit" ADD CONSTRAINT "SubUnit_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_hrReviewerId_fkey" FOREIGN KEY ("hrReviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_relieverId_fkey" FOREIGN KEY ("relieverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HandoverRecord" ADD CONSTRAINT "HandoverRecord_leaveRequestId_fkey" FOREIGN KEY ("leaveRequestId") REFERENCES "LeaveRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HandoverRecord" ADD CONSTRAINT "HandoverRecord_relieverId_fkey" FOREIGN KEY ("relieverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HandoverRecord" ADD CONSTRAINT "HandoverRecord_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppraisalPacket" ADD CONSTRAINT "AppraisalPacket_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "AppraisalCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppraisalPacket" ADD CONSTRAINT "AppraisalPacket_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppraisalPacket" ADD CONSTRAINT "AppraisalPacket_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppraisalReview" ADD CONSTRAINT "AppraisalReview_packetId_fkey" FOREIGN KEY ("packetId") REFERENCES "AppraisalPacket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppraisalReview" ADD CONSTRAINT "AppraisalReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemSettings" ADD CONSTRAINT "SystemSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollItem" ADD CONSTRAINT "PayrollItem_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollItem" ADD CONSTRAINT "PayrollItem_runId_fkey" FOREIGN KEY ("runId") REFERENCES "PayrollRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingTask" ADD CONSTRAINT "OnboardingTask_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "OnboardingTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingSession" ADD CONSTRAINT "OnboardingSession_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingSession" ADD CONSTRAINT "OnboardingSession_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "OnboardingTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingItem" ADD CONSTRAINT "OnboardingItem_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "OnboardingSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingEnrollment" ADD CONSTRAINT "TrainingEnrollment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingEnrollment" ADD CONSTRAINT "TrainingEnrollment_programId_fkey" FOREIGN KEY ("programId") REFERENCES "TrainingProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanInstallment" ADD CONSTRAINT "LoanInstallment_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseClaim" ADD CONSTRAINT "ExpenseClaim_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseClaim" ADD CONSTRAINT "ExpenseClaim_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceLog" ADD CONSTRAINT "AttendanceLog_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaasSubscription" ADD CONSTRAINT "SaasSubscription_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoginSecurityEvent" ADD CONSTRAINT "LoginSecurityEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentKPI" ADD CONSTRAINT "DepartmentKPI_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamTarget" ADD CONSTRAINT "TeamTarget_departmentKpiId_fkey" FOREIGN KEY ("departmentKpiId") REFERENCES "DepartmentKPI"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeTarget" ADD CONSTRAINT "EmployeeTarget_teamTargetId_fkey" FOREIGN KEY ("teamTargetId") REFERENCES "TeamTarget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceReviewV2" ADD CONSTRAINT "PerformanceReviewV2_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "ReviewCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceScore" ADD CONSTRAINT "PerformanceScore_performanceReviewId_fkey" FOREIGN KEY ("performanceReviewId") REFERENCES "PerformanceReviewV2"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobPosition" ADD CONSTRAINT "JobPosition_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_jobPositionId_fkey" FOREIGN KEY ("jobPositionId") REFERENCES "JobPosition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewStage" ADD CONSTRAINT "InterviewStage_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewStage" ADD CONSTRAINT "InterviewStage_interviewerId_fkey" FOREIGN KEY ("interviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewFeedback" ADD CONSTRAINT "InterviewFeedback_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewFeedback" ADD CONSTRAINT "InterviewFeedback_interviewStageId_fkey" FOREIGN KEY ("interviewStageId") REFERENCES "InterviewStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewFeedback" ADD CONSTRAINT "InterviewFeedback_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferLetter" ADD CONSTRAINT "OfferLetter_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OffboardingProcess" ADD CONSTRAINT "OffboardingProcess_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OffboardingProcess" ADD CONSTRAINT "OffboardingProcess_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "OffboardingTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExitInterview" ADD CONSTRAINT "ExitInterview_interviewerId_fkey" FOREIGN KEY ("interviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExitInterview" ADD CONSTRAINT "ExitInterview_offboardingId_fkey" FOREIGN KEY ("offboardingId") REFERENCES "OffboardingProcess"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetReturn" ADD CONSTRAINT "AssetReturn_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetReturn" ADD CONSTRAINT "AssetReturn_offboardingId_fkey" FOREIGN KEY ("offboardingId") REFERENCES "OffboardingProcess"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OffboardingTask" ADD CONSTRAINT "OffboardingTask_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "OffboardingTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OffboardingItem" ADD CONSTRAINT "OffboardingItem_offboardingId_fkey" FOREIGN KEY ("offboardingId") REFERENCES "OffboardingProcess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxBracket" ADD CONSTRAINT "TaxBracket_taxRuleId_fkey" FOREIGN KEY ("taxRuleId") REFERENCES "TaxRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeReporting" ADD CONSTRAINT "EmployeeReporting_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeReporting" ADD CONSTRAINT "EmployeeReporting_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiUpdate" ADD CONSTRAINT "KpiUpdate_kpiItemId_fkey" FOREIGN KEY ("kpiItemId") REFERENCES "KpiItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketComment" ADD CONSTRAINT "TicketComment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketComment" ADD CONSTRAINT "TicketComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisciplinaryCase" ADD CONSTRAINT "DisciplinaryCase_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisciplinaryCase" ADD CONSTRAINT "DisciplinaryCase_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyDocument" ADD CONSTRAINT "PolicyDocument_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyAcknowledgment" ADD CONSTRAINT "PolicyAcknowledgment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyAcknowledgment" ADD CONSTRAINT "PolicyAcknowledgment_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "PolicyDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProbationRecord" ADD CONSTRAINT "ProbationRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProbationRecord" ADD CONSTRAINT "ProbationRecord_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookSubscription" ADD CONSTRAINT "WebhookSubscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delegation" ADD CONSTRAINT "Delegation_granterId_fkey" FOREIGN KEY ("granterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delegation" ADD CONSTRAINT "Delegation_delegateId_fkey" FOREIGN KEY ("delegateId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback360" ADD CONSTRAINT "Feedback360_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback360" ADD CONSTRAINT "Feedback360_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardLifecycleEvent" ADD CONSTRAINT "CardLifecycleEvent_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardLifecycleEvent" ADD CONSTRAINT "CardLifecycleEvent_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallCard" ADD CONSTRAINT "CallCard_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallCardConnection" ADD CONSTRAINT "CallCardConnection_callCardId_fkey" FOREIGN KEY ("callCardId") REFERENCES "CallCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserPermissionBundles" ADD CONSTRAINT "_UserPermissionBundles_A_fkey" FOREIGN KEY ("A") REFERENCES "PermissionBundle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserPermissionBundles" ADD CONSTRAINT "_UserPermissionBundles_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
