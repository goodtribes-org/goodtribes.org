jest.mock("../lib/prisma", () => ({ prisma: {} }));
jest.mock("../lib/aiMode", () => ({ getAiClientFor: jest.fn() }));
jest.mock("../lib/aiParticipant", () => ({ getAiParticipantUser: jest.fn() }));

import { coerceHypothesisDraft, coerceMvpOptions, coerceTestScript, coerceTestSummary, DRAFT_STEPS } from "../lib/uppstartDrafts";

describe("AI help per Uppstart step (#322)", () => {
  it("has a draft for each of the four steps", () => {
    expect(DRAFT_STEPS).toEqual(["mvp_hypothesis", "mvp_built", "mvp_tested", "pilot_planned"]);
  });

  it("keeps the hypothesis parts trimmed", () => {
    expect(coerceHypothesisDraft({ who: " äldre ", what: "promenera", sign: "de kommer tillbaka", why: "Allt hänger på det." })).toEqual({
      who: "äldre", what: "promenera", sign: "de kommer tillbaka", why: "Allt hänger på det.",
    });
  });

  it("keeps two or three complete options and maps an unknown type to OTHER", () => {
    const options = coerceMvpOptions({
      options: [
        { type: "MANUAL", title: "Gör det för hand", description: "Tre familjer en lördag.", needs: "En båt" },
        { type: "APP", title: "En app", description: "Bygg en app." },
        { type: "EVENT", title: "", description: "Saknar rubrik" },
        { type: "SIGNUP", title: "Anmälan", description: "En lapp på skolan." },
        { type: "EVENT", title: "Träff", description: "En träff." },
      ],
    });
    expect(options.map((o) => o.type)).toEqual(["MANUAL", "OTHER", "SIGNUP"]);
    expect(coerceMvpOptions(null)).toEqual([]);
  });

  it("caps the script and the summary", () => {
    const script = coerceTestScript({ who_to_ask: ["a", "b", "c", "d", "e"], opening: " Hej ", questions: Array(9).fill("Hur gör du i dag?"), ask: "Vill du betala?" });
    expect(script.whoToAsk).toHaveLength(4);
    expect(script.questions).toHaveLength(6);
    expect(script.opening).toBe("Hej");
    const summary = coerceTestSummary({ patterns: ["x", "", "y"], strongest: "En betalade.", missing: ["z", "w", "v", "u"], next: "Be fler betala." });
    expect(summary.patterns).toEqual(["x", "y"]);
    expect(summary.missing).toHaveLength(3);
  });
});
