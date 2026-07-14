-- AlterTable: additive, nullable — no backfill risk.
ALTER TABLE "Organisation" ADD COLUMN "category" TEXT;

-- CreateTable
CREATE TABLE "OrganisationSkill" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganisationSkill_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrganisationSkill_organisationId_skillId_key" ON "OrganisationSkill"("organisationId", "skillId");

-- AddForeignKey
ALTER TABLE "OrganisationSkill" ADD CONSTRAINT "OrganisationSkill_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganisationSkill" ADD CONSTRAINT "OrganisationSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
