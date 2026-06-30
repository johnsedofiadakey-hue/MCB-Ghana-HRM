ALTER TABLE "Target"
  ADD COLUMN "quarter" INTEGER,
  ADD COLUMN "year" INTEGER;

ALTER TABLE "User"
  ADD COLUMN "loginEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "employeeLifecycleStage" TEXT NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE "LeaveRequest"
  ADD COLUMN "medicalCertificateUploaded" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "medicalCertificateUrl" TEXT,
  ADD COLUMN "requiresMedicalCertificate" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Organization"
  ADD COLUMN "tier2PensionEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "tier2PensionRate" DECIMAL(65,30) NOT NULL DEFAULT 0.05;

ALTER TABLE "OnboardingTask"
  ADD COLUMN "ownerRole" TEXT NOT NULL DEFAULT 'EMPLOYEE',
  ADD COLUMN "autoCompleteEvent" TEXT,
  ADD COLUMN "dependsOnTaskId" TEXT;

ALTER TABLE "OnboardingSession"
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS';

ALTER TABLE "OnboardingItem"
  ADD COLUMN "ownerRole" TEXT NOT NULL DEFAULT 'EMPLOYEE',
  ADD COLUMN "assignedToId" TEXT,
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "startedAt" TIMESTAMP(3),
  ADD COLUMN "blockedReason" TEXT,
  ADD COLUMN "evidenceUrl" TEXT,
  ADD COLUMN "verifiedAt" TIMESTAMP(3),
  ADD COLUMN "verifiedById" TEXT,
  ADD COLUMN "dependsOnItemId" TEXT,
  ADD COLUMN "autoCompleteEvent" TEXT;

ALTER TABLE "Card"
  ADD COLUMN "productionStatus" TEXT NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "accessStatus" TEXT NOT NULL DEFAULT 'NOT_PROVISIONED',
  ADD COLUMN "printedAt" TIMESTAMP(3),
  ADD COLUMN "issuedAt" TIMESTAMP(3),
  ADD COLUMN "activatedAt" TIMESTAMP(3);

CREATE TABLE "CardDesignSetting" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "theme" TEXT NOT NULL DEFAULT 'DARK',
  "logoUrl" TEXT,
  "primaryColor" TEXT NOT NULL DEFAULT '#0B4F9C',
  "secondaryColor" TEXT NOT NULL DEFAULT '#F5A623',
  "showPhone" BOOLEAN NOT NULL DEFAULT true,
  "showEmail" BOOLEAN NOT NULL DEFAULT true,
  "orientation" TEXT NOT NULL DEFAULT 'VERTICAL',
  "showLogo" BOOLEAN NOT NULL DEFAULT true,
  "showQrCode" BOOLEAN NOT NULL DEFAULT true,
  "backMessage" TEXT,
  "securityText" TEXT DEFAULT 'Terms of Use',
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CardDesignSetting_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CardDesignSetting_organizationId_key" ON "CardDesignSetting"("organizationId");

ALTER TABLE "PayrollRun"
  ADD COLUMN "releasedAt" TIMESTAMP(3),
  ADD COLUMN "releasedById" TEXT,
  ADD COLUMN "rejectedAt" TIMESTAMP(3),
  ADD COLUMN "rejectedById" TEXT,
  ADD COLUMN "rejectionReason" TEXT,
  ADD COLUMN "voidedAt" TIMESTAMP(3),
  ADD COLUMN "voidedById" TEXT,
  ADD COLUMN "calculationSnapshot" JSONB,
  ADD COLUMN "calculationChecksum" TEXT;

ALTER TABLE "PayrollItem"
  ADD COLUMN "expenseReimbursements" DECIMAL(65,30) NOT NULL DEFAULT 0,
  ADD COLUMN "employerSsnit" DECIMAL(65,30) NOT NULL DEFAULT 0,
  ADD COLUMN "taxableIncome" DECIMAL(65,30) NOT NULL DEFAULT 0,
  ADD COLUMN "tier2Pension" DECIMAL(65,30) NOT NULL DEFAULT 0;

CREATE TABLE "PayrollStatutoryRule" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "effectiveTo" TIMESTAMP(3),
  "employeeSsnitRate" DECIMAL(65,30) NOT NULL DEFAULT 0.055,
  "employerSsnitRate" DECIMAL(65,30) NOT NULL DEFAULT 0.13,
  "minimumInsurable" DECIMAL(65,30),
  "maximumInsurable" DECIMAL(65,30),
  "payeBands" JSONB NOT NULL,
  "bonusRules" JSONB,
  "overtimeRules" JSONB,
  "accountantApproved" BOOLEAN NOT NULL DEFAULT false,
  "approvedBy" TEXT,
  "approvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PayrollStatutoryRule_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PayrollStatutoryRule_organizationId_effectiveFrom_effective_idx" ON "PayrollStatutoryRule"("organizationId", "effectiveFrom", "effectiveTo");

ALTER TABLE "SupportTicket"
  ADD COLUMN "queue" TEXT NOT NULL DEFAULT 'OTHER',
  ADD COLUMN "assignedAt" TIMESTAMP(3),
  ADD COLUMN "slaDueAt" TIMESTAMP(3),
  ADD COLUMN "slaPausedAt" TIMESTAMP(3),
  ADD COLUMN "slaPausedMinutes" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "firstResponseAt" TIMESTAMP(3),
  ADD COLUMN "resolvedAt" TIMESTAMP(3),
  ADD COLUMN "closedAt" TIMESTAMP(3),
  ADD COLUMN "resolutionSummary" TEXT;

ALTER TABLE "TicketComment" ADD COLUMN "isInternal" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "TicketActivity" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT DEFAULT 'mcb-ghana-tenant',
  "ticketId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TicketActivity_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TicketActivity_organizationId_ticketId_createdAt_idx" ON "TicketActivity"("organizationId", "ticketId", "createdAt");
ALTER TABLE "TicketActivity" ADD CONSTRAINT "TicketActivity_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "KnowledgeArticle" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT DEFAULT 'mcb-ghana-tenant',
  "queue" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "KnowledgeArticle_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "KnowledgeArticle_organizationId_queue_status_idx" ON "KnowledgeArticle"("organizationId", "queue", "status");

UPDATE "SupportTicket" SET "queue" = CASE
  WHEN UPPER("category") IN ('IT', 'HR', 'FINANCE', 'MARKETING') THEN UPPER("category")
  WHEN UPPER("category") IN ('FACILITY', 'FACILITIES', 'MAINTENANCE', 'OPERATIONS') THEN 'FACILITIES'
  ELSE 'OTHER'
END;

ALTER TABLE "SupportTicket" ALTER COLUMN "queue" DROP DEFAULT;
