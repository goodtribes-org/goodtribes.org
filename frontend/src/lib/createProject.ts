import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slugify";
import { indexDocuments } from "@/lib/meili";
import { isValidLegalType } from "@/lib/legalType";

export type CreateProjectParams = {
  title: string;
  ownerId: string;
  summary?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  category?: string | null;
  tags?: string[];
  sdgGoals?: number[];
  legalType?: string;
  visibility?: string;
  orgId?: string | null;
  isSandbox?: boolean;
  skillIds?: string[];
};

// Shared core of project creation — slug-retry, the Project row itself, the
// founder membership + first phase-transition + 3 default discussion
// channels every project gets, and search indexing. Used by the full
// project-creation form, the minimal sandbox-project creation flow, and the
// AI sandbox-seed cron — they only differ in which fields they collect.
export async function createProjectRecord(params: CreateProjectParams) {
  const {
    title, ownerId,
    summary = null, description = null, imageUrl = null, category = null,
    tags = [], sdgGoals = [], visibility = "public", orgId = null,
    isSandbox = false, skillIds = [],
  } = params;
  const legalType = params.legalType && isValidLegalType(params.legalType) ? params.legalType : "NONPROFIT_UMBRELLA";

  const baseSlug = slugify(title) || "project";

  for (let attempt = 0; attempt <= 9; attempt++) {
    const candidate = attempt === 0 ? baseSlug : `${baseSlug}-${attempt}`;
    try {
      const project = await prisma.project.create({
        data: {
          slug: candidate, title, summary, description, visibility, category, tags, sdgGoals, legalType,
          ownerId, isSandbox,
          ...(imageUrl ? { imageUrl } : {}),
          ...(orgId ? { orgId } : {}),
        },
      });
      await prisma.projectMember.create({ data: { projectId: project.id, userId: ownerId, role: "FOUNDER" } });
      await prisma.phaseTransition.create({
        data: { projectId: project.id, fromPhase: null, toPhase: project.phase, changedById: ownerId },
      });
      await prisma.room.createMany({
        data: [
          { type: "PROJECT_CHANNEL", projectId: project.id, name: "allmänt", postingPolicy: "ALL_MEMBERS", order: 0 },
          { type: "PROJECT_CHANNEL", projectId: project.id, name: "beslut",  postingPolicy: "LEADS_ONLY",  order: 1 },
          { type: "PROJECT_CHANNEL", projectId: project.id, name: "ideer",   postingPolicy: "ALL_MEMBERS", order: 2 },
        ],
      });
      if (skillIds.length > 0) {
        await prisma.projectSkill.createMany({
          data: skillIds.map((skillId) => ({ projectId: project.id, skillId })),
          skipDuplicates: true,
        });
      }

      await indexDocuments("projects", [{
        id: `project-${project.slug}`,
        type: "project",
        title: project.title,
        description: project.description ?? "",
        url: `/projects/${project.slug}`,
        phase: project.phase,
        sdgGoals: project.sdgGoals,
      }]);

      return project;
    } catch (e: unknown) {
      const err = e as { code?: string };
      if (err?.code === "P2002" && attempt < 9) continue;
      throw e;
    }
  }
  throw new Error("Kunde inte skapa projekt — slug-kollision.");
}
