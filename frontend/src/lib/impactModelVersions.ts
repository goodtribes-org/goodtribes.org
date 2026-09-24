import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAiParticipantUser } from "@/lib/aiParticipant";
import { IMPACT_MODEL_FIELDS } from "@/app/[locale]/projects/[slug]/(workspace)/impact-model/fields";

type Db = Prisma.TransactionClient | typeof prisma;

// Snapshot of the model as it is now — call right after every write to it.
// savedById null = written by the AI, saved as the AI participant user so
// the history shows "AI" rather than an unknown author.
export async function snapshotImpactModel(db: Db, projectSlug: string, savedById: string | null): Promise<void> {
  const row = await db.impactModel.findUnique({ where: { projectSlug } });
  if (!row) return;
  const by = savedById ?? (await getAiParticipantUser()).id;
  await db.impactModelVersion.create({
    data: { projectSlug, savedById: by, ...Object.fromEntries(IMPACT_MODEL_FIELDS.map((f) => [f, row[f]])) },
  });
}
