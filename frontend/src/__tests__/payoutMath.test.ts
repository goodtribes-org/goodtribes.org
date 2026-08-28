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

    // Documented current behavior, not a fix: division doesn't always land
    // on a whole number (e.g. 3-way split of a 10-token pool), and the
    // function performs no rounding at all — it returns the raw floating
    // point quotient. Whatever calls this (token minting on the server,
    // the preview dialog on the client) is responsible for any rounding
    // before persisting/displaying it.
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

    // Documented current behavior, not a fix: a negative tokenValue is not
    // rejected or clamped — it flows straight through into the payout
    // amounts. Nothing in this pure function guards against a caller
    // passing a bad value.
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
