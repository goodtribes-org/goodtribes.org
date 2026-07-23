-- "Flöde i projekten": FeedPost can optionally be scoped to a project.
-- Null = today's global feed post; set = a project-scoped post, never
-- shown on the global feed.
ALTER TABLE "FeedPost" ADD COLUMN     "projectId" TEXT;

CREATE INDEX "FeedPost_projectId_idx" ON "FeedPost"("projectId");

ALTER TABLE "FeedPost" ADD CONSTRAINT "FeedPost_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
