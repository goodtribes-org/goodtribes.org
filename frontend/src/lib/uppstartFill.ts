import type Anthropic from "@anthropic-ai/sdk";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getAiClientFor } from "@/lib/aiMode";
import { getAiParticipantUser } from "@/lib/aiParticipant";
import { escapeHtml } from "@/lib/renderBody";
import { getFieldProvenance } from "@/lib/fieldProvenance";
import { latestInsight, type SynthesisContent } from "@/lib/ideaInsights";
import type { GateBrief } from "@/lib/phaseGate";
import { LEAN_CANVAS_FIELDS } from "@/app/[locale]/projects/[slug]/(workspace)/lean-canvas/fields";
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

const MODEL = "claude-sonnet-4-6";
const REQUEST_OPTIONS = { timeout: 90_000, maxRetries: 1 };

// ─── Fill status (drives the Uppstart page's placeholders) ─────────────────

export const UPPSTART_SECTIONS = ["team", "sprint", "tasks", "plan"] as const;
export type UppstartSection = (typeof UPPSTART_SECTIONS)[number];
export type UppstartFillState = "pending" | "running" | "done" | "failed" | "skipped";
export type UppstartFillStatus = Partial<Record<UppstartSection, UppstartFillState>>;

const STATES: readonly string[] = ["pending", "running", "done", "failed", "skipped"];
const STALE_AFTER_MS = 5 * 60_000;

// Parses the stored JSON; a section still waiting long after the last
// update was cut short (restart, hung request) and shows as failed so the
// page stops waiting and offers a retry — same rule as the Idé fill.
export function parseUppstartStatus(raw: unknown, updatedAt?: Date, now = Date.now()): UppstartFillStatus {
  const o = (raw ?? {}) as Record<string, unknown>;
  const stale = updatedAt ? now - updatedAt.getTime() >= STALE_AFTER_MS : false;
  const out: UppstartFillStatus = {};
  for (const s of UPPSTART_SECTIONS) {
    const v = o[s];
    if (typeof v !== "string" || !STATES.includes(v)) continue;
    out[s] = stale && (v === "pending" || v === "running") ? "failed" : (v as UppstartFillState);
  }
  return out;
}

export function isUppstartFillInProgress(status: UppstartFillStatus): boolean {
  return Object.values(status).some((s) => s === "pending" || s === "running");
}

async function setState(projectId: string, section: UppstartSection, state: UppstartFillState) {
  await prisma.$executeRaw`
    UPDATE "PhaseFill"
    SET "status" = "status" || jsonb_build_object(${section}::text, ${state}::text), "updatedAt" = NOW()
    WHERE "projectId" = ${projectId} AND "phase" = 'PILOT'::"ProjectPhase"`;
}

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

export function coerceSprintPlan(raw: unknown): SprintPlan | null {
  const o = (raw ?? {}) as Record<string, unknown>;
  const plan: SprintPlan = {
    sprintName: str(o.sprint_name).slice(0, 120) || "Design Sprint 1",
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
export function sprintPlanHtml(p: SprintPlan): string {
  const ul = (items: string[]) => `<ul>${items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>`;
  return [
    p.longTermGoal && `<h2>Långsiktigt mål</h2><p>${escapeHtml(p.longTermGoal)}</p>`,
    `<h2>Sprintfrågor</h2>${ul(p.sprintQuestions)}`,
    p.targetUser && `<h2>Vem vi testar med</h2><p>${escapeHtml(p.targetUser)}</p>`,
    p.hmw.length && `<h2>Hur skulle vi kunna …</h2>${ul(p.hmw)}`,
    p.prototypeHint && `<h2>Enklaste prototypen</h2><p>${escapeHtml(p.prototypeHint)}</p>`,
    p.testQuestions.length && `<h2>Frågor till testpersonerna</h2>${ul(p.testQuestions)}`,
    `<p><em>Utkast från AI:n utifrån Idéfasens underlag — ändra fritt.</em></p>`,
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
  const [project, lcProv, vpProv, brief, synthesis, decision] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      select: {
        title: true, summary: true, description: true, leanCanvas: true, valueProposition: true,
        _count: { select: { members: { where: { role: { not: "FOLLOWER" } } } } },
      },
    }),
    getFieldProvenance(projectId, "leanCanvas"),
    getFieldProvenance(projectId, "valueProposition"),
    latestInsight<GateBrief>(projectId, "PHASE_GATE"),
    latestInsight<SynthesisContent>(projectId, "INTERVIEW_SYNTHESIS"),
    prisma.phaseGateDecision.findFirst({ where: { projectId, outcome: "CONTINUE" }, orderBy: { createdAt: "desc" } }),
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
    `Canvas:\n${fields("leanCanvas", project?.leanCanvas, LEAN_CANVAS_FIELDS, lcProv)}\n${fields("valueProposition", project?.valueProposition, VALUE_PROPOSITION_FIELDS, vpProv)}`,
    synthesis ? `Lärdomar från ${synthesis.content.interviewCount} intervjuer: ${synthesis.content.learnings.join(" | ")}` : "Inga intervjulärdomar sammanfattade.",
    brief
      ? `Beslutsunderlag från fasgrinden:\nLärt: ${brief.content.learned.join(" | ")}\nFokus härnäst: ${brief.content.nextFocus.join(" | ")}`
      : "",
    decision?.note ? `Teamets anteckning vid beslutet att gå vidare: ${decision.note}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

async function callTool(client: Anthropic, system: string, tool: Anthropic.Tool, content: string): Promise<unknown> {
  const response = await client.messages.create(
    {
      model: MODEL,
      max_tokens: 3000,
      system,
      tools: [tool],
      tool_choice: { type: "tool", name: tool.name },
      messages: [{ role: "user", content }],
    },
    REQUEST_OPTIONS,
  );
  const toolUse = response.content.find((b) => b.type === "tool_use");
  return toolUse && toolUse.type === "tool_use" ? toolUse.input : null;
}

async function markDone(projectId: string, itemKey: string, userId: string) {
  await prisma.initiativeChecklistItem.upsert({
    where: { projectId_itemKey: { projectId, itemKey } },
    create: { projectId, phase: "PILOT", itemKey, completedAt: new Date(), completedById: userId },
    update: { completedAt: new Date(), completedById: userId },
  });
}

// ─── The background fill ────────────────────────────────────────────────────

export type UppstartFillParams = {
  projectId: string;
  projectSlug: string;
  // Checklist items the AI completes are ticked in this person's name.
  userId: string;
  only?: UppstartSection[];
};

// Marks the sections pending and runs the fill in the background (the
// app is a persistent Node server, same as the Idé fill).
export async function startUppstartFill(p: UppstartFillParams): Promise<void> {
  const sections = p.only ?? [...UPPSTART_SECTIONS];
  const pending = Object.fromEntries(sections.map((s) => [s, "pending"])) as Prisma.InputJsonObject;
  const existing = await prisma.phaseFill.findUnique({ where: { projectId_phase: { projectId: p.projectId, phase: "PILOT" } } });
  await prisma.phaseFill.upsert({
    where: { projectId_phase: { projectId: p.projectId, phase: "PILOT" } },
    create: { projectId: p.projectId, phase: "PILOT", status: pending },
    update: { status: { ...((existing?.status as Prisma.JsonObject | null) ?? {}), ...pending } },
  });
  void runUppstartFill({ ...p, only: sections }).catch((err) =>
    logger.error("uppstart-fill: crashed", { projectId: p.projectId, err: String(err) }),
  );
}

// Drafts what AI can do in Uppstart; humans form the team, run the sprint
// and build/test the prototype. Every section only adds — it never
// replaces what the team already has (existing roles, sprint, plan text).
export async function runUppstartFill(p: UppstartFillParams): Promise<void> {
  const sections = p.only ?? [...UPPSTART_SECTIONS];
  // Asked for by a person (after the gate or with the button); the
  // project's monthly AI budget applies.
  const gate = await getAiClientFor({ feature: "project-plan", kind: "assist", userId: null, projectId: p.projectId, phase: "PILOT" });
  if (!gate.ok) {
    await Promise.all(sections.map((s) => setState(p.projectId, s, "failed")));
    return;
  }
  const client = gate.client;
  const context = await buildContext(p.projectId, p.projectSlug);
  const aiUser = await getAiParticipantUser();

  const run = async (section: UppstartSection, work: () => Promise<void>) => {
    if (!sections.includes(section)) return;
    await setState(p.projectId, section, "running");
    try {
      await work();
      await setState(p.projectId, section, "done");
    } catch (err) {
      logger.error("uppstart-fill: section failed", { section, projectId: p.projectId, err: String(err) });
      await setState(p.projectId, section, "failed");
    }
  };

  await Promise.all([
    run("team", async () => {
      if (await prisma.projectRoleNeed.count({ where: { projectId: p.projectId } })) return;
      const roles = coerceRoles(await callTool(client, ROLES_SYSTEM_PROMPT, ROLES_TOOL, context));
      if (!roles.length) throw new Error("no roles");
      await prisma.projectRoleNeed.createMany({
        data: roles.map((r, i) => ({ projectId: p.projectId, title: r.title, description: r.description || null, order: i, createdByAi: true })),
      });
    }),

    run("sprint", async () => {
      const [sprintCount, wiki] = await Promise.all([
        prisma.sprint.count({ where: { projectSlug: p.projectSlug } }),
        prisma.wikiPage.findUnique({ where: { projectSlug_slug: { projectSlug: p.projectSlug, slug: "sprintplan" } }, select: { id: true } }),
      ]);
      if (sprintCount && wiki) return;
      const plan = coerceSprintPlan(await callTool(client, SPRINT_SYSTEM_PROMPT, SPRINT_TOOL, context));
      if (!plan) throw new Error("no sprint plan");
      await prisma.$transaction(async (tx) => {
        if (!wiki) {
          const maxOrder = await tx.wikiPage.aggregate({ where: { projectSlug: p.projectSlug }, _max: { order: true } });
          await tx.wikiPage.create({
            data: {
              projectSlug: p.projectSlug,
              slug: "sprintplan",
              title: "Sprintplan",
              content: sprintPlanHtml(plan),
              order: (maxOrder._max.order ?? -1) + 1,
              createdById: aiUser.id,
            },
          });
        }
        if (!sprintCount) {
          // Same shape as createSprint (together, no deadlines — the team
          // picks its pace), with the HMW questions waiting in step 1.
          await tx.sprint.create({
            data: {
              projectSlug: p.projectSlug,
              createdById: p.userId,
              name: plan.sprintName,
              pace: "TOGETHER",
              phases: {
                create: {
                  phase: "UNDERSTAND",
                  status: "OPEN",
                  openedAt: new Date(),
                  contributions: {
                    create: plan.hmw.map((content) => ({ authorId: aiUser.id, type: "HMW" as const, content, visibleAuthor: false })),
                  },
                },
              },
            },
          });
        }
      });
    }),

    run("tasks", async () => {
      const tasks = coerceTasks(await callTool(client, TASKS_SYSTEM_PROMPT, TASKS_TOOL, context));
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
      await markDone(p.projectId, "kanban_seeded", p.userId);
    }),

    run("plan", async () => {
      const current = await prisma.projectPlan.findUnique({ where: { projectSlug: p.projectSlug } });
      if (current && PLAN_FIELDS.every((f) => current[f]?.trim())) return;
      const writes = planFieldsToWrite(current, coercePlan(await callTool(client, PLAN_SYSTEM_PROMPT, PLAN_TOOL, context)));
      if (!Object.keys(writes).length) throw new Error("no plan");
      await prisma.projectPlan.upsert({
        where: { projectSlug: p.projectSlug },
        create: { projectSlug: p.projectSlug, ...writes, updatedById: aiUser.id },
        update: { ...writes, updatedById: aiUser.id },
      });
      if (writes.goal) await markDone(p.projectId, "pilot_scope_defined", p.userId);
      if (writes.resources) await markDone(p.projectId, "rough_budget_estimated", p.userId);
    }),
  ]);
}
