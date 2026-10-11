import { stepHref } from "../lib/phaseProgress";

describe("stepHref", () => {
  it("sends every Idé step to the Idé phase page, never its old standalone page", () => {
    expect(stepHref("p", "IDEA", { key: "lean_canvas_created", href: "lean-canvas" })).toBe("/projects/p/ide?step=lean_canvas_created");
    expect(stepHref("p", "IDEA", { key: "dream_defined" })).toBe("/projects/p/ide?step=dream_defined");
    // SPRINT is merged into Idé
    expect(stepHref("p", "SPRINT", { key: "market_scan_partners", href: "market-scan" })).toBe("/projects/p/ide?step=market_scan_partners");
  });

  it("sends every Uppstart step to its step on the Uppstart page (#320)", () => {
    expect(stepHref("p", "PILOT", { key: "mvp_tested" })).toBe("/projects/p/uppstart?step=mvp_tested");
  });

  it("keeps a later phase's own page, or its phase page", () => {
    expect(stepHref("p", "PRODUCTION", { key: "launch_marketing_plan_created", href: "launch-plan" })).toBe("/projects/p/launch-plan");
    expect(stepHref("p", "ESTABLISH", { key: "x" })).toBe("/projects/p/etablera");
  });
});
