CREATE TABLE "ProjectSkill" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectSkill_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ProjectSkill" ADD CONSTRAINT "ProjectSkill_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectSkill" ADD CONSTRAINT "ProjectSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "ProjectSkill_projectId_skillId_key" ON "ProjectSkill"("projectId", "skillId");
