export const dynamic = "force-dynamic";

import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import ProjectCard from "@/components/ProjectCard";
import SortToggle from "@/components/SortToggleContainer";
import Pagination from "@/components/Pagination";
import { toHeroSlideData } from "@/lib/heroSlides";
import { isSiteAdmin } from "@/lib/authz";
import { isValidProjectPhase, DISPLAY_PHASES, PROJECT_PHASE_LABEL, toDisplayPhase } from "@/lib/projectPhase";
import { computeTaskProgressByProject } from "@/lib/taskProgress";
import { routing } from "@/i18n/routing";
import type { Locale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { resolveProjectContent } from "@/lib/contentTranslation";
import { fetchActivityItems } from "@/lib/activityFeed";
import IdeaBand from "@/components/showroom/IdeaBand";
import LiveTicker from "@/components/showroom/LiveTicker";
import StepsCarousel from "@/components/showroom/StepsCarousel";
import HomeHero from "@/components/showroom/HomeHero";
import VisionMissionGoal from "@/components/showroom/VisionMissionGoal";
import PhaseMap, { type PhaseMapStep } from "@/components/showroom/PhaseMap";
import UsageNow from "@/components/showroom/UsageNow";
import ImpactSnapshot from "@/components/showroom/ImpactSnapshot";
import FoundingStory from "@/components/showroom/FoundingStory";
import ToolsGrid from "@/components/showroom/ToolsGrid";
import { getSiteCopyMap } from "@/lib/siteCopy";
import { homeSansFont, showroomMonoFont } from "@/lib/fonts";
import { getPlatformImpactStats } from "@/lib/platformStats";

const PAGE_SIZE = 8;

export default async function HomePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{
    sort?: string;
    q?: string;
    phase?: string;
    category?: string;
    sdg?: string;
    page?: string;
  }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "HomePage" });
  const { sort: sortParam, q, phase, category, sdg, page: pageStr } = await searchParams;
  const sort = sortParam === "new" ? "new" : sortParam === "trending" ? "trending" : "top";
  const sdgNum = sdg ? parseInt(sdg) : undefined;
  const page = Math.max(1, parseInt(pageStr ?? "1") || 1);

  const session = await auth();
  const userId = session?.user?.id;

  const where: Prisma.ProjectWhereInput = {
    hiddenAt: null,
    ...(q ? { OR: [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ]} : {}),
    ...(phase && isValidProjectPhase(phase) ? { phase } : {}),
    ...(category ? { category } : {}),
    ...(sdgNum && !isNaN(sdgNum) ? { sdgGoals: { has: sdgNum } } : {}),
  };

  const orderBy =
    sort === "top"       ? { members: { _count: "desc" as const } }
    : sort === "trending" ? { updatedAt: "desc" as const }
    : { createdAt: "desc" as const };

  const [
    totalFiltered,
    projects,
    firstHeroSlide,
    livePhaseProjects,
    copy,
    impactStats,
  ] = await Promise.all([
    prisma.project.count({ where }),
    prisma.project.findMany({
      where,
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        owner: { select: { name: true } },
        members: { select: { id: true } },
        translations: locale !== routing.defaultLocale ? { where: { locale } } : false,
      },
    }),
    prisma.homeHeroSlide.findFirst({ where: { locale }, orderBy: { order: "asc" } }),
    // Feeds the "Just nu i fabriken" phase map below — one unbounded scan is
    // fine at today's project counts (same assumption fetchActivityItems
    // already makes); revisit if this ever needs pagination.
    prisma.project.findMany({
      where: { hiddenAt: null, archivedAt: null },
      select: { phase: true, title: true, slug: true, isSandbox: true },
      orderBy: { updatedAt: "desc" },
    }),
    getSiteCopyMap(locale),
    getPlatformImpactStats(),
  ]);

  const heroSlide = firstHeroSlide ? toHeroSlideData(firstHeroSlide) : null;
  const canEditHero = userId ? await isSiteAdmin(userId) : false;

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

  const c = (key: string) => copy[`HomePage.${key}`] ?? t(key);

  const rawParams = { sort: sortParam, q, phase, category, sdg, page: pageStr };

  const showroomActivity = await fetchActivityItems(10);
  const recentActivity = showroomActivity.slice(0, 8);
  const tickerItems = recentActivity.map((a) => `${a.projectName} — ${a.action}`);

  const phaseMapSteps: PhaseMapStep[] = DISPLAY_PHASES.map((p) => {
    const inBucket = livePhaseProjects.filter((proj) => toDisplayPhase(proj.phase) === p.value);
    return {
      value: p.value,
      label: PROJECT_PHASE_LABEL[p.value],
      count: inBucket.length,
      chips: inBucket.slice(0, 6).map((proj) => ({ title: proj.title, slug: proj.slug, isSandbox: proj.isSandbox })),
    };
  });

  return (
    <div>
      <HomeHero locale={locale} slide={heroSlide} canEdit={canEditHero} copy={copy} />

      <VisionMissionGoal locale={locale} copy={copy} />

      <LiveTicker items={tickerItems} locale={locale} />

      <section id="projects" className={homeSansFont.className} style={{ paddingTop: 40, paddingBottom: 40 }}>
        <p className={showroomMonoFont.className} style={{ fontSize: 11, letterSpacing: ".14em", color: "var(--color-seagrass)" }}>
          {c("exploreProjectsEyebrow").toUpperCase()}
        </p>
        <div className="flex items-center justify-between mb-4" style={{ marginTop: 8 }}>
          <div className="flex items-center gap-3">
            <h2 className="text-dark-slate" style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-.01em" }}>
              {c("exploreProjectsHeading")}{" "}
              <span className="text-dark-slate/40" style={{ fontSize: 16, fontWeight: 400 }}>({totalFiltered})</span>
            </h2>
            <SortToggle sort={sort} q={q} phase={phase} category={category} sdg={sdg} basePath="/" />
          </div>
          <Link href="/projects" className="text-xs text-coral hover:underline">
            {c("seeAllProjectsLink")}
          </Link>
        </div>
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-dark-slate/50 mb-4">{c("noProjectsMatchFilters")}</p>
            <Link href="/" className="text-coral hover:underline text-sm">
              {c("clearFiltersLink")}
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
              {projectsWithLikes.map((p) => <ProjectCard key={p.slug} project={p} showStats={false} />)}
            </div>
            <Pagination
              page={page}
              total={totalFiltered}
              perPage={PAGE_SIZE}
              searchParams={rawParams}
              basePath="/"
            />
          </>
        )}
      </section>

      <section id="showroom-idea-band" className="relative" style={{ marginLeft: "calc(50% - 50vw)", width: "100vw" }}>
        <IdeaBand copy={copy} />
      </section>

      <StepsCarousel copy={copy} />

      <PhaseMap locale={locale} steps={phaseMapSteps} copy={copy} />

      <UsageNow locale={locale} copy={copy} />

      <ImpactSnapshot locale={locale} stats={impactStats} copy={copy} />

      {/* Platform-wide numbers, then one project that shows what they add up
          to in practice, then the tools. Hides itself when the configured
          project doesn't exist in this environment. */}
      <FoundingStory locale={locale} copy={copy} />

      <ToolsGrid locale={locale} copy={copy} />
    </div>
  );
}
