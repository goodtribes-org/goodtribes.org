-- Uppstart (#320): test whether anyone wants it — the smallest version and
-- the tests of it. Additive only: two enums, nullable ProjectPlan columns and
-- a new MvpTest table.


-- CreateEnum
CREATE TYPE "MvpType" AS ENUM ('MANUAL', 'EVENT', 'PROTOTYPE', 'SIGNUP', 'OTHER');

-- CreateEnum
CREATE TYPE "MvpSignal" AS ENUM ('LIKED', 'CONTINUE', 'HELPING', 'PAID');

-- AlterTable
ALTER TABLE "ProjectPlan" ADD COLUMN     "hypothesis" TEXT,
ADD COLUMN     "learnings" TEXT,
ADD COLUMN     "mvpDescription" TEXT,
ADD COLUMN     "mvpType" "MvpType",
ADD COLUMN     "pilotBudget" TEXT,
ADD COLUMN     "pilotDuration" TEXT,
ADD COLUMN     "pilotTeam" TEXT,
ADD COLUMN     "pilotWhere" TEXT,
ADD COLUMN     "pilotWho" TEXT;

-- CreateTable
CREATE TABLE "MvpTest" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "who" TEXT NOT NULL,
    "happened" TEXT,
    "signal" "MvpSignal" NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MvpTest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MvpTest_projectId_idx" ON "MvpTest"("projectId");

-- AddForeignKey
ALTER TABLE "MvpTest" ADD CONSTRAINT "MvpTest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MvpTest" ADD CONSTRAINT "MvpTest_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
