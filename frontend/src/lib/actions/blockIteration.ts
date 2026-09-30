"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";
import { aiGateMessage, getAiClientFor } from "@/lib/aiMode";
import { cachedSystemBlock } from "@/lib/anthropic";
import { createAiSuggestion } from "@/lib/aiSuggestions";
import { STEP_FOR, type CanvasAiEntity } from "@/lib/canvasAi";
import { getCanvasFieldLabels } from "@/lib/canvasFieldLabels";
import { logger } from "@/lib/logger";
import {
  buildIterationContent,
  cleanAnswers,
  ITERATION_MODEL,
  modeNeedsContent,
  parseQuestions,
  parseSuggestion,
} from "@/lib/blockIteration";
import {
  BLOCK_ITERATION_SYSTEM_PROMPT,
  MODE_INSTRUCTIONS,
  QUESTIONS_TOOL,
  SUGGESTION_TOOL,
  type BlockIterationMode,
} from "@/lib/prompts/blockIteration";
import { LEAN_CANVAS_FIELDS } from "@/app/[locale]/projects/[slug]/(workspace)/lean-canvas/fields";
import { VALUE_PROPOSITION_FIELDS } from "@/app/[locale]/projects/[slug]/(workspace)/value-proposition/fields";
import { IMPACT_MODEL_FIELDS } from "@/app/[locale]/projects/[slug]/(workspace)/impact-model/fields";

const FIELDS: Record<CanvasAiEntity, readonly string[]> = {
  leanCanvas: LEAN_CANVAS_FIELDS,
  valueProposition: VALUE_PROPOSITION_FIELDS,
  impactModel: IMPACT_MODEL_FIELDS,
};
const MODES: readonly BlockIterationMode[] = ["sharpen", "simplify", "challenge", "ask", "fromAnswers"];

export type BlockIterationResult =
  | { kind: "suggested"; note: string | null }
  | { kind: "questions"; questions: string[] }
  | { kind: "challenges"; questions: string[] }
  | { error: string };

const FAILED = "Kunde inte ta fram något just nu — försök igen.";

// "Förbättra" on one canvas block. Rewording modes (sharpen, simplify,
// fromAnswers) end as a pending AiFieldSuggestion next to the field — the
// same "Använd / Använd delar / Ignorera" box every AI draft already uses,
// so nothing is ever written into the field without the human choosing it.
// challenge and ask only return questions, never stored. Assist-level help:
// follows the canvas step's AI mode (never in MANUAL) and the weighted
// project budget, like reviewCanvas.
export async function iterateCanvasBlock(
  projectSlug: string,
  entity: string,
  field: string,
  mode: string,
  rawAnswers?: unknown,
): Promise<BlockIterationResult> {
  if (!(entity in FIELDS)) return { error: "Okänd canvas" };
  const e = entity as CanvasAiEntity;
  if (!FIELDS[e].includes(field)) return { error: "Okänt fält" };
  if (!MODES.includes(mode as BlockIterationMode)) return { error: "Okänt läge" };
  const m = mode as BlockIterationMode;
  const answers = cleanAnswers(rawAnswers);
  if (m === "fromAnswers" && !answers.length) return { error: "Svara på minst en fråga först." };

  const project = await prisma.project.findUnique({
    where: { slug: projectSlug },
    select: { id: true, title: true, summary: true, contentLocale: true, leanCanvas: true, valueProposition: true, impactModel: true },
  });
  if (!project) return { error: "Projektet hittades inte" };
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;
  if (!(await hasProjectRole(project.id, userId, PROJECT_LEAD_ROLES))) return { error: "Bara projektledningen kan göra det här." };

  const rows: Record<CanvasAiEntity, Record<string, unknown> | null> = {
    leanCanvas: project.leanCanvas as Record<string, unknown> | null,
    valueProposition: project.valueProposition as Record<string, unknown> | null,
    impactModel: project.impactModel as Record<string, unknown> | null,
  };
  const text = (ent: CanvasAiEntity, f: string) => {
    const v = rows[ent]?.[f];
    return typeof v === "string" && v.trim() ? v.trim() : null;
  };
  const current = text(e, field);
  if (modeNeedsContent(m) && !current) return { error: "Fältet är tomt — välj \"Fråga mig\" för att komma igång." };

  const gate = await getAiClientFor({ feature: "canvas-review", kind: "assist", userId, projectId: project.id, stepKey: STEP_FOR[e], language: "project" });
  if (!gate.ok) return { error: aiGateMessage(gate.reason) };

  const labels = await getCanvasFieldLabels(project.contentLocale);
  const otherFields = (Object.keys(FIELDS) as CanvasAiEntity[]).flatMap((ent) =>
    FIELDS[ent]
      .filter((f) => !(ent === e && f === field))
      .map((f) => ({ label: labels[`${ent}.${f}`] ?? f, value: text(ent, f) }))
      .filter((x): x is { label: string; value: string } => !!x.value),
  );
  const content = buildIterationContent({
    projectTitle: project.title,
    projectSummary: project.summary,
    otherFields,
    fieldLabel: labels[`${e}.${field}`] ?? field,
    fieldValue: current,
    answers: m === "fromAnswers" ? answers : undefined,
  });

  const wantsSuggestion = m === "sharpen" || m === "simplify" || m === "fromAnswers";
  const tool = wantsSuggestion ? SUGGESTION_TOOL : QUESTIONS_TOOL;
  try {
    const response = await gate.client.messages.create({
      model: ITERATION_MODEL[m],
      max_tokens: wantsSuggestion ? 1200 : 600,
      // Shared rules first and cached; the per-mode instruction after it.
      system: [...cachedSystemBlock(BLOCK_ITERATION_SYSTEM_PROMPT), { type: "text", text: MODE_INSTRUCTIONS[m] }],
      tools: [tool],
      tool_choice: { type: "tool", name: tool.name },
      messages: [{ role: "user", content }],
    });
    const toolUse = response.content.find((b) => b.type === "tool_use");
    const input = toolUse && toolUse.type === "tool_use" ? toolUse.input : null;

    if (!wantsSuggestion) {
      const questions = parseQuestions(input, content);
      if (!questions.length) return { error: FAILED };
      return m === "ask" ? { kind: "questions", questions } : { kind: "challenges", questions };
    }

    const suggestion = parseSuggestion(input, content);
    if (!suggestion) return { error: FAILED };
    await createAiSuggestion(prisma, { projectId: project.id, entity: e, field, content: suggestion.text });
    revalidatePath(`/projects/${projectSlug}`, "layout");
    return { kind: "suggested", note: suggestion.note };
  } catch (err) {
    logger.error("block iteration failed", { projectId: project.id, entity: e, field, mode: m, err: String(err) });
    return { error: FAILED };
  }
}
