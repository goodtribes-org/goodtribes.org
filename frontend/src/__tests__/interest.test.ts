import { asksForInterest, groupByPlace, normalizePlace } from "../lib/interest";

describe("where people want it to start (#332)", () => {
  it("tidies a place", () => {
    expect(normalizePlace("  göteborg   centrum ")).toBe("Göteborg centrum");
    expect(normalizePlace("   ")).toBe("");
  });

  it("groups places case-insensitively, most wanted first, and counts helpers", () => {
    expect(
      groupByPlace([
        { place: "Göteborg", wantsToHelp: false },
        { place: "göteborg ", wantsToHelp: true },
        { place: "Malmö", wantsToHelp: false },
        { place: " ", wantsToHelp: true },
        { place: "Umeå", wantsToHelp: true },
        { place: "umeå", wantsToHelp: false },
      ]),
    ).toEqual([
      { place: "Göteborg", count: 2, helpers: 1 },
      { place: "Umeå", count: 2, helpers: 1 },
      { place: "Malmö", count: 1, helpers: 0 },
    ]);
  });

  it("is asked on published projects that are open for others or growing", () => {
    const published = new Date();
    expect(asksForInterest({ publishedAt: published, openForReplication: true, phase: "PILOT" })).toBe(true);
    expect(asksForInterest({ publishedAt: published, openForReplication: false, phase: "SCALE" })).toBe(true);
    expect(asksForInterest({ publishedAt: published, openForReplication: false, phase: "PRODUCTION" })).toBe(false);
    expect(asksForInterest({ publishedAt: null, openForReplication: true, phase: "SCALE" })).toBe(false);
  });
});
