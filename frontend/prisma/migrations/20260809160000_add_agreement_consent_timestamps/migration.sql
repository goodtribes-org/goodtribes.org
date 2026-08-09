-- AlterTable: additive, nullable — no backfill risk.
ALTER TABLE "User" ADD COLUMN "acceptedParticipantAgreementAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "acceptedCodeOfConductAt" TIMESTAMP(3);
