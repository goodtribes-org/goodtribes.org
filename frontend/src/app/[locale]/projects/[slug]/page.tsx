import { notFoundUnlessVisible } from "@/lib/projectDraftGate";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { getTranslations } from "next-intl/server";
import { isFeatureEnabled } from "@/lib/featureFlags";
import { overviewPathFor } from "@/lib/projectPhase";
import type { useTranslations } from "next-intl";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { JoinButton, JoinRequestsPanel } from "./JoinSection";
import FlagContentButton from "@/components/FlagContentButton";
import { SdgIcon } from "@/components/SdgIcon";
import Tooltip from "@/components/Tooltip";
import { SDG_COLORS, SDG_LABELS_SV, SDG_UN_URLS } from "@/lib/sdg";
import { getFounderWords } from "@/lib/founderWords";
import { latestInsight, type SynthesisContent } from "@/lib/ideaInsights";
import { getProjectJourney } from "@/lib/projectJourney";
import ProjectVoice from "./ProjectVoice";
import CollapsibleStory from "./CollapsibleStory";
import MemberNextSteps, { type NextStepItem } from "./MemberNextSteps";
import FeedTabs from "./FeedTabs";
import FirstTasksPanel from "./FirstTasksPanel";
import { getOpenFirstTasks } from "@/lib/firstTasks";
import FirstTaskPrompt from "./FirstTaskPrompt";
import { isAiProjectStartAvailable } from "@/lib/aiProjectStart";
import ProjectTopNav from "./ProjectTopNav";
import ProjectSideNav from "./ProjectSideNav";
import PhaseMenuBar from "./PhaseMenuBar";
import PhaseProgressStrip from "./PhaseProgressStrip";
import { getAutoDoneKeys } from "@/lib/projectSignals";
import OwnershipBanner from "@/components/OwnershipBanner";
import { handwritingFontThin } from "@/lib/fonts";
import { isLeadRole, isSiteAdmin, isLastFounder } from "@/lib/authz";
import { isCommercialLegalType } from "@/lib/legalType";
import { buildMetadata, APP_URL } from "@/lib/metadata";
import { getLikeCommentData } from "@/lib/socialInteractions";
import ActivityFeed from "@/components/ActivityFeed";
import { fetchActivityItems, getFeedInteractionData } from "@/lib/activityFeed";
import { resolveProjectContent } from "@/lib/contentTranslation";
import { routing } from "@/i18n/routing";
import type { Locale } from "next-intl";
import MiniCalendar from "./MiniCalendar";
import { VerifiedImpactPanel } from "@/components/VerifiedImpactPanel";
import PhaseChecklistWidget from "./PhaseChecklistWidget";
import ProjectQuickActions from "./ProjectQuickActions";
import MostActiveMembersWidget from "./MostActiveMembersWidget";
import KanbanSummaryWidget from "./KanbanSummaryWidget";
import TasksWithSubtasksWidget from "./TasksWithSubtasksWidget";
import RecentChannelMessagesWidget from "./RecentChannelMessagesWidget";

const FEED_PREVIEW_SIZE = 10;
// Activity events about the board, folded into one line in the "Nyheter" tab.
const TASK_EVENT_TYPES = new Set(["task_created", "task_moved", "task_completed", "todo_completed"]);

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

function relativeTime(date: Date, t: ReturnType<typeof useTranslations>): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return t("justNow");
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t("minutesAgo", { minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("hoursAgo", { hours });
  const days = Math.floor(hours / 24);
  if (days < 7) return t("daysAgo", { days });
  return date.toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  await notFoundUnlessVisible(slug);
  const project = await prisma.project.findUnique({
    where: { slug },
    include: {
      translations: locale !== routing.defaultLocale ? { where: { locale } } : false,
    },
  });
  if (!project) return {};
  const content = resolveProjectContent(project, project.translations, locale as Locale);
  const t = await getTranslations({ locale, namespace: "ProjectDetailPage" });
  return buildMetadata({
    locale,
    path: `/projects/${slug}`,
    title: content.title,
    description: content.description ? stripHtml(content.description) : t("defaultProjectDescription"),
    imageUrl: project.imageUrl,
  });
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  await notFoundUnlessVisible(slug);
  const session = await auth();
  const t = await getTranslations("ProjectDetailPage");
  const tPhase = await getTranslations("ProjectPhase");
  const tFirst = await getTranslations("FirstTasks");

  const project = await prisma.project.findUnique({
    where: { slug },
    include: {
      owner: { select: { name: true } },
      org: { select: { name: true, slug: true } },
      githubBoard: true,
      members: {
        include: {
          user: { select: { name: true, id: true, image: true, showProfile: true } },
        },
        orderBy: { joinedAt: "asc" },
      },
      joinRequests: {
        where: { status: "pending" },
        include: { user: { select: { id: true, name: true, image: true } } },
      },
      neededSkills: {
        include: { skill: { select: { id: true, name: true, slug: true } } },
        orderBy: { addedAt: "asc" },
      },
      forkedFromProject: { select: { title: true, slug: true } },
      basedOnIdea: { select: { id: true, title: true, hiddenAt: true, author: { select: { name: true } } } },
      forks: { select: { title: true, slug: true } },
      translations: locale !== routing.defaultLocale ? { where: { locale } } : false,
    },
  });
  if (!project) notFound();

  const content = resolveProjectContent(project, project.translations, locale as Locale);
  // Polaroid-caption date, e.g. "19/8-26" — day/month-2digitYear, no leading zeros.
  const createdDateLabel = t("sinceDate", {
    date: project.createdAt.toLocaleDateString(locale === "sv" ? "sv-SE" : "en-GB", { month: "long", year: "numeric" }),
  });
  const sdgGoalsList = (project as typeof project & { sdgGoals: number[] }).sdgGoals;
  const sdgColorA = SDG_COLORS[sdgGoalsList[0]] ?? "#254441";
  const sdgColorB = SDG_COLORS[sdgGoalsList[1]] ?? "#12486C";
  const founderWords = await getFounderWords(project.id, project.description);
  const coverQuote = founderWords.dream ?? content.summary ?? null;
  const founderFirstName = founderWords.dream ? project.owner.name?.split(" ")[0] ?? null : null;

  const userId = session?.user?.id;
  const userMembership = project.members.find((m) => m.user.id === userId);
  // Site admins get the same project-level admin controls as a founder —
  // established precedent, see requireProjectRole's allowSiteAdmin default.
  const isOwnerOrAdmin = isLeadRole(userMembership?.role) || (!!userId && (await isSiteAdmin(userId)));
  const isMember = !!userMembership;
  // The AI-guided journey: link the phase menu to each phase's one-page
  // overview, and give leads a way straight back into the current phase.
  const showOverviews = !!userId && (await isFeatureEnabled("ai-project-start", userId));

  // A site-admin-hidden project (suspected criminal activity, see
  // contentModeration.ts) stays visible to its own members and site-admins,
  // 404s for everyone else — same pattern as idea/[id]'s hiddenAt gate.
  if (project.hiddenAt && !isMember && !isOwnerOrAdmin) notFound();

  // "Flöde i projekten" — real members (excludes the lightweight FOLLOWER
  // relationship) see the project's own feed above the project text;
  // everyone else sees it below, after the description/update sections.
  const isRealMember = isMember && userMembership?.role !== "FOLLOWER";
  const canLeave = isRealMember && userId ? !(await isLastFounder(project.id, userId)) : false;

  const { likeCount, liked } = await getLikeCommentData("project", project.id, userId ?? null);
  const shareUrl = `${APP_URL}/${locale}/projects/${slug}`;
  const shareText = content.description ? stripHtml(content.description) : undefined;

  // On-page preview only — always the 10 most recent, no pagination; the "Se hela
  // flödet →" link goes to /projects/[slug]/activity for the full paginated history.
  // Fetched twice as deep so "Nyheter" (people's posts, without task events) still has ten.
  const feedItems = await fetchActivityItems(FEED_PREVIEW_SIZE * 2, { projectId: project.id, projectSlug: slug });
  const feedPageItems = feedItems.slice(0, FEED_PREVIEW_SIZE);
  const isTaskEvent = (i: (typeof feedItems)[number]) =>
    i.targetType === "activityEvent" && !!i.activityType && TASK_EVENT_TYPES.has(i.activityType);
  const feedNewsItems = feedItems.filter((i) => !isTaskEvent(i)).slice(0, FEED_PREVIEW_SIZE);
  // The task events of the last week, folded into one line above "Nyheter".
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentTaskEvents = feedItems.filter((i) => isTaskEvent(i) && i.date.getTime() >= weekAgo);
  const tasksCreatedThisWeek = recentTaskEvents.filter((i) => i.activityType === "task_created").length;
  const tasksDoneThisWeek = recentTaskEvents.filter((i) => i.activityType === "task_completed" || i.activityType === "todo_completed").length;
  const {
    likeCountByTarget: feedLikeCountByTarget,
    likedByMe: feedLikedByMe,
    commentsByTarget: feedCommentsByTarget,
    memberProjectIds: feedMemberProjectIds,
    pendingJoinProjectIds: feedPendingJoinProjectIds,
  } = await getFeedInteractionData([...new Map([...feedPageItems, ...feedNewsItems].map((i) => [i.id, i])).values()], userId ?? null);

  // The project's voice and what it has learned (#275), and the last gate decision.
  const [synthesis, lastGateDecision] = await Promise.all([
    latestInsight<SynthesisContent>(project.id, "INTERVIEW_SYNTHESIS"),
    prisma.phaseGateDecision.findFirst({ where: { projectId: project.id }, orderBy: { createdAt: "desc" }, select: { outcome: true, createdAt: true } }),
  ]);
  const learnings = (synthesis?.content.learnings ?? []).slice(0, 3);
  const lastDecisionLabel = lastGateDecision
    ? `${t(`gateOutcome_${lastGateDecision.outcome}`)}, ${lastGateDecision.createdAt.toLocaleDateString(locale === "sv" ? "sv-SE" : "en-GB", { day: "numeric", month: "short" })}`
    : null;

  // Month bounds for calendar
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [latestUpdate, fundingCampaign, monthEvents, userJoinRequest, myOwnershipInterest, kanbanCards, recentChannelMessages, tokenTotals, checklistItems] =
    await Promise.all([
      prisma.blogPost.findFirst({
        where: { projectSlug: slug },
        orderBy: { createdAt: "desc" },
        select: { title: true, body: true, createdAt: true },
      }),
      prisma.fundingCampaign.findUnique({
        where: { projectId: project.id },
        include: {
          pledges: { select: { amount: true } },
          expenses: {
            select: { id: true, title: true, amount: true },
            orderBy: { date: "desc" },
            take: 6,
          },
        },
      }),
      prisma.calendarEvent.findMany({
        where: {
          projectSlug: slug,
          startsAt: { gte: monthStart, lte: monthEnd },
        },
        orderBy: { startsAt: "asc" },
        select: { id: true, title: true, startsAt: true },
      }),
      userId && !isMember
        ? prisma.projectJoinRequest.findFirst({
            where: { project: { slug }, userId },
            select: { status: true },
          })
        : Promise.resolve(null),
      userId && project.abandonedAt
        ? prisma.projectOwnershipInterest.findUnique({
            where: { projectId_userId: { projectId: project.id, userId } },
            select: { id: true },
          })
        : Promise.resolve(null),
      prisma.kanbanCard.findMany({
        where: { projectSlug: slug },
        select: {
          id: true,
          column: true,
          title: true,
          priority: true,
          assigneeId: true,
          source: true,
          githubType: true,
          githubState: true,
          githubMerged: true,
          subtasks: {
            select: { id: true, title: true, done: true },
            orderBy: { order: "asc" },
          },
        },
        orderBy: [{ column: "asc" }, { order: "asc" }],
      }),
      prisma.message.findMany({
        where: { room: { type: "PROJECT_CHANNEL", projectId: project.id }, threadParentId: null },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          roomId: true,
          body: true,
          createdAt: true,
          author: { select: { name: true, image: true } },
          room: { select: { id: true, name: true } },
        },
      }),
      prisma.tokenLedger.groupBy({
        by: ["userId"],
        where: { projectSlug: slug },
        _sum: { tokens: true },
        orderBy: { _sum: { tokens: "desc" } },
        take: 5,
      }),
      prisma.initiativeChecklistItem.findMany({
        where: { projectId: project.id, completedAt: { not: null } },
        select: { itemKey: true },
      }),
    ]);
  const autoDoneKeys = await getAutoDoneKeys(project.id, slug);

  const raised =
    fundingCampaign?.pledges.reduce((s, p) => s + p.amount, 0) ?? 0;
  const fundingPct = fundingCampaign
    ? Math.min(100, Math.round((raised / fundingCampaign.goal) * 100))
    : 0;
  const daysLeft = fundingCampaign?.deadline
    ? Math.max(
        0,
        Math.ceil(
          (new Date(fundingCampaign.deadline).getTime() - Date.now()) / 86400000
        )
      )
    : null;
  const openGithub = kanbanCards.filter(
    (c) => c.source === "github" && c.githubState === "open" && !c.githubMerged
  );
  const openGithubIssues = openGithub.filter((c) => c.githubType === "issue").length;
  const openGithubPrs = openGithub.filter((c) => c.githubType === "pull_request").length;

  const upcomingEvents = monthEvents.filter((e) => e.startsAt >= now);

  // Första uppgifter (#277): open to visitors; leads see how many sign-ups wait.
  const [openFirstTasks, pendingOffers, leadOpenFirstTaskCount, aiForPrompt] = await Promise.all([
    isRealMember ? Promise.resolve([]) : getOpenFirstTasks(slug, userId ?? null),
    isOwnerOrAdmin
      ? prisma.taskOffer.findMany({ where: { status: "PENDING", card: { projectSlug: slug } }, select: { cardId: true }, orderBy: { createdAt: "asc" } })
      : Promise.resolve([]),
    // #284: leads are asked for a first task until one is open.
    isOwnerOrAdmin && !project.abandonedAt
      ? prisma.kanbanCard.count({ where: { projectSlug: slug, openToPublic: true, column: { not: "DONE" } } })
      : Promise.resolve(1),
    isOwnerOrAdmin ? isAiProjectStartAvailable(userId) : Promise.resolve(false),
  ]);

  // Members' next steps (#275): what's waiting for them, at the top of the page.
  const memberNextSteps: NextStepItem[] = [];
  if (isRealMember && !project.abandonedAt) {
    const tChecklist = await getTranslations("ProjectPhaseChecklist");
    const inReview = kanbanCards.filter((c) => c.column === "REVIEW").length;
    if (pendingOffers.length > 0) {
      memberNextSteps.push({ key: "offers", label: t("nextStepOffers", { count: pendingOffers.length }), href: `/projects/${slug}/tasks?card=${pendingOffers[0].cardId}`, cta: t("nextStepOffersCta") });
    }
    if (isOwnerOrAdmin && inReview > 0) {
      memberNextSteps.push({ key: "review", label: t("nextStepReview", { count: inReview }), href: `/projects/${slug}/tasks`, cta: t("nextStepReviewCta") });
    }
    const journey = await getProjectJourney({ id: project.id, slug, phase: project.phase });
    if (journey.nextStepKey && journey.nextStepHref) {
      memberNextSteps.push({ key: "step", label: t("nextStepPhase", { step: tChecklist(journey.nextStepKey) }), href: journey.nextStepHref, cta: t("nextStepPhaseCta") });
    }
    if (isOwnerOrAdmin && project.joinRequests.length > 0) {
      memberNextSteps.push({ key: "join", label: t("nextStepJoin", { count: project.joinRequests.length }), href: `/projects/${slug}/members`, cta: t("nextStepJoinCta") });
    }
    const mine = kanbanCards.filter((c) => c.assigneeId === userId && c.column !== "DONE").length;
    if (mine > 0) {
      memberNextSteps.push({ key: "mine", label: t("nextStepMine", { count: mine }), href: `/projects/${slug}/tasks`, cta: t("nextStepMineCta") });
    }
  }
  const projectLinks: string[] = (project as typeof project & { links: string[] }).links ?? [];

  const sortedMembers = [...project.members].sort((a, b) =>
    a.role === "FOUNDER" && b.role !== "FOUNDER" ? -1
    : b.role === "FOUNDER" && a.role !== "FOUNDER" ? 1 : 0
  );

  const memberMap = new Map(project.members.map((m) => [m.user.id, m.user]));
  const mostActiveMembers = tokenTotals
    .map((t) => {
      const user = memberMap.get(t.userId);
      if (!user) return null;
      return { id: user.id, name: user.name ?? "Okänd", image: user.image, showProfile: user.showProfile, tokens: t._sum.tokens ?? 0 };
    })
    .filter((m): m is NonNullable<typeof m> => m !== null);

  const renderFeed = (items: typeof feedPageItems) => (
    <ActivityFeed
      pageItems={items}
      isLoggedIn={!!userId}
      page={1}
      total={items.length}
      perPage={FEED_PREVIEW_SIZE}
      basePath={`/projects/${slug}`}
      likeCountByTarget={feedLikeCountByTarget}
      likedByMe={feedLikedByMe}
      commentsByTarget={feedCommentsByTarget}
      memberProjectIds={feedMemberProjectIds}
      pendingJoinProjectIds={feedPendingJoinProjectIds}
      projectId={project.id}
      emptyMessage={t("noActivityYet")}
    />
  );
  const feedSection = (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-dark-slate">{t("activityHeading")}</h2>
        <Link href={`/projects/${slug}/activity`} className="text-xs text-seagrass hover:underline">
          {t("viewFullActivityFeed")}
        </Link>
      </div>
      <FeedTabs
        labels={{ news: t("feedTabNews"), all: t("feedTabAll") }}
        news={
          <>
            {tasksCreatedThisWeek + tasksDoneThisWeek > 0 && (
              <p className="mb-3 rounded-lg border border-muted-teal/30 bg-white px-3 py-2 text-xs text-dark-slate/70">
                {t("feedTaskSummary", { created: tasksCreatedThisWeek, done: tasksDoneThisWeek })}
              </p>
            )}
            {renderFeed(feedNewsItems)}
          </>
        }
        all={renderFeed(feedPageItems)}
      />
    </section>
  );

  return (
    <div className="flex flex-1 flex-col">
      <ProjectTopNav
        slug={slug}
        title={project.title}
        isOwner={!!isOwnerOrAdmin}
        isCommercial={isCommercialLegalType(project.legalType)}
        phase={project.phase}
        completedChecklistKeys={checklistItems.map((c) => c.itemKey)}
        phaseStrip={<PhaseProgressStrip projectId={project.id} slug={slug} viewing={project.phase} inHeader />}
      />
      {/* Hero + side nav + page content: one continuous full-bleed row, so the rail runs from the hero down to the footer */}
      <div
        className="relative -mt-8"
        style={{ marginLeft: "calc(50% - 50vw)", width: "100vw" }}
      >
        <div
          className="absolute top-0 left-0 right-0 overflow-hidden border-b border-muted-teal/20"
          style={{ height: "490px" }}
        >
          {project.imageUrl ? (
            <>
              {/* Lightly blurred, so the image is still recognisable behind the cards; a soft tone keeps them standing out. */}
              <Image src={project.imageUrl} alt="" fill unoptimized className="object-cover blur-[6px] scale-105" sizes="100vw" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/35" />
            </>
          ) : (
            <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${sdgColorA}, ${sdgColorB})` }} />
          )}
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row -mb-12">
        <ProjectSideNav
          slug={slug}
          isOwner={!!isOwnerOrAdmin}
          isCommercial={isCommercialLegalType(project.legalType)}
          phase={project.phase}
          completedChecklistKeys={checklistItems.map((c) => c.itemKey)}
        />
        <div className="flex-1 min-w-0 pb-12">
          <div className="px-4 pt-10 pb-10">
            <div className="flex flex-wrap justify-center gap-5 items-stretch w-full max-w-[1160px] mx-auto">
              {/* Card 1: project image — Polaroid-style, name written on the
                  white border like a photo caption. */}
              <div
                className="shrink-0 bg-white w-full max-w-[660px] 2xl:max-w-[820px]"
                style={{
                  // No overflow-hidden here — the image is already fully bounded
                  // by its own div below (position: relative + fixed height, so
                  // `fill` never exceeds it), so this card doesn't need to clip
                  // anything. It used to also clip Kalam's tall glyphs (ascenders
                  // on the title, descenders like "j" on the slogan) whenever
                  // they rendered slightly outside leading-none's tight 26px line
                  // box — removing it here fixes that outright instead of
                  // guessing at how many extra px of padding buffer they need.
                  // Bottom padding covers for the missing slogan line (40px line
                  // height + 3px gap) when there is none, so the blank zone below
                  // the image still matches the title's zone above it.
                  padding: project.slogan ? "0px 24px 0px" : "0px 24px 43px",
                  boxShadow: "0 8px 40px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.3)", transform: "rotate(-3deg)", position: "relative", zIndex: 1,
                }}
              >
                {/* line-height is explicit (not leading-none) because `truncate`
                    sets overflow-hidden on this element itself — Kalam's tall
                    glyphs (ascenders here, descenders like "j" on the slogan
                    below) need a line box big enough to actually contain them,
                    or they clip regardless of the card's own overflow setting.
                    40px is the smallest that keeps the clip imperceptible —
                    tested empirically, anything smaller visibly clips descenders. */}
                <p className={`${handwritingFontThin.className} text-center truncate px-2`} style={{ fontSize: 26, lineHeight: "40px", color: "#1a3d8f", transform: "translateY(2px)" }}>
                  {content.title} – {createdDateLabel}
                </p>
                <div className="relative w-full h-64 sm:h-80 md:h-[400px] 2xl:h-[460px] mt-[3px]">
                  {project.imageUrl ? (
                    <Image src={project.imageUrl} alt={content.title} fill unoptimized className="object-cover" />
                  ) : coverQuote ? (
                    // No image yet: the dream in the founder's own words, in the project's SDG colours.
                    <div
                      className="relative w-full h-full flex flex-col justify-center overflow-hidden px-8 sm:px-12"
                      style={{ background: `radial-gradient(circle at 85% 15%, ${sdgColorB} 0%, transparent 55%), linear-gradient(135deg, ${sdgColorA}, #12486C)` }}
                    >
                      <span aria-hidden className="absolute -right-4 -top-10 select-none text-[180px] font-black leading-none text-white/10">”</span>
                      <p className={`${handwritingFontThin.className} text-white text-2xl sm:text-[32px] leading-snug line-clamp-5`}>”{coverQuote}”</p>
                      {founderFirstName && <p className="mt-3 text-sm text-white/80">— {founderFirstName}</p>}
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-dry-sage/20">
                      <span className="text-6xl font-bold text-dark-slate/20">{content.title[0]}</span>
                    </div>
                  )}
                </div>
                {project.slogan && (
                  <p className={`${handwritingFontThin.className} text-center truncate px-2 mt-[3px]`} style={{ fontSize: 26, lineHeight: "40px", color: "#1a3d8f" }}>
                    &quot;{project.slogan}&quot;
                  </p>
                )}
              </div>
              {/* Card 2: team + SDG + join */}
              <div
                className="shrink-0 bg-white rounded-2xl p-5 flex flex-col w-full max-w-[320px] min-h-0 md:min-h-[400px] 2xl:min-h-[460px]"
                style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.3)", marginLeft: "-10px", transform: "rotate(3deg)" }}
              >
                {project.members.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-dark-slate/70 mb-2 uppercase tracking-wide">
                      {t("teamHeading")} <span className="text-[9px] font-normal text-dark-slate/40">· {t("membersCount", { count: project.members.length })}</span>
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {sortedMembers.slice(0, 12).map((m, i) => {
                        const isProjectOwner = m.role === "FOUNDER";
                        const initials = (m.user.name ?? "?").charAt(0).toUpperCase();
                        const firstName = (m.user.name ?? "?").split(" ")[0];
                        const avatarClass = `w-10 h-10 rounded-full overflow-hidden bg-dry-sage relative flex items-center justify-center text-sm font-semibold text-dark-slate shrink-0 ring-2 transition-all duration-200 ease-in-out hover:scale-[1.3] hover:shadow-lg cursor-pointer ${isProjectOwner ? "ring-seagrass" : "ring-white"}`;
                        const avatarContent = m.user.image ? (
                          <Image src={m.user.image} alt={m.user.name ?? ""} fill className="object-cover" unoptimized />
                        ) : initials;
                        const avatar = m.user.showProfile ? (
                          <Link href={`/members/${m.user.id}`} className={avatarClass}>{avatarContent}</Link>
                        ) : (
                          <div className={avatarClass}>{avatarContent}</div>
                        );
                        return (
                          <Tooltip key={i} lines={isProjectOwner ? [t("founderLabel")] : []}>
                            <div className="flex flex-col items-center gap-1 w-10">
                              {avatar}
                              <span className="text-[9px] text-dark-slate/60 text-center truncate w-full leading-tight">{firstName}</span>
                            </div>
                          </Tooltip>
                        );
                      })}
                      {project.members.length > 12 && (
                        <div className="flex flex-col items-center gap-1 w-10">
                          <div className="w-10 h-10 rounded-full ring-2 ring-white bg-muted-teal/20 flex items-center justify-center text-xs font-semibold text-dark-slate/60">+{project.members.length - 12}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div className="flex-1" />
                {/* With open first tasks, the way in is one of them (#277); "gå med direkt" stays as a link. */}
                {!isRealMember && openFirstTasks.length > 0 ? (
                  <div className="mb-3">
                    <a
                      href="#forsta-uppgifter"
                      className="flex justify-center w-full py-2.5 bg-coral text-white rounded-xl font-bold text-base hover:bg-coral/90 transition-colors shadow-md"
                    >
                      {tFirst("heroCta")}
                    </a>
                    <p className="mt-1.5 text-center text-[11px] text-dark-slate/60">
                      {tFirst("heroCtaNote", { count: openFirstTasks.length })}{" "}
                      {isMember ? null : userId ? (
                        <JoinButton
                          projectId={project.id}
                          slug={slug}
                          existingStatus={userJoinRequest?.status ?? null}
                          label={tFirst("heroJoinDirect")}
                          className="underline hover:text-coral"
                        />
                      ) : (
                        <Link href={`/login?callbackUrl=${encodeURIComponent(`/projects/${slug}`)}`} className="underline hover:text-coral">
                          {tFirst("heroJoinDirect")}
                        </Link>
                      )}
                    </p>
                  </div>
                ) : !isMember && (
                  <div className="mb-3">
                    {userId ? (
                      <JoinButton
                        projectId={project.id}
                        slug={slug}
                        existingStatus={userJoinRequest?.status ?? null}
                        label={t("joinCta")}
                        className="flex justify-center w-full py-2.5 bg-coral text-white rounded-xl font-bold text-base hover:bg-coral/90 transition-colors shadow-md"
                      />
                    ) : (
                      <Link
                        href={`/login?callbackUrl=${encodeURIComponent(`/projects/${slug}`)}`}
                        className="flex justify-center w-full py-2.5 bg-coral text-white rounded-xl font-bold text-base hover:bg-coral/90 transition-colors shadow-md"
                      >
                        {t("joinCta")}
                      </Link>
                    )}
                  </div>
                )}
                {(project as typeof project & { sdgGoals: number[] }).sdgGoals.length > 0 && (
                  <div className="mt-2">
                    <p className="text-[10px] font-semibold text-dark-slate/40 uppercase tracking-wider mb-1.5">{t("agenda2030Label")}</p>
                    <div className="grid grid-cols-6 gap-1">
                      {[...Array.from({ length: 17 }, (_, i) => i + 1), 18].map((n) => {
                        const isSelected = (project as typeof project & { sdgGoals: number[] }).sdgGoals.includes(n) || n === 18;
                        return (
                          <Tooltip key={n} lines={[t("sdgBadgeLabel", { number: n }), SDG_LABELS_SV[n] ?? ""]}>
                            <a href={SDG_UN_URLS[n] ?? "https://www.un.org/sustainabledevelopment/sustainable-development-goals/"} target="_blank" rel="noopener noreferrer" className="transition-all duration-200 ease-in-out hover:scale-[1.6] hover:shadow-lg block cursor-pointer">
                              <SdgIcon n={n} size={44} dark={!isSelected} />
                            </a>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

      <div className="px-6">
      <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        {/* PROTOTYPE: on wide screens the phases live in the header. */}
        <div className="lg:hidden">
        <PhaseMenuBar
          slug={slug}
          phase={project.phase}
          completedKeys={checklistItems.map((c) => c.itemKey)}
          autoDoneKeys={autoDoneKeys}
          canEdit={!!isOwnerOrAdmin}
          showOverviews={showOverviews}
          showNextStep={isRealMember && !project.abandonedAt}
        />
        </div>
        {showOverviews && isOwnerOrAdmin && !project.abandonedAt && (
          <Link
            href={`/projects/${slug}/${overviewPathFor(project.phase)}`}
            className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-seagrass/30 bg-seagrass/5 px-4 py-3 text-sm font-semibold text-seagrass hover:bg-seagrass/10"
          >
            {t("continuePhase", { phase: tPhase(project.phase) })} <span aria-hidden>→</span>
          </Link>
        )}
      </div>

      {project.abandonedAt && (
        <OwnershipBanner
          slug={slug}
          isFounder={!!isOwnerOrAdmin}
          userId={userId ?? null}
          alreadyExpressedInterest={!!myOwnershipInterest}
        />
      )}

      {/* #233: the shared idea this project drives, credited to its author. */}
      {project.basedOnIdea && !project.basedOnIdea.hiddenAt && (
        <div className="max-w-2xl mx-auto mb-4 px-4 text-sm text-dark-slate/60 text-center">
          <span aria-hidden>💡 </span>
          {t.rich("basedOnIdea", {
            author: project.basedOnIdea.author.name ?? "—",
            idea: (chunks) => (
              <Link href={`/ideas/${project.basedOnIdea!.id}`} className="text-seagrass hover:underline">
                {chunks}
              </Link>
            ),
          })}
        </div>
      )}

      {project.forkedFromProject && (
        <div className="max-w-2xl mx-auto mb-4 px-4 text-sm text-dark-slate/60 text-center">
          {t("forkedFromLabel")}{" "}
          <Link href={`/projects/${project.forkedFromProject.slug}`} className="text-seagrass hover:underline">
            {project.forkedFromProject.title}
          </Link>
        </div>
      )}

      {project.forks.length > 0 && (
        <div className="max-w-2xl mx-auto mb-6 px-4 flex items-center justify-center text-sm">
          <span className="text-dark-slate/40">
            {t("forksCountLabel", { count: project.forks.length })}{" "}
            {project.forks.map((f, i) => (
              <span key={f.slug}>
                {i > 0 && ", "}
                <Link href={`/projects/${f.slug}`} className="text-seagrass hover:underline">
                  {f.title}
                </Link>
              </span>
            ))}
          </span>
        </div>
      )}

      {isOwnerOrAdmin && project.joinRequests.length > 0 && (
        <div className="mb-8">
          <JoinRequestsPanel requests={project.joinRequests} slug={slug} />
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-5 items-stretch md:items-start md:-mr-7">
        {/* Left: project story */}
        <div className="flex-1 min-w-0 space-y-8">
          <MemberNextSteps
            heading={session?.user?.name ? t("nextStepsHeading", { name: session.user.name.split(" ")[0] }) : t("nextStepsHeadingNoName")}
            items={memberNextSteps}
          />

          {isOwnerOrAdmin && leadOpenFirstTaskCount === 0 && (
            <FirstTaskPrompt projectId={project.id} published={!!project.publishedAt} aiAvailable={aiForPrompt} />
          )}

          {isRealMember && feedSection}

          <ProjectVoice
            why={founderWords.why}
            founderName={project.owner.name}
            learnings={learnings}
            accent={sdgColorA}
            labels={{
              why: t("whyHeading"),
              whyBy: t("whyBy", { name: project.owner.name?.split(" ")[0] ?? "" }),
              learned: t("learnedHeading"),
              learnedSource: t("learnedSource"),
            }}
          />

          <section>
            <h2 className="text-base font-semibold text-dark-slate mb-4">{t("aboutProjectHeading")}</h2>
            <div className="bg-white border border-muted-teal/30 rounded-xl p-6">
              {content.summary && <p className="max-w-[760px] mx-auto mb-4 text-xl font-bold leading-snug text-dark-slate">{content.summary}</p>}
              <CollapsibleStory more={t("readFullStory")} less={t("showLess")}>
              {content.description ? (
                content.description.trimStart().startsWith("<") ? (
                  <article
                    className="prose max-w-[760px] mx-auto text-dark-slate leading-relaxed
                      prose-headings:text-dark-slate
                      prose-a:text-seagrass prose-a:no-underline hover:prose-a:underline
                      prose-strong:text-dark-slate prose-img:rounded-xl prose-img:max-w-full"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(content.description) }}
                  />
                ) : (
                  <article className="prose max-w-[760px] mx-auto text-dark-slate leading-relaxed
                    prose-headings:text-dark-slate
                    prose-a:text-seagrass prose-a:no-underline hover:prose-a:underline
                    prose-strong:text-dark-slate prose-img:rounded-xl">
                    <ReactMarkdown>{content.description}</ReactMarkdown>
                  </article>
                )
              ) : (
                <p className="text-dark-slate/40 italic text-sm">{t("noDescriptionYet")}</p>
              )}
              </CollapsibleStory>
            </div>
          </section>

          {latestUpdate && (
            <section>
              <h2 className="text-sm font-semibold text-dark-slate mb-3">{t("latestUpdateHeading")}</h2>
              <div className="bg-white border border-muted-teal/30 rounded-xl p-4">
                <p className="font-semibold text-dark-slate text-sm mb-1">{latestUpdate.title}</p>
                <p className="text-sm text-dark-slate/60 line-clamp-3">{latestUpdate.body}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-dark-slate/40">
                    {relativeTime(latestUpdate.createdAt, t)}
                  </span>
                  <Link
                    href={`/projects/${slug}/updates`}
                    className="text-xs text-seagrass hover:text-seagrass/80 font-medium"
                  >
                    {t("allUpdatesLink")}
                  </Link>
                </div>
              </div>
            </section>
          )}

          {!isRealMember && feedSection}
        </div>

        {/* Right sidebar — 320px to align with hero right card */}
        <div className="w-full md:w-[320px] shrink-0 flex flex-col gap-5">

          {/* Share / like / join-leave — the whole-project actions, always first so they're visible without scrolling */}
          <ProjectQuickActions
            projectId={project.id}
            slug={slug}
            userId={userId ?? null}
            isRealMember={isRealMember}
            canLeave={canLeave}
            initialIsFollowing={userMembership?.role === "FOLLOWER"}
            existingJoinStatus={userJoinRequest?.status ?? null}
            initialLikeCount={likeCount}
            initialLiked={liked}
            shareUrl={shareUrl}
            shareTitle={content.title}
            shareText={shareText}
            // Rendered even when empty, so a just-taken last task keeps its confirmation.
            firstTasks={isRealMember ? undefined : <FirstTasksPanel tasks={openFirstTasks} slug={slug} projectTitle={content.title} userId={userId ?? null} />}
            hasFirstTasks={openFirstTasks.length > 0}
          />

          {/* Verified impact (PRD 4d) — renders nothing until the Foundation
              has verified at least one report, so it can only ever add
              credibility, never advertise its absence */}
          <VerifiedImpactPanel projectId={project.id} locale={locale} />

          {/* Phase checklist — same items/toggle as PhaseMenuBar's popover, always visible for the current phase */}
          <PhaseChecklistWidget
            slug={slug}
            phase={project.phase}
            completedKeys={checklistItems.map((c) => c.itemKey)}
            autoDoneKeys={autoDoneKeys}
            canEdit={isOwnerOrAdmin}
            lastDecision={lastDecisionLabel}
          />
          <Link
            href={`/projects/${slug}/roadmap`}
            className="text-xs text-coral hover:text-watermelon font-medium transition-colors -mt-2"
          >
            {t("seeRoadmapLink")}
          </Link>

          {/* Skills needed */}
          {project.neededSkills.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-dark-slate mb-3">{t("skillsNeededHeading")}</h2>
              <div className="flex flex-wrap gap-2">
                {project.neededSkills.map(({ skill }) => (
                  <Link
                    key={skill.id}
                    href={`/skill/${skill.slug}`}
                    className="text-xs bg-dry-sage text-dark-slate px-3 py-1 rounded-full hover:bg-muted-teal/30 transition-colors"
                  >
                    {skill.name}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Links */}
          {projectLinks.length > 0 && (
            <section className="bg-white border border-muted-teal/30 rounded-xl p-4">
              <h2 className="text-sm font-semibold text-dark-slate mb-3">{t("linksHeading")}</h2>
              <ul className="space-y-2">
                {projectLinks.map((url, i) => {
                  let hostname = url;
                  try {
                    hostname = new URL(url).hostname.replace(/^www\./, "");
                  } catch {}
                  return (
                    <li key={i}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs text-seagrass hover:underline"
                      >
                        <span className="text-dark-slate/40">🔗</span>
                        <span className="truncate">{hostname}</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <MostActiveMembersWidget members={mostActiveMembers} slug={slug} t={t} />

          {/* Empty boxes say nothing to a visitor (#275); members always see them. */}
          {(isRealMember || kanbanCards.length > 0) && <KanbanSummaryWidget cards={kanbanCards} slug={slug} t={t} />}

          {(isRealMember || kanbanCards.length > 0) && <TasksWithSubtasksWidget cards={kanbanCards} slug={slug} t={t} />}

          <RecentChannelMessagesWidget
            messages={recentChannelMessages.map((msg) => ({
              id: msg.id,
              body: msg.body,
              timeLabel: relativeTime(msg.createdAt, t),
              author: msg.author,
              room: msg.room,
            }))}
            slug={slug}
            t={t}
          />

          {/* GitHub — read-only mirror of the mapped project board */}
          {project.githubBoard && (isRealMember || openGithubIssues + openGithubPrs > 0) && (
            <section className="bg-white border border-muted-teal/30 rounded-xl p-4">
              <h2 className="text-sm font-semibold text-dark-slate mb-3">{t("githubHeading")}</h2>
              <a
                href={
                  project.githubBoard.projectUrl ??
                  `https://github.com/orgs/${project.githubBoard.ownerLogin}/projects/${project.githubBoard.projectNumber}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono text-seagrass hover:underline break-all"
              >
                {project.githubBoard.projectTitle ??
                  `${project.githubBoard.ownerLogin}/${project.githubBoard.projectNumber}`}
              </a>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <dt className="text-dark-slate/50">{t("openIssuesLabel")}</dt>
                  <dd className="text-base font-semibold text-dark-slate">{openGithubIssues}</dd>
                </div>
                <div>
                  <dt className="text-dark-slate/50">{t("openPrsLabel")}</dt>
                  <dd className="text-base font-semibold text-dark-slate">{openGithubPrs}</dd>
                </div>
              </dl>
              {project.githubBoard.lastSyncError ? (
                <p className="mt-3 text-xs text-watermelon">
                  {t("syncFailedLabel", { error: project.githubBoard.lastSyncError })}
                </p>
              ) : project.githubBoard.lastSyncedAt ? (
                <p className="mt-3 text-xs text-dark-slate/50">
                  {t("syncedLabel", { time: relativeTime(project.githubBoard.lastSyncedAt, t) })}
                </p>
              ) : (
                <p className="mt-3 text-xs text-dark-slate/50">{t("waitingFirstSyncLabel")}</p>
              )}
              <Link
                href={`/projects/${slug}/tasks`}
                className="mt-2 block text-xs text-seagrass hover:underline"
              >
                {t("viewAsTasksLink")}
              </Link>
            </section>
          )}

          {/* Calendar widget — for visitors only when something is coming up */}
          {(isRealMember || upcomingEvents.length > 0) && (
          <section className="bg-white border border-muted-teal/30 rounded-xl p-4">
            <h2 className="text-sm font-semibold text-dark-slate mb-3">{t("calendarHeading")}</h2>
            <MiniCalendar events={monthEvents} t={t} />
            {upcomingEvents.length > 0 && (
              <ul className="mt-3 space-y-1.5 border-t border-muted-teal/20 pt-3">
                {upcomingEvents.slice(0, 3).map((ev) => (
                  <li key={ev.id} className="flex gap-2 items-start text-xs">
                    <span className="shrink-0 font-semibold text-coral tabular-nums w-10 text-right">
                      {ev.startsAt.toLocaleDateString("sv-SE", { day: "numeric", month: "short" })}
                    </span>
                    <span className="text-dark-slate/70 leading-snug">{ev.title}</span>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href={`/projects/${slug}/calendar`}
              className="mt-2 block text-xs text-seagrass hover:underline"
            >
              {t("openCalendarLink")}
            </Link>
          </section>
          )}

          {/* Costs */}
          {fundingCampaign && fundingCampaign.expenses.length > 0 && (
            <section className="bg-white border border-muted-teal/30 rounded-xl p-4">
              <h2 className="text-sm font-semibold text-dark-slate mb-3">{t("costsHeading")}</h2>
              <ul className="space-y-2">
                {fundingCampaign.expenses.map((exp) => (
                  <li key={exp.id} className="flex justify-between items-center text-xs">
                    <span className="text-dark-slate/70 truncate pr-2">{exp.title}</span>
                    <span className="shrink-0 font-semibold text-dark-slate tabular-nums">
                      {exp.amount.toLocaleString("sv-SE")} {fundingCampaign.currency}
                    </span>
                  </li>
                ))}
              </ul>
              <Link
                href={`/projects/${slug}/funding`}
                className="mt-3 block text-xs text-seagrass hover:underline"
              >
                {t("allExpensesLink")}
              </Link>
            </section>
          )}

          {/* Funding widget */}
          {fundingCampaign && (
            <section className="bg-white border border-muted-teal/30 rounded-xl p-4">
              <div className="space-y-2 mb-4">
                <div className="flex justify-between items-end">
                  <span className="text-xl font-bold text-dark-slate">
                    {raised.toLocaleString("sv-SE")}
                  </span>
                  <span className="text-xs text-dark-slate/50">
                    {t("fundingGoalLabel", { goal: fundingCampaign.goal.toLocaleString("sv-SE"), currency: fundingCampaign.currency })}
                  </span>
                </div>
                <div className="w-full h-2 bg-muted-teal/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-coral rounded-full transition-all"
                    style={{ width: `${fundingPct}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-dark-slate/50">
                  <span className="font-semibold text-dark-slate">{t("fundingPercentLabel", { pct: fundingPct })}</span>
                  {daysLeft !== null && <span>{t("daysLeftLabel", { days: daysLeft })}</span>}
                </div>
              </div>
              <Link
                href={`/projects/${slug}/funding`}
                className="block w-full text-center px-4 py-2.5 bg-coral text-white rounded-xl font-semibold text-sm hover:bg-coral/90 transition-colors"
              >
                {t("supportProjectButton")}
              </Link>
            </section>
          )}
        </div>
      </div>

      {userId && !isOwnerOrAdmin && (
        <div className="mt-6 pt-6 border-t border-muted-teal/20 flex justify-end items-center gap-3">
          <FlagContentButton targetType="Project" targetId={project.id} />
        </div>
      )}

      </div>
      </div>
      </div>
      </div>
      </div>
    </div>
  );
}
