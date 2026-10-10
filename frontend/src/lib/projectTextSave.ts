import { prisma } from "@/lib/prisma";
import { LEAN_CANVAS_STORED_FIELDS, type LeanCanvasField } from "@/app/[locale]/projects/[slug]/(workspace)/lean-canvas/fields";
import { recordHumanEdits } from "@/lib/fieldProvenance";
import { deleteDocument, indexDocuments } from "@/lib/meili";
import { PROJECTS_LIST_TAG, invalidateListCache } from "@/lib/listCache";

// Saving a canvas block or a project's texts — shared by a lead's own edit
// and an accepted proposal (#290), so both leave the same trail: a canvas
// version, field provenance, search and list cache.

export async function saveLeanCanvasField(projectSlug: string, projectId: string, field: LeanCanvasField, value: string | null, userId: string) {
  const before = await prisma.leanCanvas.findUnique({ where: { projectSlug }, select: { [field]: true } });
  const canvas = await prisma.leanCanvas.upsert({
    where: { projectSlug },
    create: { projectSlug, [field]: value, updatedById: userId },
    update: { [field]: value, updatedById: userId },
  });
  // Full-canvas snapshot on every block save — linear history alongside the
  // single mutable "current" row (see LeanCanvasVersion's schema comment).
  await prisma.leanCanvasVersion.create({
    data: {
      projectSlug,
      savedById: userId,
      ...Object.fromEntries(LEAN_CANVAS_STORED_FIELDS.map((f) => [f, canvas[f]])),
    },
  });
  await recordHumanEdits(projectId, "leanCanvas", before, { [field]: value }, userId);
}

// Search follows the project's public text; a draft (#226) or hidden
// project stays out of it.
export function syncProjectSearch(project: { slug: string; title: string; description: string | null; phase: string; sdgGoals: number[]; hiddenAt: Date | null; publishedAt: Date | null }) {
  if (!project.hiddenAt && project.publishedAt) {
    void indexDocuments("projects", [{
      id: `project-${project.slug}`,
      type: "project",
      title: project.title,
      description: project.description ?? "",
      url: `/projects/${project.slug}`,
      phase: project.phase,
      sdgGoals: project.sdgGoals,
      locale: "sv",
    }]);
  } else {
    void deleteDocument("projects", `project-${project.slug}`);
    void deleteDocument("projects", `project-${project.slug}__en`);
  }
}

// One project text field (summary or an already-sanitized description).
export async function saveProjectText(projectId: string, key: "summary" | "description", value: string | null, userId: string) {
  const before = await prisma.project.findUnique({ where: { id: projectId }, select: { summary: true, description: true } });
  const project = await prisma.project.update({
    where: { id: projectId },
    data: { [key]: value },
    select: { slug: true, title: true, description: true, phase: true, sdgGoals: true, hiddenAt: true, publishedAt: true },
  });
  await recordHumanEdits(projectId, "project", before, { [key]: value }, userId);
  syncProjectSearch(project);
  invalidateListCache(PROJECTS_LIST_TAG);
}
