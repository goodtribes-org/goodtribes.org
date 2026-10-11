import { evidenceSummary, uppstartStepsDone } from "../lib/mvp";

describe("Uppstart steps (#320)", () => {
  it("nothing is done for an empty plan", () => {
    expect(uppstartStepsDone(null, 0, null)).toEqual({ mvp_hypothesis: false, mvp_built: false, mvp_tested: false, pilot_planned: false });
  });
  it("each step follows its own data", () => {
    const plan = { hypothesis: "Vi tror att …", mvpType: "MANUAL" as const, mvpDescription: "Vi gör det för hand för tre familjer.", pilotWhere: "Gottsunda", pilotWho: "20 familjer", pilotDuration: "6 veckor" };
    expect(uppstartStepsDone(plan, 3, "- Minst 10 familjer kommer tillbaka")).toEqual({ mvp_hypothesis: true, mvp_built: true, mvp_tested: true, pilot_planned: true });
    expect(uppstartStepsDone({ ...plan, mvpDescription: " " }, 2, null)).toMatchObject({ mvp_built: false, mvp_tested: false, pilot_planned: false });
  });
  it("a pilot plan needs success criteria", () => {
    const plan = { pilotWhere: "Gottsunda", pilotWho: "20 familjer", pilotDuration: "6 veckor" };
    expect(uppstartStepsDone(plan, 0, "").pilot_planned).toBe(false);
  });
});

describe("how strong the evidence is (#320)", () => {
  it("anyone paying is strong", () => {
    expect(evidenceSummary(["LIKED", "PAID"]).strength).toBe("strong");
  });
  it("wanting to go on or helping is some", () => {
    expect(evidenceSummary(["LIKED", "CONTINUE"]).strength).toBe("some");
    expect(evidenceSummary(["HELPING"]).strength).toBe("some");
  });
  it("only opinions is weak, and no tests is none", () => {
    expect(evidenceSummary(["LIKED", "LIKED"]).strength).toBe("weak");
    expect(evidenceSummary([]).strength).toBe("none");
  });
  it("counts each signal", () => {
    expect(evidenceSummary(["LIKED", "PAID", "PAID"]).counts).toEqual({ LIKED: 1, CONTINUE: 0, HELPING: 0, PAID: 2 });
  });
});
