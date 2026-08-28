import { unstable_cache, revalidateTag } from "next/cache"
import type { Prisma, ProjectPhase, IdeaStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { countByCountry } from "@/lib/geo"
import { computeTaskProgressByProject } from "@/lib/taskProgress"
import { resolveProjectContent, resolveIdeaContent } from "@/lib/contentTranslation"
import { routing } from "@/i18n/routing"
import type { Locale } from "next-intl"

// Tags for the three public list pages (projects/ideas/members) — none of
// these queries are session-scoped (auth() on those pages only gates CTA
// buttons, never the query itself), so caching the query result across all
// visitors is safe. revalidate is a time-based safety net: this codebase has
// ~30 mutation sites across Project/Idea/User that can affect these lists,
// and revalidateTag() has only been added at the primary ones (create,
// hide/moderate, membership join/leave) — see CLAUDE.md. Missing a less
// common site degrades to "up to 60s stale", not a permanent staleness bug.
export const PROJECTS_LIST_TAG = "projects-list"
export const IDEAS_LIST_TAG = "ideas-list"
export const MEMBERS_LIST_TAG = "members-list"
const LIST_REVALIDATE_SECONDS = 60

// Next.js 16 made the second (`profile`) argument to revalidateTag
// effectively required — omitting it only warns, but is deprecated in favour
// of either passing a cacheLife profile or switching to updateTag(). We
// can't use updateTag() uniformly: it throws outside a Server Action, and
// contentModeration.ts's hideTarget/unhideTarget are called from both Server
// Actions and a plain route handler (api/content-flags). "max" is just a
// label for the new use-cache primitive's staleness bookkeeping — it has no
// effect on unstable_cache's own tag-invalidation, which still runs the same
// way regardless of profile.
export function invalidateListCache(tag: string) {
  revalidateTag(tag, "max")
}

const PROJECTS_PAGE_SIZE = 12;
const IDEAS_PAGE_SIZE = 15;
const MEMBERS_PAGE_SIZE = 24;

export const getCachedProjectsPage = unstable_cache(
  async (
    sort: "top" | "trending" | "new",
    q: string | undefined,
    phase: ProjectPhase | undefined,
    category: string | undefined,
    sdgNum: number | undefined,
    page: number,
    locale: Locale,
  ) => {
    const where: Prisma.ProjectWhereInput = {
      hiddenAt: null,
      ...(q ? { OR: [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ]} : {}),
      ...(phase ? { phase } : {}),
      ...(category ? { category } : {}),
      ...(sdgNum !== undefined && !isNaN(sdgNum) ? { sdgGoals: { has: sdgNum } } : {}),
    };

    const orderBy =
      sort === "top"      ? { members: { _count: "desc" as const } }
      : sort === "trending" ? { updatedAt: "desc" as const }
      : { createdAt: "desc" as const };

    const [total, projects, ownerCountries] = await Promise.all([
      prisma.project.count({ where }),
      prisma.project.findMany({
        where,
        orderBy,
        skip: (page - 1) * PROJECTS_PAGE_SIZE,
        take: PROJECTS_PAGE_SIZE,
        include: {
          owner: { select: { name: true } },
          members: { select: { id: true } },
          translations: locale !== routing.defaultLocale ? { where: { locale } } : false,
        },
      }),
      prisma.project.findMany({ where, select: { owner: { select: { country: true } } } }),
    ]);

    const countryCounts = countByCountry(ownerCountries.map((p) => p.owner.country));

    const [projectLikeCounts, taskProgressCards] = await Promise.all([
      projects.length
        ? prisma.feedLike.groupBy({
            by: ["targetId"],
            where: { targetType: "project", targetId: { in: projects.map((p) => p.id) } },
            _count: true,
          })
        : Promise.resolve([]),
      projects.length
        ? prisma.kanbanCard.findMany({
            where: { projectSlug: { in: projects.map((p) => p.slug) } },
            select: { projectSlug: true, column: true, subtasks: { select: { done: true } } },
          })
        : Promise.resolve([]),
    ]);
    const likesByProjectId = new Map(projectLikeCounts.map((g) => [g.targetId, g._count]));
    const taskProgressBySlug = computeTaskProgressByProject(taskProgressCards);
    const projectsWithLikes = projects.map((p) => ({
      ...p,
      ...resolveProjectContent(p, p.translations, locale),
      likes: likesByProjectId.get(p.id) ?? 0,
      taskProgress: taskProgressBySlug.get(p.slug) ?? { total: 0, done: 0 },
    }));

    return { total, projects: projectsWithLikes, countryCounts };
  },
  ["projects-list-page"],
  { tags: [PROJECTS_LIST_TAG], revalidate: LIST_REVALIDATE_SECONDS }
);

export const getCachedIdeasPage = unstable_cache(
  async (
    sort: "top" | "trending" | "new",
    status: IdeaStatus | undefined,
    category: string | undefined,
    sdgNum: number | undefined,
    region: string | undefined,
    page: number,
    locale: Locale,
  ) => {
    const where: Prisma.IdeaWhereInput = {
      hiddenAt: null,
      ...(status ? { status } : { status: { not: "draft" } }),
      ...(category ? { category } : {}),
      ...(sdgNum !== undefined && !isNaN(sdgNum) ? { sdgGoals: { has: sdgNum } } : {}),
      ...(region ? { targetRegion: region } : {}),
    };

    const orderBy =
      sort === "top" ? { votes: { _count: "desc" as const } }
      : sort === "trending" ? { updatedAt: "desc" as const }
      : { createdAt: "desc" as const };

    const [total, ideas] = await Promise.all([
      prisma.idea.count({ where }),
      prisma.idea.findMany({
        where,
        orderBy,
        skip: (page - 1) * IDEAS_PAGE_SIZE,
        take: IDEAS_PAGE_SIZE,
        include: {
          author: { select: { name: true } },
          _count: { select: { votes: true, comments: true, endorsements: true, followers: true } },
          translations: locale !== routing.defaultLocale ? { where: { locale } } : false,
        },
      }),
    ]);

    const ideasWithContent = ideas.map((idea) => ({
      ...idea,
      ...resolveIdeaContent(idea, idea.translations, locale),
    }));

    return { total, ideas: ideasWithContent };
  },
  ["ideas-list-page"],
  { tags: [IDEAS_LIST_TAG], revalidate: LIST_REVALIDATE_SECONDS }
);

export const getCachedMembersPage = unstable_cache(
  async (skill: string | undefined, page: number) => {
    const where = {
      showProfile: true,
      name: { not: null as null },
      ...(skill ? { skills: { some: { skill: { slug: skill } } } } : {}),
    };

    const [total, members, allSkills] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { name: "asc" },
        skip: (page - 1) * MEMBERS_PAGE_SIZE,
        take: MEMBERS_PAGE_SIZE,
        select: {
          id: true,
          name: true,
          bio: true,
          image: true,
          skills: {
            select: { skill: { select: { name: true, tag: true, slug: true } } },
            take: 3,
          },
        },
      }),
      prisma.skill.findMany({
        where: { users: { some: { user: { showProfile: true } } } },
        orderBy: { name: "asc" },
        select: { name: true, slug: true },
      }),
    ]);

    return { total, members, allSkills };
  },
  ["members-list-page"],
  { tags: [MEMBERS_LIST_TAG], revalidate: LIST_REVALIDATE_SECONDS }
);
