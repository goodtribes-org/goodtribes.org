import { composeHypothesis, evidenceSummary, parseHypothesis, uppstartStepsDone } from "../lib/mvp";
import { draftText } from "../lib/aiLanguage";

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

describe("the hypothesis in three parts (#320)", () => {
  const sv = draftText("sv");
  const en = draftText("en");
  it("writes the sentence in the project's language and reads it back", () => {
    const text = composeHypothesis({ who: "äldre i Hässelby", what: "gå en fast promenad", sign: "tre av fem vill fortsätta." }, sv);
    expect(text).toBe("Vi tror att äldre i Hässelby vill gå en fast promenad, och vi vet det när tre av fem vill fortsätta.");
    expect(parseHypothesis(text, sv)).toEqual({ who: "äldre i Hässelby", what: "gå en fast promenad", sign: "tre av fem vill fortsätta" });
    const eng = composeHypothesis({ who: "parents", what: "to borrow a boat", sign: "five families book" }, en);
    expect(parseHypothesis(eng, en)).toEqual({ who: "parents", what: "to borrow a boat", sign: "five families book" });
  });
  it("a freely written sentence isn't forced into parts", () => {
    expect(parseHypothesis("Folk behöver båtar.", sv)).toBeNull();
    expect(parseHypothesis(null, sv)).toBeNull();
  });
  it("nothing written is nothing stored", () => {
    expect(composeHypothesis({ who: " ", what: "", sign: "" }, sv)).toBe("");
  });
});
