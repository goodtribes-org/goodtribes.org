CREATE TABLE "ProjectInvite" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'collaborator',
  "createdById" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProjectInvite_token_key" ON "ProjectInvite"("token");

ALTER TABLE "ProjectInvite" ADD CONSTRAINT "ProjectInvite_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectInvite" ADD CONSTRAINT "ProjectInvite_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "WikiPage" (
  "id" TEXT NOT NULL,
  "projectSlug" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL DEFAULT '',
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdById" TEXT NOT NULL,
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WikiPage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WikiPage_projectSlug_slug_key" ON "WikiPage"("projectSlug", "slug");

ALTER TABLE "WikiPage" ADD CONSTRAINT "WikiPage_projectSlug_fkey"
  FOREIGN KEY ("projectSlug") REFERENCES "Project"("slug") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WikiPage" ADD CONSTRAINT "WikiPage_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WikiPage" ADD CONSTRAINT "WikiPage_updatedById_fkey"
  FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
