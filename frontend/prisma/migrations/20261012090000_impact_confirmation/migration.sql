-- Partnerbekräftelse (#336): additive only, one new table.
-- CreateTable
CREATE TABLE "ImpactConfirmation" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "confirmerName" TEXT,
    "confirmerOrg" TEXT,
    "comment" TEXT,
    "showOrgPublicly" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ImpactConfirmation_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE UNIQUE INDEX "ImpactConfirmation_tokenHash_key" ON "ImpactConfirmation"("tokenHash");
-- CreateIndex
CREATE INDEX "ImpactConfirmation_projectId_idx" ON "ImpactConfirmation"("projectId");
-- AddForeignKey
ALTER TABLE "ImpactConfirmation" ADD CONSTRAINT "ImpactConfirmation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "ImpactConfirmation" ADD CONSTRAINT "ImpactConfirmation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
