import { prisma } from "@/lib/prisma";
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
import { escapeHtml } from "@/lib/renderBody";
import { draftText, type DraftText } from "@/lib/aiLanguage";
import { getFieldProvenance } from "@/lib/fieldProvenance";
import { latestInsight, type SynthesisContent } from "@/lib/ideaInsights";
import type { GateBrief } from "@/lib/phaseGate";
import { LEAN_CANVAS_FIELDS } from "@/app/[locale]/projects/[slug]/(workspace)/lean-canvas/fields";
import { IMPACT_MODEL_FIELDS } from "@/app/[locale]/projects/[slug]/(workspace)/impact-model/fields";
import { VALUE_PROPOSITION_FIELDS } from "@/app/[locale]/projects/[slug]/(workspace)/value-proposition/fields";
import {
  PLAN_SYSTEM_PROMPT,
  PLAN_TOOL,
  ROLES_SYSTEM_PROMPT,
  ROLES_TOOL,
  SPRINT_SYSTEM_PROMPT,
  SPRINT_TOOL,
  TASKS_SYSTEM_PROMPT,
  TASKS_TOOL,
} from "@/lib/prompts/uppstartFill";

// ─── Fill status (drives the Uppstart page's placeholders) ─────────────────

export const UPPSTART_SECTIONS = ["team", "sprint", "tasks", "plan"] as const;
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
function titled(v: unknown, max: number): { title: string; description: string }[] {
  return (Array.isArray(v) ? v : [])
    .map((x) => {
      const o = (x ?? {}) as Record<string, unknown>;
      return { title: str(o.title).slice(0, 200), description: str(o.description) };
    })
    .filter((x) => x.title)
    .slice(0, max);
}

export function coerceRoles(raw: unknown) {
  return titled((raw as { roles?: unknown } | null)?.roles, 5);
}

export function coerceTasks(raw: unknown) {
  return titled((raw as { tasks?: unknown } | null)?.tasks, 7);
}

export type SprintPlan = {
  sprintName: string;
  longTermGoal: string;
  sprintQuestions: string[];
  targetUser: string;
  hmw: string[];
  prototypeHint: string;
  testQuestions: string[];
};

export function coerceSprintPlan(raw: unknown, t: DraftText = draftText("sv")): SprintPlan | null {
  const o = (raw ?? {}) as Record<string, unknown>;
  const plan: SprintPlan = {
    sprintName: str(o.sprint_name).slice(0, 120) || t.defaultSprintName,
    longTermGoal: str(o.long_term_goal),
    sprintQuestions: list(o.sprint_questions, 4),
    targetUser: str(o.target_user),
    hmw: list(o.hmw, 6),
    prototypeHint: str(o.prototype_hint),
    testQuestions: list(o.test_questions, 6),
  };
  // Without the questions the sprint is meant to answer, there's no plan.
  return plan.sprintQuestions.length ? plan : null;
}

// The sprint plan as a wiki page — escaped, so model output can never
// inject markup.
export function sprintPlanHtml(p: SprintPlan, t: DraftText = draftText("sv")): string {
  const ul = (items: string[]) => `<ul>${items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>`;
  return [
    p.longTermGoal && `<h2>${escapeHtml(t.hLongTermGoal)}</h2><p>${escapeHtml(p.longTermGoal)}</p>`,
    `<h2>${escapeHtml(t.hSprintQuestions)}</h2>${ul(p.sprintQuestions)}`,
    p.targetUser && `<h2>${escapeHtml(t.hTargetUser)}</h2><p>${escapeHtml(p.targetUser)}</p>`,
    p.hmw.length && `<h2>${escapeHtml(t.hHmw)}</h2>${ul(p.hmw)}`,
    p.prototypeHint && `<h2>${escapeHtml(t.hPrototype)}</h2><p>${escapeHtml(p.prototypeHint)}</p>`,
    p.testQuestions.length && `<h2>${escapeHtml(t.hTestQuestions)}</h2>${ul(p.testQuestions)}`,
    `<p><em>${escapeHtml(t.draftNoteFromIdea)}</em></p>`,
  ]
    .filter(Boolean)
    .join("\n");
}

export const PLAN_FIELDS = ["goal", "milestones", "resources", "risks"] as const;
export type PlanDraft = Record<(typeof PLAN_FIELDS)[number], string>;

export function coercePlan(raw: unknown): PlanDraft {
  const o = (raw ?? {}) as Record<string, unknown>;
  return { goal: str(o.goal), milestones: str(o.milestones), resources: str(o.resources), risks: str(o.risks) };
}

// Never overwrite: only the plan fields that are still empty get the draft.
export function planFieldsToWrite(current: Partial<Record<(typeof PLAN_FIELDS)[number], string | null>> | null, draft: PlanDraft): Partial<PlanDraft> {
  const out: Partial<PlanDraft> = {};
  for (const f of PLAN_FIELDS) if (draft[f] && !current?.[f]?.trim()) out[f] = draft[f];
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

// Drafts what AI can do in Uppstart; humans form the team, run the sprint
// and build/test the prototype. Every section only adds — it never
// replaces what the team already has (existing roles, sprint, plan text).
// Runs in the background via the shared runner (lib/phaseFill.ts).
export async function startUppstartFill(p: UppstartFillParams): Promise<void> {
  const slug = p.projectSlug;
  await startPhaseFill({
    projectId: p.projectId,
    phase: "PILOT",
    sections: p.only ?? UPPSTART_SECTIONS,
    buildContext: () => buildContext(p.projectId, slug),
    work: {
      team: async ({ client, context }) => {
        if (await prisma.projectRoleNeed.count({ where: { projectId: p.projectId } })) return;
        const roles = coerceRoles(await callFillTool(client, ROLES_SYSTEM_PROMPT, ROLES_TOOL, context));
        if (!roles.length) throw new Error("no roles");
        await prisma.projectRoleNeed.createMany({
          data: roles.map((r, i) => ({ projectId: p.projectId, title: r.title, description: r.description || null, order: i, createdByAi: true })),
        });
      },

      sprint: async ({ client, context, aiUserId, t }) => {
        const [sprintCount, wiki] = await Promise.all([prisma.sprint.count({ where: { projectSlug: slug } }), wikiPageExists(slug, "sprintplan")]);
        if (sprintCount && wiki) return;
        const plan = coerceSprintPlan(await callFillTool(client, SPRINT_SYSTEM_PROMPT, SPRINT_TOOL, context), t);
        if (!plan) throw new Error("no sprint plan");
        if (!wiki) await createWikiPage(slug, "sprintplan", t.titleSprintPlan, sprintPlanHtml(plan, t), aiUserId);
        if (!sprintCount) {
          // Same shape as createSprint (together, no deadlines — the team
          // picks its pace), with the HMW questions waiting in step 1.
          await prisma.sprint.create({
            data: {
              projectSlug: slug,
              createdById: p.userId,
              name: plan.sprintName,
              pace: "TOGETHER",
              phases: {
                create: {
                  phase: "UNDERSTAND",
                  status: "OPEN",
                  openedAt: new Date(),
                  contributions: { create: plan.hmw.map((content) => ({ authorId: aiUserId, type: "HMW" as const, content, visibleAuthor: false })) },
                },
              },
            },
          });
        }
      },

      tasks: async ({ client, context, aiUserId }) => {
        const tasks = coerceTasks(await callFillTool(client, TASKS_SYSTEM_PROMPT, TASKS_TOOL, context));
        if (!tasks.length) throw new Error("no tasks");
        await addAiCards(slug, tasks, aiUserId);
        await markStepDone(p.projectId, "PILOT", "kanban_seeded", p.userId);
      },

      plan: async ({ client, context, aiUserId }) => {
        const current = await prisma.projectPlan.findUnique({ where: { projectSlug: slug } });
        if (current && PLAN_FIELDS.every((f) => current[f]?.trim())) return;
        const writes = planFieldsToWrite(current, coercePlan(await callFillTool(client, PLAN_SYSTEM_PROMPT, PLAN_TOOL, context)));
        if (!Object.keys(writes).length) throw new Error("no plan");
        await prisma.projectPlan.upsert({ where: { projectSlug: slug }, create: { projectSlug: slug, ...writes, updatedById: aiUserId }, update: { ...writes, updatedById: aiUserId } });
        if (writes.goal) await markStepDone(p.projectId, "PILOT", "pilot_scope_defined", p.userId);
        if (writes.resources) await markStepDone(p.projectId, "PILOT", "rough_budget_estimated", p.userId);
      },
    },
  });
}
