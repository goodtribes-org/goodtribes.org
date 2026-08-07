-- AlterTable
ALTER TABLE "File" ADD COLUMN     "messageId" TEXT;

-- CreateIndex
CREATE INDEX "File_messageId_idx" ON "File"("messageId");

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
