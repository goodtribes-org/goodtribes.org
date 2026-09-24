"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";
import { aiGateMessage, getAiClientFor } from "@/lib/aiMode";
import { recordAiWrite } from "@/lib/fieldProvenance";
import { LEAN_CANVAS_BLOCKS, LEAN_CANVAS_FIELDS } from "@/app/[locale]/projects/[slug]/(workspace)/lean-canvas/fields";
import { VALUE_PROPOSITION_FIELDS } from "@/app/[locale]/projects/[slug]/(workspace)/value-proposition/fields";
import { CANVAS_REVIEW_SYSTEM_PROMPT, CANVAS_REVIEW_TOOL } from "@/lib/prompts/canvasReview";

type CanvasEntity = "leanCanvas" | "valueProposition";

async function requireLeadFor(projectId: string): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!(await hasProjectRole(projectId, session.user.id, PROJECT_LEAD_ROLES))) throw new Error("Forbidden");
  return session.user.id;
}

async function loadSuggestion(id: string) {
  const suggestion = await prisma.aiFieldSuggestion.findUnique({
    where: { id },
    include: { project: { select: { id: true, slug: true } } },
  });
  if (!suggestion || suggestion.status !== "pending") throw new Error("Förslaget finns inte längre");
  if (suggestion.entity !== "leanCanvas" && suggestion.entity !== "valueProposition") throw new Error("Okänt fält");
  return suggestion as typeof suggestion & { entity: CanvasEntity };
}

function revalidate(slug: string) {
  revalidatePath(`/projects/${slug}`, "layout");
}

// "Använd": the human chooses to put the AI's text in the field as-is. It's
// the human's decision, so this may replace existing text — that's exactly
// what they asked for. The field is then an (accepted) AI draft.
export async function applyAiSuggestion(id: string) {
  const s = await loadSuggestion(id);
  const userId = await requireLeadFor(s.project.id);
  const slug = s.project.slug;
  const data = { [s.field]: s.content, updatedById: userId };

  if (s.entity === "leanCanvas") {
    const canvas = await prisma.leanCanvas.upsert({ where: { projectSlug: slug }, create: { projectSlug: slug, ...data }, update: data });
    await prisma.leanCanvasVersion.create({
      data: { projectSlug: slug, savedById: userId, ...Object.fromEntries(LEAN_CANVAS_FIELDS.map((f) => [f, canvas[f]])) },
    });
  } else {
    const canvas = await prisma.valueProposition.upsert({ where: { projectSlug: slug }, create: { projectSlug: slug, ...data }, update: data });
    await prisma.valuePropositionVersion.create({
      data: { projectSlug: slug, savedById: userId, ...Object.fromEntries(VALUE_PROPOSITION_FIELDS.map((f) => [f, canvas[f]])) },
    });
  }
  await recordAiWrite(prisma, { projectId: s.project.id, entity: s.entity, field: s.field, status: "ANTAR" });
  await prisma.aiFieldSuggestion.update({ where: { id }, data: { status: "used", decidedById: userId, decidedAt: new Date() } });
  revalidate(slug);
}

// "Använd delar": called after the human saved their own edited version of
// the field (a normal block save). Marks the field as an edited AI draft
// and closes the suggestion.
export async function markAiSuggestionPartlyUsed(id: string) {
  const s = await loadSuggestion(id);
  const userId = await requireLeadFor(s.project.id);
  await prisma.fieldProvenance.updateMany({
    where: { projectId: s.project.id, entity: s.entity, field: s.field },
    data: { author: "AI_EDITED", updatedById: userId },
  });
  await prisma.aiFieldSuggestion.update({ where: { id }, data: { status: "used", decidedById: userId, decidedAt: new Date() } });
  revalidate(s.project.slug);
}

export async function ignoreAiSuggestion(id: string) {
  const s = await loadSuggestion(id);
  const userId = await requireLeadFor(s.project.id);
  await prisma.aiFieldSuggestion.update({ where: { id }, data: { status: "ignored", decidedById: userId, decidedAt: new Date() } });
  revalidate(s.project.slug);
}

// "Granska det jag skrivit": at most 3 points of feedback on a canvas.
// Assist-level help, so it follows the step's AI mode (never in MANUAL).
export async function reviewCanvas(projectSlug: string, entity: string): Promise<{ points: string[] } | { error: string }> {
  if (entity !== "leanCanvas" && entity !== "valueProposition") return { error: "Okänd canvas" };
  const project = await prisma.project.findUnique({
    where: { slug: projectSlug },
    select: { id: true, title: true, leanCanvas: true, valueProposition: true },
  });
  if (!project) return { error: "Projektet hittades inte" };
  const userId = await requireLeadFor(project.id);

  const gate = await getAiClientFor({
    feature: "canvas-review",
    kind: "assist",
    userId,
    projectId: project.id,
    stepKey: entity === "leanCanvas" ? "lean_canvas_created" : "value_proposition_created",
    language: "project",
  });
  if (!gate.ok) return { error: aiGateMessage(gate.reason) };

  const row = (entity === "leanCanvas" ? project.leanCanvas : project.valueProposition) as Record<string, unknown> | null;
  const fields: readonly string[] = entity === "leanCanvas" ? LEAN_CANVAS_FIELDS : VALUE_PROPOSITION_FIELDS;
  const label = (f: string) => (entity === "leanCanvas" ? LEAN_CANVAS_BLOCKS.find((b) => b.field === f)?.translationKey ?? f : f);
  const filled = fields.filter((f) => typeof row?.[f] === "string" && (row[f] as string).trim());
  if (filled.length === 0) return { error: "Det finns inget att granska än — fyll i några fält först." };

  const content =
    `Projekt: ${project.title}\n\n` +
    fields.map((f) => `${label(f)}: ${typeof row?.[f] === "string" && (row[f] as string).trim() ? row[f] : "(tomt)"}`).join("\n");

  try {
    const response = await gate.client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 800,
      system: CANVAS_REVIEW_SYSTEM_PROMPT,
      tools: [CANVAS_REVIEW_TOOL],
      tool_choice: { type: "tool", name: CANVAS_REVIEW_TOOL.name },
      messages: [{ role: "user", content }],
    });
    const toolUse = response.content.find((b) => b.type === "tool_use");
    const raw = (toolUse && toolUse.type === "tool_use" ? (toolUse.input as { points?: unknown }).points : null) ?? [];
    const points = Array.isArray(raw) ? raw.filter((p): p is string => typeof p === "string" && !!p.trim()).slice(0, 3) : [];
    if (!points.length) return { error: "Kunde inte granska just nu — försök igen." };
    return { points };
  } catch {
    return { error: "Kunde inte granska just nu — försök igen." };
  }
}
