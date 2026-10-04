import { stepHref } from "../lib/phaseProgress";

describe("stepHref", () => {
  it("sends every Idé step to the Idé phase page, never its old standalone page", () => {
    expect(stepHref("p", "IDEA", { key: "lean_canvas_created", href: "lean-canvas" })).toBe("/projects/p/ide?step=lean_canvas_created");
    expect(stepHref("p", "IDEA", { key: "dream_defined" })).toBe("/projects/p/ide?step=dream_defined");
    // SPRINT is merged into Idé
    expect(stepHref("p", "SPRINT", { key: "market_scan_partners", href: "market-scan" })).toBe("/projects/p/ide?step=market_scan_partners");
  });

  it("keeps a later phase's own page, or its guide", () => {
    expect(stepHref("p", "PILOT", { key: "core_team_formed", href: "members" })).toBe("/projects/p/members");
    expect(stepHref("p", "PILOT", { key: "x" })).toBe("/projects/p/guide/pilot?step=x");
  });
});
