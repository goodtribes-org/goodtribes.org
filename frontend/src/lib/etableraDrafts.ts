import { getAiClientFor, type AiGateBlockReason } from "@/lib/aiMode";
import { draftText } from "@/lib/aiLanguage";
import { prisma } from "@/lib/prisma";
import { callFillTool } from "@/lib/phaseFill";
import { buildContext, coerceSupporters, ETABLERA_WIKI, type EtableraWikiSlug } from "@/lib/etableraFill";
import { SUPPORTERS_SYSTEM_PROMPT, SUPPORTERS_TOOL } from "@/lib/prompts/etableraFill";

// "Föreslå med AI" on the Etablera steps (#329), like Uppstart's and
// Lansering's: every answer is a draft the page shows, saved only when the
// team picks it. One call per click through getAiClientFor.

export type EtableraDraftKind = EtableraWikiSlug | "supporters";
export const ETABLERA_DRAFT_KINDS: EtableraDraftKind[] = ["playbook", "finansieringsplan", "partnerskap", "supporters"];
export type EtableraDraft = { kind: EtableraDraftKind; html?: string; text?: string };

const STEP_OF: Record<EtableraDraftKind, string> = {
  playbook: "playbook_documented",
  finansieringsplan: "stable_operations_funding",
  partnerskap: "partnerships_formalized",
  supporters: "supporter_base_built",
};

type Gated<T> = { ok: true; value: T } | { ok: false; reason: AiGateBlockReason | "empty" };

export async function draftEtablera(projectId: string, slug: string, userId: string, kind: EtableraDraftKind): Promise<Gated<EtableraDraft>> {
  const gate = await getAiClientFor({ feature: "project-plan", kind: "assist", userId, projectId, stepKey: STEP_OF[kind], phase: "ESTABLISH", language: "project" });
  if (!gate.ok) return { ok: false, reason: gate.reason };
  const context = await buildContext(projectId, slug);
  if (kind === "supporters") {
    const text = coerceSupporters(await callFillTool(gate.client, SUPPORTERS_SYSTEM_PROMPT, SUPPORTERS_TOOL, context));
    return text ? { ok: true, value: { kind, text } } : { ok: false, reason: "empty" };
  }
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { contentLocale: true } });
  const page = ETABLERA_WIKI[kind];
  const html = page.toHtml(await callFillTool(gate.client, page.system, page.tool, context), draftText(project?.contentLocale));
  return html ? { ok: true, value: { kind, html } } : { ok: false, reason: "empty" };
}
