-- Field provenance ("vet/antar", who wrote it, sources) for project fields
-- (see prisma/schema/ai.prisma's FieldProvenance and
-- src/lib/fieldProvenance.ts). Additive only: two new enums and one new
-- table. No existing data is modified; fields without a row count as
-- human-written.

-- CreateEnum
CREATE TYPE "FieldKnowledgeStatus" AS ENUM ('VET', 'ANTAR');

-- CreateEnum
CREATE TYPE "FieldAuthor" AS ENUM ('USER', 'AI', 'AI_EDITED');

-- CreateTable
CREATE TABLE "FieldProvenance" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "status" "FieldKnowledgeStatus" NOT NULL DEFAULT 'ANTAR',
    "author" "FieldAuthor" NOT NULL,
    "sources" JSONB,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FieldProvenance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FieldProvenance_projectId_entity_field_key" ON "FieldProvenance"("projectId", "entity", "field");

-- AddForeignKey
ALTER TABLE "FieldProvenance" ADD CONSTRAINT "FieldProvenance_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

