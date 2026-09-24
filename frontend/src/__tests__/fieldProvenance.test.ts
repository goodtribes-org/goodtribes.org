const findMany = jest.fn();
const upsert = jest.fn((args: unknown) => args);
const transaction = jest.fn((ops: unknown[]) => Promise.resolve(ops));

jest.mock("../lib/prisma", () => ({
  prisma: {
    fieldProvenance: { findMany: (...a: unknown[]) => findMany(...a), upsert: (a: unknown) => upsert(a) },
    $transaction: (ops: unknown[]) => transaction(ops),
  },
}));

import { canAiWrite, isProvenanceField, provenanceAfterHumanEdit, recordHumanEdits } from "../lib/fieldProvenance";

describe("canAiWrite — AI never overwrites a human", () => {
  it("AI may fill an empty field", () => {
    expect(canAiWrite(null, null)).toBe(true);
    expect(canAiWrite("   ", { author: "USER", status: "ANTAR" })).toBe(true);
    expect(canAiWrite([], null)).toBe(true);
  });

  it("AI may replace its own untouched draft", () => {
    expect(canAiWrite("utkast", { author: "AI", status: "ANTAR" })).toBe(true);
  });

  it("AI may not touch human text, an edited AI draft, or text from before tracking", () => {
    expect(canAiWrite("mitt eget", { author: "USER", status: "VET" })).toBe(false);
    expect(canAiWrite("redigerat utkast", { author: "AI_EDITED", status: "ANTAR" })).toBe(false);
    expect(canAiWrite("gammal text", null)).toBe(false);
    expect(canAiWrite([3, 11], undefined)).toBe(false);
  });
});

describe("provenanceAfterHumanEdit", () => {
  it("editing an AI draft makes it AI_EDITED and keeps vet/antar", () => {
    expect(provenanceAfterHumanEdit({ author: "AI", status: "VET" })).toEqual({ author: "AI_EDITED", status: "VET" });
    expect(provenanceAfterHumanEdit({ author: "AI_EDITED", status: "ANTAR" })).toEqual({ author: "AI_EDITED", status: "ANTAR" });
  });

  it("a human-written field stays USER; a new one starts as ANTAR", () => {
    expect(provenanceAfterHumanEdit({ author: "USER", status: "VET" })).toEqual({ author: "USER", status: "VET" });
    expect(provenanceAfterHumanEdit(null)).toEqual({ author: "USER", status: "ANTAR" });
  });
});

describe("recordHumanEdits", () => {
  beforeEach(() => {
    findMany.mockReset();
    upsert.mockClear();
    transaction.mockClear();
  });

  it("only records fields whose value actually changed", async () => {
    findMany.mockResolvedValue([{ field: "summary", author: "AI", status: "ANTAR" }]);
    await recordHumanEdits(
      "p1",
      "project",
      { title: "Samma", summary: "AI-text", description: null, tags: ["a"] },
      { title: "Samma", summary: "Min text", description: "", tags: ["a"] },
      "u1",
    );
    // title unchanged, description empty→empty, tags unchanged: only summary.
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId_entity_field: { projectId: "p1", entity: "project", field: "summary" } },
        update: { author: "AI_EDITED", updatedById: "u1" },
      }),
    );
  });

  it("does nothing (no queries) when nothing changed", async () => {
    await recordHumanEdits("p1", "leanCanvas", { purpose: "x" }, { purpose: " x " }, "u1");
    expect(findMany).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
  });

  it("ignores keys that aren't tracked fields", async () => {
    findMany.mockResolvedValue([]);
    await recordHumanEdits("p1", "project", {}, { imageUrl: "https://x", slogan: "ny" } as never, "u1");
    expect(upsert).not.toHaveBeenCalled();
  });

  it("a new human field is recorded as USER / ANTAR", async () => {
    findMany.mockResolvedValue([]);
    await recordHumanEdits("p1", "valueProposition", { vpPains: null }, { vpPains: "Det gör ont" }, "u1");
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ author: "USER", status: "ANTAR", updatedById: "u1" }) }),
    );
  });
});

describe("isProvenanceField", () => {
  it("knows each entity's fields", () => {
    expect(isProvenanceField("leanCanvas", "purpose")).toBe(true);
    // Legacy Lean Canvas blocks are read-only now, so no longer tracked.
    expect(isProvenanceField("leanCanvas", "problem")).toBe(false);
    expect(isProvenanceField("valueProposition", "vpGains")).toBe(true);
    expect(isProvenanceField("impactModel", "shortTermOutcomes")).toBe(true);
    expect(isProvenanceField("impactModel", "impact")).toBe(false);
    expect(isProvenanceField("project", "description")).toBe(true);
    expect(isProvenanceField("project", "problem")).toBe(false);
    expect(isProvenanceField("constructor", "x")).toBe(false);
  });
});
