-- CreateTable
CREATE TABLE "TicketAttachment" (
    "id"             TEXT NOT NULL,
    "organizationId" TEXT DEFAULT 'mcb-ghana-tenant',
    "ticketId"       TEXT NOT NULL,
    "commentId"      TEXT,
    "uploadedById"   TEXT NOT NULL,
    "fileUrl"        TEXT NOT NULL,
    "fileName"       TEXT NOT NULL,
    "mimeType"       TEXT NOT NULL,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TicketAttachment_organizationId_ticketId_idx" ON "TicketAttachment"("organizationId", "ticketId");

-- AddForeignKey
ALTER TABLE "TicketAttachment"
  ADD CONSTRAINT "TicketAttachment_ticketId_fkey"
  FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
