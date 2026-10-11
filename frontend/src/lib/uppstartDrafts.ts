import type { MvpSignal, MvpType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAiClientFor, type AiGateBlockReason } from "@/lib/aiMode";
import { callFillTool } from "@/lib/phaseFill";
import { MVP_TYPES } from "@/lib/mvp";
import { buildContext, coercePilotPlan, type PilotPlanDraft } from "@/lib/uppstartFill";
import {
  HYPOTHESIS_SYSTEM_PROMPT,
  HYPOTHESIS_TOOL,
  MVP_OPTIONS_SYSTEM_PROMPT,
  MVP_OPTIONS_TOOL,
  PILOT_PLAN_SYSTEM_PROMPT,
  PILOT_PLAN_TOOL,
  TEST_SCRIPT_SYSTEM_PROMPT,
  TEST_SCRIPT_TOOL,
  TEST_SUMMARY_SYSTEM_PROMPT,
  TEST_SUMMARY_TOOL,
} from "@/lib/prompts/uppstartFill";

// "Föreslå med AI" on each Uppstart step (#322). Every answer is a draft the
// page shows next to the step; nothing here writes to the project — the
// team picks what to keep and the step's own save action stores it. One
// small call per click, charged to the project's AI budget like any other
// (getAiClientFor), and only where the step isn't set to MANUAL.

export type HypothesisDraft = { who: string; what: string; sign: string; why: string };
export type MvpOption = { type: MvpType; title: string; description: string; needs: string };
export type TestScript = { whoToAsk: string[]; opening: string; questions: string[]; ask: string };
export type TestSummary = { patterns: string[]; strongest: string; missing: string[]; next: string };

export type UppstartDraft =
  | { step: "mvp_hypothesis"; draft: HypothesisDraft }
  | { step: "mvp_built"; draft: MvpOption[] }
  | { step: "mvp_tested"; draft: TestScript }
  | { step: "pilot_planned"; draft: PilotPlanDraft };
export type DraftStep = UppstartDraft["step"];

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const strs = (v: unknown, max: number) => (Array.isArray(v) ? v.map(str).filter(Boolean).slice(0, max) : []);

export function coerceHypothesisDraft(raw: unknown): HypothesisDraft {
  const o = (raw ?? {}) as Record<string, unknown>;
  return { who: str(o.who), what: str(o.what), sign: str(o.sign), why: str(o.why) };
}

export function coerceMvpOptions(raw: unknown): MvpOption[] {
  const list = Array.isArray((raw as { options?: unknown })?.options) ? (raw as { options: unknown[] }).options : [];
  return list
    .map((x) => {
      const o = (x ?? {}) as Record<string, unknown>;
      const type = str(o.type) as MvpType;
      return { type: MVP_TYPES.includes(type) ? type : "OTHER", title: str(o.title), description: str(o.description), needs: str(o.needs) };
    })
    .filter((o) => o.title && o.description)
    .slice(0, 3);
}

export function coerceTestScript(raw: unknown): TestScript {
  const o = (raw ?? {}) as Record<string, unknown>;
  return { whoToAsk: strs(o.who_to_ask, 4), opening: str(o.opening), questions: strs(o.questions, 6), ask: str(o.ask) };
}

export function coerceTestSummary(raw: unknown): TestSummary {
  const o = (raw ?? {}) as Record<string, unknown>;
  return { patterns: strs(o.patterns, 4), strongest: str(o.strongest), missing: strs(o.missing, 3), next: str(o.next) };
}

const SIGNAL_TEXT: Record<MvpSignal, string> = { LIKED: "tyckte det var bra", CONTINUE: "vill fortsätta", HELPING: "hjälper till", PAID: "betalade / lovade att betala" };

// What the team has written in Uppstart so far, after the Idé material.
async function uppstartContext(projectId: string, slug: string): Promise<string> {
  const [base, plan, tests] = await Promise.all([
    buildContext(projectId, slug),
    prisma.projectPlan.findUnique({ where: { projectSlug: slug }, select: { hypothesis: true, mvpType: true, mvpDescription: true } }),
    prisma.mvpTest.findMany({ where: { projectId }, orderBy: { createdAt: "asc" }, select: { who: true, happened: true, signal: true } }),
  ]);
  return [
    base,
    plan?.hypothesis ? `Det teamet tror (hypotesen): ${plan.hypothesis}` : "",
    plan?.mvpDescription ? `Den minsta versionen (${plan.mvpType ?? "OTHER"}): ${plan.mvpDescription}` : "",
    tests.length
      ? `Tester (${tests.length}):\n${tests.map((t) => `- ${t.who}: ${SIGNAL_TEXT[t.signal]}${t.happened ? ` — ${t.happened}` : ""}`).join("\n")}`
      : "Inga tester ännu.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

const STEP_CALLS = {
  mvp_hypothesis: { system: HYPOTHESIS_SYSTEM_PROMPT, tool: HYPOTHESIS_TOOL, coerce: coerceHypothesisDraft },
  mvp_built: { system: MVP_OPTIONS_SYSTEM_PROMPT, tool: MVP_OPTIONS_TOOL, coerce: coerceMvpOptions },
  mvp_tested: { system: TEST_SCRIPT_SYSTEM_PROMPT, tool: TEST_SCRIPT_TOOL, coerce: coerceTestScript },
  pilot_planned: { system: PILOT_PLAN_SYSTEM_PROMPT, tool: PILOT_PLAN_TOOL, coerce: coercePilotPlan },
} as const;

export const DRAFT_STEPS = Object.keys(STEP_CALLS) as DraftStep[];

type Gated<T> = { ok: true; value: T } | { ok: false; reason: AiGateBlockReason | "empty" };

async function gate(projectId: string, userId: string, stepKey: string) {
  return getAiClientFor({ feature: "project-plan", kind: "assist", userId, projectId, stepKey, phase: "PILOT", language: "project" });
}

export async function draftUppstartStep(projectId: string, slug: string, userId: string, step: DraftStep): Promise<Gated<UppstartDraft>> {
  const g = await gate(projectId, userId, step);
  if (!g.ok) return { ok: false, reason: g.reason };
  const call = STEP_CALLS[step];
  const draft = call.coerce(await callFillTool(g.client, call.system, call.tool, await uppstartContext(projectId, slug)));
  const empty =
    step === "mvp_hypothesis" ? !(draft as HypothesisDraft).who
    : step === "mvp_built" ? !(draft as MvpOption[]).length
    : step === "mvp_tested" ? !(draft as TestScript).questions.length
    : !(draft as PilotPlanDraft).pilotWhere && !(draft as PilotPlanDraft).successCriteria.length;
  if (empty) return { ok: false, reason: "empty" };
  return { ok: true, value: { step, draft } as UppstartDraft };
}

// Needs at least MIN_MVP_TESTS tests to say anything; the caller checks.
export async function summarizeMvpTests(projectId: string, slug: string, userId: string): Promise<Gated<TestSummary>> {
  const g = await gate(projectId, userId, "mvp_tested");
  if (!g.ok) return { ok: false, reason: g.reason };
  const summary = coerceTestSummary(await callFillTool(g.client, TEST_SUMMARY_SYSTEM_PROMPT, TEST_SUMMARY_TOOL, await uppstartContext(projectId, slug)));
  return summary.patterns.length || summary.strongest ? { ok: true, value: summary } : { ok: false, reason: "empty" };
}
