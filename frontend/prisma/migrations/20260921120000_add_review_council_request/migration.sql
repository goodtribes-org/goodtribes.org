-- CreateEnum
CREATE TYPE "ReviewCouncilRequestStatus" AS ENUM ('pending', 'in_review', 'completed', 'declined');

-- CreateTable
CREATE TABLE "ReviewCouncilRequest" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "note" TEXT,
    "status" "ReviewCouncilRequestStatus" NOT NULL DEFAULT 'pending',
    "assignedCouncilMemberId" TEXT,
    "outcomeNote" TEXT,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewCouncilRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReviewCouncilRequest_projectId_idx" ON "ReviewCouncilRequest"("projectId");

-- CreateIndex
CREATE INDEX "ReviewCouncilRequest_status_idx" ON "ReviewCouncilRequest"("status");

-- AddForeignKey
ALTER TABLE "ReviewCouncilRequest" ADD CONSTRAINT "ReviewCouncilRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewCouncilRequest" ADD CONSTRAINT "ReviewCouncilRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewCouncilRequest" ADD CONSTRAINT "ReviewCouncilRequest_assignedCouncilMemberId_fkey" FOREIGN KEY ("assignedCouncilMemberId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewCouncilRequest" ADD CONSTRAINT "ReviewCouncilRequest_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

