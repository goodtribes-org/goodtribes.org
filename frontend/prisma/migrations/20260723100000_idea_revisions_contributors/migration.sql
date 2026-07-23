-- PRD 5.15-5.16: idea co-creation (pull-request-style revisions +
-- contributors) and the idea -> project promotion back-link.
ALTER TABLE "Idea" ADD COLUMN     "promotedToProjectId" TEXT;

CREATE TABLE "IdeaRevision" (
    "id" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "proposedDescription" TEXT NOT NULL,
    "previousDescription" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "proposedById" TEXT NOT NULL,
    "decisionNote" TEXT,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdeaRevision_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IdeaContributor" (
    "id" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'contributor',
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdeaContributor_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "IdeaRevision_ideaId_idx" ON "IdeaRevision"("ideaId");

CREATE UNIQUE INDEX "IdeaContributor_ideaId_userId_key" ON "IdeaContributor"("ideaId", "userId");

CREATE UNIQUE INDEX "Idea_promotedToProjectId_key" ON "Idea"("promotedToProjectId");

ALTER TABLE "Idea" ADD CONSTRAINT "Idea_promotedToProjectId_fkey" FOREIGN KEY ("promotedToProjectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "IdeaRevision" ADD CONSTRAINT "IdeaRevision_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "Idea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "IdeaRevision" ADD CONSTRAINT "IdeaRevision_proposedById_fkey" FOREIGN KEY ("proposedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "IdeaRevision" ADD CONSTRAINT "IdeaRevision_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "IdeaContributor" ADD CONSTRAINT "IdeaContributor_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "Idea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "IdeaContributor" ADD CONSTRAINT "IdeaContributor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
