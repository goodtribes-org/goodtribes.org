import type Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { getAiParticipantUser } from "@/lib/aiParticipant";
import { researchMarket } from "@/lib/ideaFill";
import { LEAN_CANVAS_FIELDS } from "@/app/[locale]/projects/[slug]/(workspace)/lean-canvas/fields";
import { IMPACT_MODEL_FIELDS } from "@/app/[locale]/projects/[slug]/(workspace)/impact-model/fields";

// The market scan follows the canvas (#207): the AI searches from the
// project's own canvas, ties every find to the canvas field it speaks to,
// and drafts the scan's conclusion from what it found. Shared by the Idé
// fill and the phase page's "Ta fram omvärldsbevakningen".

export const MARKET_SCAN_FIELD_KEYS = [
  ...LEAN_CANVAS_FIELDS.map((f) => `leanCanvas.${f}`),
  ...IMPACT_MODEL_FIELDS.map((f) => `impactModel.${f}`),
];

// Project text plus every filled canvas field, keyed as the model must
// answer them (linked_field).
export async function marketScanContext(projectSlug: string): Promise<string> {
  const project = await prisma.project.findUnique({
    where: { slug: projectSlug },
    select: { title: true, summary: true, description: true, contentLocale: true, leanCanvas: true, impactModel: true },
  });
  if (!project) return "";
  const { getCanvasFieldLabels } = await import("@/lib/canvasFieldLabels");
  const labels = await getCanvasFieldLabels(project.contentLocale ?? "sv");
  const rows: string[] = [];
  for (const [entity, row, fields] of [
    ["leanCanvas", project.leanCanvas, LEAN_CANVAS_FIELDS],
    ["impactModel", project.impactModel, IMPACT_MODEL_FIELDS],
  ] as const) {
    for (const f of fields) {
      const v = (row as Record<string, unknown> | null)?.[f];
      if (typeof v === "string" && v.trim()) rows.push(`- ${entity}.${f} (${labels[`${entity}.${f}`] ?? f}): ${v.trim()}`);
    }
  }
  return [
    `Projekt: ${project.title}`,
    project.summary && `Sammanfattning: ${project.summary}`,
    project.description && `Beskrivning: ${project.description.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()}`,
    rows.length ? `Canvas (linked_field = nyckeln före parentesen):\n${rows.join("\n")}` : "Canvas: inte ifylld än.",
  ]
    .filter(Boolean)
    .join("\n");
}

// Runs the search and saves what it found: entries as AI finds, and the
// conclusion only if the project has none yet (never overwrites the team's).
export async function runAndSaveMarketScan(client: Anthropic, projectSlug: string, extraContext = ""): Promise<number> {
  const context = [await marketScanContext(projectSlug), extraContext].filter(Boolean).join("\n\n");
  const { entries, conclusion } = await researchMarket(client, context, new Set(MARKET_SCAN_FIELD_KEYS));
  if (!entries.length) return 0;
  const ai = await getAiParticipantUser();
  await prisma.marketScanEntry.createMany({
    data: entries.map((e) => ({
      projectSlug,
      type: e.type,
      name: e.name,
      description: e.description,
      relevanceNote: e.relevance || null,
      sourceUrl: e.sourceUrl,
      linkedField: e.linkedField ?? null,
      createdByAi: true,
      createdById: ai.id,
    })),
  });
  if (conclusion) {
    const existing = await prisma.marketScanConclusion.findUnique({ where: { projectSlug } });
    if (!existing) {
      await prisma.marketScanConclusion.create({
        data: { projectSlug, strengths: conclusion.strengths || null, gap: conclusion.gap || null, firstContacts: conclusion.firstContacts || null, createdByAi: true },
      });
    }
  }
  return entries.length;
}
