-- CreateTable
CREATE TABLE "LeaveRequestDay" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT DEFAULT 'mcb-ghana-tenant',
    "leaveRequestId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaveRequestDay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LeaveRequestDay_leaveRequestId_date_key" ON "LeaveRequestDay"("leaveRequestId", "date");

-- CreateIndex
CREATE INDEX "LeaveRequestDay_organizationId_date_idx" ON "LeaveRequestDay"("organizationId", "date");

-- AddForeignKey
ALTER TABLE "LeaveRequestDay" ADD CONSTRAINT "LeaveRequestDay_leaveRequestId_fkey" FOREIGN KEY ("leaveRequestId") REFERENCES "LeaveRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
