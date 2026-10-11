jest.mock("../lib/prisma", () => ({ prisma: {} }));
jest.mock("../lib/aiMode", () => ({ getAiClientFor: jest.fn() }));
jest.mock("../lib/aiParticipant", () => ({ getAiParticipantUser: jest.fn() }));

import {
  appendLogEntry,
  coerceCriterionMetrics,
  coerceImpactMetrics,
  coercePlanForward,
  criteriaLines,
  parseLanseringStatus,
  plainText,
  successCriteriaText,
  workflowsHtml,
} from "../lib/lanseringFill";
import { isPhaseFillInProgress, parsePhaseFillStatus } from "../lib/phaseFill";

describe("phase fill status", () => {
  it("keeps known sections and marks stale waiting ones failed", () => {
    const updated = new Date("2026-09-24T10:00:00Z");
    expect(parseLanseringStatus({ metrics: "done", plan: "running", pilot: "done" })).toEqual({ metrics: "done", plan: "running" });
    expect(parsePhaseFillStatus({ a: "pending" }, ["a"] as const, updated, updated.getTime() + 6 * 60_000)).toEqual({ a: "failed" });
    expect(isPhaseFillInProgress({ a: "done", b: "pending" })).toBe(true);
  });
});

describe("impact metrics", () => {
  it("drops metrics without label or unit and unjustified targets", () => {
    expect(
      coerceImpactMetrics({
        metrics: [
          { label: "Räddade portioner", unit: "portioner", target: 200, description: "Räknas av köket" },
          { label: "Familjer", unit: "familjer", target: -3 },
          { label: "", unit: "kg" },
          { label: "Utan enhet" },
        ],
      }),
    ).toEqual([
      { label: "Räddade portioner", unit: "portioner", targetValue: 200, description: "Räknas av köket" },
      { label: "Familjer", unit: "familjer", targetValue: null, description: "" },
    ]);
  });
});

describe("a metric per success criterion (#327)", () => {
  it("ties each metric to the numbered criterion, one per criterion", () => {
    const criteria = ["Minst 10 familjer bokar två gånger", "Hälften kommer tillbaka"];
    expect(
      coerceCriterionMetrics(
        {
          metrics: [
            { criterion_number: 1, label: "Familjer som bokat två gånger", unit: "familjer", target: 10 },
            { criterion_number: 1, label: "Dubblett", unit: "st" },
            { criterion_number: 7, label: "Finns inte", unit: "st" },
            { criterion_number: 2, label: "Återkommande", unit: "familjer" },
          ],
        },
        criteria,
      ),
    ).toEqual([
      { criterion: criteria[0], label: "Familjer som bokat två gånger", unit: "familjer", targetValue: 10, description: "" },
      { criterion: criteria[1], label: "Återkommande", unit: "familjer", targetValue: null, description: "" },
    ]);
  });
});

describe("plan forward (#327)", () => {
  it("maps the AI's fields onto the launch plan's", () => {
    expect(coercePlanForward({ who_more: " Fler skolor ", how_to_reach: "Föräldrabrev", running_cost: "", who_pays: "Kommunen" })).toEqual({
      targetAudience: "Fler skolor",
      howToReach: "Föräldrabrev",
      budgetOverview: "",
      whoPays: "Kommunen",
    });
  });
  it("lists the criteria with the team's own judgement", () => {
    expect(criteriaLines([{ criterion: "A", outcome: "MET" }, { criterion: "B", outcome: null, note: null }])).toBe("1. A — nådde\n2. B — inte bedömt");
  });
});

describe("workflows and log", () => {
  it("returns null without responsibilities or routines", () => {
    expect(workflowsHtml({ decisions: ["x"] })).toBeNull();
    expect(workflowsHtml({ responsibilities: ["Projektledare: <x>"] })).toContain("&lt;x&gt;");
  });

  it("appends a dated, single-line entry", () => {
    const d = new Date("2026-09-24T12:00:00Z");
    expect(appendLogEntry(null, d, "  Första\nhämtningen ")).toBe("2026-09-24: Första hämtningen");
    expect(appendLogEntry("2026-09-20: Start\n", d, "Två familjer")).toBe("2026-09-20: Start\n2026-09-24: Två familjer");
  });

  it("marks proposed success criteria as a proposal", () => {
    expect(successCriteriaText(["A", "B"])).toBe("- A\n- B\n\n(Förslag från AI:n — justera nivåerna.)");
  });
});

describe("plainText", () => {
  it("strips markdown markers but keeps the words", () => {
    expect(plainText("**Resultat**\n\n## Kriterier\n1. *Godkännande* – oklart.\n- 4*5 = 20")).toBe("Resultat\n\nKriterier\n1. Godkännande – oklart.\n- 4*5 = 20");
  });
});
