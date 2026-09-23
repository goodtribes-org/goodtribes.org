jest.mock("../lib/prisma", () => ({ prisma: {} }));
jest.mock("../lib/aiMode", () => ({ getAiClientFor: jest.fn() }));
jest.mock("../lib/aiParticipant", () => ({ getAiParticipantUser: jest.fn() }));

import {
  appendLogEntry,
  coerceImpactMetrics,
  coerceLaunchPlan,
  coercePilotPlan,
  launchFieldsToWrite,
  parseLanseringStatus,
  plainText,
  pilotPlanHtml,
  successCriteriaText,
  workflowsHtml,
} from "../lib/lanseringFill";
import { isPhaseFillInProgress, parsePhaseFillStatus } from "../lib/phaseFill";

describe("phase fill status", () => {
  it("keeps known sections and marks stale waiting ones failed", () => {
    const updated = new Date("2026-09-24T10:00:00Z");
    expect(parseLanseringStatus({ pilot: "done", impact: "running", nope: "done" })).toEqual({ pilot: "done", impact: "running" });
    expect(parsePhaseFillStatus({ a: "pending" }, ["a"] as const, updated, updated.getTime() + 6 * 60_000)).toEqual({ a: "failed" });
    expect(isPhaseFillInProgress({ a: "done", b: "pending" })).toBe(true);
  });
});

describe("pilot plan", () => {
  it("needs a setup or steps, and escapes the wiki page", () => {
    expect(coercePilotPlan({ measure: ["x"] })).toBeNull();
    const p = coercePilotPlan({ setup: "En skola <b>4 veckor</b>", weeks: ["Vecka 1: start"], success_criteria: ["Minst 10 hämtningar"] })!;
    expect(p.successCriteria).toEqual(["Minst 10 hämtningar"]);
    const html = pilotPlanHtml(p);
    expect(html).toContain("&lt;b&gt;");
    expect(html).not.toContain("<b>");
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

describe("launch plan — never overwrite", () => {
  it("fills only empty fields and keeps named channels", () => {
    const draft = coerceLaunchPlan({ target_audience: "Familjer", positioning: "Neutralt", budget_overview: "", success_metrics: "Anmälningar", channels: [{ name: "Föräldrabrev", tactic: "Via skolan" }, { tactic: "saknar namn" }] });
    expect(draft.channels).toEqual([{ name: "Föräldrabrev", tactic: "Via skolan" }]);
    expect(launchFieldsToWrite({ targetAudience: "Teamets egen", positioning: null, budgetOverview: null, successMetrics: " " }, draft)).toEqual({
      positioning: "Neutralt",
      successMetrics: "Anmälningar",
    });
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
