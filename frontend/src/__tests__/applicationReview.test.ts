import { canReviewFor, completenessFindings, needsGoodTribesReview, reviewLeadDays, suggestEntity, type CheckInput } from "@/lib/fundingCalls/review";

const DAY = 86_400_000;
const now = Date.UTC(2026, 9, 12);

describe("which GoodTribes entity applies", () => {
  const entities = [
    { id: "stiftelsen", kind: "FOUNDATION" as const, status: "EXISTS" as const, applicantTypes: ["NONPROFIT" as const] },
    { id: "ab", kind: "LIMITED_COMPANY" as const, status: "EXISTS" as const, applicantTypes: ["COMPANY" as const, "NONPROFIT" as const] },
    { id: "planerat", kind: "LIMITED_COMPANY" as const, status: "PLANNED" as const, applicantTypes: ["COMPANY" as const] },
    { id: "partner", kind: "PARTNER" as const, status: "EXISTS" as const, applicantTypes: ["UNIVERSITY" as const] },
  ];
  it("prefers a subsidiary over the foundation where both fit", () => {
    expect(suggestEntity(["NONPROFIT"], entities)).toBe("ab");
    expect(suggestEntity(["NONPROFIT"], entities.filter((e) => e.id !== "ab"))).toBe("stiftelsen");
  });
  it("never suggests a planned entity or a partner", () => {
    expect(suggestEntity(["COMPANY"], entities.filter((e) => e.id !== "ab"))).toBeNull();
    expect(suggestEntity(["UNIVERSITY"], entities)).toBeNull();
  });
  it("a partner applying itself needs no GoodTribes review", () => {
    expect(needsGoodTribesReview({ kind: "PARTNER" })).toBe(false);
    expect(needsGoodTribesReview({ kind: "FOUNDATION" })).toBe(true);
    expect(needsGoodTribesReview(null)).toBe(false);
  });
});

describe("the completeness check", () => {
  const ok: CheckInput = {
    requirements: ["Budget", "Projektplan"], requirementsDone: ["Budget", "Projektplan"],
    amountRequestedSek: 400000, amountMinSek: null, amountMaxSek: 500000,
    cofunding: "Krävs ej", cofundingNote: null, deadline: new Date(now + 30 * DAY), entityChosen: true, now, leadDays: 7,
  };
  it("passes a complete application", () => {
    expect(completenessFindings(ok)).toEqual([]);
  });
  it("lists what's missing, one line each", () => {
    const f = completenessFindings({ ...ok, requirementsDone: ["Budget"], amountRequestedSek: 600000, entityChosen: false });
    expect(f).toEqual(["Välj vilken GoodTribes-enhet som ska stå som sökande", "Saknas i ansökan: Projektplan", "Ni söker mer än utlysningens högsta belopp (500000 kr)"]);
  });
  it("won't let an entity that isn't formed yet apply", () => {
    expect(completenessFindings({ ...ok, entityNotFormed: true })).toEqual(["Den valda enheten är inte bildad än och kan inte stå som sökande"]);
  });
  it("asks how co-funding is arranged only when the call requires it", () => {
    expect(completenessFindings({ ...ok, cofunding: "Minst 25 %" })).toEqual(["Utlysningen kräver medfinansiering: skriv hur den ordnas"]);
    expect(completenessFindings({ ...ok, cofunding: "Minst 25 %", cofundingNote: "Egen tid" })).toEqual([]);
  });
  it("stops what can't be reviewed in time", () => {
    expect(completenessFindings({ ...ok, deadline: new Date(now + 5 * DAY) })[0]).toMatch(/minst 7 dagar/);
  });
  it("the lead time can be configured", () => {
    process.env.FUNDING_REVIEW_LEAD_DAYS = "10";
    expect(reviewLeadDays()).toBe(10);
    delete process.env.FUNDING_REVIEW_LEAD_DAYS;
    expect(reviewLeadDays()).toBe(7);
  });
});

describe("who may decide", () => {
  it("the entity's reviewers, or any site admin when none are named", () => {
    expect(canReviewFor(["u1"], "u1", false)).toBe(true);
    expect(canReviewFor(["u1"], "u2", true)).toBe(false);
    expect(canReviewFor([], "u2", true)).toBe(true);
    expect(canReviewFor([], "u3", false)).toBe(false);
  });
});
