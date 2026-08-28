import { computeCardPayees, CREATOR_BONUS_TOKENS, APPROVER_BONUS_TOKENS } from "../lib/payoutMath";

// Pure money/token payout math shared between server-side minting (tokens.ts)
// and the client-side payout preview/edit dialog. computeCardPayees is the
// only function this module exports besides the two bonus constants.
describe("payoutMath", () => {
  describe("constants", () => {
    it("exposes the documented bonus token amounts", () => {
      expect(CREATOR_BONUS_TOKENS).toBe(5);
      expect(APPROVER_BONUS_TOKENS).toBe(5);
    });
  });

  describe("computeCardPayees", () => {
    it("pays the assignee the full token value when there are no subtasks", () => {
      const result = computeCardPayees({ tokenValue: 30, subtasks: [], assigneeId: "user-1" });
      expect(result).toEqual([{ userId: "user-1", tokens: 30 }]);
    });

    it("returns an empty array when there are no subtasks and no assignee", () => {
      const result = computeCardPayees({ tokenValue: 30, subtasks: [], assigneeId: null });
      expect(result).toEqual([]);
    });

    it("splits the token pool evenly across a single completer's subtasks", () => {
      const result = computeCardPayees({
        tokenValue: 30,
        subtasks: [{ completedById: "user-1" }, { completedById: "user-1" }, { completedById: "user-1" }],
        assigneeId: "user-2",
      });
      // All 3 subtasks attributed to user-1 -> user-1 gets the full pool,
      // the assignee (user-2) gets nothing since attribution takes priority.
      expect(result).toEqual([{ userId: "user-1", tokens: 30 }]);
    });

    it("splits the token pool weighted by how many subtasks each person completed", () => {
      const result = computeCardPayees({
        tokenValue: 30,
        subtasks: [
          { completedById: "user-1" },
          { completedById: "user-1" },
          { completedById: "user-2" },
        ],
        assigneeId: null,
      });
      expect(result).toHaveLength(2);
      const byUser = Object.fromEntries(result.map((r) => [r.userId, r.tokens]));
      expect(byUser["user-1"]).toBe(20); // 2/3 of 30
      expect(byUser["user-2"]).toBe(10); // 1/3 of 30
    });

    it("falls back to the assignee when subtasks exist but none are attributed", () => {
      const result = computeCardPayees({
        tokenValue: 30,
        subtasks: [{ completedById: null }, { completedById: null }],
        assigneeId: "user-3",
      });
      expect(result).toEqual([{ userId: "user-3", tokens: 30 }]);
    });

    it("ignores unattributed subtasks and still splits by only the attributed ones", () => {
      const result = computeCardPayees({
        tokenValue: 40,
        subtasks: [{ completedById: "user-1" }, { completedById: null }, { completedById: "user-2" }],
        assigneeId: "user-3",
      });
      expect(result).toHaveLength(2);
      const byUser = Object.fromEntries(result.map((r) => [r.userId, r.tokens]));
      expect(byUser["user-1"]).toBe(20);
      expect(byUser["user-2"]).toBe(20);
      expect(byUser["user-3"]).toBeUndefined();
    });

    it("returns an empty array when there are unattributed subtasks and no assignee", () => {
      const result = computeCardPayees({
        tokenValue: 20,
        subtasks: [{ completedById: null }],
        assigneeId: null,
      });
      expect(result).toEqual([]);
    });

    it("handles a zero token value (splits/pays zero, still returns payees)", () => {
      expect(
        computeCardPayees({ tokenValue: 0, subtasks: [], assigneeId: "user-1" })
      ).toEqual([{ userId: "user-1", tokens: 0 }]);
      expect(
        computeCardPayees({
          tokenValue: 0,
          subtasks: [{ completedById: "user-1" }, { completedById: "user-2" }],
          assigneeId: null,
        })
      ).toEqual([
        { userId: "user-1", tokens: 0 },
        { userId: "user-2", tokens: 0 },
      ]);
    });

    // Investigated as a possible money-adjacent bug, concluded no fix
    // needed -- documenting the reasoning here rather than silently
    // leaving this as an unexplained gap:
    //   - TokenLedger.tokens and GtLedger.tokens are both `Float` in
    //     schema.prisma (Postgres `double precision`), so a raw fractional
    //     quotient like 10/3 persists exactly as-is -- no truncation, no
    //     write-time error, nothing to guard against at the storage layer.
    //   - The *total* payout for a card is mathematically conserved
    //     regardless of how unevenly it splits: summing
    //     (tokenValue * count / attributed.length) over every payee always
    //     equals tokenValue exactly, since the counts sum to
    //     attributed.length. Only the per-person share carries a repeating
    //     fraction, not the aggregate the ledger is meant to reconcile.
    //   - Display already rounds independently of this function:
    //     TokenPayoutDialog.tsx's formatTokens does
    //     `Math.round(tokens * 10) / 10`, and WorkplaceTokensTab.tsx
    //     formats to 0 or 1 decimal place depending on whether the value
    //     is a whole number. A user never sees a long raw float.
    //   - This is a gamification token system, not audited legal-tender
    //     currency (contrast with ProfitDistributionProposal's real SEK
    //     amounts) -- sub-cent-equivalent float drift has no accounting
    //     reconciliation depending on it.
    // Net: rounding here would just move the rounding point earlier for no
    // behavioral benefit, and would make computeCardPayees lossy for any
    // caller that might legitimately want the exact share. Left as pure,
    // unrounded division on purpose.
    it("does not round an uneven split — returns the raw fractional token amount", () => {
      const result = computeCardPayees({
        tokenValue: 10,
        subtasks: [{ completedById: "a" }, { completedById: "b" }, { completedById: "c" }],
        assigneeId: null,
      });
      const byUser = Object.fromEntries(result.map((r) => [r.userId, r.tokens]));
      expect(byUser["a"]).toBeCloseTo(10 / 3);
      expect(byUser["b"]).toBeCloseTo(10 / 3);
      expect(byUser["c"]).toBeCloseTo(10 / 3);
      // Confirm it's genuinely not a whole number, i.e. not silently rounded.
      expect(Number.isInteger(byUser["a"])).toBe(false);
    });

    // Investigated as a possible money-adjacent bug, concluded no fix
    // needed: a negative tokenValue is genuinely unreachable from any real
    // call site, not just untested. Every caller of computeCardPayees
    // (kanbanMove.ts's mintCardCompletion path, TokenPayoutDialog.tsx's
    // preview, and site-admin/token-backfill/actions.ts's admin backfill
    // tool) derives tokenValue from either a KanbanCard's
    // `lockedTokenValue` or `getPriorityTokenValue(priority)`
    // (priorityTokens.ts) -- and every single write site for
    // `lockedTokenValue` across the codebase sets it from
    // `getPriorityTokenValue(...)` too (grepped every occurrence). That
    // function returns one of a fixed table of positive values
    // (10/20/30/40/50) or falls back to 20 for an unrecognized priority --
    // there is no code path that ever produces a negative or arbitrary
    // tokenValue. This test documents the function's actual behavior
    // (pure passthrough, no guard) so it stays correct if that changes,
    // not because the missing guard is considered a live risk today.
    it("passes a negative tokenValue straight through with no validation", () => {
      const result = computeCardPayees({ tokenValue: -10, subtasks: [], assigneeId: "user-1" });
      expect(result).toEqual([{ userId: "user-1", tokens: -10 }]);
    });

    it("preserves Map insertion order (first-attributed-completer first) in the returned array", () => {
      const result = computeCardPayees({
        tokenValue: 30,
        subtasks: [
          { completedById: "user-2" },
          { completedById: "user-1" },
          { completedById: "user-2" },
        ],
        assigneeId: null,
      });
      expect(result.map((r) => r.userId)).toEqual(["user-2", "user-1"]);
    });
  });
});
