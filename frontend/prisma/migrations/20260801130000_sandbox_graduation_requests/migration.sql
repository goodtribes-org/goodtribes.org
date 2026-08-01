-- CreateTable
CREATE TABLE "SandboxGraduationRequest" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requestedById" TEXT NOT NULL,
    "decisionNote" TEXT,
    "executedById" TEXT,
    "executedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SandboxGraduationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SandboxGraduationRequest_projectId_idx" ON "SandboxGraduationRequest"("projectId");

-- AddForeignKey
ALTER TABLE "SandboxGraduationRequest" ADD CONSTRAINT "SandboxGraduationRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SandboxGraduationRequest" ADD CONSTRAINT "SandboxGraduationRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SandboxGraduationRequest" ADD CONSTRAINT "SandboxGraduationRequest_executedById_fkey" FOREIGN KEY ("executedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
