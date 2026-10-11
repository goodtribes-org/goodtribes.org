import { canConfirm, confirmationExpiry, confirmationState, hashConfirmationToken, isWellFormedToken, newConfirmationToken } from "@/lib/impactConfirmation";
import { impactStepsDone, trustLevel } from "@/lib/impactStory";

const DAY = 24 * 60 * 60 * 1000;
const now = Date.UTC(2026, 9, 12, 9);

describe("Partnerbekräftelse", () => {
  it("makes a random, well-formed token and stores only its hash", () => {
    const a = newConfirmationToken();
    const b = newConfirmationToken();
    expect(a.token).not.toBe(b.token);
    expect(isWellFormedToken(a.token)).toBe(true);
    expect(a.tokenHash).toBe(hashConfirmationToken(a.token));
    expect(a.tokenHash).not.toContain(a.token);
    expect(isWellFormedToken("../../etc")).toBe(false);
    expect(isWellFormedToken("")).toBe(false);
  });

  it("works for 30 days, once, until taken back", () => {
    const fresh = { confirmedAt: null, revokedAt: null, expiresAt: confirmationExpiry(now) };
    expect(confirmationExpiry(now).getTime() - now).toBe(30 * DAY);
    expect(canConfirm(fresh, now)).toBe(true);
    expect(confirmationState(fresh, now + 31 * DAY)).toBe("expired");
    expect(confirmationState({ ...fresh, revokedAt: new Date(now) }, now)).toBe("revoked");
    expect(confirmationState({ ...fresh, confirmedAt: new Date(now) }, now)).toBe("confirmed");
    expect(canConfirm({ ...fresh, confirmedAt: new Date(now) }, now)).toBe(false);
    // A confirmation given stays given, even after the link would have expired.
    expect(confirmationState({ ...fresh, confirmedAt: new Date(now) }, now + 60 * DAY)).toBe("confirmed");
  });

  it("a confirmed partner is rung 3 on the trust ladder", () => {
    const base = { followup: { story: "Vi gjorde det" }, deliveredReports: 0, verifiedDeliveredReports: 0 };
    expect(trustLevel(base)).toBe(1);
    expect(trustLevel({ ...base, partnerConfirmations: 1 })).toBe(3);
    expect(trustLevel({ ...base, partnerConfirmations: 1, verifiedDeliveredReports: 1 })).toBe(4);
    expect(impactStepsDone({ ...base, partnerConfirmations: 1 }).impact_externally_verified).toBe(true);
  });
});
