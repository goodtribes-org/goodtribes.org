import type { NextStepDecision, Prisma } from "@prisma/client";
import { stepKeysFor } from "@/lib/phaseWork";
import { getChecklistForPhase } from "@/lib/projectPhase";
import { prisma } from "@/lib/prisma";
import { draftText, type DraftText } from "@/lib/aiLanguage";
import { getAiClientFor } from "@/lib/aiMode";
import { InsightError, latestInsight } from "@/lib/ideaInsights";
import type { GateBrief } from "@/lib/phaseGate";
import { coerceTasks } from "@/lib/uppstartFill";
import { tasksToolFor } from "@/lib/prompts/uppstartFill";
import {
  addAiCards,
  callFillTool,
  fillList,
  fillStr,
  isPhaseFillInProgress,
  parsePhaseFillStatus,
  startPhaseFill,
  wikiHtml,
  type PhaseFillState,
} from "@/lib/phaseFill";
import { IMPACT_MODEL_FIELDS } from "@/app/[locale]/projects/[slug]/(workspace)/impact-model/fields";
import {
  IMPACT_TASKS_SYSTEM_PROMPT,
  LESSONS_SYSTEM_PROMPT,
  NEXT_STEP_SYSTEM_PROMPT,
  NEXT_STEP_TOOL,
  STORY_SYSTEM_PROMPT,
  TEXT_TOOL,
} from "@/lib/prompts/impactPhaseFill";
import { parseCriteria, resultsFor } from "@/lib/pilot";
import { criteriaLines } from "@/lib/lanseringFill";

export const IMPACT_SECTIONS = ["story", "lessons", "tasks"] as const;
export type ImpactSection = (typeof IMPACT_SECTIONS)[number];
export type ImpactFillStatus = Partial<Record<ImpactSection, PhaseFillState>>;

export function parseImpactStatus(raw: unknown, updatedAt?: Date, now = Date.now()): ImpactFillStatus {
  return parsePhaseFillStatus(raw, IMPACT_SECTIONS, updatedAt, now);
}
export const isImpactFillInProgress = isPhaseFillInProgress;

// ─── Pure parsing (unit tested) ─────────────────────────────────────────────

export function impactSummaryHtml(raw: unknown, t: DraftText = draftText("sv")): string | null {
  const o = (raw ?? {}) as Record<string, unknown>;
  const results = fillList(o.results, 8);
  if (!results.length) return null;
  return wikiHtml(
    [
      { heading: t.hWhatWeDo, text: fillStr(o.summary) },
      { heading: t.hResults, items: results },
      { heading: t.hSdgs, items: fillList(o.sdgs, 5) },
      { heading: t.hGaps, items: fillList(o.gaps, 3) },
    ],
    t.draftNoteImpact,
  );
}

export type NextStepOption = "continue" | "replicate" | "close";
export type NextStepBrief = {
  situation: string[];
  options: { option: NextStepOption; assessment: string }[];
  recommendation: NextStepOption;
  reasons: string[];
  firstSteps: string[];
};

const OPTIONS: readonly NextStepOption[] = ["continue", "replicate", "close"];

// The recommendation defaults to "continue" — the choice that changes
// nothing — when the model's answer isn't one of the three.
export function coerceNextStepBrief(raw: unknown): NextStepBrief {
  const o = (raw ?? {}) as Record<string, unknown>;
  const seen = new Set<string>();
  const options = (Array.isArray(o.options) ? o.options : [])
    .map((x) => ({ option: fillStr((x as Record<string, unknown>)?.option), assessment: fillStr((x as Record<string, unknown>)?.assessment) }))
    .filter((x): x is { option: NextStepOption; assessment: string } => OPTIONS.includes(x.option as NextStepOption) && !!x.assessment && !seen.has(x.option) && !!seen.add(x.option));
  const rec = fillStr(o.recommendation);
  return {
    situation: fillList(o.situation, 4),
    options,
    recommendation: OPTIONS.includes(rec as NextStepOption) ? (rec as NextStepOption) : "continue",
    reasons: fillList(o.reasons, 4),
    firstSteps: fillList(o.first_steps, 4),
  };
}

export const NEXT_STEP_DECISION: Record<NextStepOption, NextStepDecision> = {
  continue: "CONTINUE",
  replicate: "REPLICATE",
  close: "CLOSE_RESPONSIBLY",
};

export const FOLLOWUP_FIELDS = ["externalVerificationNotes", "celebrationNotes"] as const;

// ─── Context ────────────────────────────────────────────────────────────────

const strip = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

// The team's theory of change from the Idé phase — what they planned to
// achieve, as a yardstick for what was actually reported. A plan, never a
// result (the prompt says so too).
export function impactModelPlanText(model: Record<string, unknown> | null): string {
  const lines = IMPACT_MODEL_FIELDS.map((f) => [f, typeof model?.[f] === "string" ? (model[f] as string).trim() : ""] as const).filter(([, v]) => v);
  if (!lines.length) return "";
  return `Impactmodellen (teamets plan, INTE resultat):\n${lines.map(([f, v]) => `${f}: ${v}`).join("\n")}`;
}

export async function buildContext(projectId: string, slug: string): Promise<string> {
  const [project, metrics, reports, brief, plan, instances, forks, launch, playbook, impactModel] = await Promise.all([
    prisma.project.findUnique({ where: { id: projectId }, select: { title: true, summary: true, sdgGoals: true, openForReplication: true } }),
    prisma.impactMetric.findMany({
      where: { projectSlug: slug },
      select: { label: true, unit: true, currentValue: true, targetValue: true, updates: { orderBy: { createdAt: "asc" }, select: { value: true, createdAt: true } } },
    }),
    prisma.impactReport.findMany({
      where: { projectId },
      select: { sdgGoals: true, metricDescription: true, metricValue: true, metricUnit: true, kind: true, valueQualifier: true, isCumulative: true, periodStart: true, periodEnd: true, verifiedAt: true, rejectedAt: true },
    }),
    latestInsight<GateBrief>(projectId, "SKALA_GATE"),
    prisma.scalingPlan.findUnique({ where: { projectSlug: slug }, select: { goals: true } }),
    prisma.projectInstance.findMany({ where: { parentSlug: slug }, select: { region: true, status: true } }),
    prisma.project.count({ where: { forkedFromProjectId: projectId } }),
    prisma.launchPlan.findUnique({ where: { projectSlug: slug }, select: { channels: { select: { name: true } } } }),
    prisma.wikiPage.findUnique({ where: { projectSlug_slug: { projectSlug: slug, slug: "playbook" } }, select: { content: true } }),
    prisma.impactModel.findUnique({ where: { projectSlug: slug } }),
  ]);
  const [evaluation, followup, pulses] = await Promise.all([
    prisma.pilotEvaluation.findUnique({ where: { projectSlug: slug }, select: { successCriteria: true, criteriaResults: true, resultsSummary: true } }),
    prisma.impactFollowup.findUnique({ where: { projectSlug: slug }, select: { voiceQuote: true, voiceWho: true, voiceConsent: true } }),
    // The team's monthly pulse sentences (#335), in their own words.
    prisma.impactPulse.findMany({ where: { projectId, note: { not: null } }, orderBy: { createdAt: "asc" }, take: 36, select: { note: true, createdAt: true } }),
  ]);
  const pilot = resultsFor(parseCriteria(evaluation?.successCriteria), evaluation?.criteriaResults);
  const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "?");
  return [
    `Projekt: ${project?.title ?? slug} — ${project?.summary ?? ""}. Globala mål projektet siktar på: ${project?.sdgGoals.join(", ") || "inga angivna"}.`,
    `Impact-mätetal:\n${
      metrics
        .map((m) => `${m.label}: ${m.currentValue} ${m.unit}${m.targetValue ? ` (mål ${m.targetValue})` : ""}${m.updates.length ? ` — ${m.updates.map((u) => `${day(u.createdAt)} ${u.value}`).join(", ")}` : " — inte rapporterat"}`)
        .join("\n") || "(inga)"
    }`,
    impactModelPlanText(impactModel),
    `Impactrapporter:\n${
      reports
        .map(
          (r) =>
            `${r.kind === "SUPPORT_RECEIVED" ? "[STÖD PROJEKTET FÅTT]" : "[LEVERERAT]"} ${r.metricDescription}: ${r.valueQualifier === "AT_LEAST" ? "minst " : r.valueQualifier === "APPROXIMATE" ? "ca " : ""}${r.metricValue} ${r.metricUnit ?? ""}${r.isCumulative ? " (total sedan start)" : ""}, period ${day(r.periodStart)}–${day(r.periodEnd)}, mål ${r.sdgGoals.join("/") || "—"}, ${r.verifiedAt ? "verifierad" : r.rejectedAt ? "avvisad" : "ej granskad"}`,
        )
        .join("\n") || "(inga)"
    }`,
    brief ? `Förra fasgrinden (Skala → Impact): ${brief.content.learned.join(" | ")}\nFokus i Impact: ${brief.content.nextFocus.join(" | ")}` : "",
    plan?.goals ? `Skalningsmål: ${plan.goals}` : "",
    `Nätverk: öppet för replikering ${project?.openForReplication ? "ja" : "nej"}; instanser ${instances.map((i) => `${i.region} (${i.status})`).join(", ") || "inga"}; forkar ${forks}.`,
    launch?.channels.length ? `Projektets kanaler: ${launch.channels.map((c) => c.name).join(", ")}` : "",
    playbook ? `Så här gör vi: ${strip(playbook.content).slice(0, 500)} …` : "",
    pilot.length ? `Pilotens framgångskriterier och teamets bedömning:\n${criteriaLines(pilot)}` : "",
    evaluation?.resultsSummary ? `Vad piloten visade: ${evaluation.resultsSummary}` : "",
    pulses.length ? `Teamets månadspuls (egna ord, en rad per månad):\n${pulses.map((p) => `${day(p.createdAt)}: ${p.note}`).join("\n")}` : "",
    followup?.voiceQuote && followup.voiceConsent ? `En deltagares röst (med samtycke): "${followup.voiceQuote}"${followup.voiceWho ? ` — ${followup.voiceWho}` : ""}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

// ─── The background fill ────────────────────────────────────────────────────

export async function startImpactFill(p: { projectId: string; projectSlug: string; userId: string; only?: ImpactSection[] }) {
  const { projectId, projectSlug: slug } = p;
  const followupText = (field: "story" | "celebrationNotes", system: string, toolName: string) =>
    async ({ client, context, aiUserId }: { client: Parameters<typeof callFillTool>[0]; context: string; aiUserId: string }) => {
      const current = await prisma.impactFollowup.findUnique({ where: { projectSlug: slug }, select: { story: true, celebrationNotes: true } });
      if (current?.[field]?.trim()) return;
      const raw = (await callFillTool(client, system, TEXT_TOOL(toolName, toolName), context)) as { text?: unknown } | null;
      const text = fillStr(raw?.text);
      if (!text) throw new Error(`no ${field}`);
      await prisma.impactFollowup.upsert({ where: { projectSlug: slug }, create: { projectSlug: slug, [field]: text, updatedById: aiUserId }, update: { [field]: text, updatedById: aiUserId } });
    };

  await startPhaseFill({
    projectId,
    phase: "IMPACT",
    sections: p.only ?? IMPACT_SECTIONS,
    buildContext: () => buildContext(projectId, slug),
    work: {
      story: followupText("story", STORY_SYSTEM_PROMPT, "berattelse"),
      lessons: followupText("celebrationNotes", LESSONS_SYSTEM_PROMPT, "lardomar"),
      tasks: async ({ client, context, aiUserId }) => {
        const tasks = coerceTasks(await callFillTool(client, IMPACT_TASKS_SYSTEM_PROMPT, tasksToolFor(getChecklistForPhase("IMPACT")), context), stepKeysFor("IMPACT"));
        if (!tasks.length) throw new Error("no tasks");
        await addAiCards(slug, "IMPACT", tasks, aiUserId);
      },
    },
  });
}

// ─── Nästa steg (on request) ────────────────────────────────────────────────

export async function runNextStepBrief(projectId: string, slug: string, userId: string): Promise<NextStepBrief> {
  const gate = await getAiClientFor({ feature: "critique", kind: "assist", userId, projectId, language: "project" });
  if (!gate.ok) throw new InsightError(gate.reason);
  const [context, followup] = await Promise.all([
    buildContext(projectId, slug),
    prisma.impactFollowup.findUnique({ where: { projectSlug: slug }, select: { externalVerificationNotes: true, celebrationNotes: true } }),
  ]);
  const content = `${context}\n\nVem mer har sett resultaten: ${followup?.externalVerificationNotes ?? "—"}\nLärdomar: ${followup?.celebrationNotes ?? "—"}`;
  const brief = coerceNextStepBrief(await callFillTool(gate.client, NEXT_STEP_SYSTEM_PROMPT, NEXT_STEP_TOOL, content));
  if (!brief.reasons.length) throw new InsightError("empty");
  await prisma.aiInsight.create({ data: { projectId, kind: "IMPACT_NEXT_STEP", content: brief as unknown as Prisma.InputJsonValue } });
  return brief;
}
