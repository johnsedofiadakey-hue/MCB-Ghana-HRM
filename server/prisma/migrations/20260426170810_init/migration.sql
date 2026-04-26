-- CreateTable
CREATE TABLE "KpiSheet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "lockedAt" DATETIME,
    "title" TEXT NOT NULL,
    "employeeId" TEXT,
    "reviewerId" TEXT,
    "totalScore" DECIMAL,
    "status" TEXT DEFAULT 'DRAFT',
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "targetDepartmentId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KpiSheet_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "KpiSheet_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KpiItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'General',
    "metricType" TEXT NOT NULL DEFAULT 'NUMERIC',
    "targetValue" DECIMAL NOT NULL,
    "actualValue" DECIMAL NOT NULL DEFAULT 0,
    "weight" DECIMAL NOT NULL DEFAULT 1.0,
    "score" DECIMAL,
    "frequency" TEXT NOT NULL DEFAULT 'MONTHLY',
    "startDate" DATETIME,
    "endDate" DATETIME,
    "lastEntryDate" DATETIME,
    "sheetId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KpiItem_sheetId_fkey" FOREIGN KEY ("sheetId") REFERENCES "KpiSheet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Target" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "level" TEXT NOT NULL DEFAULT 'INDIVIDUAL',
    "type" TEXT NOT NULL DEFAULT 'SINGLE',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "dueDate" DATETIME,
    "weight" DECIMAL NOT NULL DEFAULT 1.0,
    "progress" DECIMAL NOT NULL DEFAULT 0,
    "contributionWeight" DECIMAL NOT NULL DEFAULT 0,
    "parentTargetId" TEXT,
    "departmentId" INTEGER,
    "assigneeId" TEXT,
    "originatorId" TEXT NOT NULL,
    "lineManagerId" TEXT,
    "reviewerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" DATETIME,
    CONSTRAINT "Target_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Target_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Target_lineManagerId_fkey" FOREIGN KEY ("lineManagerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Target_originatorId_fkey" FOREIGN KEY ("originatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Target_parentTargetId_fkey" FOREIGN KEY ("parentTargetId") REFERENCES "Target" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Target_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TargetMetric" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "targetId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "metricType" TEXT NOT NULL DEFAULT 'NUMERICAL',
    "targetValue" DECIMAL,
    "currentValue" DECIMAL NOT NULL DEFAULT 0,
    "unit" TEXT,
    "currency" TEXT DEFAULT 'GHS',
    "weight" DECIMAL NOT NULL DEFAULT 1.0,
    "qualitativePrompt" TEXT,
    CONSTRAINT "TargetMetric_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Target" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TargetAcknowledgement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "targetId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACKNOWLEDGED',
    "message" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TargetAcknowledgement_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Target" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TargetAcknowledgement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TargetUpdate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "targetId" TEXT NOT NULL,
    "metricId" TEXT,
    "submittedById" TEXT NOT NULL,
    "value" DECIMAL,
    "comment" TEXT,
    "attachmentUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TargetUpdate_metricId_fkey" FOREIGN KEY ("metricId") REFERENCES "TargetMetric" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TargetUpdate_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TargetUpdate_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Target" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isCompanyProperty" BOOLEAN NOT NULL DEFAULT true,
    "serialNumber" TEXT NOT NULL,
    "make" TEXT,
    "model" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "purchaseDate" DATETIME,
    "warrantyExpiry" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "userId" TEXT,
    "action" TEXT,
    "entity" TEXT,
    "entityId" TEXT,
    "details" TEXT,
    "ipAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EmployeeHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "employeeId" TEXT,
    "createdById" TEXT,
    "title" TEXT,
    "description" TEXT,
    "change" TEXT,
    "type" TEXT,
    "severity" TEXT,
    "status" TEXT DEFAULT 'OPEN',
    "loggedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmployeeHistory_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EmployeeHistory_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EmployeeHistory_loggedById_fkey" FOREIGN KEY ("loggedById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApiUsage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "path" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AssetAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "returnedAt" DATETIME,
    "details" TEXT,
    "status" TEXT DEFAULT 'OPEN',
    "conditionOnAssign" TEXT,
    "conditionOnReturn" TEXT,
    "loggedById" TEXT,
    "userId" TEXT,
    "assetId" TEXT,
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "handoverSignature" TEXT,
    "returnSignature" TEXT,
    CONSTRAINT "AssetAssignment_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AssetAssignment_loggedById_fkey" FOREIGN KEY ("loggedById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AssetAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'STAFF',
    "employeeCode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "position" TEXT,
    "departmentId" INTEGER,
    "subUnitId" TEXT,
    "jobTitle" TEXT NOT NULL,
    "joinDate" DATETIME,
    "employmentType" TEXT,
    "dob" DATETIME,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "salary" DECIMAL,
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
    "leaveBalance" DECIMAL DEFAULT 30,
    "leaveAllowance" DECIMAL DEFAULT 30,
    "leaveAccruedAt" DATETIME,
    "supervisorId" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedDate" DATETIME,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "biometricId" TEXT,
    "countryOfOrigin" TEXT,
    "hasManualLeaveOverride" BOOLEAN NOT NULL DEFAULT false,
    "lastManualLeaveAdjustmentAt" DATETIME,
    "nationality" TEXT,
    "signatureUrl" TEXT,
    CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_subUnitId_fkey" FOREIGN KEY ("subUnitId") REFERENCES "SubUnit" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CompensationHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "employeeId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "previousSalary" DECIMAL NOT NULL,
    "newSalary" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "reason" TEXT,
    "effectiveDate" DATETIME NOT NULL,
    "authorizedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CompensationHistory_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EmployeeDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "employeeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmployeeDocument_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EmployeeQuery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "employeeId" TEXT NOT NULL,
    "issuedById" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EmployeeQuery_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EmployeeQuery_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Department" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "name" TEXT NOT NULL,
    "managerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Department_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SubUnit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "name" TEXT NOT NULL,
    "departmentId" INTEGER NOT NULL,
    "managerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SubUnit_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SubUnit_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LeaveRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "employeeId" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "leaveDays" DECIMAL NOT NULL DEFAULT 0,
    "leaveType" TEXT NOT NULL DEFAULT 'Annual',
    "reason" TEXT NOT NULL,
    "relieverId" TEXT,
    "relieverStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "relieverRespondedAt" DATETIME,
    "relieverComment" TEXT,
    "handoverNotes" TEXT,
    "relieverAcceptanceRequired" BOOLEAN NOT NULL DEFAULT false,
    "handoverAcknowledged" BOOLEAN NOT NULL DEFAULT false,
    "managerId" TEXT,
    "managerComment" TEXT,
    "hrReviewerId" TEXT,
    "hrComment" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" DATETIME,
    CONSTRAINT "LeaveRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LeaveRequest_hrReviewerId_fkey" FOREIGN KEY ("hrReviewerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "LeaveRequest_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "LeaveRequest_relieverId_fkey" FOREIGN KEY ("relieverId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HandoverRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "leaveRequestId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "relieverId" TEXT NOT NULL,
    "handoverNotes" TEXT,
    "acceptedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'ACCEPTED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "HandoverRecord_leaveRequestId_fkey" FOREIGN KEY ("leaveRequestId") REFERENCES "LeaveRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "HandoverRecord_relieverId_fkey" FOREIGN KEY ("relieverId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "HandoverRecord_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Cycle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ReviewCycle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "targetAudience" TEXT NOT NULL,
    "departmentId" INTEGER,
    "publishDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expirationDate" DATETIME,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Announcement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Announcement_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AppraisalCycle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "title" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AppraisalPacket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
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
    "disputeResolvedAt" DATETIME,
    "resolvedById" TEXT,
    "finalScore" DECIMAL,
    "finalVerdict" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "arbitrationLogic" TEXT,
    CONSTRAINT "AppraisalPacket_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "AppraisalCycle" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AppraisalPacket_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AppraisalPacket_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AppraisalReview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "packetId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "reviewStage" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "submittedAt" DATETIME,
    "overallRating" DECIMAL,
    "summary" TEXT,
    "strengths" TEXT,
    "weaknesses" TEXT,
    "achievements" TEXT,
    "developmentNeeds" TEXT,
    "responses" TEXT DEFAULT '{}',
    CONSTRAINT "AppraisalReview_packetId_fkey" FOREIGN KEY ("packetId") REFERENCES "AppraisalPacket" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AppraisalReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "country" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "subscriptionPlan" TEXT NOT NULL DEFAULT 'FREE',
    "subscriptionAmount" DECIMAL NOT NULL DEFAULT 0,
    "billingStatus" TEXT NOT NULL DEFAULT 'FREE',
    "isEnterprise" BOOLEAN NOT NULL DEFAULT false,
    "features" TEXT NOT NULL DEFAULT '{}',
    "isSuspended" BOOLEAN NOT NULL DEFAULT false,
    "trialStartDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trialEndsAt" DATETIME,
    "nextBillingDate" DATETIME,
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
    "themePreset" TEXT NOT NULL DEFAULT 'nexus-dark',
    "lightMode" BOOLEAN NOT NULL DEFAULT false,
    "language" TEXT NOT NULL DEFAULT 'en',
    "discountPercentage" DECIMAL DEFAULT 0,
    "discountFixed" DECIMAL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "allowLeaveBorrowing" BOOLEAN NOT NULL DEFAULT false,
    "allowLeaveCarryForward" BOOLEAN NOT NULL DEFAULT true,
    "bgElevated" TEXT DEFAULT '#f1f5f9',
    "bgInput" TEXT DEFAULT '#ffffff',
    "borderSubtle" TEXT DEFAULT '#e2e8f0',
    "borrowingLimit" DECIMAL NOT NULL DEFAULT 5,
    "carryForwardLimit" DECIMAL NOT NULL DEFAULT 10,
    "defaultLeaveAllowance" DECIMAL NOT NULL DEFAULT 30,
    "domainStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "errorColor" TEXT DEFAULT '#ef4444',
    "infoColor" TEXT DEFAULT '#06b6d4',
    "isAiEnabled" BOOLEAN NOT NULL DEFAULT false,
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "subdomain" TEXT,
    "successColor" TEXT DEFAULT '#10b981',
    "textInverse" TEXT DEFAULT '#ffffff',
    "warningColor" TEXT DEFAULT '#f59e0b',
    "employerSsnitRate" DECIMAL NOT NULL DEFAULT 0.13,
    "payeBands" TEXT DEFAULT '[{"rate": 0, "limit": 490}, {"rate": 0.05, "limit": 110}, {"rate": 0.10, "limit": 130}, {"rate": 0.175, "limit": 3166.67}, {"rate": 0.25, "limit": 16000}, {"rate": 0.30, "limit": 30520}, {"rate": 0.35, "limit": 999999999}]',
    "ssnitRate" DECIMAL NOT NULL DEFAULT 0.055
);

-- CreateTable
CREATE TABLE "SystemSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT,
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
    "monthlyPriceGHS" DECIMAL,
    "annualPriceGHS" DECIMAL,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "monthlyPrice" DECIMAL,
    "annualPrice" DECIMAL,
    "trialDays" INTEGER NOT NULL DEFAULT 14,
    "loginNotice" TEXT,
    "loginSubtitle" TEXT,
    "loginBullets" TEXT,
    "backupFrequencyDays" INTEGER NOT NULL DEFAULT 7,
    "updatedAt" DATETIME NOT NULL,
    "databaseExpiryDate" DATETIME,
    "domainExpiryDate" DATETIME,
    "googleDriveFolderId" TEXT,
    CONSTRAINT "SystemSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'INFO',
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PayrollRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "period" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "totalGross" DECIMAL NOT NULL DEFAULT 0,
    "totalNet" DECIMAL NOT NULL DEFAULT 0,
    "approvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "approvedById" TEXT,
    "mdApprovedAt" DATETIME,
    "mdApprovedById" TEXT,
    "reviewedAt" DATETIME,
    "reviewedById" TEXT
);

-- CreateTable
CREATE TABLE "PayrollItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "runId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "baseSalary" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "overtime" DECIMAL NOT NULL DEFAULT 0,
    "bonus" DECIMAL NOT NULL DEFAULT 0,
    "allowances" DECIMAL NOT NULL DEFAULT 0,
    "tax" DECIMAL NOT NULL DEFAULT 0,
    "ssnit" DECIMAL NOT NULL DEFAULT 0,
    "otherDeductions" DECIMAL NOT NULL DEFAULT 0,
    "grossPay" DECIMAL NOT NULL,
    "netPay" DECIMAL NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PayrollItem_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PayrollItem_runId_fkey" FOREIGN KEY ("runId") REFERENCES "PayrollRun" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OnboardingTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "OnboardingTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "templateId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'General',
    "dueAfterDays" INTEGER NOT NULL DEFAULT 1,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "OnboardingTask_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "OnboardingTemplate" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OnboardingSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "employeeId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OnboardingSession_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OnboardingSession_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "OnboardingTemplate" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OnboardingItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "sessionId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "dueDate" DATETIME,
    "completedAt" DATETIME,
    "completedBy" TEXT,
    "notes" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "OnboardingItem_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "OnboardingSession" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TrainingProgram" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "provider" TEXT,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "durationHours" INTEGER,
    "cost" DECIMAL,
    "maxSeats" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "TrainingEnrollment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "programId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "enrolledAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "score" DECIMAL,
    "certificate" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ENROLLED',
    CONSTRAINT "TrainingEnrollment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TrainingEnrollment_programId_fkey" FOREIGN KEY ("programId") REFERENCES "TrainingProgram" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PublicHoliday" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "name" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'GH',
    "isRecurring" BOOLEAN NOT NULL DEFAULT true,
    "year" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "clientId" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'MONTHLY',
    "priceGHS" DECIMAL,
    "price" DECIMAL,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "status" TEXT NOT NULL DEFAULT 'TRIAL',
    "orgName" TEXT,
    "contactEmail" TEXT,
    "paystackRef" TEXT,
    "paystackSubCode" TEXT,
    "trialEndsAt" DATETIME,
    "currentPeriodStart" DATETIME,
    "currentPeriodEnd" DATETIME,
    "cancelledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Subscription_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Loan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "employeeId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'ADVANCE',
    "principalAmount" DECIMAL NOT NULL,
    "interestRate" DECIMAL NOT NULL DEFAULT 0,
    "totalRepayment" DECIMAL NOT NULL,
    "installmentAmount" DECIMAL NOT NULL,
    "monthsDuration" INTEGER NOT NULL,
    "purpose" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" DATETIME,
    "approvedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Loan_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Loan_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LoanInstallment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "loanId" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "deductedRunId" TEXT,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paidAt" DATETIME,
    CONSTRAINT "LoanInstallment_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExpenseClaim" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "employeeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "category" TEXT NOT NULL,
    "receiptUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" DATETIME,
    "approvedById" TEXT,
    "rejectionReason" TEXT,
    "paidInRunId" TEXT,
    CONSTRAINT "ExpenseClaim_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ExpenseClaim_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AttendanceLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "employeeId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "clockIn" DATETIME,
    "clockOut" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'PRESENT',
    "source" TEXT NOT NULL DEFAULT 'WEB',
    "notes" TEXT,
    "locationIn" TEXT,
    "locationOut" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AttendanceLog_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SaasSubscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "clientId" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'MONTHLY',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "amount" DECIMAL NOT NULL DEFAULT 50.00,
    "nextBillingDate" DATETIME NOT NULL,
    "lastPaymentDate" DATETIME,
    "paystackRef" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SaasSubscription_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BackupLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "filename" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "revokedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LoginSecurityEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoginSecurityEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DepartmentKPI" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "departmentId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "metricType" TEXT NOT NULL,
    "targetValue" DECIMAL NOT NULL,
    "measurementPeriod" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "assignedToId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DepartmentKPI_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TeamTarget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "departmentKpiId" TEXT NOT NULL,
    "originKPIId" TEXT,
    "managerId" TEXT NOT NULL,
    "teamName" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "metricType" TEXT NOT NULL,
    "targetValue" DECIMAL NOT NULL,
    "measurementPeriod" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TeamTarget_departmentKpiId_fkey" FOREIGN KEY ("departmentKpiId") REFERENCES "DepartmentKPI" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EmployeeTarget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "teamTargetId" TEXT NOT NULL,
    "originKPIId" TEXT,
    "managerId" TEXT,
    "employeeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "metricType" TEXT NOT NULL,
    "targetValue" DECIMAL NOT NULL,
    "measurementPeriod" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "assignedToId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EmployeeTarget_teamTargetId_fkey" FOREIGN KEY ("teamTargetId") REFERENCES "TeamTarget" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PerformanceReviewV2" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "managerId" TEXT,
    "directorId" TEXT,
    "cycle" TEXT NOT NULL,
    "selfReview" TEXT,
    "managerReview" TEXT,
    "directorReview" TEXT,
    "selfScore" DECIMAL,
    "managerScore" DECIMAL,
    "directorScore" DECIMAL,
    "finalScore" DECIMAL,
    "cycleId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "submittedAt" DATETIME,
    "validatedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PerformanceReviewV2_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "ReviewCycle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PerformanceScore" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "performanceReviewId" TEXT NOT NULL,
    "kpiTitle" TEXT NOT NULL,
    "metricType" TEXT NOT NULL,
    "targetValue" DECIMAL,
    "achievedValue" DECIMAL,
    "weightedScore" DECIMAL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PerformanceScore_performanceReviewId_fkey" FOREIGN KEY ("performanceReviewId") REFERENCES "PerformanceReviewV2" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JobPosition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "departmentId" INTEGER,
    "description" TEXT,
    "location" TEXT,
    "employmentType" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "openedById" TEXT,
    "closedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "JobPosition_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Candidate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "jobPositionId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "resumeUrl" TEXT,
    "source" TEXT,
    "status" TEXT NOT NULL DEFAULT 'APPLIED',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Candidate_jobPositionId_fkey" FOREIGN KEY ("jobPositionId") REFERENCES "JobPosition" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InterviewStage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "scheduledAt" DATETIME,
    "interviewerId" TEXT,
    "outcome" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'APPLIED',
    CONSTRAINT "InterviewStage_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InterviewStage_interviewerId_fkey" FOREIGN KEY ("interviewerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InterviewFeedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "interviewStageId" TEXT,
    "reviewerId" TEXT NOT NULL,
    "rating" DECIMAL,
    "feedback" TEXT,
    "recommendation" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InterviewFeedback_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InterviewFeedback_interviewStageId_fkey" FOREIGN KEY ("interviewStageId") REFERENCES "InterviewStage" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "InterviewFeedback_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OfferLetter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "fileUrl" TEXT,
    "salaryOffered" DECIMAL,
    "currency" TEXT DEFAULT 'GHS',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "sentAt" DATETIME,
    "acceptedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OfferLetter_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OnboardingChecklist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "source" TEXT DEFAULT 'ATS',
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "OnboardingChecklistTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT DEFAULT 'GENERAL',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "dueDate" DATETIME,
    "completedAt" DATETIME,
    "completedById" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "OffboardingProcess" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "triggeredById" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'INITIATED',
    "effectiveDate" DATETIME,
    "accountDisabledAt" DATETIME,
    "finalPayrollRunId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "templateId" TEXT,
    CONSTRAINT "OffboardingProcess_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OffboardingProcess_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "OffboardingTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExitInterview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "offboardingId" TEXT NOT NULL,
    "interviewerId" TEXT,
    "interviewDate" DATETIME,
    "reason" TEXT,
    "feedback" TEXT,
    "rehireEligible" BOOLEAN,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ExitInterview_interviewerId_fkey" FOREIGN KEY ("interviewerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ExitInterview_offboardingId_fkey" FOREIGN KEY ("offboardingId") REFERENCES "OffboardingProcess" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AssetReturn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "offboardingId" TEXT NOT NULL,
    "assetId" TEXT,
    "assetName" TEXT,
    "returned" BOOLEAN NOT NULL DEFAULT false,
    "returnedAt" DATETIME,
    "conditionNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AssetReturn_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AssetReturn_offboardingId_fkey" FOREIGN KEY ("offboardingId") REFERENCES "OffboardingProcess" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OffboardingTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "OffboardingTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "templateId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'General',
    "dueAfterDays" INTEGER NOT NULL DEFAULT 1,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "OffboardingTask_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "OffboardingTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OffboardingItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "offboardingId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "dueDate" DATETIME,
    "completedAt" DATETIME,
    "completedBy" TEXT,
    "notes" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "OffboardingItem_offboardingId_fkey" FOREIGN KEY ("offboardingId") REFERENCES "OffboardingProcess" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BenefitPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "employerAmount" DECIMAL DEFAULT 0,
    "employeeAmount" DECIMAL DEFAULT 0,
    "taxable" BOOLEAN NOT NULL DEFAULT false,
    "payrollCode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "EmployeeBenefitEnrollment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "benefitPlanId" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "employeeAmount" DECIMAL DEFAULT 0,
    "employerAmount" DECIMAL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Shift" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Accra',
    "gracePeriodMins" INTEGER NOT NULL DEFAULT 10,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "EmployeeShift" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "effectiveFrom" DATETIME NOT NULL,
    "effectiveTo" DATETIME,
    "assignedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ShiftAttendanceRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "lateAfterMins" INTEGER NOT NULL DEFAULT 10,
    "halfDayAfterMins" INTEGER NOT NULL DEFAULT 240,
    "absentAfterMins" INTEGER NOT NULL DEFAULT 480,
    "requiresGeoFence" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TaxRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "taxType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "appliesTo" TEXT DEFAULT 'PAYROLL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" DATETIME NOT NULL,
    "effectiveTo" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TaxBracket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "taxRuleId" TEXT NOT NULL,
    "minAmount" DECIMAL NOT NULL,
    "maxAmount" DECIMAL,
    "rate" DECIMAL NOT NULL,
    "fixedAmount" DECIMAL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TaxBracket_taxRuleId_fkey" FOREIGN KEY ("taxRuleId") REFERENCES "TaxRule" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SystemLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "type" TEXT,
    "message" TEXT,
    "action" TEXT,
    "details" TEXT,
    "source" TEXT,
    "operatorId" TEXT,
    "operatorEmail" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "EmployeeReporting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "employeeId" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'DIRECT',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "effectiveFrom" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmployeeReporting_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EmployeeReporting_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KpiUpdate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "kpiItemId" TEXT NOT NULL,
    "value" DECIMAL NOT NULL,
    "comment" TEXT,
    "submittedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KpiUpdate_kpiItemId_fkey" FOREIGN KEY ("kpiItemId") REFERENCES "KpiItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "employeeId" TEXT NOT NULL,
    "assignedToId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SupportTicket_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SupportTicket_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TicketComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "ticketId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "attachmentUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TicketComment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TicketComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company" TEXT,
    "phone" TEXT,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "organizationId" TEXT DEFAULT 'stormglide-corp',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DisciplinaryCase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "employeeId" TEXT NOT NULL,
    "issuedById" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'CONDUCT',
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "evidence" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "outcome" TEXT,
    "hearingDate" DATETIME,
    "resolvedAt" DATETIME,
    "acknowledgedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DisciplinaryCase_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DisciplinaryCase_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PolicyDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT,
    "fileUrl" TEXT,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "version" TEXT NOT NULL DEFAULT '1.0',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "targetRoles" TEXT,
    "publishedAt" DATETIME,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PolicyDocument_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PolicyAcknowledgment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "policyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "acknowledgedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    CONSTRAINT "PolicyAcknowledgment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PolicyAcknowledgment_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "PolicyDocument" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProbationRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "employeeId" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "period" INTEGER NOT NULL DEFAULT 90,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "reviewDate" DATETIME,
    "reviewedById" TEXT,
    "outcome" TEXT,
    "goals" TEXT,
    "notes" TEXT,
    "alertSentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProbationRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProbationRecord_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "lastUsedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ApiKey_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WebhookSubscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "events" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "secret" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WebhookSubscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
