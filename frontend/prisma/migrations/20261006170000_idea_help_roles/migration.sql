-- #235: "Jag vill hjälpa till" says with what. Additive only, from
-- `prisma migrate diff --from-schema <main> --to-schema`. Existing
-- endorsements get an empty list (a helper who hasn't said with what).

-- CreateEnum
CREATE TYPE "IdeaHelpRole" AS ENUM ('CODE', 'DESIGN', 'COMMUNICATION', 'FUNDRAISING', 'CONTACTS', 'LOCAL_KNOWLEDGE', 'PRACTICAL');

-- AlterTable
ALTER TABLE "IdeaEndorsement" ADD COLUMN     "roles" "IdeaHelpRole"[] DEFAULT ARRAY[]::"IdeaHelpRole"[];
