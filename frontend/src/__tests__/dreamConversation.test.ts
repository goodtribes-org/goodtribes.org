import { isDreamComplete, mergeDreamState, parseDreamState, parseOpenQuestions } from "../lib/dreamConversation";
import { dreamProgressNote } from "../lib/prompts/dreamConversation";

describe("parseDreamState", () => {
  it("keeps only known areas, in canonical order, without duplicates", () => {
    const s = parseDreamState({ covered: ["idea", "nonsense", "dream", "idea", 3], notes: { dream: " En värld ", bogus: "x", idea: "" } });
    expect(s.covered).toEqual(["dream", "idea"]);
    expect(s.notes).toEqual({ dream: "En värld" });
  });

  it("tolerates garbage", () => {
    expect(parseDreamState(null)).toEqual({ covered: [], notes: {} });
    expect(parseDreamState("x")).toEqual({ covered: [], notes: {} });
  });
});

describe("mergeDreamState", () => {
  it("never loses a covered area or a note the model forgot this turn", () => {
    const prev = { covered: ["dream", "problem"] as const, notes: { dream: "A", problem: "B" } };
    const update = { covered: ["idea"] as const, notes: { idea: "C", problem: "B2" } };
    expect(mergeDreamState({ ...prev, covered: [...prev.covered] }, { ...update, covered: [...update.covered] })).toEqual({
      covered: ["dream", "problem", "idea"],
      notes: { dream: "A", problem: "B2", idea: "C" },
    });
  });
});

describe("isDreamComplete", () => {
  it("needs all six areas", () => {
    expect(isDreamComplete({ covered: ["dream", "problem", "why_you", "idea", "people"], notes: {} })).toBe(false);
    expect(isDreamComplete({ covered: ["dream", "problem", "why_you", "idea", "people", "conditions"], notes: {} })).toBe(true);
  });
});

describe("parseOpenQuestions", () => {
  it("dedupes, trims and caps", () => {
    expect(parseOpenQuestions([" Vem betalar? ", "Vem betalar?", "", 5])).toEqual(["Vem betalar?"]);
    expect(parseOpenQuestions(Array.from({ length: 30 }, (_, i) => `q${i}`))).toHaveLength(20);
    expect(parseOpenQuestions(null)).toEqual([]);
  });
});

describe("dreamProgressNote", () => {
  it("tells the model to wrap up after ~15 questions", () => {
    const base = { covered: [], notes: {}, openQuestions: [] };
    expect(dreamProgressNote({ ...base, aiQuestionCount: 5 })).not.toMatch(/avsluta samtalet/);
    expect(dreamProgressNote({ ...base, aiQuestionCount: 15 })).toMatch(/avsluta samtalet/);
  });
});

describe("done — the coach closing the conversation", () => {
  it("counts as complete even if not every area is covered, and is never lost", () => {
    const partial = parseDreamState({ covered: ["dream", "idea"], done: true });
    expect(partial.done).toBe(true);
    expect(isDreamComplete(partial)).toBe(true);
    const merged = mergeDreamState(partial, parseDreamState({ covered: ["people"] }));
    expect(merged.done).toBe(true);
    expect(isDreamComplete(parseDreamState({ covered: ["dream"], done: "yes" }))).toBe(false);
  });
});
