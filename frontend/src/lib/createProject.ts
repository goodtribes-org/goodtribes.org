import type { AiMode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slugify";
import { indexDocuments } from "@/lib/meili";
import { isCreatableLegalType } from "@/lib/legalType";
import { PROJECTS_LIST_TAG, invalidateListCache } from "@/lib/listCache";
import { normalizeContentLocale, requestContentLocale } from "@/lib/aiLanguage";
import { createIdeaStepCards } from "@/lib/ideaStepCards";
import { DraftLimitError, MAX_DRAFTS, countOwnDrafts } from "@/lib/projectVisibility";

export type CreateProjectParams = {
  title: string;
  ownerId: string;
  slogan?: string | null;
  summary?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  category?: string | null;
  tags?: string[];
  sdgGoals?: number[];
  legalType?: string;
  orgId?: string | null;
  // Every project starts as a draft only its members see (#226), and the
  // owner may have at most MAX_DRAFTS of them. A project that grows out of
  // something already public (an idea someone drives) is published at once
  // instead, and doesn't count against the limit.
  publish?: boolean;
  skillIds?: string[];
  // The language the project is written in; defaults to the creator's
  // locale in a request, Swedish otherwise (crons).
  contentLocale?: string;
  // The project-wide AI mode. Left unset, the project is a "legacy" one
  // (aiMode = NULL); "Starta utan AI" sets MANUAL so the AI stays out
  // until someone switches it on.
  aiMode?: AiMode | null;
  // A card per Idé step on the board (lib/ideaStepCards.ts, #200).
  ideaStepCards?: boolean;
  // Set when the project comes out of a Drömsamtal: the "Beskriv projektet"
  // card then credits the founder (told it) and GoodTribes (wrote it up).
  dreamFounderId?: string;
};

// Shared core of project creation — slug-retry, the Project row itself, the
// founder membership + first phase-transition + 3 default discussion
// channels every project gets, and search indexing once it's published.
// Used by Din dröm, Snabbstart, Drömsamtalet and the promotion of old
// drafts and Idéverkstaden threads — they only differ in which fields they
// collect. Throws DraftLimitError when the owner already has MAX_DRAFTS.
export async function createProjectRecord(params: CreateProjectParams) {
  const {
    title, ownerId,
    slogan = null,
    summary = null, description = null, imageUrl = null, category = null,
    tags = [], sdgGoals = [], orgId = null,
    publish = false, skillIds = [], aiMode = null, ideaStepCards = true, dreamFounderId,
  } = params;
  if (!publish && (await countOwnDrafts(ownerId)) >= MAX_DRAFTS) throw new DraftLimitError();
  const legalType = params.legalType && isCreatableLegalType(params.legalType) ? params.legalType : "NONPROFIT_UMBRELLA";

  const contentLocale = params.contentLocale ? normalizeContentLocale(params.contentLocale) : await requestContentLocale();
  const baseSlug = slugify(title) || "project";

  for (let attempt = 0; attempt <= 9; attempt++) {
    const candidate = attempt === 0 ? baseSlug : `${baseSlug}-${attempt}`;
    try {
      const project = await prisma.project.create({
        data: {
          slug: candidate, title, slogan, summary, description, category, tags, sdgGoals, legalType,
          ownerId, contentLocale,
          ...(publish ? { publishedAt: new Date() } : {}),
          ...(imageUrl ? { imageUrl } : {}),
          ...(orgId ? { orgId } : {}),
          ...(aiMode ? { aiMode } : {}),
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

      // A draft isn't searchable; publishProject indexes it later.
      if (publish) {
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
        invalidateListCache(PROJECTS_LIST_TAG);
      }

      if (ideaStepCards) await createIdeaStepCards(prisma, { projectSlug: project.slug, contentLocale, dreamFounderId });
      return project;
    } catch (e: unknown) {
      const err = e as { code?: string };
      if (err?.code === "P2002" && attempt < 9) continue;
      throw e;
    }
  }
  throw new Error("Kunde inte skapa projekt — slug-kollision.");
}
