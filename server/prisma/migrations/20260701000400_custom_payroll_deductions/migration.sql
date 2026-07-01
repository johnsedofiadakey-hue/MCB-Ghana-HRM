-- AddColumn: customDeductionsSnapshot on PayrollItem
ALTER TABLE "PayrollItem" ADD COLUMN IF NOT EXISTS "customDeductionsSnapshot" JSONB;

-- CreateTable: PayrollDeductionTemplate
CREATE TABLE IF NOT EXISTS "PayrollDeductionTemplate" (
    "id"             TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name"           TEXT NOT NULL,
    "type"           TEXT NOT NULL DEFAULT 'DEDUCTION',
    "scope"          TEXT NOT NULL DEFAULT 'GLOBAL',
    "employeeId"     TEXT,
    "basis"          TEXT NOT NULL DEFAULT 'FIXED',
    "amount"         DECIMAL(65,30) NOT NULL DEFAULT 0,
    "taxTreatment"   TEXT NOT NULL DEFAULT 'POST_TAX',
    "isActive"       BOOLEAN NOT NULL DEFAULT true,
    "notes"          TEXT,
    "createdById"    TEXT NOT NULL,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayrollDeductionTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PayrollDeductionTemplate_organizationId_isActive_idx"
    ON "PayrollDeductionTemplate"("organizationId", "isActive");

CREATE INDEX IF NOT EXISTS "PayrollDeductionTemplate_organizationId_employeeId_idx"
    ON "PayrollDeductionTemplate"("organizationId", "employeeId");

-- AddForeignKey: employee (nullable)
ALTER TABLE "PayrollDeductionTemplate"
    ADD CONSTRAINT "PayrollDeductionTemplate_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: createdBy
ALTER TABLE "PayrollDeductionTemplate"
    ADD CONSTRAINT "PayrollDeductionTemplate_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
