export const dynamic = "force-dynamic";

import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import ProjectCard from "@/components/ProjectCard";
import SortToggle from "@/components/SortToggleContainer";
import Pagination from "@/components/Pagination";
import HeroPhotoStack from "@/components/HeroPhotoStack";
import HeroSlideText from "@/components/HeroSlideText";
import WhyHowWhat from "@/components/WhyHowWhat";
import { toHeroSlideData } from "@/lib/heroSlides";
import { isSiteAdmin } from "@/lib/authz";
import OnboardingStepsBar from "@/components/OnboardingStepsBar";
import { isValidProjectPhase } from "@/lib/projectPhase";
import { computeTaskProgressByProject } from "@/lib/taskProgress";
import { routing } from "@/i18n/routing";
import type { Locale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { resolveProjectContent } from "@/lib/contentTranslation";
import { fetchActivityItems } from "@/lib/activityFeed";
import { timeAgo } from "@/lib/timeAgo";
import IdeaBand from "@/components/showroom/IdeaBand";
import LiveTicker from "@/components/showroom/LiveTicker";
import ShowroomGrid from "@/components/showroom/ShowroomGrid";
import ThreeSteps from "@/components/showroom/ThreeSteps";
import ProjectExample from "@/components/showroom/ProjectExample";
import StepsCarousel from "@/components/showroom/StepsCarousel";
import GoodPyramid from "@/components/showroom/GoodPyramid";
import ManifestoSection from "@/components/showroom/ManifestoSection";
import StatsRow from "@/components/showroom/StatsRow";
import ShowroomActivityFeed, { type ShowroomFeedEvent } from "@/components/showroom/ShowroomActivityFeed";
import EndCta from "@/components/showroom/EndCta";

const SDG_TOTAL_COUNT = 17;

function initialsFromName(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return parts.length === 1 ? parts[0].slice(0, 2).toUpperCase() : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const PAGE_SIZE = 12;

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
  const tWhy = await getTranslations({ locale, namespace: "WhyHowWhat" });
  const { sort: sortParam, q, phase, category, sdg, page: pageStr } = await searchParams;
  const sort = sortParam === "top" ? "top" : sortParam === "trending" ? "trending" : "new";
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
    heroSlides,
    onboardingSteps,
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
    prisma.homeHeroSlide.findMany({ where: { locale }, orderBy: { order: "asc" } }),
    prisma.onboardingStep.findMany({ where: { locale }, orderBy: { order: "asc" } }),
  ]);

  // Onboarding steps fall back to the site's default locale's editorial
  // content rather than showing a blank bar the first time a non-default
  // locale hasn't been translated by a site admin yet. The hero heading and
  // slides do NOT get this cross-locale fallback — unlike the onboarding
  // bar, the hero already has a locale-correct hardcoded default (below),
  // so falling back to a different locale's real, admin-authored text would
  // silently show Swedish copy on the English homepage forever, with no
  // signal to a site admin that a translation is still needed.
  let finalOnboardingSteps = onboardingSteps;
  if (locale !== routing.defaultLocale && finalOnboardingSteps.length === 0) {
    const fallbackSteps = await prisma.onboardingStep.findMany({ where: { locale: routing.defaultLocale }, orderBy: { order: "asc" } });
    if (fallbackSteps.length) finalOnboardingSteps = fallbackSteps;
  }

  const heroSlidesForStack = heroSlides.map(toHeroSlideData);
  const canEditHero = userId ? await isSiteAdmin(userId) : false;
  const onboardingStepsForBar = finalOnboardingSteps.map((s) => ({ id: s.id, order: s.order, label: s.label, href: s.href }));

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

  const rawParams = { sort: sortParam, q, phase, category, sdg, page: pageStr };

  // Del 3-14 — "Showroom"-sektionerna längst ner (design_handoff_startsida_showroom).
  // Ticker/aktivitetsflöde delar samma fetchActivityItems()-källa som /sandbox's
  // Activity Pulse; statistikraden/projektflödet är egna, riktiga aggregat.
  const [totalRaisedAgg, completedTasksCount, sdgProjects, showroomActivity] = await Promise.all([
    prisma.fundingPledge.aggregate({ where: { pledgeStatus: "confirmed" }, _sum: { amount: true } }),
    prisma.kanbanCardSubtask.count({ where: { done: true } }),
    prisma.project.findMany({ where: { hiddenAt: null }, select: { sdgGoals: true } }),
    fetchActivityItems(10),
  ]);
  const totalRaised = totalRaisedAgg._sum.amount ?? 0;
  const sdgCoveredCount = new Set(sdgProjects.flatMap((p) => p.sdgGoals)).size;
  const recentActivity = showroomActivity.slice(0, 8);
  const tickerItems = recentActivity.map((a) => `${a.projectName} — ${a.action}`);
  const feedEvents: ShowroomFeedEvent[] = recentActivity.slice(0, 6).map((a) => ({
    key: a.id,
    project: a.projectName,
    action: a.action,
    meta: timeAgo(a.date),
    initials: initialsFromName(a.avatarName),
  }));

  return (
    <div>

      {/* Del 1 — Hero: full-bleed blurred bakgrund (följer bilden som visas i högen) + bilder + textkort.
          -mt-8 tar bort main:s pt-8 så bakgrunden går ända upp mot toppmenyn utan marginal. */}
      <div className="relative -mt-8" style={{ marginLeft: "calc(50% - 50vw)", width: "100vw" }}>
        <HeroPhotoStack slides={heroSlidesForStack} canEdit={canEditHero} />
      </div>

      <LiveTicker items={tickerItems} />

      <OnboardingStepsBar steps={onboardingStepsForBar} canEdit={canEditHero} />

      {/* Hero-slide-listan delas i två: "Följ din dröm" + "Hitta din tribe" (index 1–2)
          renderas här, sedan Statistikraden, sedan resten av slidesen (t.ex. "Alla
          vinner") — det ger effekten att Statistikraden hamnar direkt under
          "Hitta din tribe"-rutan istället för under alla hero-slides. */}
      <HeroSlideText slides={heroSlidesForStack.slice(1, 3)} canEdit={canEditHero} tiltOffset={1} />

      <section id="showroom-stats-row">
        <StatsRow
          locale={locale}
          totalRaised={totalRaised}
          completedTasks={completedTasksCount}
          sdgCoveredCount={sdgCoveredCount}
          sdgTotalCount={SDG_TOTAL_COUNT}
        />
      </section>

      <HeroSlideText slides={heroSlidesForStack.slice(3)} canEdit={canEditHero} tiltOffset={3} />

      {/* Del 2 — Project Browser */}
      <section id="projects">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-dark-slate">
              {t("exploreProjectsHeading")}{" "}
              <span className="text-dark-slate/40 font-normal">({totalFiltered})</span>
            </h2>
            <SortToggle sort={sort} q={q} phase={phase} category={category} sdg={sdg} basePath="/" />
          </div>
          <Link href="/projects" className="text-xs text-coral hover:underline">
            {t("seeAllProjectsLink")}
          </Link>
        </div>
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-dark-slate/50 mb-4">{t("noProjectsMatchFilters")}</p>
            <Link href="/" className="text-coral hover:underline text-sm">
              {t("clearFiltersLink")}
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
              {projectsWithLikes.map((p) => <ProjectCard key={p.slug} project={p} />)}
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
        <IdeaBand />
      </section>

      <section id="showroom-three-steps">
        <ThreeSteps locale={locale} />
      </section>

      <WhyHowWhat
        eyebrow={tWhy("eyebrow")}
        headings={{ why: tWhy("whyHeading"), how: tWhy("howHeading"), what: tWhy("whatHeading") }}
        bodies={{ why: tWhy("whyBody"), how: tWhy("howBody"), what: tWhy("whatBody") }}
      />

      <div className="space-y-16">

      {/* Del 3–14 — "Showroom"-sektionerna (design_handoff_startsida_showroom),
          medvetet placerade längst ner även där de dubblerar innehåll som redan
          finns högre upp (Pillars, WhyHowWhat, onboarding-steg, projektlistan). */}
      <section id="showroom-project-example">
        <ProjectExample locale={locale} />
      </section>

      <section id="showroom-pyramid">
        <GoodPyramid locale={locale} />
      </section>

      <section id="showroom-activity-feed">
        <ShowroomActivityFeed locale={locale} events={feedEvents} />
      </section>

      </div>

      <ShowroomGrid />

      <StepsCarousel />

      <ManifestoSection locale={locale} />

      <EndCta locale={locale} />

    </div>
  );
}
