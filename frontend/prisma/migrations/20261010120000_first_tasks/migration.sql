-- Första uppgifter (#277): KanbanCard fields for a task written for someone
-- from outside, and TaskOffer for sign-ups the project's leads choose among.
-- Additive only: new enums, nullable/defaulted columns and a new table.
CREATE TYPE "FirstTaskTime" AS ENUM ('MIN15', 'HOUR1', 'HOURS2_4', 'RECURRING');

-- CreateEnum
CREATE TYPE "TaskOfferStatus" AS ENUM ('PENDING', 'CHOSEN', 'DECLINED', 'WITHDRAWN');

-- AlterTable
ALTER TABLE "KanbanCard" ADD COLUMN     "firstTaskChoose" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "firstTaskMaxOffers" INTEGER,
ADD COLUMN     "firstTaskPlace" TEXT,
ADD COLUMN     "firstTaskQuestion" TEXT,
ADD COLUMN     "firstTaskTime" "FirstTaskTime",
ADD COLUMN     "firstTaskWhy" TEXT;

-- CreateTable
CREATE TABLE "TaskOffer" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "answer" TEXT,
    "message" TEXT,
    "status" "TaskOfferStatus" NOT NULL DEFAULT 'PENDING',
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskOffer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskOffer_cardId_status_idx" ON "TaskOffer"("cardId", "status");

-- CreateIndex
CREATE INDEX "TaskOffer_userId_idx" ON "TaskOffer"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskOffer_cardId_userId_key" ON "TaskOffer"("cardId", "userId");

-- AddForeignKey
ALTER TABLE "TaskOffer" ADD CONSTRAINT "TaskOffer_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "KanbanCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskOffer" ADD CONSTRAINT "TaskOffer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

