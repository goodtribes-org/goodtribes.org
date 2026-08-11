-- CreateIndex
-- ActivityEvent already indexed organisationId but not projectId, despite
-- lib/activityFeed.ts filtering directly on projectId in several queries —
-- an oversight, not a deliberate omission (found in the 2026-08-11 code
-- review).
CREATE INDEX "ActivityEvent_projectId_idx" ON "ActivityEvent"("projectId");
