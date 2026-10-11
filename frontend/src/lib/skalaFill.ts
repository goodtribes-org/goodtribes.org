import { stepKeysFor } from "@/lib/phaseWork";
import { getChecklistForPhase } from "@/lib/projectPhase";
import { prisma } from "@/lib/prisma";
import { draftText, type DraftText } from "@/lib/aiLanguage";
import { latestInsight } from "@/lib/ideaInsights";
import type { GateBrief } from "@/lib/phaseGate";
import { coerceTasks } from "@/lib/uppstartFill";
import { tasksToolFor } from "@/lib/prompts/uppstartFill";
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
import { CORE_SYSTEM_PROMPT, CORE_TOOL, SCALE_CHOICE_SYSTEM_PROMPT, SCALE_CHOICE_TOOL, SCALING_PLAN_SYSTEM_PROMPT, SCALING_PLAN_TOOL, SKALA_TASKS_SYSTEM_PROMPT } from "@/lib/prompts/skalaFill";

export const SKALA_SECTIONS = ["plan", "choice", "core", "tasks"] as const;
export type SkalaSection = (typeof SKALA_SECTIONS)[number];
export type SkalaFillStatus = Partial<Record<SkalaSection, PhaseFillState>>;

export function parseSkalaStatus(raw: unknown, updatedAt?: Date, now = Date.now()): SkalaFillStatus {
  return parsePhaseFillStatus(raw, SKALA_SECTIONS, updatedAt, now);
}
export const isSkalaFillInProgress = isPhaseFillInProgress;

// ─── Pure parsing (unit tested) ─────────────────────────────────────────────

export const SCALING_FIELDS = ["goals", "geographies", "capitalPlan", "teamOrLicenseModel"] as const;

export function coerceScalingPlan(raw: unknown): Record<(typeof SCALING_FIELDS)[number], string> {
  const o = (raw ?? {}) as Record<string, unknown>;
  return { goals: fillStr(o.goals), geographies: fillStr(o.geographies), capitalPlan: fillStr(o.capital_plan), teamOrLicenseModel: fillStr(o.team_or_license) };
}

// Kärnan (#331): what must stay the same everywhere, what may be adapted.
export const CORE_FIELDS = ["coreFixed", "coreAdaptable"] as const;

export function coerceCore(raw: unknown): Record<(typeof CORE_FIELDS)[number], string> {
  const o = (raw ?? {}) as Record<string, unknown>;
  return { coreFixed: fillStr(o.core_fixed), coreAdaptable: fillStr(o.core_adaptable) };
}

export function scaleChoiceHtml(raw: unknown, t: DraftText = draftText("sv")): string | null {
  const o = (raw ?? {}) as Record<string, unknown>;
  const recommendation = fillStr(o.recommendation);
  if (!recommendation) return null;
  return wikiHtml(
    [
      { heading: t.hThreeWays, items: fillList(o.options, 3) },
      { heading: t.hRecommendation, text: recommendation },
      { heading: t.hRequirements, items: fillList(o.requirements, 4) },
    ],
    t.draftNoteDecision,
  );
}

// ─── Context ────────────────────────────────────────────────────────────────

const strip = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

export async function buildContext(projectId: string, slug: string): Promise<string> {
  const [project, brief, decision, establishment, wikis, applications, partnerships, metrics, scaling, instances, launch] = await Promise.all([
    prisma.project.findUnique({ where: { id: projectId }, select: { title: true, summary: true, openForReplication: true } }),
    latestInsight<GateBrief>(projectId, "ETABLERA_GATE"),
    prisma.phaseGateDecision.findFirst({ where: { projectId, fromPhase: "ESTABLISH", outcome: "CONTINUE" }, orderBy: { createdAt: "desc" } }),
    prisma.establishmentPlan.findUnique({ where: { projectSlug: slug }, select: { supporterBaseNotes: true } }),
    prisma.wikiPage.findMany({ where: { projectSlug: slug, slug: { in: ["playbook", "finansieringsplan"] } }, select: { slug: true, content: true } }),
    prisma.fundingApplication.findMany({ where: { projectId }, select: { status: true, outcomeAmountSek: true, fundingSource: { select: { name: true } } } }),
    prisma.partnership.findMany({ where: { projectId, status: "active" }, select: { organisation: { select: { name: true } } } }),
    prisma.impactMetric.findMany({ where: { projectSlug: slug }, select: { label: true, unit: true, currentValue: true, _count: { select: { updates: true } } } }),
    prisma.scalingPlan.findUnique({ where: { projectSlug: slug }, select: { goals: true, geographies: true, growthPath: true, coreFixed: true } }),
    prisma.projectInstance.findMany({ where: { parentSlug: slug }, select: { region: true, status: true } }),
    prisma.launchPlan.findUnique({ where: { projectSlug: slug }, select: { budgetOverview: true, whoPays: true } }),
  ]);
  const wiki = (s: string) => wikis.find((w) => w.slug === s)?.content;
  return [
    `Projekt: ${project?.title ?? slug} — ${project?.summary ?? ""}`,
    brief
      ? `Beslutsunderlag vid förra fasgrinden (redo att växa?):\nLäget: ${brief.content.learned.join(" | ")}\nOmråden: ${brief.content.criteriaVerdicts.map((c) => `${c.criterion} = ${c.verdict}`).join(" | ")}\nFokus i Skala: ${brief.content.nextFocus.join(" | ")}`
      : "",
    decision?.note ? `Teamets anteckning vid beslutet: ${decision.note}` : "",
    wiki("playbook") ? `Så här gör vi: ${strip(wiki("playbook")!).slice(0, 1500)}` : "Inget dokument om hur de gör.",
    establishment?.supporterBaseNotes ? `Människor runt projektet: ${establishment.supporterBaseNotes}` : "",
    launch ? `Driften kostar: ${launch.budgetOverview ?? "—"}; vem betalar: ${launch.whoPays ?? "—"}` : "",
    wiki("finansieringsplan") ? `Råd om finansiering: ${strip(wiki("finansieringsplan")!).slice(0, 800)}` : "",
    applications.length ? `Ansökningar: ${applications.map((a) => `${a.fundingSource.name}: ${a.status}${a.outcomeAmountSek ? ` (${a.outcomeAmountSek} kr)` : ""}`).join("; ")}` : "Inga ansökningar.",
    partnerships.length ? `Aktiva samarbeten: ${partnerships.map((p) => p.organisation.name).join(", ")}` : "Inga aktiva samarbeten.",
    `Impact: ${metrics.map((m) => `${m.label} ${m.currentValue} ${m.unit}${m._count.updates ? "" : " (inte rapporterat)"}`).join("; ") || "inga mätetal"}`,
    scaling?.goals ? `Vilka fler de vill nå: ${scaling.goals}${scaling.geographies ? ` — var: ${scaling.geographies}` : ""}` : "",
    scaling?.growthPath ? `Valt sätt att växa: ${scaling.growthPath}` : "",
    scaling?.coreFixed ? `Kärnan som måste vara lika: ${scaling.coreFixed}` : "",
    `Öppet för att andra startar egna: ${project?.openForReplication ? "ja" : "nej"}. Lokala grupper: ${instances.map((i) => `${i.region} (${i.status})`).join(", ") || "inga"}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

// Drafts what AI can do in Skala (#331): the plan's texts, a comparison of
// the four ways to grow and the core; the choice, the new places and the
// money are the team's. Only adds.
export async function startSkalaFill(p: { projectId: string; projectSlug: string; userId: string; only?: SkalaSection[] }) {
  const { projectId, projectSlug: slug } = p;
  await startPhaseFill({
    projectId,
    phase: "SCALE",
    sections: p.only ?? SKALA_SECTIONS,
    buildContext: () => buildContext(projectId, slug),
    work: {
      plan: async ({ client, context, aiUserId }) => {
        const current = await prisma.scalingPlan.findUnique({ where: { projectSlug: slug } });
        if (current && SCALING_FIELDS.every((f) => current[f]?.trim())) return;
        const writes = emptyFieldsToWrite(SCALING_FIELDS, current, coerceScalingPlan(await callFillTool(client, SCALING_PLAN_SYSTEM_PROMPT, SCALING_PLAN_TOOL, context)));
        if (!Object.keys(writes).length) throw new Error("no scaling plan");
        await prisma.scalingPlan.upsert({ where: { projectSlug: slug }, create: { projectSlug: slug, ...writes, updatedById: aiUserId }, update: { ...writes, updatedById: aiUserId } });
      },
      choice: async ({ client, context, aiUserId, t }) => {
        if (await wikiPageExists(slug, "skalningsval")) return;
        const html = scaleChoiceHtml(await callFillTool(client, SCALE_CHOICE_SYSTEM_PROMPT, SCALE_CHOICE_TOOL, context), t);
        if (!html) throw new Error("no scale choice");
        await createWikiPage(slug, "skalningsval", t.titleScaleChoice, html, aiUserId);
      },
      core: async ({ client, context, aiUserId }) => {
        const current = await prisma.scalingPlan.findUnique({ where: { projectSlug: slug }, select: { coreFixed: true, coreAdaptable: true } });
        if (current && CORE_FIELDS.every((f) => current[f]?.trim())) return;
        const writes = emptyFieldsToWrite(CORE_FIELDS, current, coerceCore(await callFillTool(client, CORE_SYSTEM_PROMPT, CORE_TOOL, context)));
        if (!Object.keys(writes).length) throw new Error("no core");
        await prisma.scalingPlan.upsert({ where: { projectSlug: slug }, create: { projectSlug: slug, ...writes, updatedById: aiUserId }, update: { ...writes, updatedById: aiUserId } });
      },
      tasks: async ({ client, context, aiUserId }) => {
        const tasks = coerceTasks(await callFillTool(client, SKALA_TASKS_SYSTEM_PROMPT, tasksToolFor(getChecklistForPhase("SCALE")), context), stepKeysFor("SCALE"));
        if (!tasks.length) throw new Error("no tasks");
        await addAiCards(slug, "SCALE", tasks, aiUserId);
      },
    },
  });
}
