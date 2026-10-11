import { stepKeysFor } from "@/lib/phaseWork";
import { successCriteriaText } from "@/lib/lanseringFill";
import { getChecklistForPhase } from "@/lib/projectPhase";
import { prisma } from "@/lib/prisma";
import {
  addAiCards,
  callFillTool,
  isPhaseFillInProgress,
  parsePhaseFillStatus,
  startPhaseFill,
  type PhaseFillState,
} from "@/lib/phaseFill";
import { getFieldProvenance } from "@/lib/fieldProvenance";
import { latestInsight, type SynthesisContent } from "@/lib/ideaInsights";
import type { GateBrief } from "@/lib/phaseGate";
import { LEAN_CANVAS_FIELDS } from "@/app/[locale]/projects/[slug]/(workspace)/lean-canvas/fields";
import { IMPACT_MODEL_FIELDS } from "@/app/[locale]/projects/[slug]/(workspace)/impact-model/fields";
import { VALUE_PROPOSITION_FIELDS } from "@/app/[locale]/projects/[slug]/(workspace)/value-proposition/fields";
import {
  MVP_SYSTEM_PROMPT,
  MVP_TOOL,
  PILOT_PLAN_SYSTEM_PROMPT,
  PILOT_PLAN_TOOL,
  TASKS_SYSTEM_PROMPT,
  tasksToolFor,
} from "@/lib/prompts/uppstartFill";
import { composeHypothesis, MVP_TYPES, type HypothesisWords } from "@/lib/mvp";
import type { MvpType } from "@prisma/client";

// ─── Fill status (drives the Uppstart page's placeholders) ─────────────────

export const UPPSTART_SECTIONS = ["mvp", "tasks", "plan"] as const;
export type UppstartSection = (typeof UPPSTART_SECTIONS)[number];
export type UppstartFillState = PhaseFillState;
export type UppstartFillStatus = Partial<Record<UppstartSection, UppstartFillState>>;

export function parseUppstartStatus(raw: unknown, updatedAt?: Date, now = Date.now()): UppstartFillStatus {
  return parsePhaseFillStatus(raw, UPPSTART_SECTIONS, updatedAt, now);
}

export const isUppstartFillInProgress = isPhaseFillInProgress;


// ─── Pure parsing (unit tested) ─────────────────────────────────────────────

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}
function list(v: unknown, max: number): string[] {
  return Array.isArray(v) ? v.map(str).filter(Boolean).slice(0, max) : [];
}
// With `steps`, each task keeps the step the AI tied it to — if it is one
// of them; anything else is dropped (the card stays tied to the phase only).
export function coerceTasks(raw: unknown, steps: readonly string[] = []): { title: string; description: string; stepKey: string | null }[] {
  const list = (raw as { tasks?: unknown } | null)?.tasks;
  return (Array.isArray(list) ? list : [])
    .map((x) => {
      const o = (x ?? {}) as Record<string, unknown>;
      const step = str(o.step);
      return { title: str(o.title).slice(0, 200), description: str(o.description), stepKey: steps.includes(step) ? step : null };
    })
    .filter((x) => x.title)
    .slice(0, 7);
}

export type MvpDraft = { hypothesis: string; mvpType: MvpType | null; mvpDescription: string };

// The hypothesis comes in three parts and is stored as the template's one
// sentence in the project's language (composeHypothesis), so the page can
// show it as the same three fields a person fills in.
export function coerceMvp(raw: unknown, words: HypothesisWords): MvpDraft {
  const o = (raw ?? {}) as Record<string, unknown>;
  const type = str(o.mvp_type) as MvpType;
  const parts = { who: str(o.hypothesis_who), what: str(o.hypothesis_what), sign: str(o.hypothesis_sign) };
  return {
    hypothesis: parts.who && parts.what && parts.sign ? composeHypothesis(parts, words) : "",
    mvpType: MVP_TYPES.includes(type) ? type : null,
    mvpDescription: str(o.mvp_description),
  };
}

export const PILOT_PLAN_FIELDS = ["pilotWhere", "pilotWho", "pilotDuration", "pilotTeam", "pilotBudget"] as const;
export type PilotPlanDraft = Record<(typeof PILOT_PLAN_FIELDS)[number], string> & { successCriteria: string[] };

export function coercePilotPlan(raw: unknown): PilotPlanDraft {
  const o = (raw ?? {}) as Record<string, unknown>;
  return {
    pilotWhere: str(o.pilot_where),
    pilotWho: str(o.pilot_who),
    pilotDuration: str(o.pilot_duration),
    pilotTeam: str(o.pilot_team),
    pilotBudget: str(o.pilot_budget),
    successCriteria: list(o.success_criteria, 3),
  };
}

// Never overwrite: only the fields that are still empty get the draft.
export function emptyOnly<K extends string>(keys: readonly K[], current: Partial<Record<K, string | null>> | null, draft: Partial<Record<K, string>>): Partial<Record<K, string>> {
  const out: Partial<Record<K, string>> = {};
  for (const k of keys) if (draft[k] && !current?.[k]?.trim()) out[k] = draft[k];
  return out;
}

// ─── Context ────────────────────────────────────────────────────────────────

async function buildContext(projectId: string, slug: string): Promise<string> {
  const [project, lcProv, vpProv, imProv, brief, synthesis, decision] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      select: {
        title: true, summary: true, description: true, leanCanvas: true, valueProposition: true, impactModel: true,
        _count: { select: { members: { where: { role: { not: "FOLLOWER" } } } } },
      },
    }),
    getFieldProvenance(projectId, "leanCanvas"),
    getFieldProvenance(projectId, "valueProposition"),
    getFieldProvenance(projectId, "impactModel"),
    latestInsight<GateBrief>(projectId, "PHASE_GATE"),
    latestInsight<SynthesisContent>(projectId, "INTERVIEW_SYNTHESIS"),
    prisma.phaseGateDecision.findFirst({ where: { projectId, fromPhase: { in: ["IDEA", "SPRINT"] }, outcome: "CONTINUE" }, orderBy: { createdAt: "desc" } }),
  ]);
  const fields = (entity: string, row: unknown, keys: readonly string[], prov: Record<string, { status: string }>) =>
    keys
      .map((f) => [f, str((row as Record<string, unknown> | null)?.[f])] as const)
      .filter(([, v]) => v)
      .map(([f, v]) => `${entity}.${f} [${prov[f]?.status === "VET" ? "VET" : "ANTAR"}]: ${v}`)
      .join("\n");
  return [
    `Projekt: ${project?.title ?? slug} — ${project?.summary ?? ""}`,
    `Beskrivning: ${(project?.description ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()}`,
    `Antal medlemmar i teamet nu: ${project?._count.members ?? 1}`,
    `Canvas:\n${fields("leanCanvas", project?.leanCanvas, LEAN_CANVAS_FIELDS, lcProv)}\n${fields("valueProposition", project?.valueProposition, VALUE_PROPOSITION_FIELDS, vpProv)}\n${fields("impactModel", project?.impactModel, IMPACT_MODEL_FIELDS, imProv)}`,
    synthesis ? `Lärdomar från ${synthesis.content.interviewCount} intervjuer: ${synthesis.content.learnings.join(" | ")}` : "Inga intervjulärdomar sammanfattade.",
    brief
      ? `Beslutsunderlag från fasgrinden:\nLärt: ${brief.content.learned.join(" | ")}\nFokus härnäst: ${brief.content.nextFocus.join(" | ")}`
      : "",
    decision?.note ? `Teamets anteckning vid beslutet att gå vidare: ${decision.note}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}



// ─── The background fill ────────────────────────────────────────────────────

export type UppstartFillParams = {
  projectId: string;
  projectSlug: string;
  // Checklist items the AI completes are ticked in this person's name.
  userId: string;
  only?: UppstartSection[];
};

// Drafts what AI can do in Uppstart (#320): what to test and the smallest
// version, first tasks, a pilot plan. People build the version and let
// others try it. Every section only fills what is still empty.
// Runs in the background via the shared runner (lib/phaseFill.ts).
export async function startUppstartFill(p: UppstartFillParams): Promise<void> {
  const slug = p.projectSlug;
  await startPhaseFill({
    projectId: p.projectId,
    phase: "PILOT",
    sections: p.only ?? UPPSTART_SECTIONS,
    buildContext: () => buildContext(p.projectId, slug),
    work: {
      mvp: async ({ client, context, aiUserId, t }) => {
        const current = await prisma.projectPlan.findUnique({ where: { projectSlug: slug }, select: { hypothesis: true, mvpType: true, mvpDescription: true } });
        if (current?.hypothesis?.trim() && current.mvpType && current.mvpDescription?.trim()) return;
        const draft = coerceMvp(await callFillTool(client, MVP_SYSTEM_PROMPT, MVP_TOOL, context), t);
        const writes = {
          ...emptyOnly(["hypothesis", "mvpDescription"] as const, current, draft),
          ...(!current?.mvpType && draft.mvpType ? { mvpType: draft.mvpType } : {}),
        };
        if (!Object.keys(writes).length) throw new Error("no mvp draft");
        await prisma.projectPlan.upsert({ where: { projectSlug: slug }, create: { projectSlug: slug, ...writes, updatedById: aiUserId }, update: { ...writes, updatedById: aiUserId } });
      },

      tasks: async ({ client, context, aiUserId }) => {
        const tasks = coerceTasks(await callFillTool(client, TASKS_SYSTEM_PROMPT, tasksToolFor(getChecklistForPhase("PILOT")), context), stepKeysFor("PILOT"));
        if (!tasks.length) throw new Error("no tasks");
        await addAiCards(slug, "PILOT", tasks, aiUserId);
      },

      plan: async ({ client, context, aiUserId, t }) => {
        const [current, evaluation] = await Promise.all([
          prisma.projectPlan.findUnique({ where: { projectSlug: slug } }),
          prisma.pilotEvaluation.findUnique({ where: { projectSlug: slug }, select: { successCriteria: true } }),
        ]);
        const draft = coercePilotPlan(await callFillTool(client, PILOT_PLAN_SYSTEM_PROMPT, PILOT_PLAN_TOOL, context));
        const writes = emptyOnly(PILOT_PLAN_FIELDS, current, draft);
        const criteria = !evaluation?.successCriteria?.trim() && draft.successCriteria.length ? successCriteriaText(draft.successCriteria, t) : null;
        if (!Object.keys(writes).length && !criteria) throw new Error("no pilot plan");
        if (Object.keys(writes).length) {
          await prisma.projectPlan.upsert({ where: { projectSlug: slug }, create: { projectSlug: slug, ...writes, updatedById: aiUserId }, update: { ...writes, updatedById: aiUserId } });
        }
        // A proposal, marked as such in the text — the team sets the real levels.
        if (criteria) {
          await prisma.pilotEvaluation.upsert({ where: { projectSlug: slug }, create: { projectSlug: slug, successCriteria: criteria, updatedById: aiUserId }, update: { successCriteria: criteria, updatedById: aiUserId } });
        }
      },
    },
  });
}
