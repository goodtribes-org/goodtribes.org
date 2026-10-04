-- #201: when a lead answered "Inte nu" to "Startar du projektet tillsammans
-- med någon?". Additive, nullable — no backfill.
ALTER TABLE "Project" ADD COLUMN "inviteQuestionDismissedAt" TIMESTAMP(3);
