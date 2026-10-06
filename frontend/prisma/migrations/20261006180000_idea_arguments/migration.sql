-- #236: "Vad talar för och emot?" on ideas. Additive only, from
-- `prisma migrate diff --from-schema <main> --to-schema`: two new tables
-- and an enum, nothing existing changes.

-- CreateEnum
CREATE TYPE "IdeaArgumentSide" AS ENUM ('PRO', 'CON');

-- CreateTable
CREATE TABLE "IdeaArgument" (
    "id" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "side" "IdeaArgumentSide" NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hiddenAt" TIMESTAMP(3),
    "hiddenById" TEXT,
    "hiddenReason" "ContentHideReason",

    CONSTRAINT "IdeaArgument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdeaArgumentHelpful" (
    "id" TEXT NOT NULL,
    "argumentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdeaArgumentHelpful_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IdeaArgument_ideaId_idx" ON "IdeaArgument"("ideaId");

-- CreateIndex
CREATE UNIQUE INDEX "IdeaArgumentHelpful_argumentId_userId_key" ON "IdeaArgumentHelpful"("argumentId", "userId");

-- AddForeignKey
ALTER TABLE "IdeaArgument" ADD CONSTRAINT "IdeaArgument_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "Idea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdeaArgument" ADD CONSTRAINT "IdeaArgument_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdeaArgumentHelpful" ADD CONSTRAINT "IdeaArgumentHelpful_argumentId_fkey" FOREIGN KEY ("argumentId") REFERENCES "IdeaArgument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdeaArgumentHelpful" ADD CONSTRAINT "IdeaArgumentHelpful_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

