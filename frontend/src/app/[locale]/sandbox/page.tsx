export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import SortToggleContainer from "@/components/SortToggleContainer";
import Pagination from "@/components/Pagination";
import ProjectCard from "@/components/ProjectCard";
import IdeaCard from "@/components/IdeaCardContainer";
import ActivityPulse from "@/components/ActivityPulse";
import LeaderboardWidget from "@/components/LeaderboardWidget";
import NewMembersWidget from "@/components/NewMembersWidget";
import ImpactStatsWidget from "@/components/ImpactStatsWidget";
import SdgCoverageWidget from "@/components/SdgCoverageWidget";
import HomeStatsWidget from "@/components/HomeStatsWidget";
import { computeTaskProgressByProject } from "@/lib/taskProgress";
import Pillars from "@/components/Pillars";
import { resolveProjectContent, resolveIdeaContent } from "@/lib/contentTranslation";
import { routing } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";
import type { Locale } from "next-intl";
import { isSiteAdmin } from "@/lib/authz";
import { getSandboxHero } from "@/lib/sandboxHero";

const IDEA_PREVIEW_SIZE = 8;
const DRAFT_PREVIEW_SIZE = 8;

function draftTimeAgo(date: Date, t: (key: string, values?: Record<string, number>) => string): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return t("listTimeJustNow");
  const m = Math.floor(s / 60);
  if (m < 60) return t("listTimeMinutesAgo", { minutes: m });
  const h = Math.floor(m / 60);
  if (h < 24) return t("listTimeHoursAgo", { hours: h });
  return t("listTimeDaysAgo", { days: Math.floor(h / 24) });
}

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "SandboxPage" });
  return { title: "Sandbox — GoodTribes.org", description: t("metaDescription") };
}

const PAGE_SIZE = 12;

export default async function SandboxPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ sort?: string; page?: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "SandboxPage" });
  const tHeroPhotoStack = await getTranslations({ locale, namespace: "HeroPhotoStack" });
  const tLeanCanvas = await getTranslations({ locale, namespace: "LeanCanvasDraftPage" });
  const tWhiteboard = await getTranslations({ locale, namespace: "WhiteboardDraftPage" });
  const tValueProposition = await getTranslations({ locale, namespace: "ValuePropositionDraftPage" });
  const { sort: sortParam, page: pageStr } = await searchParams;
  const sort = sortParam === "top" ? "top" : sortParam === "trending" ? "trending" : "new";
  const page = Math.max(1, parseInt(pageStr ?? "1") || 1);

  const orderBy =
    sort === "top"       ? { members: { _count: "desc" as const } }
    : sort === "trending" ? { updatedAt: "desc" as const }
    : { createdAt: "desc" as const };

  const where = { isSandbox: true };
  const session = await auth();
  const userId = session?.user?.id;
  const [canEditHero, heroData] = await Promise.all([
    userId ? isSiteAdmin(userId) : Promise.resolve(false),
    getSandboxHero(locale),
  ]);

  const [
    total,
    projects,
    ideaCount,
    ideas,
    siteProjectCount,
    orgCount,
    memberCount,
    pledgeSum,
    tokenSum,
    completedCards,
    completedSubtasks,
    leaderboard,
    newMembers,
    sdgProjects,
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
    prisma.idea.count({ where: { status: { not: "draft" } } }),
    prisma.idea.findMany({
      where: { status: { not: "draft" } },
      orderBy: { createdAt: "desc" },
      take: IDEA_PREVIEW_SIZE,
      include: {
        author: { select: { name: true } },
        _count: { select: { votes: true, comments: true, endorsements: true } },
        votes: userId ? { where: { userId }, select: { id: true } } : false,
        translations: locale !== routing.defaultLocale ? { where: { locale } } : false,
      },
    }),
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
  ]);

  const ideasWithVote = ideas.map((idea) => ({
    ...idea,
    ...resolveIdeaContent(idea, idea.translations, locale),
    myVoteId: idea.votes?.[0]?.id ?? null,
  }));

  // Same access model as /lean-canvas and /whiteboard: those pages redirect
  // anonymous visitors to /login entirely, so previews here only fetch (and
  // only show) for a logged-in session too, rather than leaking draft
  // content to guests who couldn't open the linked page anyway.
  const [leanCanvasCount, leanCanvasDrafts, whiteboardCount, whiteboardDrafts, valuePropositionCount, valuePropositionDrafts] = userId
    ? await Promise.all([
        prisma.leanCanvasDraft.count({ where: { promotedToProjectSlug: null } }),
        prisma.leanCanvasDraft.findMany({
          where: { promotedToProjectSlug: null },
          orderBy: { updatedAt: "desc" },
          take: DRAFT_PREVIEW_SIZE,
          include: { owner: { select: { name: true } } },
        }),
        prisma.whiteboardDraft.count({ where: { promotedToProjectSlug: null } }),
        prisma.whiteboardDraft.findMany({
          where: { promotedToProjectSlug: null },
          orderBy: { updatedAt: "desc" },
          take: DRAFT_PREVIEW_SIZE,
          include: { owner: { select: { name: true } } },
        }),
        prisma.valuePropositionDraft.count({ where: { promotedToProjectSlug: null } }),
        prisma.valuePropositionDraft.findMany({
          where: { promotedToProjectSlug: null },
          orderBy: { updatedAt: "desc" },
          take: DRAFT_PREVIEW_SIZE,
          include: { owner: { select: { name: true } } },
        }),
      ])
    : [0, [], 0, [], 0, []];

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
    ...resolveProjectContent(p, p.translations, locale),
    likes: likesByProjectId.get(p.id) ?? 0,
    taskProgress: taskProgressBySlug.get(p.slug) ?? { total: 0, done: 0 },
  }));

  const rawParams = { sort: sortParam, page: pageStr };
  const isLastPage = page * PAGE_SIZE >= total;
  const ghostCount = isLastPage && projectsWithLikes.length > 0 ? (4 - (projectsWithLikes.length % 4)) % 4 : 0;

  return (
    <>
    {/* Träd + rutan (nu med Sandbox-innehållet, flyttat hit från hero-bildens textkort)
        + Leva/Må/Göra Gott/Dröm stort — flyttade hit från startsidan, högst upp på sandboxsidan.
        Samma bakgrundsfärg (#f6f5f2) som sektionen nedanför, kant-till-kant.
        -mt-8 tar bort main:s pt-8, pt-36/48/52 lägger tillbaka en liten marginal mot
        toppmenyn (utan den skulle trädens grenar överlappa menyn). */}
    <div
      className="relative -mt-8 pt-36 sm:pt-48 md:pt-52 pb-10 sm:pb-14"
      style={{ marginLeft: "calc(50% - 50vw)", width: "100vw", backgroundColor: "#f6f5f2" }}
    >
      <Pillars
        heading={heroData.heroKicker}
        body={heroData.heroDescription}
        headings={heroData.headings}
        bodies={heroData.bodies}
        canEdit={canEditHero}
        editHref="/site-admin/sandbox-hero"
        editLabel={tHeroPhotoStack("editLink")}
      />
    </div>

    <div className="relative -mb-12 flex-1" style={{ marginLeft: "calc(50% - 50vw)", width: "100vw", backgroundColor: "#f6f5f2" }}>
    <div className="max-w-6xl mx-auto px-6 pb-12">
      <section id="projects" className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-dark-slate">
            {t("exploreHeading")} <span className="text-dark-slate/40 font-normal">({total})</span>
          </h2>
          <SortToggleContainer sort={sort} basePath="/sandbox" />
        </div>

        {projectsWithLikes.length === 0 ? (
          <div className="border border-dashed border-amber-300 rounded-lg p-16 text-center">
            <p className="text-dark-slate/40 text-sm mb-3">{t("emptyProjects")}</p>
            <Link href="/projects/new" className="text-coral hover:underline text-sm">
              {t("startFirstProject")}
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {projectsWithLikes.map((p) => <ProjectCard key={p.slug} project={p} variant="sandbox" />)}
              {ghostCount > 0 && (
                <Link
                  href="/projects/new"
                  className="rounded-lg border-2 border-dashed border-coral/60 bg-coral/5 hover:bg-coral/10 transition-colors flex items-center justify-center aspect-[4/3] text-coral text-sm font-semibold text-center p-4"
                >
                  {t("startNext")}
                </Link>
              )}
              {Array.from({ length: Math.max(ghostCount - 1, 0) }).map((_, i) => (
                <div
                  key={`ghost-${i}`}
                  className="rounded-lg border-2 border-dashed border-coral/60 bg-coral/5 flex items-center justify-center aspect-[4/3] text-coral text-sm text-center p-4"
                >
                  {t("aiSeedingSoon")}
                </div>
              ))}
            </div>
            <Pagination page={page} total={total} perPage={PAGE_SIZE} searchParams={rawParams} basePath="/sandbox" />
          </>
        )}
      </section>

      <section id="ideas" className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-dark-slate">
            {t("exploreIdeasHeading")} <span className="text-dark-slate/40 font-normal">({ideaCount})</span>
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

      {userId && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          <section id="lean-canvas">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-dark-slate">
                {t("exploreLeanCanvasHeading")} <span className="text-dark-slate/40 font-normal">({leanCanvasCount})</span>
              </h2>
              <Link href="/lean-canvas" className="text-xs text-coral hover:underline">
                {t("seeAllLeanCanvasLink")}
              </Link>
            </div>
            {leanCanvasDrafts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <p className="text-dark-slate/50 mb-4">{tLeanCanvas("listEmptyState")}</p>
                <Link href="/lean-canvas/new" className="text-coral hover:underline text-sm">
                  {tLeanCanvas("listStartFirst")}
                </Link>
              </div>
            ) : (
              <div className="flex flex-col rounded-lg border border-muted-teal/40 bg-white divide-y divide-muted-teal/20 overflow-hidden">
                {leanCanvasDrafts.map((d) => (
                  <Link
                    key={d.id}
                    href={`/lean-canvas/${d.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted-teal/5 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="inline-block flex-shrink-0 text-[10px] font-semibold uppercase tracking-wide text-coral bg-coral/10 rounded px-2 py-0.5">
                        {tLeanCanvas("cardBadge")}
                      </span>
                      <p className="text-sm font-medium text-dark-slate truncate">
                        {d.name || d.problem?.slice(0, 80) || tLeanCanvas("listStartedBy", { name: d.owner.name ?? tLeanCanvas("unknownAuthor") })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <p className="text-xs text-dark-slate/40 whitespace-nowrap">{tLeanCanvas("listStartedBy", { name: d.owner.name ?? tLeanCanvas("unknownAuthor") })}</p>
                      <span className="text-[11px] text-dark-slate/40 whitespace-nowrap">{draftTimeAgo(d.updatedAt, tLeanCanvas)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section id="whiteboard">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-dark-slate">
                {t("exploreWhiteboardHeading")} <span className="text-dark-slate/40 font-normal">({whiteboardCount})</span>
              </h2>
              <Link href="/whiteboard" className="text-xs text-coral hover:underline">
                {t("seeAllWhiteboardLink")}
              </Link>
            </div>
            {whiteboardDrafts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <p className="text-dark-slate/50 mb-4">{tWhiteboard("listEmptyState")}</p>
                <Link href="/whiteboard/new" className="text-coral hover:underline text-sm">
                  {tWhiteboard("listStartFirst")}
                </Link>
              </div>
            ) : (
              <div className="flex flex-col rounded-lg border border-muted-teal/40 bg-white divide-y divide-muted-teal/20 overflow-hidden">
                {whiteboardDrafts.map((d) => (
                  <Link
                    key={d.id}
                    href={`/whiteboard/${d.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted-teal/5 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="inline-block flex-shrink-0 text-[10px] font-semibold uppercase tracking-wide text-coral bg-coral/10 rounded px-2 py-0.5">
                        {tWhiteboard("cardBadge")}
                      </span>
                      {d.name && <p className="text-sm font-medium text-dark-slate truncate">{d.name}</p>}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <p className="text-xs text-dark-slate/40 whitespace-nowrap">{tWhiteboard("listStartedBy", { name: d.owner.name ?? tWhiteboard("unknownAuthor") })}</p>
                      <span className="text-[11px] text-dark-slate/40 whitespace-nowrap">{draftTimeAgo(d.updatedAt, tWhiteboard)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section id="value-proposition">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-dark-slate">
                {t("exploreValuePropositionHeading")} <span className="text-dark-slate/40 font-normal">({valuePropositionCount})</span>
              </h2>
              <Link href="/value-proposition" className="text-xs text-coral hover:underline">
                {t("seeAllValuePropositionLink")}
              </Link>
            </div>
            {valuePropositionDrafts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <p className="text-dark-slate/50 mb-4">{tValueProposition("listEmptyState")}</p>
                <Link href="/value-proposition/new" className="text-coral hover:underline text-sm">
                  {tValueProposition("listStartFirst")}
                </Link>
              </div>
            ) : (
              <div className="flex flex-col rounded-lg border border-muted-teal/40 bg-white divide-y divide-muted-teal/20 overflow-hidden">
                {valuePropositionDrafts.map((d) => (
                  <Link
                    key={d.id}
                    href={`/value-proposition/${d.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted-teal/5 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="inline-block flex-shrink-0 text-[10px] font-semibold uppercase tracking-wide text-coral bg-coral/10 rounded px-2 py-0.5">
                        {tValueProposition("cardBadge")}
                      </span>
                      <p className="text-sm font-medium text-dark-slate truncate">
                        {d.name || d.vpJobs?.slice(0, 80) || tValueProposition("listStartedBy", { name: d.owner.name ?? tValueProposition("unknownAuthor") })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <p className="text-xs text-dark-slate/40 whitespace-nowrap">{tValueProposition("listStartedBy", { name: d.owner.name ?? tValueProposition("unknownAuthor") })}</p>
                      <span className="text-[11px] text-dark-slate/40 whitespace-nowrap">{draftTimeAgo(d.updatedAt, tValueProposition)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      <section className="mb-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-dark-slate">{t("pulseHeading")}</h2>
                <p className="text-xs text-dark-slate/50 mt-0.5">{t("pulseSubheading")}</p>
              </div>
              <Link href="/feed" className="text-xs text-coral hover:underline">
                {t("seeAllPulseLink")}
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
              projectCount={siteProjectCount}
              orgCount={orgCount}
              memberCount={memberCount}
            />
          </div>
        </div>
      </section>
    </div>
    </div>
    </>
  );
}
