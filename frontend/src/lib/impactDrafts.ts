import { getAiClientFor, type AiGateBlockReason } from "@/lib/aiMode";
import { callFillTool, fillStr } from "@/lib/phaseFill";
import { buildContext } from "@/lib/impactPhaseFill";
import { LESSONS_SYSTEM_PROMPT, STORY_SYSTEM_PROMPT, TEXT_TOOL } from "@/lib/prompts/impactPhaseFill";

// "Föreslå med AI" in Impact (#334): the story and the lessons, as drafts
// the team picks or discards — like the earlier phases.

export type ImpactDraftKind = "story" | "lessons";
export const IMPACT_DRAFT_KINDS: ImpactDraftKind[] = ["story", "lessons"];

const CALL: Record<ImpactDraftKind, { system: string; tool: string; step: string }> = {
  story: { system: STORY_SYSTEM_PROMPT, tool: "berattelse", step: "sdg_impact_measured" },
  lessons: { system: LESSONS_SYSTEM_PROMPT, tool: "lardomar", step: "results_celebrated" },
};

export async function draftImpact(projectId: string, slug: string, userId: string, kind: ImpactDraftKind): Promise<{ ok: true; text: string } | { ok: false; reason: AiGateBlockReason | "empty" }> {
  const c = CALL[kind];
  const gate = await getAiClientFor({ feature: "project-plan", kind: "assist", userId, projectId, stepKey: c.step, phase: "IMPACT", language: "project" });
  if (!gate.ok) return { ok: false, reason: gate.reason };
  const raw = (await callFillTool(gate.client, c.system, TEXT_TOOL(c.tool, c.tool), await buildContext(projectId, slug))) as { text?: unknown } | null;
  const text = fillStr(raw?.text);
  return text ? { ok: true, text } : { ok: false, reason: "empty" };
}
