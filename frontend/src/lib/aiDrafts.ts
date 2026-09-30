import type { FieldAuthor } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PROVENANCE_FIELDS, type ProvenanceEntity } from "@/lib/fieldProvenance";

// "5 av 13 fält är AI-utkast som ingen i teamet gått igenom än"
// (docs/plans/fasframsteg-och-overblick.md, part 2). We fill everything in
// straight away, like IdeaBuddy does — but unlike it, we say which parts
// nobody has looked at yet. A field counts as an unreviewed draft while its
// provenance author is AI; editing it or pressing "Ser bra ut" makes it
// AI_EDITED (reviewed). Review is independent of vet/antar: an approved
// draft is still an assumption until someone knows.

export type DraftCount = { drafts: number; filled: number };

const hasContent = (v: unknown) => (Array.isArray(v) ? v.length > 0 : typeof v === "string" && v.trim() !== "");

// Pure: rows are each entity's current values, authors the provenance
// author per "entity.field". Only filled fields count, both as drafts and
// in the total — an empty field is neither.
export function countAiDrafts(
  rows: Partial<Record<ProvenanceEntity, Record<string, unknown> | null>>,
  authors: Record<string, FieldAuthor>,
): DraftCount {
  let drafts = 0;
  let filled = 0;
  for (const entity of Object.keys(PROVENANCE_FIELDS) as ProvenanceEntity[]) {
    const row = rows[entity];
    for (const field of PROVENANCE_FIELDS[entity]) {
      if (!hasContent(row?.[field])) continue;
      filled += 1;
      if (authors[`${entity}.${field}`] === "AI") drafts += 1;
    }
  }
  return { drafts, filled };
}

export async function getAiDraftCount(projectId: string): Promise<DraftCount> {
  const [project, prov] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      select: { title: true, summary: true, description: true, category: true, tags: true, sdgGoals: true, leanCanvas: true, valueProposition: true, impactModel: true },
    }),
    prisma.fieldProvenance.findMany({ where: { projectId }, select: { entity: true, field: true, author: true } }),
  ]);
  if (!project) return { drafts: 0, filled: 0 };
  const { leanCanvas, valueProposition, impactModel, ...about } = project;
  return countAiDrafts(
    {
      project: about,
      leanCanvas: leanCanvas as Record<string, unknown> | null,
      valueProposition: valueProposition as Record<string, unknown> | null,
      impactModel: impactModel as Record<string, unknown> | null,
    },
    Object.fromEntries(prov.map((p) => [`${p.entity}.${p.field}`, p.author])),
  );
}
