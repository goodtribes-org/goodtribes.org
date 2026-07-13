-- CreateEnum
CREATE TYPE "RoomType" AS ENUM ('DM', 'GROUP', 'PROJECT_CHANNEL', 'ORG_CHANNEL');

-- CreateEnum
CREATE TYPE "RoomPostingPolicy" AS ENUM ('ALL_MEMBERS', 'LEADS_ONLY');

-- CreateEnum
CREATE TYPE "RoomParticipantRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- Conversation -> Room
ALTER TABLE "Conversation" RENAME TO "Room";
ALTER TABLE "Room" ADD COLUMN "type" "RoomType" NOT NULL DEFAULT 'DM';
ALTER TABLE "Room" ADD COLUMN "name" TEXT;
ALTER TABLE "Room" ADD COLUMN "description" TEXT;
ALTER TABLE "Room" ADD COLUMN "projectId" TEXT;
ALTER TABLE "Room" ADD COLUMN "organisationId" TEXT;
ALTER TABLE "Room" ADD COLUMN "postingPolicy" "RoomPostingPolicy" NOT NULL DEFAULT 'ALL_MEMBERS';
ALTER TABLE "Room" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Room" ADD COLUMN "pinned" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Room_projectId_idx" ON "Room"("projectId");
CREATE INDEX "Room_organisationId_idx" ON "Room"("organisationId");
CREATE UNIQUE INDEX "Room_projectId_name_key" ON "Room"("projectId", "name");
CREATE UNIQUE INDEX "Room_organisationId_name_key" ON "Room"("organisationId", "name");

ALTER TABLE "Room" ADD CONSTRAINT "Room_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Room" ADD CONSTRAINT "Room_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ConversationParticipant -> RoomParticipant
ALTER TABLE "ConversationParticipant" RENAME TO "RoomParticipant";
ALTER TABLE "RoomParticipant" RENAME COLUMN "conversationId" TO "roomId";
ALTER TABLE "RoomParticipant" ADD COLUMN "role" "RoomParticipantRole" NOT NULL DEFAULT 'MEMBER';

-- DirectMessage -> Message
ALTER TABLE "DirectMessage" RENAME TO "Message";
ALTER TABLE "Message" RENAME COLUMN "conversationId" TO "roomId";
ALTER TABLE "Message" RENAME COLUMN "senderId" TO "authorId";
ALTER TABLE "Message" ADD COLUMN "threadParentId" TEXT;
ALTER TABLE "Message" ADD COLUMN "updatedAt" TIMESTAMP(3);
UPDATE "Message" SET "updatedAt" = "createdAt";
ALTER TABLE "Message" ALTER COLUMN "updatedAt" SET NOT NULL;

CREATE INDEX "Message_threadParentId_idx" ON "Message"("threadParentId");
ALTER TABLE "Message" ADD CONSTRAINT "Message_threadParentId_fkey" FOREIGN KEY ("threadParentId") REFERENCES "Message"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- CreateTable
CREATE TABLE "MessageReaction" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageReaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MessageReaction_messageId_userId_emoji_key" ON "MessageReaction"("messageId", "userId", "emoji");

ALTER TABLE "MessageReaction" ADD CONSTRAINT "MessageReaction_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessageReaction" ADD CONSTRAINT "MessageReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: Channel -> PROJECT_CHANNEL Room (id reused: FeedLike/FeedComment store loose
-- targetId references to ChannelMessage.id with no FK, so ids must survive unchanged)
INSERT INTO "Room" ("id", "type", "name", "description", "projectId", "postingPolicy", "order", "pinned", "createdAt", "lastMessageAt")
SELECT "id", 'PROJECT_CHANNEL', "name", "description", "projectId",
       CASE "type" WHEN 'announcement' THEN 'LEADS_ONLY'::"RoomPostingPolicy" ELSE 'ALL_MEMBERS'::"RoomPostingPolicy" END,
       "order", "pinned", "createdAt", "createdAt"
FROM "Channel";

-- Backfill: ChannelMessage -> Message (id reused, threadParentId self-references stay valid)
INSERT INTO "Message" ("id", "roomId", "authorId", "body", "threadParentId", "createdAt", "updatedAt")
SELECT "id", "channelId", "authorId", "body", "threadParentId", "createdAt", "updatedAt"
FROM "ChannelMessage";

-- Backfill: ChannelMessageReaction -> MessageReaction (id reused, nothing external references it)
INSERT INTO "MessageReaction" ("id", "messageId", "userId", "emoji", "createdAt")
SELECT "id", "messageId", "userId", "emoji", "createdAt"
FROM "ChannelMessageReaction";

-- Backfill: RoomParticipant for project channels from ProjectMember. lastReadAt copies the
-- existing ChannelReadMarker if present, else epoch (NOT now()) -- the current channel page
-- already treats "no marker" as "everything unread", so defaulting to now() here would
-- silently mark history read for anyone who never opened a channel.
INSERT INTO "RoomParticipant" ("id", "roomId", "userId", "role", "lastReadAt", "createdAt")
SELECT gen_random_uuid()::text, c."id", pm."userId", 'MEMBER'::"RoomParticipantRole",
       COALESCE(crm."lastReadAt", TIMESTAMP '1970-01-01 00:00:00'),
       pm."joinedAt"
FROM "Channel" c
JOIN "ProjectMember" pm ON pm."projectId" = c."projectId"
LEFT JOIN "ChannelReadMarker" crm ON crm."channelId" = c."id" AND crm."userId" = pm."userId";

-- Backfill: one ORG_CHANNEL Room per Organisation (fresh, deterministic id -- nothing
-- references WorkspaceMessage/Organisation ids as loose targets, so no id-reuse benefit)
INSERT INTO "Room" ("id", "type", "name", "organisationId", "postingPolicy", "order", "pinned", "createdAt", "lastMessageAt")
SELECT 'orgroom_' || o."id", 'ORG_CHANNEL', NULL, o."id", 'ALL_MEMBERS'::"RoomPostingPolicy", 0, false, o."createdAt", o."createdAt"
FROM "Organisation" o;

-- Backfill: WorkspaceMessage -> Message on the new org room (id reused, harmless)
INSERT INTO "Message" ("id", "roomId", "authorId", "body", "createdAt", "updatedAt")
SELECT wm."id", 'orgroom_' || wm."organisationId", wm."authorId", wm."content", wm."createdAt", wm."createdAt"
FROM "WorkspaceMessage" wm;

-- Backfill: RoomParticipant for org rooms from OrganisationMember. Arbetsrum never had a
-- read/unread concept at all, so per the confirmed product decision every backfilled
-- participant starts at epoch (everything unread), not now().
INSERT INTO "RoomParticipant" ("id", "roomId", "userId", "role", "lastReadAt", "createdAt")
SELECT gen_random_uuid()::text, 'orgroom_' || om."organisationId", om."userId", 'MEMBER'::"RoomParticipantRole",
       TIMESTAMP '1970-01-01 00:00:00', om."joinedAt"
FROM "OrganisationMember" om;

-- Backfill: the org owner may not have an OrganisationMember row (see work/[slug]/actions.ts's
-- "!member && org?.ownerId !== userId" check) -- make sure they still get room access.
INSERT INTO "RoomParticipant" ("id", "roomId", "userId", "role", "lastReadAt", "createdAt")
SELECT gen_random_uuid()::text, 'orgroom_' || o."id", o."ownerId", 'MEMBER'::"RoomParticipantRole",
       TIMESTAMP '1970-01-01 00:00:00', o."createdAt"
FROM "Organisation" o
WHERE NOT EXISTS (
  SELECT 1 FROM "OrganisationMember" om WHERE om."organisationId" = o."id" AND om."userId" = o."ownerId"
);

-- Recompute lastMessageAt from actual message history now that channel/org messages exist
UPDATE "Room" r SET "lastMessageAt" = COALESCE(
  (SELECT MAX(m."createdAt") FROM "Message" m WHERE m."roomId" = r."id"),
  r."createdAt"
);

-- Drop the backfill-only default now that every row has an explicit type
ALTER TABLE "Room" ALTER COLUMN "type" DROP DEFAULT;

-- Drop old chat tables (children before parents to satisfy FK dependency order)
DROP TABLE "ChannelMessageReaction";
DROP TABLE "ChannelReadMarker";
DROP TABLE "ChannelMessage";
DROP TABLE "Channel";
DROP TABLE "WorkspaceMessage";
