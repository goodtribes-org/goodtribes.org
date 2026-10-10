import { checkProposal, parseRevisionField, wordDiff } from "../lib/projectRevisions";

describe("parseRevisionField", () => {
  it("accepts the project texts and canvas fields", () => {
    expect(parseRevisionField("project.summary")).toEqual({ entity: "project", key: "summary" });
    expect(parseRevisionField("project.description")).toEqual({ entity: "project", key: "description" });
    expect(parseRevisionField("leanCanvas.purpose")).toEqual({ entity: "leanCanvas", key: "purpose" });
  });
  it("rejects anything else", () => {
    for (const f of ["project.title", "leanCanvas.problem", "leanCanvas", "user.name", "project.summary.x"]) {
      expect(parseRevisionField(f)).toBeNull();
    }
  });
});

describe("checkProposal", () => {
  const summary = { entity: "project", key: "summary" } as const;
  const description = { entity: "project", key: "description" } as const;
  const canvas = { entity: "leanCanvas", key: "purpose" } as const;

  it("trims and accepts a real change", () => {
    expect(checkProposal(summary, "  Ny text  ", "Gammal text")).toEqual({ ok: true, value: "Ny text" });
  });
  it("refuses empty, unchanged and too long", () => {
    expect(checkProposal(summary, "   ", null)).toEqual({ ok: false, error: "empty" });
    expect(checkProposal(summary, "Samma", "Samma ")).toEqual({ ok: false, error: "unchanged" });
    expect(checkProposal(summary, "x".repeat(501), null)).toEqual({ ok: false, error: "too_long" });
    expect(checkProposal(canvas, "x".repeat(2001), null)).toEqual({ ok: false, error: "too_long" });
  });
  it("sanitizes the description and compares it as text", () => {
    const res = checkProposal(description, '<p>Hej<script>alert(1)</script></p>', null);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value).not.toContain("script");
    expect(checkProposal(description, "<p>Samma text</p>", "<p>Samma  text</p>")).toEqual({ ok: false, error: "unchanged" });
    expect(checkProposal(description, "<p></p>", "<p>x</p>")).toEqual({ ok: false, error: "empty" });
  });
});

describe("wordDiff", () => {
  const show = (parts: ReturnType<typeof wordDiff>) => parts.map((p) => (p.type === "same" ? p.text : p.type === "add" ? `[+${p.text}]` : `[-${p.text}]`)).join("");
  it("marks added and removed words", () => {
    expect(show(wordDiff("Vi går promenader varje vecka", "Vi går långa promenader varje dag"))).toBe("Vi går [+långa ]promenader varje [-vecka][+dag]");
  });
  it("handles empty sides", () => {
    expect(wordDiff("", "Ny text")).toEqual([{ type: "add", text: "Ny text" }]);
    expect(wordDiff("Gammal", "")).toEqual([{ type: "del", text: "Gammal" }]);
  });
});
