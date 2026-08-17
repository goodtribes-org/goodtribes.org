-- Adds an optional display name to standalone Lean Canvas and Whiteboard
-- drafts. Nullable at the DB level (existing rows have none); the app
-- requires a non-empty name before a new draft can be created.
ALTER TABLE "LeanCanvasDraft" ADD COLUMN "name" TEXT;
ALTER TABLE "WhiteboardDraft" ADD COLUMN "name" TEXT;
