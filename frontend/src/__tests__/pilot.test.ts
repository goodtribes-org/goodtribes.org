import { lanseringStepsDone, outcomeCounts, parseCriteria, resultsFor, withResult } from "../lib/pilot";

describe("success criteria as a list (#327)", () => {
  it("one per line, bullets and the AI's note dropped", () => {
    expect(parseCriteria("- Minst 10 familjer bokar\n• Hälften kommer tillbaka\n2) Någon betalar\n\n(Förslag från AI:n — justera nivåerna.)")).toEqual([
      "Minst 10 familjer bokar",
      "Hälften kommer tillbaka",
      "Någon betalar",
    ]);
    expect(parseCriteria(null)).toEqual([]);
  });

  it("results follow the criterion text, not its position", () => {
    const stored = [{ criterion: "hälften kommer  tillbaka", outcome: "MET", metricId: "m1" }, { criterion: "Borttaget", outcome: "NOT_MET" }];
    const results = resultsFor(["Minst 10 familjer bokar", "Hälften kommer tillbaka"], stored);
    expect(results[0]).toEqual({ criterion: "Minst 10 familjer bokar", metricId: null, outcome: null, note: null });
    expect(results[1]).toMatchObject({ outcome: "MET", metricId: "m1" });
  });

  it("changing one result keeps the others, also for criteria no longer listed", () => {
    const next = withResult([{ criterion: "A", outcome: "MET" }, { criterion: "Gammalt", outcome: "PARTLY" }], "B", { outcome: "NOT_MET", note: "Bara 3" });
    expect(next.map((r) => r.criterion)).toEqual(["A", "Gammalt", "B"]);
    expect(withResult(next, "a", { note: "Alla 12" })[0]).toMatchObject({ criterion: "A", outcome: "MET", note: "Alla 12" });
  });

  it("counts outcomes and what's still unassessed", () => {
    expect(outcomeCounts([{ criterion: "A", outcome: "MET" }, { criterion: "B", outcome: "PARTLY" }, { criterion: "C" }])).toEqual({
      total: 3, assessed: 2, MET: 1, PARTLY: 1, NOT_MET: 0,
    });
  });
});

describe("Lansering steps (#327)", () => {
  const evaluation = { successCriteria: "- A\n- B", startedAt: new Date("2026-05-01"), executionNotes: "2026-05-02: x\n2026-05-09: y\n2026-05-16: z", criteriaResults: [{ criterion: "A", outcome: "MET" }, { criterion: "B", outcome: "NOT_MET" }] };
  it("each step follows its own data", () => {
    expect(lanseringStepsDone({ evaluation, launch: { targetAudience: "Fler skolor", howToReach: "Föräldrabrev" } })).toEqual({
      pilot_success_criteria: true,
      pilot_executed_documented: true,
      pilot_results_collected: true,
      launch_marketing_plan_created: true,
    });
  });
  it("starting needs criteria and a date, results need every criterion judged", () => {
    const steps = lanseringStepsDone({ evaluation: { ...evaluation, startedAt: null, criteriaResults: [{ criterion: "A", outcome: "MET" }] }, launch: { targetAudience: "x", howToReach: " " } });
    expect(steps).toMatchObject({ pilot_success_criteria: false, pilot_results_collected: false, launch_marketing_plan_created: false });
    expect(lanseringStepsDone({ evaluation: null, launch: null }).pilot_results_collected).toBe(false);
  });
});
