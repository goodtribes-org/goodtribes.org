import type { NextStepDecision, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { draftText, type DraftText } from "@/lib/aiLanguage";
import { getAiClientFor } from "@/lib/aiMode";
import { InsightError, latestInsight } from "@/lib/ideaInsights";
import type { GateBrief } from "@/lib/phaseGate";
import { coerceTasks } from "@/lib/uppstartFill";
import { TASKS_TOOL } from "@/lib/prompts/uppstartFill";
import {
  addAiCards,
  callFillTool,
  createWikiPage,
  emptyFieldsToWrite,
  fillList,
  fillStr,
  isPhaseFillInProgress,
  parsePhaseFillStatus,
  startPhaseFill,
  wikiHtml,
  wikiPageExists,
  type PhaseFillState,
} from "@/lib/phaseFill";
import {
  CELEBRATION_SYSTEM_PROMPT,
  IMPACT_SUMMARY_SYSTEM_PROMPT,
  IMPACT_SUMMARY_TOOL,
  IMPACT_TASKS_SYSTEM_PROMPT,
  NEXT_STEP_SYSTEM_PROMPT,
  NEXT_STEP_TOOL,
  TEXT_TOOL,
  VERIFICATION_SYSTEM_PROMPT,
} from "@/lib/prompts/impactPhaseFill";

export const IMPACT_SECTIONS = ["summary", "verification", "celebration", "tasks"] as const;
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

async function buildContext(projectId: string, slug: string): Promise<string> {
  const [project, metrics, reports, brief, plan, instances, forks, launch, playbook] = await Promise.all([
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
  ]);
  const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "?");
  return [
    `Projekt: ${project?.title ?? slug} — ${project?.summary ?? ""}. Globala mål projektet siktar på: ${project?.sdgGoals.join(", ") || "inga angivna"}.`,
    `Impact-mätetal:\n${
      metrics
        .map((m) => `${m.label}: ${m.currentValue} ${m.unit}${m.targetValue ? ` (mål ${m.targetValue})` : ""}${m.updates.length ? ` — ${m.updates.map((u) => `${day(u.createdAt)} ${u.value}`).join(", ")}` : " — inte rapporterat"}`)
        .join("\n") || "(inga)"
    }`,
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
    playbook ? `Playbook finns: ${strip(playbook.content).slice(0, 500)} …` : "Ingen playbook.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

// ─── The background fill ────────────────────────────────────────────────────

export async function startImpactFill(p: { projectId: string; projectSlug: string; userId: string; only?: ImpactSection[] }) {
  const { projectId, projectSlug: slug } = p;
  const followupField = (field: (typeof FOLLOWUP_FIELDS)[number], system: string, toolName: string) =>
    async ({ client, context, aiUserId }: { client: Parameters<typeof callFillTool>[0]; context: string; aiUserId: string }) => {
      const current = await prisma.impactFollowup.findUnique({ where: { projectSlug: slug } });
      if (current?.[field]?.trim()) return;
      const raw = (await callFillTool(client, system, TEXT_TOOL(toolName, toolName), context)) as { text?: unknown } | null;
      const writes = emptyFieldsToWrite(FOLLOWUP_FIELDS, current, { [field]: fillStr(raw?.text) });
      if (!writes[field]) throw new Error(`no ${field}`);
      await prisma.impactFollowup.upsert({ where: { projectSlug: slug }, create: { projectSlug: slug, ...writes, updatedById: aiUserId }, update: { ...writes, updatedById: aiUserId } });
    };

  await startPhaseFill({
    projectId,
    phase: "IMPACT",
    sections: p.only ?? IMPACT_SECTIONS,
    buildContext: () => buildContext(projectId, slug),
    work: {
      summary: async ({ client, context, aiUserId, t }) => {
        if (await wikiPageExists(slug, "impactsammanfattning")) return;
        const html = impactSummaryHtml(await callFillTool(client, IMPACT_SUMMARY_SYSTEM_PROMPT, IMPACT_SUMMARY_TOOL, context), t);
        if (!html) throw new Error("no impact summary");
        await createWikiPage(slug, "impactsammanfattning", t.titleImpactSummary, html, aiUserId);
      },
      verification: followupField("externalVerificationNotes", VERIFICATION_SYSTEM_PROMPT, "verifiering"),
      celebration: followupField("celebrationNotes", CELEBRATION_SYSTEM_PROMPT, "fira"),
      tasks: async ({ client, context, aiUserId }) => {
        const tasks = coerceTasks(await callFillTool(client, IMPACT_TASKS_SYSTEM_PROMPT, TASKS_TOOL, context));
        if (!tasks.length) throw new Error("no tasks");
        await addAiCards(slug, tasks, aiUserId);
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
  const content = `${context}\n\nVerifieringsplan: ${followup?.externalVerificationNotes ?? "—"}\nFirande: ${followup?.celebrationNotes ?? "—"}`;
  const brief = coerceNextStepBrief(await callFillTool(gate.client, NEXT_STEP_SYSTEM_PROMPT, NEXT_STEP_TOOL, content));
  if (!brief.reasons.length) throw new InsightError("empty");
  await prisma.aiInsight.create({ data: { projectId, kind: "IMPACT_NEXT_STEP", content: brief as unknown as Prisma.InputJsonValue } });
  return brief;
}

// What the phase has done, for the progress chips: ticked, or shown by
// the data (reported metric values, a verified delivered report, notes
// written, a decision taken).
export async function impactStepsDone(projectId: string, slug: string): Promise<Set<string>> {
  const [done, updates, verified, followup] = await Promise.all([
    prisma.initiativeChecklistItem.findMany({ where: { projectId, completedAt: { not: null } }, select: { itemKey: true } }),
    prisma.impactUpdate.count({ where: { impactMetric: { projectSlug: slug } } }),
    prisma.impactReport.count({ where: { projectId, kind: "DELIVERED", verifiedAt: { not: null } } }),
    prisma.impactFollowup.findUnique({ where: { projectSlug: slug }, select: { nextStepDecision: true } }),
  ]);
  const keys = new Set(done.map((d) => d.itemKey));
  if (updates > 0) keys.add("sdg_impact_measured");
  if (verified > 0) keys.add("impact_externally_verified");
  if (followup && followup.nextStepDecision !== "UNDECIDED") keys.add("next_step_decided");
  return keys;
}
