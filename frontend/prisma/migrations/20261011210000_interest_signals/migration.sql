-- "Jag vill att det här startar där jag bor" (#332). Additive only.
CREATE TABLE "InterestSignal" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "place" TEXT NOT NULL,
    "wantsToHelp" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT,
    "contact" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InterestSignal_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "InterestSignal_projectId_idx" ON "InterestSignal"("projectId");
ALTER TABLE "InterestSignal" ADD CONSTRAINT "InterestSignal_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
