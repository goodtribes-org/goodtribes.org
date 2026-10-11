import { getAiClientFor, type AiGateBlockReason } from "@/lib/aiMode";
import { draftText } from "@/lib/aiLanguage";
import { prisma } from "@/lib/prisma";
import { callFillTool } from "@/lib/phaseFill";
import { buildContext, coerceCore, coerceScalingPlan, scaleChoiceHtml } from "@/lib/skalaFill";
import { CORE_SYSTEM_PROMPT, CORE_TOOL, SCALE_CHOICE_SYSTEM_PROMPT, SCALE_CHOICE_TOOL, SCALING_PLAN_SYSTEM_PROMPT, SCALING_PLAN_TOOL } from "@/lib/prompts/skalaFill";

// "Föreslå med AI" on the Skala steps (#331), like the earlier phases:
// every answer is a draft the page shows, saved only when the team picks it.
// The plan's texts come from one tool; each step shows only its own fields.

export type SkalaDraftKind = "goals" | "choice" | "core" | "firstPlace" | "capital";
export const SKALA_DRAFT_KINDS: SkalaDraftKind[] = ["goals", "choice", "core", "firstPlace", "capital"];
export type SkalaDraft = { kind: SkalaDraftKind; fields?: Record<string, string>; html?: string };

const STEP_OF: Record<SkalaDraftKind, string> = {
  goals: "scaling_goals_set",
  choice: "scale_vs_fork_decided",
  core: "core_defined",
  firstPlace: "local_teams_or_license",
  capital: "expansion_capital_secured",
};
const PLAN_FIELDS: Partial<Record<SkalaDraftKind, string[]>> = {
  goals: ["goals", "geographies"],
  firstPlace: ["teamOrLicenseModel"],
  capital: ["capitalPlan"],
};

type Gated<T> = { ok: true; value: T } | { ok: false; reason: AiGateBlockReason | "empty" };

export async function draftSkala(projectId: string, slug: string, userId: string, kind: SkalaDraftKind): Promise<Gated<SkalaDraft>> {
  const gate = await getAiClientFor({ feature: "project-plan", kind: "assist", userId, projectId, stepKey: STEP_OF[kind], phase: "SCALE", language: "project" });
  if (!gate.ok) return { ok: false, reason: gate.reason };
  const context = await buildContext(projectId, slug);
  if (kind === "choice") {
    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { contentLocale: true } });
    const html = scaleChoiceHtml(await callFillTool(gate.client, SCALE_CHOICE_SYSTEM_PROMPT, SCALE_CHOICE_TOOL, context), draftText(project?.contentLocale));
    return html ? { ok: true, value: { kind, html } } : { ok: false, reason: "empty" };
  }
  const all: Record<string, string> =
    kind === "core"
      ? coerceCore(await callFillTool(gate.client, CORE_SYSTEM_PROMPT, CORE_TOOL, context))
      : coerceScalingPlan(await callFillTool(gate.client, SCALING_PLAN_SYSTEM_PROMPT, SCALING_PLAN_TOOL, context));
  const keys = kind === "core" ? ["coreFixed", "coreAdaptable"] : PLAN_FIELDS[kind]!;
  const fields = Object.fromEntries(keys.filter((k) => all[k]).map((k) => [k, all[k]]));
  return Object.keys(fields).length ? { ok: true, value: { kind, fields } } : { ok: false, reason: "empty" };
}
