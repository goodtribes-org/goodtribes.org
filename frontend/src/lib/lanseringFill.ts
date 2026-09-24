import { prisma } from "@/lib/prisma";
import { getAiClientFor } from "@/lib/aiMode";
import { escapeHtml } from "@/lib/renderBody";
import { draftText, type DraftText } from "@/lib/aiLanguage";
import { InsightError, latestInsight } from "@/lib/ideaInsights";
import type { GateBrief } from "@/lib/phaseGate";
import { coerceTasks } from "@/lib/uppstartFill";
import {
  addAiCards,
  callFillTool,
  createWikiPage,
  isPhaseFillInProgress,
  markStepDone,
  parsePhaseFillStatus,
  startPhaseFill,
  wikiPageExists,
  type PhaseFillState,
} from "@/lib/phaseFill";
import { TASKS_TOOL } from "@/lib/prompts/uppstartFill";
import {
  IMPACT_METRICS_SYSTEM_PROMPT,
  IMPACT_METRICS_TOOL,
  LANSERING_TASKS_SYSTEM_PROMPT,
  LAUNCH_PLAN_SYSTEM_PROMPT,
  LAUNCH_PLAN_TOOL,
  PILOT_PLAN_SYSTEM_PROMPT,
  PILOT_PLAN_TOOL,
  RESULTS_SYSTEM_PROMPT,
  RESULTS_TOOL,
  WORKFLOWS_SYSTEM_PROMPT,
  WORKFLOWS_TOOL,
} from "@/lib/prompts/lanseringFill";

// ─── Fill status ────────────────────────────────────────────────────────────

export const LANSERING_SECTIONS = ["pilot", "impact", "launch", "workflows", "tasks"] as const;
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

export type PilotPlan = { setup: string; weeks: string[]; measure: string[]; logPrompts: string[]; stopRules: string[]; successCriteria: string[] };

export function coercePilotPlan(raw: unknown): PilotPlan | null {
  const o = (raw ?? {}) as Record<string, unknown>;
  const plan = {
    setup: str(o.setup),
    weeks: list(o.weeks, 6),
    measure: list(o.measure, 4),
    logPrompts: list(o.log_prompts, 5),
    stopRules: list(o.stop_rules, 3),
    successCriteria: list(o.success_criteria, 4),
  };
  return plan.setup || plan.weeks.length ? plan : null;
}

export function pilotPlanHtml(p: PilotPlan, t: DraftText = draftText("sv")): string {
  return [
    p.setup && `<h2>${escapeHtml(t.hSetup)}</h2><p>${escapeHtml(p.setup)}</p>`,
    p.weeks.length && `<h2>${escapeHtml(t.hSteps)}</h2>${ul(p.weeks)}`,
    p.measure.length && `<h2>${escapeHtml(t.hMeasure)}</h2>${ul(p.measure)}`,
    p.logPrompts.length && `<h2>${escapeHtml(t.hLogPrompts)}</h2>${ul(p.logPrompts)}`,
    p.stopRules.length && `<h2>${escapeHtml(t.hStopRules)}</h2>${ul(p.stopRules)}`,
    aiNote(t),
  ]
    .filter(Boolean)
    .join("\n");
}

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

export const LAUNCH_FIELDS = ["targetAudience", "positioning", "budgetOverview", "successMetrics"] as const;
export type LaunchDraft = Record<(typeof LAUNCH_FIELDS)[number], string> & { channels: { name: string; tactic: string }[] };

export function coerceLaunchPlan(raw: unknown): LaunchDraft {
  const o = (raw ?? {}) as Record<string, unknown>;
  return {
    targetAudience: str(o.target_audience),
    positioning: str(o.positioning),
    budgetOverview: str(o.budget_overview),
    successMetrics: str(o.success_metrics),
    channels: (Array.isArray(o.channels) ? o.channels : [])
      .map((c) => ({ name: str((c as Record<string, unknown>)?.name).slice(0, 120), tactic: str((c as Record<string, unknown>)?.tactic) }))
      .filter((c) => c.name)
      .slice(0, 4),
  };
}

// Never overwrite: only the empty text fields get the draft.
export function launchFieldsToWrite(
  current: Partial<Record<(typeof LAUNCH_FIELDS)[number], string | null>> | null,
  draft: LaunchDraft,
): Partial<Record<(typeof LAUNCH_FIELDS)[number], string>> {
  const out: Partial<Record<(typeof LAUNCH_FIELDS)[number], string>> = {};
  for (const f of LAUNCH_FIELDS) if (draft[f] && !current?.[f]?.trim()) out[f] = draft[f];
  return out;
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

async function buildContext(projectId: string, slug: string): Promise<string> {
  const [project, brief, decision, plan, evaluation, roles] = await Promise.all([
    prisma.project.findUnique({ where: { id: projectId }, select: { title: true, summary: true, leanCanvas: true } }),
    latestInsight<GateBrief>(projectId, "UPPSTART_GATE"),
    prisma.phaseGateDecision.findFirst({ where: { projectId, fromPhase: "PILOT", outcome: "CONTINUE" }, orderBy: { createdAt: "desc" } }),
    prisma.projectPlan.findUnique({ where: { projectSlug: slug }, select: { goal: true, milestones: true, resources: true } }),
    prisma.pilotEvaluation.findUnique({ where: { projectSlug: slug }, select: { successCriteria: true } }),
    prisma.projectRoleNeed.findMany({ where: { projectId }, orderBy: { order: "asc" }, select: { title: true, description: true, filledById: true } }),
  ]);
  const lc = (project?.leanCanvas ?? {}) as Record<string, unknown>;
  const canvas = ["purpose", "customerSegments", "jobsToBeDone", "solution", "uniqueValueProposition", "channels", "impact"]
    .filter((f) => str(lc[f]))
    .map((f) => `${f}: ${str(lc[f])}`)
    .join("\n");
  return [
    `Projekt: ${project?.title ?? slug} — ${project?.summary ?? ""}`,
    canvas && `Lean Canvas:\n${canvas}`,
    brief
      ? `Beslutsunderlag från fasgrinden (Uppstart → Lansering):\nTesterna visade: ${brief.content.learned.join(" | ")}\nFokus i piloten: ${brief.content.nextFocus.join(" | ")}\nObesvarat: ${brief.content.unanswered.join(" | ") || "inget"}`
      : "Inget beslutsunderlag från fasgrinden.",
    evaluation?.successCriteria ? `Framgångskriterier:\n${evaluation.successCriteria}` : brief?.content.successCriteria.length ? `Föreslagna framgångskriterier: ${brief.content.successCriteria.join(" | ")}` : "",
    decision?.note ? `Teamets anteckning vid beslutet: ${decision.note}` : "",
    plan?.goal ? `Projektplanens mål och avgränsning:\n${plan.goal}` : "",
    plan?.resources ? `Resurser:\n${plan.resources}` : "",
    `Kärnteam: ${roles.length ? roles.map((r) => `${r.title} (${r.filledById ? "tillsatt" : "vakant"})${r.description ? ` — ${r.description}` : ""}`).join("; ") : "inga roller definierade"}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}




// ─── The background fill ────────────────────────────────────────────────────

export type LanseringFillParams = { projectId: string; projectSlug: string; userId: string; only?: LanseringSection[] };

// Drafts what AI can do in Lansering; people run the pilot, log what
// happens and decide. Every section only adds — existing wiki pages,
// metrics, launch plan text and success criteria are left alone. Runs in
// the background via the shared runner (lib/phaseFill.ts).
export async function startLanseringFill(p: LanseringFillParams): Promise<void> {
  const slug = p.projectSlug;
  await startPhaseFill({
    projectId: p.projectId,
    phase: "PRODUCTION",
    sections: p.only ?? LANSERING_SECTIONS,
    buildContext: () => buildContext(p.projectId, slug),
    work: {
      pilot: async ({ client, context, aiUserId, t }) => {
        const [wiki, evaluation] = await Promise.all([
          wikiPageExists(slug, "pilotplan"),
          prisma.pilotEvaluation.findUnique({ where: { projectSlug: slug }, select: { successCriteria: true } }),
        ]);
        const needsCriteria = !evaluation?.successCriteria?.trim();
        if (wiki && !needsCriteria) return;
        const plan = coercePilotPlan(await callFillTool(client, PILOT_PLAN_SYSTEM_PROMPT, PILOT_PLAN_TOOL, context));
        if (!plan) throw new Error("no pilot plan");
        if (!wiki) await createWikiPage(slug, "pilotplan", t.titlePilotPlan, pilotPlanHtml(plan, t), aiUserId);
        if (needsCriteria && plan.successCriteria.length) {
          const successCriteria = successCriteriaText(plan.successCriteria, t);
          await prisma.pilotEvaluation.upsert({
            where: { projectSlug: slug },
            create: { projectSlug: slug, successCriteria, updatedById: aiUserId },
            update: { successCriteria, updatedById: aiUserId },
          });
        }
      },

      impact: async ({ client, context }) => {
        if (await prisma.impactMetric.count({ where: { projectSlug: slug } })) return;
        const metrics = coerceImpactMetrics(await callFillTool(client, IMPACT_METRICS_SYSTEM_PROMPT, IMPACT_METRICS_TOOL, context));
        if (!metrics.length) throw new Error("no metrics");
        await prisma.impactMetric.createMany({
          data: metrics.map((m) => ({ projectSlug: slug, label: m.label, unit: m.unit, targetValue: m.targetValue, description: m.description || null })),
        });
        await markStepDone(p.projectId, "PRODUCTION", "impact_measurement_setup", p.userId);
      },

      launch: async ({ client, context, aiUserId }) => {
        const current = await prisma.launchPlan.findUnique({ where: { projectSlug: slug }, include: { _count: { select: { channels: true } } } });
        if (current && current._count.channels && LAUNCH_FIELDS.every((f) => current[f]?.trim())) return;
        const draft = coerceLaunchPlan(await callFillTool(client, LAUNCH_PLAN_SYSTEM_PROMPT, LAUNCH_PLAN_TOOL, context));
        const writes = launchFieldsToWrite(current, draft);
        const channels = current?._count.channels ? [] : draft.channels;
        if (!Object.keys(writes).length && !channels.length) throw new Error("no launch plan");
        await prisma.launchPlan.upsert({
          where: { projectSlug: slug },
          create: { projectSlug: slug, ...writes, updatedById: aiUserId, channels: { create: channels } },
          update: { ...writes, updatedById: aiUserId, channels: { create: channels } },
        });
        await markStepDone(p.projectId, "PRODUCTION", "launch_marketing_plan_created", p.userId);
      },

      workflows: async ({ client, context, aiUserId, t }) => {
        if (await wikiPageExists(slug, "arbetsfloden")) return;
        const html = workflowsHtml(await callFillTool(client, WORKFLOWS_SYSTEM_PROMPT, WORKFLOWS_TOOL, context), t);
        if (!html) throw new Error("no workflows");
        await createWikiPage(slug, "arbetsfloden", t.titleWorkflows, html, aiUserId);
        await markStepDone(p.projectId, "PRODUCTION", "workflows_formalized", p.userId);
      },

      tasks: async ({ client, context, aiUserId }) => {
        const tasks = coerceTasks(await callFillTool(client, LANSERING_TASKS_SYSTEM_PROMPT, TASKS_TOOL, context));
        if (!tasks.length) throw new Error("no tasks");
        await addAiCards(slug, tasks, aiUserId);
      },
    },
  });
}

// ─── "Sammanfatta resultaten" (on request) ──────────────────────────────────

export async function summarizePilotResults(projectId: string, slug: string, userId: string): Promise<string> {
  const [evaluation, metrics] = await Promise.all([
    prisma.pilotEvaluation.findUnique({ where: { projectSlug: slug }, select: { successCriteria: true, executionNotes: true } }),
    prisma.impactMetric.findMany({
      where: { projectSlug: slug },
      select: { label: true, unit: true, targetValue: true, currentValue: true, updates: { orderBy: { createdAt: "asc" }, select: { value: true, note: true, createdAt: true } } },
    }),
  ]);
  if (!evaluation?.executionNotes?.trim()) throw new InsightError("no_log");
  const gate = await getAiClientFor({ feature: "project-plan", kind: "assist", userId, projectId, stepKey: "pilot_results_collected", language: "project" });
  if (!gate.ok) throw new InsightError(gate.reason);

  const content = [
    `Framgångskriterier:\n${evaluation.successCriteria ?? "(inga angivna)"}`,
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
