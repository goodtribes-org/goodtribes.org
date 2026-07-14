-- AlterTable: additive, defaulted — no backfill risk.
ALTER TABLE "Organisation" ADD COLUMN "verified" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "OrganisationFlag" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "flaggedById" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedById" TEXT,
    "decisionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganisationFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganisationEthicsReview" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "organisationFlagId" TEXT,
    "outcome" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganisationEthicsReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganisationReview" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganisationReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrganisationFlag_organisationId_idx" ON "OrganisationFlag"("organisationId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganisationEthicsReview_organisationFlagId_key" ON "OrganisationEthicsReview"("organisationFlagId");

-- CreateIndex
CREATE INDEX "OrganisationEthicsReview_organisationId_idx" ON "OrganisationEthicsReview"("organisationId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganisationReview_organisationId_authorId_key" ON "OrganisationReview"("organisationId", "authorId");

-- CreateIndex
CREATE INDEX "OrganisationReview_organisationId_idx" ON "OrganisationReview"("organisationId");

-- AddForeignKey
ALTER TABLE "OrganisationFlag" ADD CONSTRAINT "OrganisationFlag_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganisationFlag" ADD CONSTRAINT "OrganisationFlag_flaggedById_fkey" FOREIGN KEY ("flaggedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganisationFlag" ADD CONSTRAINT "OrganisationFlag_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganisationEthicsReview" ADD CONSTRAINT "OrganisationEthicsReview_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganisationEthicsReview" ADD CONSTRAINT "OrganisationEthicsReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganisationEthicsReview" ADD CONSTRAINT "OrganisationEthicsReview_organisationFlagId_fkey" FOREIGN KEY ("organisationFlagId") REFERENCES "OrganisationFlag"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganisationReview" ADD CONSTRAINT "OrganisationReview_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganisationReview" ADD CONSTRAINT "OrganisationReview_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
