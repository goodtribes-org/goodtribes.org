import { stepKeysFor } from "@/lib/phaseWork";
import { getChecklistForPhase } from "@/lib/projectPhase";
import { prisma } from "@/lib/prisma";
import { getAiClientFor } from "@/lib/aiMode";
import type { Prisma } from "@prisma/client";
import { escapeHtml } from "@/lib/renderBody";
import { draftText, type DraftText } from "@/lib/aiLanguage";
import { InsightError, latestInsight } from "@/lib/ideaInsights";
import type { GateBrief } from "@/lib/phaseGate";
import { coerceTasks } from "@/lib/uppstartFill";
import {
  addAiCards,
  callFillTool,
  isPhaseFillInProgress,
  parsePhaseFillStatus,
  startPhaseFill,
  type PhaseFillState,
} from "@/lib/phaseFill";
import { tasksToolFor } from "@/lib/prompts/uppstartFill";
import {
  CRITERIA_METRICS_SYSTEM_PROMPT,
  CRITERIA_METRICS_TOOL,
  LANSERING_TASKS_SYSTEM_PROMPT,
  PLAN_FORWARD_SYSTEM_PROMPT,
  PLAN_FORWARD_TOOL,
  RESULTS_SYSTEM_PROMPT,
  RESULTS_TOOL,
} from "@/lib/prompts/lanseringFill";
import { emptyOnly } from "@/lib/uppstartFill";
import { parseCriteria, resultsFor, withResult, type CriterionResult } from "@/lib/pilot";

// ─── Fill status ────────────────────────────────────────────────────────────

export const LANSERING_SECTIONS = ["metrics", "plan", "tasks"] as const;
export type LanseringSection = (typeof LANSERING_SECTIONS)[number];
export type LanseringFillStatus = Partial<Record<LanseringSection, PhaseFillState>>;

export function parseLanseringStatus(raw: unknown, updatedAt?: Date, now = Date.now()): LanseringFillStatus {
  return parsePhaseFillStatus(raw, LANSERING_SECTIONS, updatedAt, now);
}
export const isLanseringFillInProgress = isPhaseFillInProgress;

// ─── Pure parsing (unit tested) ─────────────────────────────────────────────

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}
function list(v: unknown, max: number): string[] {
  return Array.isArray(v) ? v.map(str).filter(Boolean).slice(0, max) : [];
}
const ul = (items: string[]) => `<ul>${items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>`;
const aiNote = (t: DraftText) => `<p><em>${escapeHtml(t.draftNoteFromUppstart)}</em></p>`;

export type MetricDraft = { label: string; unit: string; targetValue: number | null; description: string };

export function coerceImpactMetrics(raw: unknown): MetricDraft[] {
  return (Array.isArray((raw as { metrics?: unknown } | null)?.metrics) ? (raw as { metrics: unknown[] }).metrics : [])
    .map((m) => {
      const o = (m ?? {}) as Record<string, unknown>;
      const t = typeof o.target === "number" && Number.isFinite(o.target) && o.target > 0 ? o.target : null;
      return { label: str(o.label).slice(0, 120), unit: str(o.unit).slice(0, 40), targetValue: t, description: str(o.description) };
    })
    .filter((m) => m.label && m.unit)
    .slice(0, 4);
}

// A metric per success criterion (#327): the AI numbers the criteria, the
// draft keeps only numbers that exist and one metric per criterion.
export type CriterionMetricDraft = MetricDraft & { criterion: string };

export function coerceCriterionMetrics(raw: unknown, criteria: string[]): CriterionMetricDraft[] {
  const list = Array.isArray((raw as { metrics?: unknown } | null)?.metrics) ? (raw as { metrics: unknown[] }).metrics : [];
  const out: CriterionMetricDraft[] = [];
  for (const m of list) {
    const o = (m ?? {}) as Record<string, unknown>;
    const n = typeof o.criterion_number === "number" ? Math.round(o.criterion_number) : NaN;
    const criterion = criteria[n - 1];
    const [metric] = coerceImpactMetrics({ metrics: [o] });
    if (criterion && metric && !out.some((x) => x.criterion === criterion)) out.push({ ...metric, criterion });
  }
  return out;
}

// "Plan framåt" (#327) lives in LaunchPlan: targetAudience = vilka fler,
// budgetOverview = vad det kostar att driva, plus howToReach and whoPays.
export const PLAN_FORWARD_FIELDS = ["targetAudience", "howToReach", "budgetOverview", "whoPays"] as const;
export type PlanForwardDraft = Record<(typeof PLAN_FORWARD_FIELDS)[number], string>;

export function coercePlanForward(raw: unknown): PlanForwardDraft {
  const o = (raw ?? {}) as Record<string, unknown>;
  return { targetAudience: str(o.who_more), howToReach: str(o.how_to_reach), budgetOverview: str(o.running_cost), whoPays: str(o.who_pays) };
}

export function workflowsHtml(raw: unknown, t: DraftText = draftText("sv")): string | null {
  const o = (raw ?? {}) as Record<string, unknown>;
  const responsibilities = list(o.responsibilities, 6);
  const routines = list(o.routines, 5);
  if (!responsibilities.length && !routines.length) return null;
  const decisions = list(o.decisions, 3);
  const handover = list(o.handover, 3);
  return [
    responsibilities.length && `<h2>${escapeHtml(t.hResponsibilities)}</h2>${ul(responsibilities)}`,
    routines.length && `<h2>${escapeHtml(t.hRoutines)}</h2>${ul(routines)}`,
    decisions.length && `<h2>${escapeHtml(t.hDecisions)}</h2>${ul(decisions)}`,
    handover.length && `<h2>${escapeHtml(t.hHandover)}</h2>${ul(handover)}`,
    aiNote(t),
  ]
    .filter(Boolean)
    .join("\n");
}

// One dated line appended to the pilot log (PilotEvaluation.executionNotes).
export function appendLogEntry(existing: string | null, date: Date, text: string): string {
  const line = `${date.toISOString().slice(0, 10)}: ${text.trim().replace(/\s+/g, " ")}`;
  return existing?.trim() ? `${existing.trimEnd()}\n${line}` : line;
}

// The results summary is shown as plain text — strip markdown the model
// may still add (bold/italic markers, headings).
export function plainText(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/(^|\s)\*(\S.*?\S|\S)\*(?=\s|[.,:;!?]|$)/gm, "$1$2")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function successCriteriaText(criteria: string[], t: DraftText = draftText("sv"), suffix: "proposalSuffix" | "gateProposalSuffix" = "proposalSuffix"): string {
  return `${criteria.map((c) => `- ${c}`).join("\n")}\n\n${t[suffix]}`;
}

// ─── Context ────────────────────────────────────────────────────────────────

const OUTCOME_TEXT: Record<string, string> = { MET: "nådde", PARTLY: "nådde delvis", NOT_MET: "nådde inte" };

// The criteria still without a metric, numbered for CRITERIA_METRICS_TOOL.
export function openCriteriaList(criteria: string[]): string {
  return `Kriterier som saknar mätetal:\n${criteria.map((c, i) => `${i + 1}. ${c}`).join("\n")}`;
}

export function criteriaLines(results: CriterionResult[]): string {
  return results.map((r, i) => `${i + 1}. ${r.criterion} — ${r.outcome ? OUTCOME_TEXT[r.outcome] : "inte bedömt"}${r.note ? ` (${r.note})` : ""}`).join("\n");
}

export async function buildContext(projectId: string, slug: string): Promise<string> {
  const [project, brief, decision, plan, evaluation, metrics] = await Promise.all([
    prisma.project.findUnique({ where: { id: projectId }, select: { title: true, summary: true, leanCanvas: true } }),
    latestInsight<GateBrief>(projectId, "UPPSTART_GATE"),
    prisma.phaseGateDecision.findFirst({ where: { projectId, fromPhase: "PILOT", outcome: "CONTINUE" }, orderBy: { createdAt: "desc" } }),
    prisma.projectPlan.findUnique({ where: { projectSlug: slug }, select: { hypothesis: true, mvpDescription: true, pilotWhere: true, pilotWho: true, pilotDuration: true, pilotTeam: true, pilotBudget: true } }),
    prisma.pilotEvaluation.findUnique({ where: { projectSlug: slug }, select: { successCriteria: true, executionNotes: true, criteriaResults: true } }),
    prisma.impactMetric.findMany({ where: { projectSlug: slug }, select: { label: true, unit: true, targetValue: true, currentValue: true } }),
  ]);
  const lc = (project?.leanCanvas ?? {}) as Record<string, unknown>;
  const canvas = ["purpose", "customerSegments", "jobsToBeDone", "solution", "uniqueValueProposition", "channels", "revenueStreams", "costStructure", "impact"]
    .filter((f) => str(lc[f]))
    .map((f) => `${f}: ${str(lc[f])}`)
    .join("\n");
  const results = resultsFor(parseCriteria(evaluation?.successCriteria), evaluation?.criteriaResults);
  const pilot = [
    plan?.pilotWhere && `Var: ${plan.pilotWhere}`,
    plan?.pilotWho && `Med vilka: ${plan.pilotWho}`,
    plan?.pilotDuration && `Hur länge: ${plan.pilotDuration}`,
    plan?.pilotTeam && `Vilka som gör det: ${plan.pilotTeam}`,
    plan?.pilotBudget && `Vad det kostar: ${plan.pilotBudget}`,
  ].filter(Boolean).join("\n");
  return [
    `Projekt: ${project?.title ?? slug} — ${project?.summary ?? ""}`,
    canvas && `Lean Canvas:\n${canvas}`,
    plan?.hypothesis ? `Det teamet testade i Uppstart: ${plan.hypothesis}` : "",
    brief
      ? `Beslutsunderlag från fasgrinden (Uppstart → Lansering):\nTesterna visade: ${brief.content.learned.join(" | ")}\nFokus i piloten: ${brief.content.nextFocus.join(" | ")}\nObesvarat: ${brief.content.unanswered.join(" | ") || "inget"}`
      : "Inget beslutsunderlag från fasgrinden.",
    pilot && `Pilotplanen:\n${pilot}`,
    results.length ? `Framgångskriterier:\n${criteriaLines(results)}` : "Inga framgångskriterier angivna.",
    metrics.length ? `Mätetal:\n${metrics.map((m) => `${m.label}: ${m.currentValue} ${m.unit}${m.targetValue ? ` (mål ${m.targetValue})` : ""}`).join("\n")}` : "",
    evaluation?.executionNotes?.trim() ? `Pilotlogg:\n${evaluation.executionNotes}` : "",
    decision?.note ? `Teamets anteckning vid beslutet: ${decision.note}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

// Creates a metric for each success criterion that has none yet and ties it
// to the criterion (criteriaResults). null = nothing to do (no criteria, or
// all tied already); otherwise how many were added. `suggest` gets the
// criteria still without a metric — the AI's draft, or the team's picks.
export async function addCriterionMetrics(slug: string, suggest: (criteria: string[]) => Promise<CriterionMetricDraft[]>): Promise<number | null> {
  const evaluation = await prisma.pilotEvaluation.findUnique({ where: { projectSlug: slug }, select: { successCriteria: true, criteriaResults: true } });
  const open = resultsFor(parseCriteria(evaluation?.successCriteria), evaluation?.criteriaResults).filter((r) => !r.metricId).map((r) => r.criterion);
  if (!open.length) return null;
  const drafts = (await suggest(open)).filter((d) => open.includes(d.criterion));
  let results: unknown = evaluation?.criteriaResults ?? [];
  for (const d of drafts) {
    const metric = await prisma.impactMetric.create({ data: { projectSlug: slug, label: d.label, unit: d.unit, targetValue: d.targetValue, description: d.description || null } });
    results = withResult(results, d.criterion, { metricId: metric.id });
  }
  if (drafts.length) {
    await prisma.pilotEvaluation.update({ where: { projectSlug: slug }, data: { criteriaResults: results as Prisma.InputJsonValue } });
  }
  return drafts.length;
}

// ─── The background fill ────────────────────────────────────────────────────

export type LanseringFillParams = { projectId: string; projectSlug: string; userId: string; only?: LanseringSection[] };

// Drafts what AI can do in Lansering (#327): a metric per success
// criterion, a plan forward and the first tasks; people run the pilot, log
// what happens and judge it. Every section only adds — metrics already tied
// to a criterion and plan text the team wrote are left alone. Runs in
// the background via the shared runner (lib/phaseFill.ts).
export async function startLanseringFill(p: LanseringFillParams): Promise<void> {
  const slug = p.projectSlug;
  await startPhaseFill({
    projectId: p.projectId,
    phase: "PRODUCTION",
    sections: p.only ?? LANSERING_SECTIONS,
    buildContext: () => buildContext(p.projectId, slug),
    work: {
      metrics: async ({ client, context }) => {
        const added = await addCriterionMetrics(slug, async (criteria) =>
          coerceCriterionMetrics(await callFillTool(client, CRITERIA_METRICS_SYSTEM_PROMPT, CRITERIA_METRICS_TOOL, `${context}\n\n${openCriteriaList(criteria)}`), criteria),
        );
        if (added === null) return;
        if (!added) throw new Error("no metrics");
      },

      plan: async ({ client, context, aiUserId }) => {
        const current = await prisma.launchPlan.findUnique({ where: { projectSlug: slug }, select: { targetAudience: true, howToReach: true, budgetOverview: true, whoPays: true } });
        if (current && PLAN_FORWARD_FIELDS.every((f) => current[f]?.trim())) return;
        const writes = emptyOnly(PLAN_FORWARD_FIELDS, current, coercePlanForward(await callFillTool(client, PLAN_FORWARD_SYSTEM_PROMPT, PLAN_FORWARD_TOOL, context)));
        if (!Object.keys(writes).length) throw new Error("no plan forward");
        await prisma.launchPlan.upsert({
          where: { projectSlug: slug },
          create: { projectSlug: slug, ...writes, updatedById: aiUserId },
          update: { ...writes, updatedById: aiUserId },
        });
      },

      tasks: async ({ client, context, aiUserId }) => {
        const tasks = coerceTasks(await callFillTool(client, LANSERING_TASKS_SYSTEM_PROMPT, tasksToolFor(getChecklistForPhase("PRODUCTION")), context), stepKeysFor("PRODUCTION"));
        if (!tasks.length) throw new Error("no tasks");
        await addAiCards(slug, "PRODUCTION", tasks, aiUserId);
      },
    },
  });
}

// ─── "Sammanfatta resultaten" (on request) ──────────────────────────────────

export async function summarizePilotResults(projectId: string, slug: string, userId: string): Promise<string> {
  const [evaluation, metrics] = await Promise.all([
    prisma.pilotEvaluation.findUnique({ where: { projectSlug: slug }, select: { successCriteria: true, executionNotes: true, criteriaResults: true } }),
    prisma.impactMetric.findMany({
      where: { projectSlug: slug },
      select: { label: true, unit: true, targetValue: true, currentValue: true, updates: { orderBy: { createdAt: "asc" }, select: { value: true, note: true, createdAt: true } } },
    }),
  ]);
  if (!evaluation?.executionNotes?.trim()) throw new InsightError("no_log");
  const gate = await getAiClientFor({ feature: "project-plan", kind: "assist", userId, projectId, stepKey: "pilot_results_collected", language: "project" });
  if (!gate.ok) throw new InsightError(gate.reason);

  const content = [
    `Framgångskriterier och teamets bedömning:\n${criteriaLines(resultsFor(parseCriteria(evaluation.successCriteria), evaluation.criteriaResults)) || "(inga angivna)"}`,
    `Pilotlogg:\n${evaluation.executionNotes}`,
    `Impact-värden:\n${
      metrics
        .map(
          (m) =>
            `${m.label}: ${m.currentValue} ${m.unit}${m.targetValue ? ` (mål ${m.targetValue})` : ""}${
              m.updates.length ? ` — uppdateringar: ${m.updates.map((u) => `${u.createdAt.toISOString().slice(0, 10)} ${u.value}${u.note ? ` (${u.note})` : ""}`).join(", ")}` : ""
            }`,
        )
        .join("\n") || "(inga)"
    }`,
  ].join("\n\n");
  const raw = (await callFillTool(gate.client, RESULTS_SYSTEM_PROMPT, RESULTS_TOOL, content)) as { summary?: unknown } | null;
  const summary = plainText(str(raw?.summary));
  if (!summary) throw new InsightError("empty");
  return summary;
}
