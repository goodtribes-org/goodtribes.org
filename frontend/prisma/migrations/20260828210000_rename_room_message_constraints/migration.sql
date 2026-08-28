-- Purely cosmetic cleanup: 20260713160000_unify_chat_rooms renamed the
-- Conversation/ConversationParticipant/DirectMessage tables (and the
-- conversationId/senderId columns) to Room/RoomParticipant/Message via
-- `ALTER TABLE ... RENAME TO` / `RENAME COLUMN`, but Postgres does not
-- rename a table's constraints or indexes along with it -- those keep
-- their original Conversation*/DirectMessage* names unless explicitly
-- renamed too, which that migration never did. Every already-migrated
-- database (dev, production) has been carrying these stale constraint/
-- index names since 2026-07-13 with zero functional impact (Postgres
-- enforces a constraint identically regardless of what it's named) --
-- discovered only because it makes `prisma migrate diff` against a
-- fresh database report drift that doesn't actually affect behavior.
--
-- Fixed here purely so migration history and schema.prisma agree by
-- name, which is what tooling (this diff, any future shadow-database
-- work) expects. RENAME CONSTRAINT / RENAME INDEX are fast, in-place
-- metadata-only operations -- no table rewrite, no data touched, no
-- lock beyond a brief ACCESS EXCLUSIVE while the catalog entry updates.

-- Primary keys
ALTER TABLE "Room" RENAME CONSTRAINT "Conversation_pkey" TO "Room_pkey";
ALTER TABLE "RoomParticipant" RENAME CONSTRAINT "ConversationParticipant_pkey" TO "RoomParticipant_pkey";
ALTER TABLE "Message" RENAME CONSTRAINT "DirectMessage_pkey" TO "Message_pkey";

-- Foreign keys
ALTER TABLE "RoomParticipant" RENAME CONSTRAINT "ConversationParticipant_conversationId_fkey" TO "RoomParticipant_roomId_fkey";
ALTER TABLE "RoomParticipant" RENAME CONSTRAINT "ConversationParticipant_userId_fkey" TO "RoomParticipant_userId_fkey";
ALTER TABLE "Message" RENAME CONSTRAINT "DirectMessage_conversationId_fkey" TO "Message_roomId_fkey";
ALTER TABLE "Message" RENAME CONSTRAINT "DirectMessage_senderId_fkey" TO "Message_authorId_fkey";

-- Indexes
ALTER INDEX "Conversation_pairKey_key" RENAME TO "Room_pairKey_key";
ALTER INDEX "Conversation_lastMessageAt_idx" RENAME TO "Room_lastMessageAt_idx";
ALTER INDEX "ConversationParticipant_conversationId_userId_key" RENAME TO "RoomParticipant_roomId_userId_key";
ALTER INDEX "ConversationParticipant_userId_idx" RENAME TO "RoomParticipant_userId_idx";
ALTER INDEX "DirectMessage_conversationId_createdAt_idx" RENAME TO "Message_roomId_createdAt_idx";
