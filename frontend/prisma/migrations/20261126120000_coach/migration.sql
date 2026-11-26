-- Coachen (#367): a personal coach first in the conversation panel.
-- Additive only: two enums, one column on User (default CALM), two new tables.

-- CreateEnum
CREATE TYPE "CoachLevel" AS ENUM ('OFF', 'CALM', 'DIRECT', 'PUSHY');

-- CreateEnum
CREATE TYPE "CoachRole" AS ENUM ('COACH', 'USER');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "coachLevel" "CoachLevel" NOT NULL DEFAULT 'CALM';

-- CreateTable
CREATE TABLE "CoachMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "CoachRole" NOT NULL,
    "body" TEXT NOT NULL,
    "quickReplies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "draft" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoachMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachPromise" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3),
    "doneAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoachPromise_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CoachMessage_userId_createdAt_idx" ON "CoachMessage"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "CoachPromise_userId_doneAt_idx" ON "CoachPromise"("userId", "doneAt");

-- AddForeignKey
ALTER TABLE "CoachMessage" ADD CONSTRAINT "CoachMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachPromise" ADD CONSTRAINT "CoachPromise_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

