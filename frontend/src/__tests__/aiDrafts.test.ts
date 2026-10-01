jest.mock("../lib/prisma", () => ({ prisma: {} }));
import { countAiDrafts } from "../lib/aiDrafts";

describe("countAiDrafts", () => {
  it("counts filled fields, and among them those still authored by AI", () => {
    const rows = {
      project: { title: "Läxhjälp", summary: "  ", tags: ["skola"], sdgGoals: [] },
      leanCanvas: { purpose: "Alla barn ska klara skolan", solution: "Volontärer", impact: "" },
      valueProposition: null,
    };
    const authors = {
      "project.title": "USER" as const,
      "project.tags": "AI" as const,
      "leanCanvas.purpose": "AI" as const,
      "leanCanvas.solution": "AI_EDITED" as const,
      // An AI row for an empty field isn't a draft to review.
      "leanCanvas.impact": "AI" as const,
    };
    // Filled: title, tags, purpose, solution = 4. Drafts: tags, purpose = 2.
    expect(countAiDrafts(rows, authors)).toEqual({ drafts: 2, filled: 4 });
  });

  it("a field with no provenance row counts as human-written", () => {
    expect(countAiDrafts({ leanCanvas: { purpose: "x" } }, {})).toEqual({ drafts: 0, filled: 1 });
  });
});
