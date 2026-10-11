import { prisma } from "@/lib/prisma";
import { getAiClientFor, type AiGateBlockReason } from "@/lib/aiMode";
import { InsightError } from "@/lib/ideaInsights";
import { callFillTool } from "@/lib/phaseFill";
import { parseCriteria, resultsFor } from "@/lib/pilot";
import {
  buildContext,
  coerceCriterionMetrics,
  coercePlanForward,
  openCriteriaList,
  summarizePilotResults,
  type CriterionMetricDraft,
  type PlanForwardDraft,
} from "@/lib/lanseringFill";
import { CRITERIA_METRICS_SYSTEM_PROMPT, CRITERIA_METRICS_TOOL, PLAN_FORWARD_SYSTEM_PROMPT, PLAN_FORWARD_TOOL } from "@/lib/prompts/lanseringFill";

// "Föreslå med AI" on the Lansering steps (#327), like Uppstart's (#322):
// every answer is a draft the page shows, saved only when the team picks
// it. One call per click through getAiClientFor (the step's AI mode and the
// project's budget).

export type LanseringDraft =
  | { kind: "metrics"; draft: CriterionMetricDraft[] }
  | { kind: "results"; draft: string }
  | { kind: "plan"; draft: PlanForwardDraft };
export type LanseringDraftKind = LanseringDraft["kind"];
export const LANSERING_DRAFT_KINDS: LanseringDraftKind[] = ["metrics", "results", "plan"];

const STEP_OF: Record<LanseringDraftKind, string> = {
  metrics: "pilot_success_criteria",
  results: "pilot_results_collected",
  plan: "launch_marketing_plan_created",
};

type Gated<T> = { ok: true; value: T } | { ok: false; reason: AiGateBlockReason | "empty" | "no_log" | "no_criteria" };

export async function draftLansering(projectId: string, slug: string, userId: string, kind: LanseringDraftKind): Promise<Gated<LanseringDraft>> {
  if (kind === "results") {
    try {
      return { ok: true, value: { kind, draft: await summarizePilotResults(projectId, slug, userId) } };
    } catch (err) {
      if (err instanceof InsightError) return { ok: false, reason: err.message as "empty" };
      throw err;
    }
  }
  if (kind === "metrics") {
    const evaluation = await prisma.pilotEvaluation.findUnique({ where: { projectSlug: slug }, select: { successCriteria: true, criteriaResults: true } });
    const open = resultsFor(parseCriteria(evaluation?.successCriteria), evaluation?.criteriaResults).filter((r) => !r.metricId).map((r) => r.criterion);
    if (!open.length) return { ok: false, reason: "no_criteria" };
    const gate = await getAiClientFor({ feature: "project-plan", kind: "assist", userId, projectId, stepKey: STEP_OF.metrics, phase: "PRODUCTION", language: "project" });
    if (!gate.ok) return { ok: false, reason: gate.reason };
    // Number only the criteria still without a metric, so the AI's numbers
    // map straight onto them.
    const context = `${await buildContext(projectId, slug)}\n\n${openCriteriaList(open)}`;
    const draft = coerceCriterionMetrics(await callFillTool(gate.client, CRITERIA_METRICS_SYSTEM_PROMPT, CRITERIA_METRICS_TOOL, context), open);
    return draft.length ? { ok: true, value: { kind, draft } } : { ok: false, reason: "empty" };
  }
  const gate = await getAiClientFor({ feature: "project-plan", kind: "assist", userId, projectId, stepKey: STEP_OF.plan, phase: "PRODUCTION", language: "project" });
  if (!gate.ok) return { ok: false, reason: gate.reason };
  const draft = coercePlanForward(await callFillTool(gate.client, PLAN_FORWARD_SYSTEM_PROMPT, PLAN_FORWARD_TOOL, await buildContext(projectId, slug)));
  return Object.values(draft).some(Boolean) ? { ok: true, value: { kind, draft } } : { ok: false, reason: "empty" };
}
