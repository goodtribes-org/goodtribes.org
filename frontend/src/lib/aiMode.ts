import type AnthropicSdk from "@anthropic-ai/sdk";
import type { AiMode, ProjectPhase } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { checkAiRateLimit, createAnthropicClient, isAiEnabled } from "@/lib/anthropic";
import { isKnownAiToolKey, type AiToolKey } from "@/lib/aiToolKeys";
import { toDisplayPhase } from "@/lib/projectPhase";

// ─── What a call site is ────────────────────────────────────────────────────

// Every AI call belongs to a feature. The AiToolKey ones are user-visible
// tools with their own ToolAiPreference; the rest are AI steps that have no
// separate tool setting and only follow the step/phase/project levels.
export type AiFeature = AiToolKey | "project-plan" | "translation" | "sandbox-seed" | "dream-conversation";

// What kind of help the call gives, which decides which modes allow it:
//   "agent"  — AI performs the work and writes a result (a card run, a
//              drafted application, an auto-generated plan). Only in AGENT.
//   "assist" — AI helps a human who asked (a suggestion, an estimate, a
//              reply, a review). In AGENT and ASSIST.
// MANUAL allows neither — no AI call is ever made.
export type AiCallKind = "agent" | "assist";

export function isAiCallAllowed(mode: AiMode, kind: AiCallKind): boolean {
  if (mode === "AGENT") return true;
  if (mode === "ASSIST") return kind === "assist";
  return false;
}

// ─── Resolving the mode ─────────────────────────────────────────────────────

// Tools whose ToolAiPreference row already gated them before AI modes
// existed. In a legacy project (Project.aiMode = NULL) only these honour
// their row, and default to "not agent" without one — exactly the old
// behaviour. Every other tool ran unconditionally, so it keeps doing so.
const LEGACY_TOOL_GATED: ReadonlySet<AiFeature> = new Set<AiFeature>(["kanban-agent", "funding-applications"]);

export type AiModeLevels = {
  step?: AiMode | null;
  tool?: AiMode | null;
  phase?: AiMode | null;
  project?: AiMode | null;
};

export type ResolvedAiMode = {
  mode: AiMode;
  // Which level decided — used by the UI to show an inherited mode dimmed
  // and an explicitly chosen one highlighted.
  source: "step" | "tool" | "phase" | "project" | "legacy";
};

// Pure resolution: the most specific explicitly-set level wins, in the order
// step → tool → phase → project. With nothing set, a legacy project (no
// project mode) falls back to what the feature did before AI modes existed.
export function resolveAiModeFrom(levels: AiModeLevels, feature: AiFeature): ResolvedAiMode {
  const isLegacyProject = !levels.project;

  if (levels.step) return { mode: levels.step, source: "step" };
  // A legacy project only ever honoured tool rows for the tools that read
  // them; stray rows for other tools (the settings panel listed them all)
  // never changed anything before, so they don't start to now.
  if (levels.tool && (!isLegacyProject || LEGACY_TOOL_GATED.has(feature))) {
    return { mode: levels.tool, source: "tool" };
  }
  if (levels.phase) return { mode: levels.phase, source: "phase" };
  if (levels.project) return { mode: levels.project, source: "project" };

  // Legacy default: previously-gated tools ran only with an explicit AGENT
  // row (ASSIST blocks agent-kind calls, keeps assist-kind ones working);
  // everything else simply ran.
  return { mode: LEGACY_TOOL_GATED.has(feature) ? "ASSIST" : "AGENT", source: "legacy" };
}

export type AiModeContext = {
  projectId: string;
  feature: AiFeature;
  // A guide/checklist step (InitiativeChecklistItem itemKey), when the call
  // belongs to one.
  stepKey?: string;
  // Defaults to the project's current phase.
  phase?: ProjectPhase;
};

// Reads all levels for one call in a single round of queries.
export async function resolveAiMode(ctx: AiModeContext): Promise<ResolvedAiMode> {
  const project = await prisma.project.findUnique({
    where: { id: ctx.projectId },
    select: { aiMode: true, phase: true },
  });
  if (!project) return { mode: "MANUAL", source: "project" };

  const phase = toDisplayPhase(ctx.phase ?? project.phase);
  const [phaseRow, stepRow, toolRow] = await Promise.all([
    prisma.projectPhaseAiSetting.findUnique({
      where: { projectId_phase: { projectId: ctx.projectId, phase } },
      select: { aiMode: true },
    }),
    ctx.stepKey
      ? prisma.projectStepAiSetting.findUnique({
          where: { projectId_stepKey: { projectId: ctx.projectId, stepKey: ctx.stepKey } },
          select: { aiMode: true },
        })
      : null,
    isKnownAiToolKey(ctx.feature)
      ? prisma.toolAiPreference.findUnique({
          where: { projectId_toolKey: { projectId: ctx.projectId, toolKey: ctx.feature } },
          select: { aiMode: true },
        })
      : null,
  ]);

  return resolveAiModeFrom(
    { step: stepRow?.aiMode, tool: toolRow?.aiMode, phase: phaseRow?.aiMode, project: project.aiMode },
    ctx.feature,
  );
}

// ─── The gate ───────────────────────────────────────────────────────────────

export type AiGateRequest = {
  feature: AiFeature;
  kind: AiCallKind;
  // Rate-limited per user. null only for system jobs (crons) that have no
  // user and are bounded by their own schedule.
  userId: string | null;
  // null for AI calls that don't belong to a project yet (idea feed SDG
  // suggestions, Idéverkstaden threads, the sandbox-seed cron) — those only
  // need AI to be configured.
  projectId: string | null;
  stepKey?: string;
  phase?: ProjectPhase;
};

export type AiGateBlockReason = "not_configured" | "mode" | "rate_limited";

export type AiGateResult =
  | { ok: true; client: AnthropicSdk; mode: AiMode }
  | { ok: false; reason: AiGateBlockReason; mode?: AiMode };

// The ONLY way to get an Anthropic client (enforced by
// __tests__/aiGate.test.ts, which fails if anything else imports
// createAnthropicClient). Order matters: the mode check comes before the
// rate limit so a call blocked by MANUAL doesn't burn the user's quota.
export async function getAiClientFor(req: AiGateRequest): Promise<AiGateResult> {
  if (!isAiEnabled()) return { ok: false, reason: "not_configured" };

  let mode: AiMode = "AGENT";
  if (req.projectId) {
    ({ mode } = await resolveAiMode({
      projectId: req.projectId,
      feature: req.feature,
      stepKey: req.stepKey,
      phase: req.phase,
    }));
    if (!isAiCallAllowed(mode, req.kind)) return { ok: false, reason: "mode", mode };
  }

  if (req.userId && !(await checkAiRateLimit(req.userId))) return { ok: false, reason: "rate_limited", mode };

  const client = await createAnthropicClient();
  if (!client) return { ok: false, reason: "not_configured" };
  return { ok: true, client, mode };
}

// Swedish user-facing message for a blocked call — same wording the call
// sites used before they went through the gate.
export function aiGateMessage(reason: AiGateBlockReason): string {
  switch (reason) {
    case "not_configured":
      return "AI är inte konfigurerad just nu.";
    case "mode":
      return "AI är avstängt för det här i projektets AI-inställningar.";
    case "rate_limited":
      return "För många AI-anrop just nu — försök igen om en stund.";
  }
}

// HTTP status matching each reason, for route handlers.
export function aiGateStatus(reason: AiGateBlockReason): number {
  switch (reason) {
    case "not_configured":
      return 503;
    case "mode":
      return 403;
    case "rate_limited":
      return 429;
  }
}

// ─── Settings as shown in the UI ────────────────────────────────────────────

export type DisplayPhase = Exclude<ProjectPhase, "SPRINT">;

export type ProjectAiSettings = {
  // NULL = a project from before AI modes; see resolveAiModeFrom's legacy default.
  projectMode: AiMode | null;
  aiProjectManager: boolean;
  phaseModes: Partial<Record<DisplayPhase, AiMode>>;
  stepModes: Record<string, AiMode>;
};

// Everything the settings page and the per-step pickers need, in one go.
export async function getProjectAiSettings(projectId: string): Promise<ProjectAiSettings | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      aiMode: true,
      aiProjectManager: true,
      phaseAiSettings: { select: { phase: true, aiMode: true } },
      stepAiSettings: { select: { stepKey: true, aiMode: true } },
    },
  });
  if (!project) return null;
  return {
    projectMode: project.aiMode,
    aiProjectManager: project.aiProjectManager,
    phaseModes: Object.fromEntries(project.phaseAiSettings.map((p) => [toDisplayPhase(p.phase), p.aiMode])),
    stepModes: Object.fromEntries(project.stepAiSettings.map((s) => [s.stepKey, s.aiMode])),
  };
}
