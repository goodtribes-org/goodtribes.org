-- Make ProjectInvite.email nullable (for shareable links)
ALTER TABLE "ProjectInvite" ALTER COLUMN "email" DROP NOT NULL;

-- Create ProjectMessage table
CREATE TABLE "ProjectMessage" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectMessage_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ProjectMessage" ADD CONSTRAINT "ProjectMessage_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectMessage" ADD CONSTRAINT "ProjectMessage_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "ProjectMessage_projectId_createdAt_idx" ON "ProjectMessage"("projectId", "createdAt" DESC);
