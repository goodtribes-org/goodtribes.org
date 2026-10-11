import { isAnswer, parsePulseValue, pulseDue, snoozeUntil, type PulseRow } from "@/lib/impactPulse";

const DAY = 24 * 60 * 60 * 1000;
const now = Date.UTC(2026, 9, 11, 12);
const ago = (days: number) => new Date(now - days * DAY);
const answer = (days: number, over: Partial<PulseRow> = {}): PulseRow => ({ note: "Det gick bra", imageUrl: null, impactUpdateId: null, snoozedUntil: null, createdAt: ago(days), ...over });
const snooze = (daysAgo: number, until: Date): PulseRow => ({ note: null, imageUrl: null, impactUpdateId: null, snoozedUntil: until, createdAt: ago(daysAgo) });

describe("Impactpuls", () => {
  it("starts in Lansering and never before", () => {
    expect(pulseDue("IDEA", [], now)).toBe(false);
    expect(pulseDue("PILOT", [], now)).toBe(false);
    for (const phase of ["PRODUCTION", "ESTABLISH", "SCALE", "IMPACT"] as const) expect(pulseDue(phase, [], now)).toBe(true);
  });

  it("asks once a month: not again until 30 days after the last answer", () => {
    expect(pulseDue("PRODUCTION", [answer(3)], now)).toBe(false);
    expect(pulseDue("PRODUCTION", [answer(29)], now)).toBe(false);
    expect(pulseDue("PRODUCTION", [answer(30)], now)).toBe(true);
    expect(pulseDue("PRODUCTION", [answer(45), answer(5)], now)).toBe(false);
  });

  it("a photo or a figure alone is an answer; a snooze row is not", () => {
    expect(isAnswer({ note: null, imageUrl: "/storage/a.jpg", impactUpdateId: null })).toBe(true);
    expect(isAnswer({ note: null, imageUrl: null, impactUpdateId: "u1" })).toBe(true);
    expect(isAnswer({ note: "  ", imageUrl: null, impactUpdateId: null })).toBe(false);
    expect(pulseDue("SCALE", [answer(2, { note: null, imageUrl: "/storage/a.jpg" })], now)).toBe(false);
  });

  it("can be put off a week, and comes back after", () => {
    expect(pulseDue("PRODUCTION", [snooze(1, snoozeUntil(now - DAY))], now)).toBe(false);
    expect(pulseDue("PRODUCTION", [snooze(8, new Date(now - DAY))], now)).toBe(true);
    expect(snoozeUntil(now).getTime() - now).toBe(7 * DAY);
  });

  it("reads a figure the way people write it", () => {
    expect(parsePulseValue("")).toBeNull();
    expect(parsePulseValue("12,5")).toBe(12.5);
    expect(parsePulseValue("1 200")).toBe(1200);
    expect(parsePulseValue("tolv")).toBeNaN();
  });
});
