-- CreateTable
CREATE TABLE "OnboardingInviteToken" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "token"     TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt"    TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OnboardingInviteToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingInviteToken_userId_key" ON "OnboardingInviteToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingInviteToken_token_key" ON "OnboardingInviteToken"("token");

-- AddForeignKey
ALTER TABLE "OnboardingInviteToken"
  ADD CONSTRAINT "OnboardingInviteToken_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
