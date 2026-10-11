import { stepKeysFor } from "@/lib/phaseWork";
import { getChecklistForPhase } from "@/lib/projectPhase";
import { prisma } from "@/lib/prisma";
import { draftText, type DraftText } from "@/lib/aiLanguage";
import { latestInsight } from "@/lib/ideaInsights";
import type { GateBrief } from "@/lib/phaseGate";
import { coerceTasks } from "@/lib/uppstartFill";
import { isWrittenPhaseWiki } from "@/lib/phaseWikiTemplates";
import { tasksToolFor } from "@/lib/prompts/uppstartFill";
import {
  addAiCards,
  callFillTool,
  createWikiPage,
  fillList,
  fillStr,
  isPhaseFillInProgress,
  parsePhaseFillStatus,
  startPhaseFill,
  wikiHtml,
  type PhaseFillState,
} from "@/lib/phaseFill";
import {
  ETABLERA_TASKS_SYSTEM_PROMPT,
  FUNDING_PLAN_SYSTEM_PROMPT,
  FUNDING_PLAN_TOOL,
  PARTNERSHIPS_SYSTEM_PROMPT,
  PARTNERSHIPS_TOOL,
  PLAYBOOK_SYSTEM_PROMPT,
  PLAYBOOK_TOOL,
  SUPPORTERS_SYSTEM_PROMPT,
  SUPPORTERS_TOOL,
} from "@/lib/prompts/etableraFill";

export const ETABLERA_SECTIONS = ["playbook", "funding", "partners", "supporters", "tasks"] as const;
export type EtableraSection = (typeof ETABLERA_SECTIONS)[number];
export type EtableraFillStatus = Partial<Record<EtableraSection, PhaseFillState>>;

export function parseEtableraStatus(raw: unknown, updatedAt?: Date, now = Date.now()): EtableraFillStatus {
  return parsePhaseFillStatus(raw, ETABLERA_SECTIONS, updatedAt, now);
}
export const isEtableraFillInProgress = isPhaseFillInProgress;


// ─── Pure parsing (unit tested) ─────────────────────────────────────────────

export function fundingPlanHtml(raw: unknown, t: DraftText = draftText("sv")): string | null {
  const o = (raw ?? {}) as Record<string, unknown>;
  const sources = fillList(o.sources, 5);
  if (!sources.length) return null;
  return wikiHtml(
    [
      { heading: t.hCosts, items: fillList(o.costs, 5) },
      { heading: t.hSources, items: sources },
      { heading: t.hRecurring, items: fillList(o.recurring, 3) },
      { heading: t.hNextSteps, items: fillList(o.next_steps, 4) },
    ],
    t.draftNoteFromPilot,
  );
}

export function partnershipsHtml(raw: unknown, t: DraftText = draftText("sv")): string | null {
  const o = (raw ?? {}) as Record<string, unknown>;
  const partners = fillList(o.partners, 5);
  if (!partners.length) return null;
  return wikiHtml(
    [
      { heading: t.hPartners, items: partners },
      { heading: t.hAgreement, items: fillList(o.agreement, 5) },
      { heading: t.hNextSteps, items: fillList(o.next_steps, 4) },
    ],
    t.draftNoteFromPilot,
  );
}

export function playbookHtml(raw: unknown, t: DraftText = draftText("sv")): string | null {
  const o = (raw ?? {}) as Record<string, unknown>;
  const steps = fillList(o.steps, 8);
  if (!steps.length) return null;
  return wikiHtml(
    [
      { heading: t.hWhatThisIs, text: fillStr(o.summary) },
      { heading: t.hRoles, items: fillList(o.roles, 6) },
      { heading: t.hRoutines, items: fillList(o.routines, 5) },
      { heading: t.hGettingStarted, items: steps },
      { heading: t.hPrerequisites, items: fillList(o.prerequisites, 6) },
      { heading: t.hLessons, items: fillList(o.lessons, 5) },
      { heading: t.hWorks, items: fillList(o.measure, 4) },
    ],
    t.draftNoteFromPilot,
  );
}

export function coerceSupporters(raw: unknown): string {
  return fillStr((raw as { supporters?: unknown } | null)?.supporters);
}

// ─── Context ────────────────────────────────────────────────────────────────

const strip = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

export async function buildContext(projectId: string, slug: string): Promise<string> {
  const [project, brief, decision, evaluation, metrics, launch, wikis, establishment, partners] = await Promise.all([
    prisma.project.findUnique({ where: { id: projectId }, select: { title: true, summary: true } }),
    latestInsight<GateBrief>(projectId, "LANSERING_GATE"),
    prisma.phaseGateDecision.findFirst({ where: { projectId, fromPhase: "PRODUCTION", outcome: "CONTINUE" }, orderBy: { createdAt: "desc" } }),
    prisma.pilotEvaluation.findUnique({ where: { projectSlug: slug }, select: { successCriteria: true, resultsSummary: true, executionNotes: true } }),
    prisma.impactMetric.findMany({ where: { projectSlug: slug }, select: { label: true, unit: true, currentValue: true, targetValue: true } }),
    prisma.launchPlan.findUnique({ where: { projectSlug: slug }, select: { targetAudience: true, howToReach: true, budgetOverview: true, whoPays: true } }),
    prisma.wikiPage.findMany({ where: { projectSlug: slug, slug: { in: ["pilotplan", "arbetsfloden"] } }, select: { slug: true, content: true } }),
    prisma.establishmentPlan.findUnique({ where: { projectSlug: slug }, select: { scaledProcessNotes: true } }),
    prisma.marketScanEntry.findMany({ where: { projectSlug: slug, type: "PARTNER_PROSPECT" }, select: { name: true, description: true } }),
  ]);
  const wiki = (s: string) => wikis.find((w) => w.slug === s)?.content;
  return [
    `Projekt: ${project?.title ?? slug} — ${project?.summary ?? ""}`,
    brief
      ? `Beslutsunderlag vid fasgrinden efter piloten:\nPiloten visade: ${brief.content.learned.join(" | ")}\nKriterier: ${brief.content.criteriaVerdicts.map((c) => `${c.criterion} = ${c.verdict}`).join(" | ")}\nOklart: ${brief.content.unanswered.join(" | ") || "inget"}\nFokus i Etablera: ${brief.content.nextFocus.join(" | ")}`
      : "",
    decision?.note ? `Teamets anteckning vid beslutet att gå vidare: ${decision.note}` : "",
    evaluation?.successCriteria ? `Framgångskriterier:\n${evaluation.successCriteria}` : "",
    evaluation?.resultsSummary ? `Pilotens resultat:\n${evaluation.resultsSummary}` : evaluation?.executionNotes ? `Pilotlogg:\n${evaluation.executionNotes}` : "",
    metrics.length ? `Impact: ${metrics.map((m) => `${m.label} ${m.currentValue} ${m.unit}${m.targetValue ? ` (mål ${m.targetValue})` : ""}`).join("; ")}` : "",
    launch ? `Plan framåt: vilka fler ${launch.targetAudience ?? "—"}; hur ${launch.howToReach ?? "—"}; driften kostar ${launch.budgetOverview ?? "—"}; vem betalar ${launch.whoPays ?? "—"}` : "",
    wiki("pilotplan") ? `Pilotplan: ${strip(wiki("pilotplan")!).slice(0, 1500)}` : "",
    wiki("arbetsfloden") ? `Arbetsflöden och ansvar: ${strip(wiki("arbetsfloden")!).slice(0, 1500)}` : "",
    establishment?.scaledProcessNotes ? `Processen (äldre anteckning): ${establishment.scaledProcessNotes}` : "",
    partners.length ? `Möjliga partner från omvärldsbevakningen: ${partners.map((p) => `${p.name} — ${p.description}`).join(" | ")}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

// ─── The phase's wiki pages ─────────────────────────────────────────────────

// The pages the AI can draft in Etablera: "Så här gör vi" (the playbook)
// and advice on funding and partnerships.
export const ETABLERA_WIKI = {
  playbook: { title: (t: DraftText) => t.titlePlaybook, system: PLAYBOOK_SYSTEM_PROMPT, tool: PLAYBOOK_TOOL, toHtml: playbookHtml },
  finansieringsplan: { title: (t: DraftText) => t.titleFundingPlan, system: FUNDING_PLAN_SYSTEM_PROMPT, tool: FUNDING_PLAN_TOOL, toHtml: fundingPlanHtml },
  partnerskap: { title: (t: DraftText) => t.titlePartnerships, system: PARTNERSHIPS_SYSTEM_PROMPT, tool: PARTNERSHIPS_TOOL, toHtml: partnershipsHtml },
} as const;
export type EtableraWikiSlug = keyof typeof ETABLERA_WIKI;

// Written = real text, not an untouched "Skriv själv" template.
export async function isEtableraWikiWritten(projectSlug: string, wikiSlug: EtableraWikiSlug): Promise<boolean> {
  const page = await prisma.wikiPage.findUnique({ where: { projectSlug_slug: { projectSlug, slug: wikiSlug } }, select: { content: true } });
  return isWrittenPhaseWiki(wikiSlug, page?.content);
}

// Creates the page, or fills one that is still the untouched template;
// never replaces text someone wrote (false then).
export async function saveEtableraWiki(projectSlug: string, wikiSlug: EtableraWikiSlug, html: string, authorId: string, t: DraftText): Promise<boolean> {
  const page = await prisma.wikiPage.findUnique({ where: { projectSlug_slug: { projectSlug, slug: wikiSlug } }, select: { id: true, content: true } });
  if (page && isWrittenPhaseWiki(wikiSlug, page.content)) return false;
  if (page) await prisma.wikiPage.update({ where: { id: page.id }, data: { content: html, title: ETABLERA_WIKI[wikiSlug].title(t) } });
  else await createWikiPage(projectSlug, wikiSlug, ETABLERA_WIKI[wikiSlug].title(t), html, authorId);
  return true;
}

// ─── The background fill ────────────────────────────────────────────────────

// Drafts what AI can do in Etablera (#329): "Så här gör vi" (the playbook
// page), funding and partnership advice, a text about the people around the
// project and the first tasks; people secure the money, sign agreements and
// ask for the review. Only adds — existing pages and text are left alone.
export async function startEtableraFill(p: { projectId: string; projectSlug: string; userId: string; only?: EtableraSection[] }) {
  const { projectId, projectSlug: slug } = p;
  const wikiSection = (wikiSlug: EtableraWikiSlug, system: string, tool: Parameters<typeof callFillTool>[2], toHtml: (raw: unknown, t: DraftText) => string | null) =>
    async ({ client, context, aiUserId, t }: { client: Parameters<typeof callFillTool>[0]; context: string; aiUserId: string; t: DraftText }) => {
      if (await isEtableraWikiWritten(slug, wikiSlug)) return;
      const html = toHtml(await callFillTool(client, system, tool, context), t);
      if (!html) throw new Error(`no ${wikiSlug}`);
      await saveEtableraWiki(slug, wikiSlug, html, aiUserId, t);
    };
  await startPhaseFill({
    projectId,
    phase: "ESTABLISH",
    sections: p.only ?? ETABLERA_SECTIONS,
    buildContext: () => buildContext(projectId, slug),
    work: {
      supporters: async ({ client, context, aiUserId }) => {
        const current = await prisma.establishmentPlan.findUnique({ where: { projectSlug: slug }, select: { supporterBaseNotes: true } });
        if (current?.supporterBaseNotes?.trim()) return;
        const supporterBaseNotes = coerceSupporters(await callFillTool(client, SUPPORTERS_SYSTEM_PROMPT, SUPPORTERS_TOOL, context));
        if (!supporterBaseNotes) throw new Error("no supporters");
        await prisma.establishmentPlan.upsert({
          where: { projectSlug: slug },
          create: { projectSlug: slug, supporterBaseNotes, updatedById: aiUserId },
          update: { supporterBaseNotes, updatedById: aiUserId },
        });
      },
      funding: wikiSection("finansieringsplan", FUNDING_PLAN_SYSTEM_PROMPT, FUNDING_PLAN_TOOL, fundingPlanHtml),
      partners: wikiSection("partnerskap", PARTNERSHIPS_SYSTEM_PROMPT, PARTNERSHIPS_TOOL, partnershipsHtml),
      playbook: wikiSection("playbook", PLAYBOOK_SYSTEM_PROMPT, PLAYBOOK_TOOL, playbookHtml),
      tasks: async ({ client, context, aiUserId }) => {
        const tasks = coerceTasks(await callFillTool(client, ETABLERA_TASKS_SYSTEM_PROMPT, tasksToolFor(getChecklistForPhase("ESTABLISH")), context), stepKeysFor("ESTABLISH"));
        if (!tasks.length) throw new Error("no tasks");
        await addAiCards(slug, "ESTABLISH", tasks, aiUserId);
      },
    },
  });
}
