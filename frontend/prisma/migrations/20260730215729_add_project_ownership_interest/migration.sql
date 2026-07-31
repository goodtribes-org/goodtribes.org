-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "abandonedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ProjectOwnershipInterest" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectOwnershipInterest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectOwnershipInterest_projectId_idx" ON "ProjectOwnershipInterest"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectOwnershipInterest_projectId_userId_key" ON "ProjectOwnershipInterest"("projectId", "userId");

-- AddForeignKey
ALTER TABLE "ProjectOwnershipInterest" ADD CONSTRAINT "ProjectOwnershipInterest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectOwnershipInterest" ADD CONSTRAINT "ProjectOwnershipInterest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
