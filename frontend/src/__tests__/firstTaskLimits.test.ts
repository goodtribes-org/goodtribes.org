import { accountAgeDays, isNewAccount, newAccountCapReached, NEW_ACCOUNT_MAX_OPEN } from "../lib/firstTaskLimits";

const now = new Date("2026-12-03T19:00:00Z");
const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

describe("new-account cap (#294)", () => {
  it("treats accounts younger than 7 days as new", () => {
    expect(isNewAccount(daysAgo(0), now)).toBe(true);
    expect(isNewAccount(daysAgo(6.9), now)).toBe(true);
    expect(isNewAccount(daysAgo(7), now)).toBe(false);
  });
  it("caps a new account at three open first tasks", () => {
    expect(NEW_ACCOUNT_MAX_OPEN).toBe(3);
    expect(newAccountCapReached(daysAgo(6), 2, now)).toBe(false);
    expect(newAccountCapReached(daysAgo(6), 3, now)).toBe(true);
  });
  it("never caps an older account", () => {
    expect(newAccountCapReached(daysAgo(8), 10, now)).toBe(false);
  });
  it("counts the account's age in whole days", () => {
    expect(accountAgeDays(daysAgo(0.5), now)).toBe(0);
    expect(accountAgeDays(daysAgo(3.2), now)).toBe(3);
  });
});
