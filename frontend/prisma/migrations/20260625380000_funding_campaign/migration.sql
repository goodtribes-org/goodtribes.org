CREATE TABLE "FundingCampaign" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "goal" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'SEK',
  "status" TEXT NOT NULL DEFAULT 'active',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FundingCampaign_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FundingCampaign_projectId_key" ON "FundingCampaign"("projectId");

CREATE TABLE "FundingPledge" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "message" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FundingPledge_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FundingPledge_campaignId_userId_key" ON "FundingPledge"("campaignId", "userId");

ALTER TABLE "FundingCampaign" ADD CONSTRAINT "FundingCampaign_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FundingPledge" ADD CONSTRAINT "FundingPledge_campaignId_fkey"
  FOREIGN KEY ("campaignId") REFERENCES "FundingCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FundingPledge" ADD CONSTRAINT "FundingPledge_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
