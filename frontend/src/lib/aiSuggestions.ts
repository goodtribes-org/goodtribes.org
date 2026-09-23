import type { AiMode, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { canAiWrite, isProvenanceField, type ProvenanceEntity, type ProvenanceInfo } from "@/lib/fieldProvenance";

type FieldValue = string | string[] | number[] | null | undefined;

// Where an AI-produced value for a field goes:
//   "write"   — straight into the field (marked as an AI draft)
//   "suggest" — next to the field, for a human to use, adapt or ignore
// Only AGENT mode ever writes, and even then only into a field AI may
// touch (empty, or its own untouched draft). ASSIST always suggests — the
// AI never fills anything in itself. MANUAL never gets here (no AI calls).
export function decideAiPlacement(
  mode: AiMode,
  currentValue: FieldValue,
  provenance: ProvenanceInfo | null | undefined,
): "write" | "suggest" {
  return mode === "AGENT" && canAiWrite(currentValue, provenance) ? "write" : "suggest";
}

type Db = Prisma.TransactionClient | typeof prisma;

// Replaces any pending suggestion for the same field, so there's never more
// than one waiting.
export async function createAiSuggestion(
  db: Db,
  params: { projectId: string; entity: ProvenanceEntity; field: string; content: string },
): Promise<void> {
  const { projectId, entity, field, content } = params;
  if (!isProvenanceField(entity, field)) throw new Error(`Unknown field ${entity}.${field}`);
  if (!content.trim()) return;
  await db.aiFieldSuggestion.deleteMany({ where: { projectId, entity, field, status: "pending" } });
  await db.aiFieldSuggestion.create({ data: { projectId, entity, field, content: content.trim() } });
}

export type PendingSuggestion = { id: string; content: string };

export async function getPendingSuggestions(
  projectId: string,
  entity: ProvenanceEntity,
): Promise<Record<string, PendingSuggestion>> {
  const rows = await prisma.aiFieldSuggestion.findMany({
    where: { projectId, entity, status: "pending" },
    orderBy: { createdAt: "asc" },
    select: { id: true, field: true, content: true },
  });
  return Object.fromEntries(rows.map((r) => [r.field, { id: r.id, content: r.content }]));
}
