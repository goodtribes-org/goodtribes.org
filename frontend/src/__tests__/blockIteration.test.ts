import { buildIterationContent, cleanAnswers, ITERATION_MODEL, modeNeedsContent, parseQuestions, parseSuggestion } from "../lib/blockIteration";

const source = "Projekt: Läxhjälp i Rinkeby\nFÄLTET I FOKUS — Kundsegment:\nFöräldrar i Rinkeby";

describe("blockIteration", () => {
  it("uses Haiku for the short modes and Sonnet only for writing from answers", () => {
    expect(ITERATION_MODEL.sharpen).toMatch(/haiku/);
    expect(ITERATION_MODEL.ask).toMatch(/haiku/);
    expect(ITERATION_MODEL.fromAnswers).toMatch(/sonnet/);
  });

  it("only 'ask' works on an empty field", () => {
    expect(modeNeedsContent("ask")).toBe(false);
    expect(modeNeedsContent("fromAnswers")).toBe(false);
    expect(modeNeedsContent("sharpen")).toBe(true);
    expect(modeNeedsContent("challenge")).toBe(true);
  });

  it("keeps a suggestion whose names all appear in the source", () => {
    expect(parseSuggestion({ text: " Föräldrar i Rinkeby med barn i åk 4–6 ", note: "Skärpte målgruppen", names: ["Rinkeby"] }, source)).toEqual({
      text: "Föräldrar i Rinkeby med barn i åk 4–6",
      note: "Skärpte målgruppen",
    });
  });

  it("drops a suggestion that invents a name", () => {
    expect(parseSuggestion({ text: "Samarbete med Rädda Barnen", names: ["Rädda Barnen"] }, source)).toBeNull();
  });

  it("drops empty suggestions and tolerates a missing note", () => {
    expect(parseSuggestion({ text: "  ", names: [] }, source)).toBeNull();
    expect(parseSuggestion({ text: "Föräldrar", names: [] }, source)).toEqual({ text: "Föräldrar", note: null });
    expect(parseSuggestion(null, source)).toBeNull();
  });

  it("returns at most three non-empty questions, and none if a name is invented", () => {
    expect(parseQuestions({ questions: ["A?", " ", "B?", "C?", "D?"], names: [] }, source)).toEqual(["A?", "B?", "C?"]);
    expect(parseQuestions({ questions: ["Har ni pratat med Stockholms stad?"], names: ["Stockholms stad"] }, source)).toEqual([]);
  });

  it("cleans answers: drops blanks and junk, trims, caps count and length", () => {
    const long = "x".repeat(2000);
    const out = cleanAnswers([{ question: "Vem?", answer: " Föräldrar " }, { question: "Var?", answer: "  " }, { nope: 1 }, { question: "Hur?", answer: long }, { question: "4?", answer: "a" }, { question: "5?", answer: "b" }]);
    expect(out.map((a) => a.question)).toEqual(["Vem?", "Hur?", "4?"]);
    expect(out[0].answer).toBe("Föräldrar");
    expect(out[1].answer).toHaveLength(1000);
    expect(cleanAnswers("nope")).toEqual([]);
  });

  it("builds context with the field in focus, other fields and answers", () => {
    const c = buildIterationContent({
      projectTitle: "Läxhjälp",
      projectSummary: null,
      otherFields: [{ label: "Lösning", value: "Volontärer hjälper" }],
      fieldLabel: "Kundsegment",
      fieldValue: null,
      answers: [{ question: "Vem?", answer: "Föräldrar" }],
    });
    expect(c).toContain("- Lösning: Volontärer hjälper");
    expect(c).toContain("FÄLTET I FOKUS — Kundsegment:\n(tomt)");
    expect(c).toContain("F: Vem?\nS: Föräldrar");
    expect(c).not.toContain("Beskrivning:");
  });
});
