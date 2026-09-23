-- AI fill of the Idé phase after Drömsamtalet: progress per section on the
-- conversation, and a marker on market-scan entries found by the AI's web
-- search. Additive only: one nullable column and one defaulted column.

-- AlterTable
ALTER TABLE "DreamConversation" ADD COLUMN     "fillStatus" JSONB;

-- AlterTable
ALTER TABLE "MarketScanEntry" ADD COLUMN     "createdByAi" BOOLEAN NOT NULL DEFAULT false;

