-- Optional caller-supplied dedup key on TokenLedger, so the awardTokens
-- chokepoint itself can refuse a second award for the same real-world event
-- (e.g. a replayed Stripe webhook) instead of relying on whatever unique
-- constraint the caller's own transaction happens to have. Nullable+unique:
-- Postgres allows multiple NULLs, so existing callers that pass no key are
-- unaffected. See src/lib/tokens.ts's awardTokens.
ALTER TABLE "TokenLedger" ADD COLUMN "idempotencyKey" TEXT;

CREATE UNIQUE INDEX "TokenLedger_idempotencyKey_key" ON "TokenLedger"("idempotencyKey");
