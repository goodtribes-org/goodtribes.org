-- Migration: fas25_fas28_forum_calendar_tokens
-- New tables for Forum, Calendar, TaskEstimate, TimeLog, TokenLedger

CREATE TABLE "ForumPost" (
    "id" TEXT NOT NULL,
    "projectSlug" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "status" TEXT NOT NULL DEFAULT 'open',
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ForumPost_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ForumReply" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "parentId" TEXT,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ForumReply_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CalendarEvent" (
    "id" TEXT NOT NULL,
    "projectSlug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "type" TEXT NOT NULL DEFAULT 'custom',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TaskEstimate" (
    "id" TEXT NOT NULL,
    "kanbanCardId" TEXT NOT NULL,
    "aiHours" DOUBLE PRECISION NOT NULL,
    "aiConfidence" TEXT NOT NULL,
    "aiReasoning" TEXT NOT NULL,
    "manualHours" DOUBLE PRECISION,
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskEstimate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TimeLog" (
    "id" TEXT NOT NULL,
    "kanbanCardId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "loggedHours" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimeLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TokenLedger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectSlug" TEXT NOT NULL,
    "kanbanCardId" TEXT,
    "tokens" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenLedger_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ForumPost_projectSlug_idx" ON "ForumPost"("projectSlug");
CREATE INDEX "ForumReply_postId_idx" ON "ForumReply"("postId");
CREATE INDEX "CalendarEvent_projectSlug_startsAt_idx" ON "CalendarEvent"("projectSlug", "startsAt");
CREATE UNIQUE INDEX "TaskEstimate_kanbanCardId_key" ON "TaskEstimate"("kanbanCardId");
CREATE INDEX "TimeLog_kanbanCardId_idx" ON "TimeLog"("kanbanCardId");
CREATE INDEX "TimeLog_userId_idx" ON "TimeLog"("userId");
CREATE INDEX "TokenLedger_userId_idx" ON "TokenLedger"("userId");
CREATE INDEX "TokenLedger_projectSlug_idx" ON "TokenLedger"("projectSlug");

ALTER TABLE "ForumPost" ADD CONSTRAINT "ForumPost_projectSlug_fkey" FOREIGN KEY ("projectSlug") REFERENCES "Project"("slug") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ForumPost" ADD CONSTRAINT "ForumPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ForumReply" ADD CONSTRAINT "ForumReply_postId_fkey" FOREIGN KEY ("postId") REFERENCES "ForumPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ForumReply" ADD CONSTRAINT "ForumReply_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ForumReply"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "ForumReply" ADD CONSTRAINT "ForumReply_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_projectSlug_fkey" FOREIGN KEY ("projectSlug") REFERENCES "Project"("slug") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TaskEstimate" ADD CONSTRAINT "TaskEstimate_kanbanCardId_fkey" FOREIGN KEY ("kanbanCardId") REFERENCES "KanbanCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TimeLog" ADD CONSTRAINT "TimeLog_kanbanCardId_fkey" FOREIGN KEY ("kanbanCardId") REFERENCES "KanbanCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TimeLog" ADD CONSTRAINT "TimeLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimeLog" ADD CONSTRAINT "TimeLog_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TokenLedger" ADD CONSTRAINT "TokenLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TokenLedger" ADD CONSTRAINT "TokenLedger_projectSlug_fkey" FOREIGN KEY ("projectSlug") REFERENCES "Project"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TokenLedger" ADD CONSTRAINT "TokenLedger_kanbanCardId_fkey" FOREIGN KEY ("kanbanCardId") REFERENCES "KanbanCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;
