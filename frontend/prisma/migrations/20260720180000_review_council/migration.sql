-- Granskningsrådet (PRD 5.53-5.55): GT-weighted platform-wide elections,
-- an elected council, and the exclusion-case workflow. Purely additive —
-- no existing tables touched.

-- CreateTable
CREATE TABLE "PlatformPoll" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'council_election',
    "status" TEXT NOT NULL DEFAULT 'open',
    "seatCount" INTEGER,
    "termMonths" INTEGER,
    "deadline" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformPoll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformPollOption" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "candidateId" TEXT,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PlatformPollOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformPollVote" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "pollOptionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gtWeight" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformPollVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewCouncilMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "termStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "termEnd" TIMESTAMP(3) NOT NULL,
    "electedViaPollId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewCouncilMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExclusionCase" (
    "id" TEXT NOT NULL,
    "reportedUserId" TEXT NOT NULL,
    "reportedById" TEXT NOT NULL,
    "projectId" TEXT,
    "reason" TEXT NOT NULL,
    "responseText" TEXT,
    "respondedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'open',
    "proposedDecision" TEXT,
    "decision" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decisionReasoning" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExclusionCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExclusionCaseVote" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "councilMemberId" TEXT NOT NULL,
    "vote" TEXT NOT NULL,
    "reasoning" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExclusionCaseVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlatformPollVote_pollId_userId_idx" ON "PlatformPollVote"("pollId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformPollVote_pollId_pollOptionId_userId_key" ON "PlatformPollVote"("pollId", "pollOptionId", "userId");

-- CreateIndex
CREATE INDEX "ReviewCouncilMember_userId_idx" ON "ReviewCouncilMember"("userId");

-- CreateIndex
CREATE INDEX "ExclusionCase_reportedUserId_idx" ON "ExclusionCase"("reportedUserId");

-- CreateIndex
CREATE INDEX "ExclusionCase_projectId_idx" ON "ExclusionCase"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ExclusionCaseVote_caseId_councilMemberId_key" ON "ExclusionCaseVote"("caseId", "councilMemberId");

-- AddForeignKey
ALTER TABLE "PlatformPoll" ADD CONSTRAINT "PlatformPoll_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformPollOption" ADD CONSTRAINT "PlatformPollOption_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "PlatformPoll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformPollOption" ADD CONSTRAINT "PlatformPollOption_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformPollVote" ADD CONSTRAINT "PlatformPollVote_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "PlatformPoll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformPollVote" ADD CONSTRAINT "PlatformPollVote_pollOptionId_fkey" FOREIGN KEY ("pollOptionId") REFERENCES "PlatformPollOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformPollVote" ADD CONSTRAINT "PlatformPollVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewCouncilMember" ADD CONSTRAINT "ReviewCouncilMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExclusionCase" ADD CONSTRAINT "ExclusionCase_reportedUserId_fkey" FOREIGN KEY ("reportedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExclusionCase" ADD CONSTRAINT "ExclusionCase_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExclusionCase" ADD CONSTRAINT "ExclusionCase_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExclusionCaseVote" ADD CONSTRAINT "ExclusionCaseVote_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ExclusionCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExclusionCaseVote" ADD CONSTRAINT "ExclusionCaseVote_councilMemberId_fkey" FOREIGN KEY ("councilMemberId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
