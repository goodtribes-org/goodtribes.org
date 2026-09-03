import {
  PROJECT_PHASES,
  PROJECT_PHASE_LABEL,
  PROJECT_PHASE_COLOR,
  DISPLAY_PHASES,
  toDisplayPhase,
  isValidProjectPhase,
  getNextPhase,
  getChecklistForPhase,
  INITIATIVE_CHECKLIST_ITEMS,
} from "../lib/projectPhase";

// Per CLAUDE.md: IDEA and SPRINT are merged into a single visible "Idé" step
// everywhere. The 7-value enum itself (PROJECT_PHASES) is untouched, but
// DISPLAY_PHASES/toDisplayPhase/getChecklistForPhase fold SPRINT into IDEA,
// and getNextPhase never routes a new advance through SPRINT.
describe("projectPhase", () => {
  it("PROJECT_PHASES has the full 7 raw enum values, in lifecycle order", () => {
    expect(PROJECT_PHASES.map((p) => p.value)).toEqual([
      "IDEA",
      "SPRINT",
      "PILOT",
      "PRODUCTION",
      "ESTABLISH",
      "SCALE",
      "IMPACT",
    ]);
  });

  it("IDEA and SPRINT share the same label ('Idé') in the raw phase list", () => {
    expect(PROJECT_PHASE_LABEL.IDEA).toBe("Idé");
    expect(PROJECT_PHASE_LABEL.SPRINT).toBe("Idé");
  });

  it("PROJECT_PHASE_LABEL/COLOR are keyed by every raw phase value", () => {
    for (const phase of PROJECT_PHASES) {
      expect(PROJECT_PHASE_LABEL[phase.value]).toBe(phase.label);
      expect(PROJECT_PHASE_COLOR[phase.value]).toBe(phase.color);
    }
  });

  describe("DISPLAY_PHASES", () => {
    it("has exactly 6 entries — SPRINT folded out of the visible journey", () => {
      expect(DISPLAY_PHASES).toHaveLength(6);
      const values: string[] = DISPLAY_PHASES.map((p) => p.value);
      expect(values).toEqual([
        "IDEA",
        "PILOT",
        "PRODUCTION",
        "ESTABLISH",
        "SCALE",
        "IMPACT",
      ]);
      expect(values.includes("SPRINT")).toBe(false);
    });
  });

  describe("toDisplayPhase", () => {
    it("maps SPRINT to IDEA", () => {
      expect(toDisplayPhase("SPRINT")).toBe("IDEA");
    });

    it("passes every other phase through unchanged", () => {
      for (const value of ["IDEA", "PILOT", "PRODUCTION", "ESTABLISH", "SCALE", "IMPACT"] as const) {
        expect(toDisplayPhase(value)).toBe(value);
      }
    });
  });

  describe("isValidProjectPhase", () => {
    it("accepts every raw enum value, including SPRINT", () => {
      for (const phase of PROJECT_PHASES) {
        expect(isValidProjectPhase(phase.value)).toBe(true);
      }
    });

    it("rejects unknown values", () => {
      expect(isValidProjectPhase("NOT_A_PHASE")).toBe(false);
      expect(isValidProjectPhase("")).toBe(false);
      expect(isValidProjectPhase("idea")).toBe(false); // case-sensitive
    });
  });

  describe("getNextPhase", () => {
    it("routes both IDEA and SPRINT straight to PILOT, never to each other", () => {
      expect(getNextPhase("IDEA")).toBe("PILOT");
      expect(getNextPhase("SPRINT")).toBe("PILOT");
    });

    it("advances every later phase to its immediate successor in the enum order", () => {
      expect(getNextPhase("PILOT")).toBe("PRODUCTION");
      expect(getNextPhase("PRODUCTION")).toBe("ESTABLISH");
      expect(getNextPhase("ESTABLISH")).toBe("SCALE");
      expect(getNextPhase("SCALE")).toBe("IMPACT");
    });

    it("returns null at the terminal phase (IMPACT)", () => {
      expect(getNextPhase("IMPACT")).toBeNull();
    });

    it("never returns SPRINT as the next phase for any input", () => {
      for (const phase of PROJECT_PHASES) {
        expect(getNextPhase(phase.value)).not.toBe("SPRINT");
      }
    });
  });

  describe("getChecklistForPhase", () => {
    it("returns IDEA's own checklist for both IDEA and SPRINT (same visible 'Idé' step)", () => {
      expect(getChecklistForPhase("IDEA")).toEqual(INITIATIVE_CHECKLIST_ITEMS.IDEA);
      expect(getChecklistForPhase("SPRINT")).toEqual(INITIATIVE_CHECKLIST_ITEMS.IDEA);
    });

    it("returns each other phase's own checklist unchanged", () => {
      for (const value of ["PILOT", "PRODUCTION", "ESTABLISH", "SCALE", "IMPACT"] as const) {
        expect(getChecklistForPhase(value)).toEqual(INITIATIVE_CHECKLIST_ITEMS[value]);
      }
    });

    it("has no duplicate item keys across the whole checklist (item keys never collide across phases)", () => {
      const keys = PROJECT_PHASES.flatMap((p) => INITIATIVE_CHECKLIST_ITEMS[p.value].map((item) => item.key));
      expect(new Set(keys).size).toBe(keys.length);
    });

    it("every phase's checklist items have a non-empty key and label", () => {
      for (const phase of PROJECT_PHASES) {
        const items = INITIATIVE_CHECKLIST_ITEMS[phase.value];
        for (const item of items) {
          expect(item.key.length).toBeGreaterThan(0);
          expect(item.label.length).toBeGreaterThan(0);
        }
      }
    });

    it("every item with a parentKey resolves to a real top-level item earlier in the same phase array (walking back through sibling sub-items)", () => {
      for (const phase of PROJECT_PHASES) {
        const items = INITIATIVE_CHECKLIST_ITEMS[phase.value];
        items.forEach((item, i) => {
          if (!item.parentKey) return;
          let j = i - 1;
          while (j >= 0 && items[j].parentKey) j -= 1;
          expect(j).toBeGreaterThanOrEqual(0);
          expect(items[j].key).toBe(item.parentKey);
        });
      }
    });
  });
});
