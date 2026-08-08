export const dynamic = "force-dynamic";

import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import ProjectCard from "@/components/ProjectCard";
import IdeaCard from "@/components/IdeaCardContainer";
import SortToggle from "@/components/SortToggleContainer";
import Pagination from "@/components/Pagination";
import ActivityPulse from "@/components/ActivityPulse";
import HeroPhotoStack from "@/components/HeroPhotoStack";
import { toHeroSlideData } from "@/lib/heroSlides";
import { isSiteAdmin } from "@/lib/authz";
import HomeStatsWidget from "@/components/HomeStatsWidget";
import OnboardingStepsBar from "@/components/OnboardingStepsBar";
import ImpactStatsWidget from "@/components/ImpactStatsWidget";
import LeaderboardWidget from "@/components/LeaderboardWidget";
import NewMembersWidget from "@/components/NewMembersWidget";
import SdgCoverageWidget from "@/components/SdgCoverageWidget";
import { isValidProjectPhase } from "@/lib/projectPhase";
import { computeTaskProgressByProject } from "@/lib/taskProgress";
import { routing } from "@/i18n/routing";
import type { Locale } from "next-intl";
import { getTranslations } from "next-intl/server";

const PAGE_SIZE = 12;
const IDEA_PREVIEW_SIZE = 8;

async function getLeaderboard() {
  // Ranks everyone with a name, same as a project's "Mest aktiva medlemmar" —
  // showProfile only gates whether a row links to a public profile page (see
  // LeaderboardWidget), not whether the ranking itself includes you.
  const users = await prisma.user.findMany({
    where: { name: { not: null as null } },
    select: { id: true, name: true, image: true, showProfile: true },
  });
  if (users.length === 0) return [];
  const userMap = new Map(users.map((u) => [u.id, u]));

  const tokenGroups = await prisma.tokenLedger.groupBy({
    by: ["userId"],
    where: { userId: { in: users.map((u) => u.id) } },
    _sum: { tokens: true },
    orderBy: { _sum: { tokens: "desc" } },
    take: 5,
  });

  return tokenGroups.map((g) => {
    const user = userMap.get(g.userId)!;
    return { id: user.id, name: user.name!, image: user.image, showProfile: user.showProfile, tokens: g._sum.tokens ?? 0 };
  });
}

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
    projectCount,
    orgCount,
    memberCount,
    pledgeSum,
    tokenSum,
    completedCards,
    completedSubtasks,
    leaderboard,
    newMembers,
    sdgProjects,
    totalFiltered,
    projects,
    ideaCount,
    ideas,
    heroSlides,
    heroSettings,
    onboardingSteps,
  ] = await Promise.all([
    prisma.project.count({ where: { hiddenAt: null } }),
    prisma.organisation.count({ where: { isPublic: true } }),
    prisma.user.count({ where: { showProfile: true } }),
    prisma.fundingPledge.aggregate({ where: { pledgeStatus: "confirmed" }, _sum: { amount: true } }),
    prisma.tokenLedger.aggregate({ _sum: { tokens: true } }),
    prisma.kanbanCard.count({ where: { column: "DONE" } }),
    prisma.kanbanCardSubtask.count({ where: { done: true } }),
    getLeaderboard(),
    prisma.user.findMany({
      where: { name: { not: null as null } },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, name: true, image: true, showProfile: true },
    }),
    prisma.project.findMany({ where: { hiddenAt: null }, select: { sdgGoals: true } }),
    prisma.project.count({ where }),
    prisma.project.findMany({
      where,
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        owner: { select: { name: true } },
        members: { select: { id: true } },
      },
    }),
    prisma.idea.count({ where: { status: { not: "draft" } } }),
    prisma.idea.findMany({
      where: { status: { not: "draft" } },
      orderBy: { createdAt: "desc" },
      take: IDEA_PREVIEW_SIZE,
      include: {
        author: { select: { name: true } },
        _count: { select: { votes: true, comments: true, endorsements: true } },
        votes: userId ? { where: { userId }, select: { id: true } } : false,
      },
    }),
    prisma.homeHeroSlide.findMany({ where: { locale }, orderBy: { order: "asc" } }),
    prisma.homeHeroSettings.findUnique({ where: { locale } }),
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
  const heroHeading = heroSettings?.heading ?? (locale === "en" ? "Welcome to GoodTribes" : "Välkommen till GoodTribes");
  const onboardingStepsForBar = finalOnboardingSteps.map((s) => ({ id: s.id, order: s.order, label: s.label, href: s.href }));

  const totalRaised = pledgeSum._sum.amount ?? 0;
  const completedTasks = completedCards + completedSubtasks;
  const totalTokens = Math.round(tokenSum._sum.tokens ?? 0);
  const coveredGoals = Array.from(new Set(sdgProjects.flatMap((p) => p.sdgGoals)));

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
    likes: likesByProjectId.get(p.id) ?? 0,
    taskProgress: taskProgressBySlug.get(p.slug) ?? { total: 0, done: 0 },
  }));

  const ideasWithVote = ideas.map((idea) => ({ ...idea, myVoteId: idea.votes?.[0]?.id ?? null }));

  const rawParams = { sort: sortParam, q, phase, category, sdg, page: pageStr };

  return (
    <div>

      {/* Del 1 — Hero: full-bleed blurred bakgrund (följer bilden som visas i högen) + bilder + textkort */}
      <div className="relative -mt-8" style={{ marginLeft: "calc(50% - 50vw)", width: "100vw" }}>
        <HeroPhotoStack slides={heroSlidesForStack} heading={heroHeading} canEdit={canEditHero} />
      </div>

      <OnboardingStepsBar steps={onboardingStepsForBar} canEdit={canEditHero} />

      <div className="space-y-16">

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

      {/* Del 3 — Idea Browser */}
      <section id="ideas">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-dark-slate">
            {t("exploreIdeasHeading")}{" "}
            <span className="text-dark-slate/40 font-normal">({ideaCount})</span>
          </h2>
          <Link href="/ideas" className="text-xs text-coral hover:underline">
            {t("seeAllIdeasLink")}
          </Link>
        </div>
        {ideas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-dark-slate/50 mb-4">{t("noIdeasYet")}</p>
            <Link href="/ideas/new" className="text-coral hover:underline text-sm">
              {t("shareFirstIdeaLink")}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {ideasWithVote.map((idea) => <IdeaCard key={idea.id} idea={idea} isLoggedIn={!!userId} />)}
          </div>
        )}
      </section>

      {/* Del 4 — Activity Pulse */}
      <section>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-dark-slate">{t("activityHeading")}</h2>
                <p className="text-xs text-dark-slate/50 mt-0.5">{t("activitySubheading")}</p>
              </div>
              <Link href="/feed" className="text-xs text-coral hover:underline">
                {t("seeAllActivityLink")}
              </Link>
            </div>
            <ActivityPulse />
          </div>
          <div className="flex flex-col gap-6">
            <LeaderboardWidget entries={leaderboard} />
            <NewMembersWidget
              members={newMembers.map((m) => ({ id: m.id, name: m.name!, image: m.image, showProfile: m.showProfile }))}
            />
            <ImpactStatsWidget
              totalRaised={totalRaised}
              totalTokens={totalTokens}
              completedTasks={completedTasks}
            />
            <SdgCoverageWidget coveredGoals={coveredGoals} />
            <HomeStatsWidget
              projectCount={projectCount}
              orgCount={orgCount}
              memberCount={memberCount}
            />
          </div>
        </div>
      </section>

      </div>

    </div>
  );
}
