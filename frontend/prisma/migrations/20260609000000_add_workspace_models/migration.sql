-- CreateTable
CREATE TABLE "WorkspaceMessage" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceTask" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "WorkspaceTask_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "WorkspaceMessage" ADD CONSTRAINT "WorkspaceMessage_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMessage" ADD CONSTRAINT "WorkspaceMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceTask" ADD CONSTRAINT "WorkspaceTask_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceTask" ADD CONSTRAINT "WorkspaceTask_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
