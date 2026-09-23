import { prisma } from "@/lib/prisma";
import { latestInsight } from "@/lib/ideaInsights";
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
  markStepDone,
  parsePhaseFillStatus,
  startPhaseFill,
  wikiHtml,
  wikiPageExists,
  type PhaseFillState,
} from "@/lib/phaseFill";
import {
  ESTABLISHMENT_PLAN_SYSTEM_PROMPT,
  ESTABLISHMENT_PLAN_TOOL,
  ETABLERA_TASKS_SYSTEM_PROMPT,
  FUNDING_PLAN_SYSTEM_PROMPT,
  FUNDING_PLAN_TOOL,
  PARTNERSHIPS_SYSTEM_PROMPT,
  PARTNERSHIPS_TOOL,
  PLAYBOOK_SYSTEM_PROMPT,
  PLAYBOOK_TOOL,
} from "@/lib/prompts/etableraFill";

export const ETABLERA_SECTIONS = ["plan", "funding", "partners", "playbook", "tasks"] as const;
export type EtableraSection = (typeof ETABLERA_SECTIONS)[number];
export type EtableraFillStatus = Partial<Record<EtableraSection, PhaseFillState>>;

export function parseEtableraStatus(raw: unknown, updatedAt?: Date, now = Date.now()): EtableraFillStatus {
  return parsePhaseFillStatus(raw, ETABLERA_SECTIONS, updatedAt, now);
}
export const isEtableraFillInProgress = isPhaseFillInProgress;

const NOTE = "Utkast från AI:n utifrån pilotens resultat — ändra fritt.";

// ─── Pure parsing (unit tested) ─────────────────────────────────────────────

export function fundingPlanHtml(raw: unknown): string | null {
  const o = (raw ?? {}) as Record<string, unknown>;
  const sources = fillList(o.sources, 5);
  if (!sources.length) return null;
  return wikiHtml(
    [
      { heading: "Vad driften kräver", items: fillList(o.costs, 5) },
      { heading: "Möjliga finansieringskällor", items: sources },
      { heading: "Så blir finansieringen återkommande", items: fillList(o.recurring, 3) },
      { heading: "Nästa steg", items: fillList(o.next_steps, 4) },
    ],
    NOTE,
  );
}

export function partnershipsHtml(raw: unknown): string | null {
  const o = (raw ?? {}) as Record<string, unknown>;
  const partners = fillList(o.partners, 5);
  if (!partners.length) return null;
  return wikiHtml(
    [
      { heading: "Partner att formalisera samarbete med", items: partners },
      { heading: "Det ett samarbetsavtal bör reglera", items: fillList(o.agreement, 5) },
      { heading: "Nästa steg", items: fillList(o.next_steps, 4) },
    ],
    NOTE,
  );
}

export function playbookHtml(raw: unknown): string | null {
  const o = (raw ?? {}) as Record<string, unknown>;
  const steps = fillList(o.steps, 8);
  if (!steps.length) return null;
  return wikiHtml(
    [
      { heading: "Vad det här är", text: fillStr(o.summary) },
      { heading: "Det här behöver finnas innan ni startar", items: fillList(o.prerequisites, 6) },
      { heading: "Så kommer ni igång", items: steps },
      { heading: "Roller", items: fillList(o.roles, 6) },
      { heading: "Rutiner", items: fillList(o.routines, 5) },
      { heading: "Lärdomar och fallgropar", items: fillList(o.lessons, 5) },
      { heading: "Så vet ni att det fungerar", items: fillList(o.measure, 4) },
    ],
    NOTE,
  );
}

export const ESTABLISHMENT_FIELDS = ["scaledProcessNotes", "supporterBaseNotes"] as const;

export function coerceEstablishmentPlan(raw: unknown): Record<(typeof ESTABLISHMENT_FIELDS)[number], string> {
  const o = (raw ?? {}) as Record<string, unknown>;
  return { scaledProcessNotes: fillStr(o.scaled_process), supporterBaseNotes: fillStr(o.supporter_base) };
}

// ─── Context ────────────────────────────────────────────────────────────────

const strip = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

async function buildContext(projectId: string, slug: string): Promise<string> {
  const [project, brief, decision, evaluation, metrics, launch, wikis, roles, partners] = await Promise.all([
    prisma.project.findUnique({ where: { id: projectId }, select: { title: true, summary: true } }),
    latestInsight<GateBrief>(projectId, "LANSERING_GATE"),
    prisma.phaseGateDecision.findFirst({ where: { projectId, fromPhase: "PRODUCTION", outcome: "CONTINUE" }, orderBy: { createdAt: "desc" } }),
    prisma.pilotEvaluation.findUnique({ where: { projectSlug: slug }, select: { successCriteria: true, resultsSummary: true, executionNotes: true } }),
    prisma.impactMetric.findMany({ where: { projectSlug: slug }, select: { label: true, unit: true, currentValue: true, targetValue: true } }),
    prisma.launchPlan.findUnique({ where: { projectSlug: slug }, select: { targetAudience: true, channels: { select: { name: true } } } }),
    prisma.wikiPage.findMany({ where: { projectSlug: slug, slug: { in: ["pilotplan", "arbetsfloden"] } }, select: { slug: true, content: true } }),
    prisma.projectRoleNeed.findMany({ where: { projectId }, select: { title: true, filledById: true } }),
    prisma.marketScanEntry.findMany({ where: { projectSlug: slug, type: "PARTNER_PROSPECT" }, select: { name: true, description: true } }),
  ]);
  const wiki = (s: string) => wikis.find((w) => w.slug === s)?.content;
  return [
    `Projekt: ${project?.title ?? slug} — ${project?.summary ?? ""}`,
    brief
      ? `Beslutsunderlag vid pilotens go/no-go:\nPiloten visade: ${brief.content.learned.join(" | ")}\nKriterier: ${brief.content.criteriaVerdicts.map((c) => `${c.criterion} = ${c.verdict}`).join(" | ")}\nOklart: ${brief.content.unanswered.join(" | ") || "inget"}\nFokus i Etablera: ${brief.content.nextFocus.join(" | ")}`
      : "",
    decision?.note ? `Teamets anteckning vid go-beslutet: ${decision.note}` : "",
    evaluation?.successCriteria ? `Framgångskriterier:\n${evaluation.successCriteria}` : "",
    evaluation?.resultsSummary ? `Pilotens resultat:\n${evaluation.resultsSummary}` : evaluation?.executionNotes ? `Pilotlogg:\n${evaluation.executionNotes}` : "",
    metrics.length ? `Impact: ${metrics.map((m) => `${m.label} ${m.currentValue} ${m.unit}${m.targetValue ? ` (mål ${m.targetValue})` : ""}`).join("; ")}` : "",
    launch ? `Målgrupp: ${launch.targetAudience ?? "—"}; kanaler: ${launch.channels.map((c) => c.name).join(", ") || "—"}` : "",
    wiki("pilotplan") ? `Pilotplan: ${strip(wiki("pilotplan")!).slice(0, 1500)}` : "",
    wiki("arbetsfloden") ? `Arbetsflöden och ansvar: ${strip(wiki("arbetsfloden")!).slice(0, 1500)}` : "",
    `Kärnteam: ${roles.map((r) => `${r.title} (${r.filledById ? "tillsatt" : "vakant"})`).join(", ") || "inga roller definierade"}`,
    partners.length ? `Möjliga partner från omvärldsbevakningen: ${partners.map((p) => `${p.name} — ${p.description}`).join(" | ")}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

// ─── The background fill ────────────────────────────────────────────────────

// Drafts what AI can do in Etablera; people secure funding, sign
// agreements, grow the community and ask for the review. Only adds —
// existing wiki pages and plan text are left alone.
export async function startEtableraFill(p: { projectId: string; projectSlug: string; userId: string; only?: EtableraSection[] }) {
  const { projectId, projectSlug: slug, userId } = p;
  const wikiSection = (wikiSlug: string, title: string, system: string, tool: Parameters<typeof callFillTool>[2], toHtml: (raw: unknown) => string | null, tick?: string) =>
    async ({ client, context, aiUserId }: { client: Parameters<typeof callFillTool>[0]; context: string; aiUserId: string }) => {
      if (await wikiPageExists(slug, wikiSlug)) return;
      const html = toHtml(await callFillTool(client, system, tool, context));
      if (!html) throw new Error(`no ${wikiSlug}`);
      await createWikiPage(slug, wikiSlug, title, html, aiUserId);
      if (tick) await markStepDone(projectId, "ESTABLISH", tick, userId);
    };

  await startPhaseFill({
    projectId,
    phase: "ESTABLISH",
    sections: p.only ?? ETABLERA_SECTIONS,
    buildContext: () => buildContext(projectId, slug),
    work: {
      plan: async ({ client, context, aiUserId }) => {
        const current = await prisma.establishmentPlan.findUnique({ where: { projectSlug: slug } });
        if (current && ESTABLISHMENT_FIELDS.every((f) => current[f]?.trim())) return;
        const writes = emptyFieldsToWrite(ESTABLISHMENT_FIELDS, current, coerceEstablishmentPlan(await callFillTool(client, ESTABLISHMENT_PLAN_SYSTEM_PROMPT, ESTABLISHMENT_PLAN_TOOL, context)));
        if (!Object.keys(writes).length) throw new Error("no establishment plan");
        await prisma.establishmentPlan.upsert({
          where: { projectSlug: slug },
          create: { projectSlug: slug, ...writes, updatedById: aiUserId },
          update: { ...writes, updatedById: aiUserId },
        });
      },
      funding: wikiSection("finansieringsplan", "Finansieringsplan", FUNDING_PLAN_SYSTEM_PROMPT, FUNDING_PLAN_TOOL, fundingPlanHtml),
      partners: wikiSection("partnerskap", "Partnerskap", PARTNERSHIPS_SYSTEM_PROMPT, PARTNERSHIPS_TOOL, partnershipsHtml),
      playbook: wikiSection("playbook", "Playbook", PLAYBOOK_SYSTEM_PROMPT, PLAYBOOK_TOOL, playbookHtml, "playbook_documented"),
      tasks: async ({ client, context, aiUserId }) => {
        const tasks = coerceTasks(await callFillTool(client, ETABLERA_TASKS_SYSTEM_PROMPT, TASKS_TOOL, context));
        if (!tasks.length) throw new Error("no tasks");
        await addAiCards(slug, tasks, aiUserId);
      },
    },
  });
}
