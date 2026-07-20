-- legal_type / 4c (PRD): replaces the dead Project.commercial Boolean
-- (added 20260715220000_project_commercial, confirmed never written
-- anywhere in the app) with the 4-value legal_type enum, plus the
-- umbrella-AB entity table and the member-request/Foundation-execute
-- transition workflow table. No backfill needed — commercial was always
-- false.

-- CreateEnum
CREATE TYPE "LegalType" AS ENUM ('COMMERCIAL_UMBRELLA', 'COMMERCIAL_AB', 'NONPROFIT_UMBRELLA', 'NONPROFIT_OWN_ASSOC');

-- AlterTable
ALTER TABLE "Project" DROP COLUMN "commercial",
ADD COLUMN     "commercialUmbrellaEntityId" TEXT,
ADD COLUMN     "legalType" "LegalType" NOT NULL DEFAULT 'NONPROFIT_UMBRELLA';

-- CreateTable
CREATE TABLE "CommercialUmbrellaEntity" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "foundationAbOrgNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommercialUmbrellaEntity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalTypeChangeRequest" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "requestedType" "LegalType" NOT NULL,
    "pollId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requestedById" TEXT NOT NULL,
    "decisionNote" TEXT,
    "executedById" TEXT,
    "executedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegalTypeChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LegalTypeChangeRequest_projectId_idx" ON "LegalTypeChangeRequest"("projectId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_commercialUmbrellaEntityId_fkey" FOREIGN KEY ("commercialUmbrellaEntityId") REFERENCES "CommercialUmbrellaEntity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalTypeChangeRequest" ADD CONSTRAINT "LegalTypeChangeRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalTypeChangeRequest" ADD CONSTRAINT "LegalTypeChangeRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalTypeChangeRequest" ADD CONSTRAINT "LegalTypeChangeRequest_executedById_fkey" FOREIGN KEY ("executedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
