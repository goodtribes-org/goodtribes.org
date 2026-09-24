import type Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getAiClientFor } from "@/lib/aiMode";
import { getAiParticipantUser } from "@/lib/aiParticipant";
import { escapeHtml } from "@/lib/renderBody";
import { draftText, type DraftText } from "@/lib/aiLanguage";
import { InsightError, latestInsight } from "@/lib/ideaInsights";
import type { GateBrief } from "@/lib/phaseGate";
import { coerceTasks } from "@/lib/uppstartFill";
import { isPhaseFillInProgress, markPhaseFillPending, parsePhaseFillStatus, setPhaseFillState, type PhaseFillState } from "@/lib/phaseFill";
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

const MODEL = "claude-sonnet-4-6";
const REQUEST_OPTIONS = { timeout: 90_000, maxRetries: 1 };

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
  const canvas = ["problem", "customerSegments", "earlyAdopters", "solution", "uniqueValueProposition", "channels"]
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

async function callTool(client: Anthropic, system: string, tool: Anthropic.Tool, content: string): Promise<unknown> {
  const response = await client.messages.create(
    { model: MODEL, max_tokens: 3000, system, tools: [tool], tool_choice: { type: "tool", name: tool.name }, messages: [{ role: "user", content }] },
    REQUEST_OPTIONS,
  );
  const toolUse = response.content.find((b) => b.type === "tool_use");
  return toolUse && toolUse.type === "tool_use" ? toolUse.input : null;
}

async function markDone(projectId: string, itemKey: string, userId: string) {
  await prisma.initiativeChecklistItem.upsert({
    where: { projectId_itemKey: { projectId, itemKey } },
    create: { projectId, phase: "PRODUCTION", itemKey, completedAt: new Date(), completedById: userId },
    update: { completedAt: new Date(), completedById: userId },
  });
}

async function createWikiPage(projectSlug: string, slug: string, title: string, content: string, authorId: string) {
  const maxOrder = await prisma.wikiPage.aggregate({ where: { projectSlug }, _max: { order: true } });
  await prisma.wikiPage.create({ data: { projectSlug, slug, title, content, order: (maxOrder._max.order ?? -1) + 1, createdById: authorId } });
}

// ─── The background fill ────────────────────────────────────────────────────

export type LanseringFillParams = { projectId: string; projectSlug: string; userId: string; only?: LanseringSection[] };

export async function startLanseringFill(p: LanseringFillParams): Promise<void> {
  const sections = p.only ?? [...LANSERING_SECTIONS];
  await markPhaseFillPending(p.projectId, "PRODUCTION", sections);
  void runLanseringFill({ ...p, only: sections }).catch((err) =>
    logger.error("lansering-fill: crashed", { projectId: p.projectId, err: String(err) }),
  );
}

// Drafts what AI can do in Lansering; people run the pilot, log what
// happens and decide. Every section only adds — existing wiki pages,
// metrics, launch plan text and success criteria are left alone.
export async function runLanseringFill(p: LanseringFillParams): Promise<void> {
  const sections = p.only ?? [...LANSERING_SECTIONS];
  const setState = (s: LanseringSection, state: PhaseFillState) => setPhaseFillState(p.projectId, "PRODUCTION", s, state);
  const gate = await getAiClientFor({ feature: "project-plan", kind: "assist", userId: null, projectId: p.projectId, phase: "PRODUCTION", language: "project" });
  if (!gate.ok) {
    await Promise.all(sections.map((s) => setState(s, "failed")));
    return;
  }
  const client = gate.client;
  const [context, aiUser, lang] = await Promise.all([
    buildContext(p.projectId, p.projectSlug),
    getAiParticipantUser(),
    prisma.project.findUnique({ where: { id: p.projectId }, select: { contentLocale: true } }),
  ]);
  const t = draftText(lang?.contentLocale);

  const run = async (section: LanseringSection, work: () => Promise<void>) => {
    if (!sections.includes(section)) return;
    await setState(section, "running");
    try {
      await work();
      await setState(section, "done");
    } catch (err) {
      logger.error("lansering-fill: section failed", { section, projectId: p.projectId, err: String(err) });
      await setState(section, "failed");
    }
  };

  await Promise.all([
    run("pilot", async () => {
      const [wiki, evaluation] = await Promise.all([
        prisma.wikiPage.findUnique({ where: { projectSlug_slug: { projectSlug: p.projectSlug, slug: "pilotplan" } }, select: { id: true } }),
        prisma.pilotEvaluation.findUnique({ where: { projectSlug: p.projectSlug }, select: { successCriteria: true } }),
      ]);
      const needsCriteria = !evaluation?.successCriteria?.trim();
      if (wiki && !needsCriteria) return;
      const plan = coercePilotPlan(await callTool(client, PILOT_PLAN_SYSTEM_PROMPT, PILOT_PLAN_TOOL, context));
      if (!plan) throw new Error("no pilot plan");
      if (!wiki) await createWikiPage(p.projectSlug, "pilotplan", t.titlePilotPlan, pilotPlanHtml(plan, t), aiUser.id);
      if (needsCriteria && plan.successCriteria.length) {
        const successCriteria = successCriteriaText(plan.successCriteria, t);
        await prisma.pilotEvaluation.upsert({
          where: { projectSlug: p.projectSlug },
          create: { projectSlug: p.projectSlug, successCriteria, updatedById: aiUser.id },
          update: { successCriteria, updatedById: aiUser.id },
        });
      }
    }),

    run("impact", async () => {
      if (await prisma.impactMetric.count({ where: { projectSlug: p.projectSlug } })) return;
      const metrics = coerceImpactMetrics(await callTool(client, IMPACT_METRICS_SYSTEM_PROMPT, IMPACT_METRICS_TOOL, context));
      if (!metrics.length) throw new Error("no metrics");
      await prisma.impactMetric.createMany({
        data: metrics.map((m) => ({ projectSlug: p.projectSlug, label: m.label, unit: m.unit, targetValue: m.targetValue, description: m.description || null })),
      });
      await markDone(p.projectId, "impact_measurement_setup", p.userId);
    }),

    run("launch", async () => {
      const current = await prisma.launchPlan.findUnique({ where: { projectSlug: p.projectSlug }, include: { _count: { select: { channels: true } } } });
      if (current && current._count.channels && LAUNCH_FIELDS.every((f) => current[f]?.trim())) return;
      const draft = coerceLaunchPlan(await callTool(client, LAUNCH_PLAN_SYSTEM_PROMPT, LAUNCH_PLAN_TOOL, context));
      const writes = launchFieldsToWrite(current, draft);
      const channels = current?._count.channels ? [] : draft.channels;
      if (!Object.keys(writes).length && !channels.length) throw new Error("no launch plan");
      await prisma.launchPlan.upsert({
        where: { projectSlug: p.projectSlug },
        create: { projectSlug: p.projectSlug, ...writes, updatedById: aiUser.id, channels: { create: channels } },
        update: { ...writes, updatedById: aiUser.id, channels: { create: channels } },
      });
      await markDone(p.projectId, "launch_marketing_plan_created", p.userId);
    }),

    run("workflows", async () => {
      const exists = await prisma.wikiPage.findUnique({ where: { projectSlug_slug: { projectSlug: p.projectSlug, slug: "arbetsfloden" } }, select: { id: true } });
      if (exists) return;
      const html = workflowsHtml(await callTool(client, WORKFLOWS_SYSTEM_PROMPT, WORKFLOWS_TOOL, context), t);
      if (!html) throw new Error("no workflows");
      await createWikiPage(p.projectSlug, "arbetsfloden", t.titleWorkflows, html, aiUser.id);
      await markDone(p.projectId, "workflows_formalized", p.userId);
    }),

    run("tasks", async () => {
      const tasks = coerceTasks(await callTool(client, LANSERING_TASKS_SYSTEM_PROMPT, TASKS_TOOL, context));
      if (!tasks.length) throw new Error("no tasks");
      const maxOrder = await prisma.kanbanCard.aggregate({ where: { projectSlug: p.projectSlug, column: "TODO" }, _max: { order: true } });
      const start = (maxOrder._max.order ?? -1) + 1;
      await prisma.kanbanCard.createMany({
        data: tasks.map((t, i) => ({
          projectSlug: p.projectSlug,
          title: t.title,
          description: t.description || null,
          column: "TODO" as const,
          order: start + i,
          createdById: aiUser.id,
          createdByAi: true,
        })),
      });
    }),
  ]);
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
  const raw = (await callTool(gate.client, RESULTS_SYSTEM_PROMPT, RESULTS_TOOL, content)) as { summary?: unknown } | null;
  const summary = plainText(str(raw?.summary));
  if (!summary) throw new InsightError("empty");
  return summary;
}
