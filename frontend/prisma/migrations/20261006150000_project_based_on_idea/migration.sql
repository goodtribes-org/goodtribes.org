-- #233: anyone can drive any open idea, and one idea can have many projects.
-- Hand-written from `prisma migrate diff --from-schema <main> --to-schema`
-- (additive only), plus two data steps.

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "basedOnIdeaId" TEXT;

-- CreateIndex
CREATE INDEX "Project_basedOnIdeaId_idx" ON "Project"("basedOnIdeaId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_basedOnIdeaId_fkey" FOREIGN KEY ("basedOnIdeaId") REFERENCES "Idea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Data: copy every existing one-to-one link (Idea.promotedToProjectId) to
-- the new many-projects link. Idea.promotedToProjectId is kept (deprecated,
-- no longer written) so nothing is lost; a later cleanup can drop it.
UPDATE "Project" p
SET "basedOnIdeaId" = i."id"
FROM "Idea" i
WHERE i."promotedToProjectId" = p."id"
  AND p."basedOnIdeaId" IS NULL;

-- Data: no approval step any more. An idea is draft or open; one that was
-- in review, shortlisted, approved or converted is open (a converted idea
-- stays open and shows the projects that drive it). The enum values are
-- left in place, so no ALTER TYPE.
UPDATE "Idea"
SET "status" = 'open'
WHERE "status" IN ('review', 'shortlisted', 'approved', 'converted');
