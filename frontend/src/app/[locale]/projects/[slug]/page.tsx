import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { getTranslations } from "next-intl/server";
import type { useTranslations } from "next-intl";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { JoinButton, JoinRequestsPanel } from "./JoinSection";
import FlagContentButton from "@/components/FlagContentButton";
import { SdgIcon } from "@/components/SdgIcon";
import Tooltip from "@/components/Tooltip";
import { SDG_LABELS_SV, SDG_UN_URLS } from "@/lib/sdg";
import ProjectSideNav from "./ProjectSideNav";
import PhaseMenuBar from "./PhaseMenuBar";
import OwnershipBanner from "@/components/OwnershipBanner";
import { handwritingFontThin } from "@/lib/fonts";
import { ProjectSandboxAnnouncer } from "@/components/SandboxIndicator";
import { isLeadRole, isSiteAdmin, isLastFounder } from "@/lib/authz";
import { isCommercialLegalType } from "@/lib/legalType";
import { buildMetadata, APP_URL } from "@/lib/metadata";
import { computeTaskProgress } from "@/lib/taskProgress";
import { getLikeCommentData } from "@/lib/socialInteractions";
import { toProxyUrl } from "@/lib/storageUrl";
import ActivityFeed from "@/components/ActivityFeed";
import { fetchActivityItems, getFeedInteractionData } from "@/lib/activityFeed";
import { resolveProjectContent } from "@/lib/contentTranslation";
import { routing } from "@/i18n/routing";
import type { Locale } from "next-intl";
import MiniCalendar from "./MiniCalendar";
import PhaseChecklistWidget from "./PhaseChecklistWidget";
import ProjectQuickActions from "./ProjectQuickActions";

const FEED_PREVIEW_SIZE = 10;

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
  const session = await auth();
  const t = await getTranslations("ProjectDetailPage");

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
      forks: { select: { title: true, slug: true } },
      translations: locale !== routing.defaultLocale ? { where: { locale } } : false,
    },
  });
  if (!project) notFound();

  const content = resolveProjectContent(project, project.translations, locale as Locale);
  // Polaroid-caption date, e.g. "19/8-26" — day/month-2digitYear, no leading zeros.
  const createdDateLabel = `${project.createdAt.getDate()}/${project.createdAt.getMonth() + 1}-${String(project.createdAt.getFullYear()).slice(-2)}`;

  const userId = session?.user?.id;
  const userMembership = project.members.find((m) => m.user.id === userId);
  // Site admins get the same project-level admin controls as a founder —
  // established precedent, see requireProjectRole's allowSiteAdmin default.
  const isOwnerOrAdmin = isLeadRole(userMembership?.role) || (!!userId && (await isSiteAdmin(userId)));
  const isMember = !!userMembership;
  const canLeave = isMember && userId ? !(await isLastFounder(project.id, userId)) : false;

  // A site-admin-hidden project (suspected criminal activity, see
  // contentModeration.ts) stays visible to its own members and site-admins,
  // 404s for everyone else — same pattern as idea/[id]'s hiddenAt gate.
  if (project.hiddenAt && !isMember && !isOwnerOrAdmin) notFound();

  // "Flöde i projekten" — real members (excludes the lightweight FOLLOWER
  // relationship) see the project's own feed above the project text;
  // everyone else sees it below, after the description/update sections.
  const isRealMember = isMember && userMembership?.role !== "FOLLOWER";

  const { likeCount, liked } = await getLikeCommentData("project", project.id, userId ?? null);
  const shareUrl = `${APP_URL}/${locale}/projects/${slug}`;
  const shareText = content.description ? stripHtml(content.description) : undefined;

  // On-page preview only — always the 10 most recent, no pagination; the "Se hela
  // flödet →" link goes to /projects/[slug]/activity for the full paginated history.
  const feedPageItems = (await fetchActivityItems(FEED_PREVIEW_SIZE, { projectId: project.id, projectSlug: slug })).slice(0, FEED_PREVIEW_SIZE);
  const {
    likeCountByTarget: feedLikeCountByTarget,
    likedByMe: feedLikedByMe,
    commentsByTarget: feedCommentsByTarget,
    memberProjectIds: feedMemberProjectIds,
    pendingJoinProjectIds: feedPendingJoinProjectIds,
  } = await getFeedInteractionData(feedPageItems, userId ?? null);

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

  return (
    <div className="flex flex-1 flex-col">
      <ProjectSandboxAnnouncer isSandbox={project.isSandbox} />
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
            <Image src={project.imageUrl} alt="" fill unoptimized className="object-cover blur-2xl scale-110" sizes="100vw" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-dark-slate to-dark-slate/70" />
          )}
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row -mb-12">
        <ProjectSideNav slug={slug} isOwner={!!isOwnerOrAdmin} isCommercial={isCommercialLegalType(project.legalType)} />
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
                  {content.title} - {createdDateLabel}
                </p>
                <div className="relative w-full h-64 sm:h-80 md:h-[400px] 2xl:h-[460px] mt-[3px]">
                  {project.imageUrl ? (
                    <Image src={project.imageUrl} alt={content.title} fill unoptimized className="object-cover" />
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
                {!isMember && (
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
        <PhaseMenuBar
          slug={slug}
          phase={project.phase}
          completedKeys={checklistItems.map((c) => c.itemKey)}
          canEdit={!!isOwnerOrAdmin}
        />
      </div>

      {project.abandonedAt && (
        <OwnershipBanner
          slug={slug}
          isFounder={!!isOwnerOrAdmin}
          userId={userId ?? null}
          alreadyExpressedInterest={!!myOwnershipInterest}
        />
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
          {isRealMember && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-dark-slate">{t("activityHeading")}</h2>
                <Link href={`/projects/${slug}/activity`} className="text-xs text-seagrass hover:underline">
                  {t("viewFullActivityFeed")}
                </Link>
              </div>
              <ActivityFeed
                pageItems={feedPageItems}
                isLoggedIn={!!userId}
                page={1}
                total={feedPageItems.length}
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
            </section>
          )}

          <section>
            <h2 className="text-base font-semibold text-dark-slate mb-4">{t("aboutProjectHeading")}</h2>
            <div className="bg-white border border-muted-teal/30 rounded-xl p-6">
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

          {!isRealMember && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-dark-slate">{t("activityHeading")}</h2>
                <Link href={`/projects/${slug}/activity`} className="text-xs text-seagrass hover:underline">
                  {t("viewFullActivityFeed")}
                </Link>
              </div>
              <ActivityFeed
                pageItems={feedPageItems}
                isLoggedIn={!!userId}
                page={1}
                total={feedPageItems.length}
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
            </section>
          )}
        </div>

        {/* Right sidebar — 320px to align with hero right card */}
        <div className="w-full md:w-[320px] shrink-0 flex flex-col gap-5">

          {/* Share / like / join-leave — the whole-project actions, always first so they're visible without scrolling */}
          <ProjectQuickActions
            projectId={project.id}
            slug={slug}
            userId={userId ?? null}
            isMember={isMember}
            canLeave={canLeave}
            existingJoinStatus={userJoinRequest?.status ?? null}
            initialLikeCount={likeCount}
            initialLiked={liked}
            shareUrl={shareUrl}
            shareTitle={content.title}
            shareText={shareText}
          />

          {/* Phase checklist — same items/toggle as PhaseMenuBar's popover, always visible for the current phase */}
          <PhaseChecklistWidget
            slug={slug}
            phase={project.phase}
            completedKeys={checklistItems.map((c) => c.itemKey)}
            canEdit={isOwnerOrAdmin}
          />

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

          {/* Most active members */}
          {mostActiveMembers.length > 0 && (
            <section className="bg-white border border-muted-teal/30 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-dark-slate">{t("mostActiveMembersHeading")}</h2>
                <Link href={`/projects/${slug}/tokens`} className="text-xs text-seagrass hover:underline">
                  {t("viewAllTokensLink")}
                </Link>
              </div>
              <ol className="space-y-2">
                {mostActiveMembers.map((m, i) => {
                  const initials = m.name
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();
                  const avatarContent = m.image ? (
                    <Image src={toProxyUrl(m.image)} alt={m.name} fill unoptimized className="object-cover" />
                  ) : (
                    initials
                  );
                  const row = (
                    <div className="flex items-center gap-3">
                      <span className="w-5 text-center text-xs font-bold text-dark-slate/40">{i + 1}</span>
                      <div className="w-8 h-8 rounded-full bg-dry-sage flex-shrink-0 flex items-center justify-center text-xs font-semibold text-dark-slate overflow-hidden relative">
                        {avatarContent}
                      </div>
                      <span className="flex-1 min-w-0 text-sm text-dark-slate truncate">{m.name}</span>
                      <span className="text-xs font-semibold text-coral">{Math.round(m.tokens)} {t("pointsAbbreviation")}</span>
                    </div>
                  );
                  return (
                    <li key={m.id}>
                      {m.showProfile ? (
                        <Link
                          href={`/members/${m.id}`}
                          className="block hover:bg-dry-sage/20 rounded-lg px-1.5 py-1 -mx-1.5 transition-colors"
                        >
                          {row}
                        </Link>
                      ) : (
                        <div className="px-1.5 py-1 -mx-1.5">{row}</div>
                      )}
                    </li>
                  );
                })}
              </ol>
            </section>
          )}

          {/* Kanban summary — bar chart */}
          {kanbanCards.length > 0 && (() => {
            const cols = [
              { key: "BACKLOG", label: t("columnBacklog"), bg: "#b2b09b" },
              { key: "TODO",    label: t("columnTodo"),    bg: "#7bad93" },
              { key: "DOING",   label: t("columnDoing"),   bg: "#ff6f59" },
              { key: "REVIEW",  label: t("columnReview"),  bg: "#f59e0b" },
              { key: "DONE",    label: t("columnDone"),    bg: "#43aa8b" },
            ];
            const { total, done } = computeTaskProgress(kanbanCards);
            const counts = cols.map(c => {
              if (c.key === "DONE") return done;
              const cardsInCol = kanbanCards.filter(k => k.column === c.key);
              return cardsInCol.length + cardsInCol.reduce((sum, k) => sum + (k.subtasks?.length ?? 0), 0);
            });
            const max = Math.max(...counts, 1);
            return (
              <section className="bg-white border border-muted-teal/30 rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-dark-slate">{t("tasksHeading")}</h2>
                  <Link href={`/projects/${slug}/tasks`} className="text-xs text-seagrass hover:underline">
                    {t("openArrowLink")}
                  </Link>
                </div>

                {/* Vertical bar chart */}
                <div className="flex items-end justify-between gap-1.5 mb-2">
                  {cols.map(({ key, label, bg }, i) => {
                    const count = counts[i];
                    const barH = count === 0 ? 4 : Math.max(8, Math.round((count / max) * 80));
                    return (
                      <div key={key} className="flex flex-col items-center gap-1 flex-1" title={`${label}: ${count}`}>
                        <span className="text-[10px] font-semibold text-dark-slate tabular-nums">{count}</span>
                        <div
                          className="w-full rounded-t-sm"
                          style={{ height: `${barH}px`, backgroundColor: bg }}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Labels */}
                <div className="flex justify-between gap-1.5">
                  {cols.map(({ key, label }) => (
                    <div key={key} className="flex-1 text-center">
                      <span className="text-[9px] text-dark-slate/50 leading-tight block truncate">{label}</span>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-dark-slate/40 mt-3 text-center">
                  {t("tasksProgressLabel", { done, total })}
                </p>
              </section>
            );
          })()}

          {/* Uppgifter widget */}
          {(() => {
            const colOrder = ["TODO", "DOING", "REVIEW"];
            const cardsWithSubtasks = [...kanbanCards]
              .filter(c => colOrder.includes(c.column) && c.subtasks && c.subtasks.length > 0)
              .sort((a, b) => colOrder.indexOf(a.column) - colOrder.indexOf(b.column));
            if (cardsWithSubtasks.length === 0) return null;
            return (
              <section className="bg-white border border-muted-teal/30 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-dark-slate">{t("tasksListHeading")}</h2>
                  <Link href={`/projects/${slug}/tasks`} className="text-xs text-seagrass hover:underline">
                    {t("openArrowLink")}
                  </Link>
                </div>
                <div className="max-h-64 overflow-y-auto space-y-3">
                  {cardsWithSubtasks.map(card => {
                    const doneCount = card.subtasks!.filter(s => s.done).length;
                    const totalCount = card.subtasks!.length;
                    return (
                      <div key={card.id}>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-[11px] font-semibold text-dark-slate truncate">{card.title}</span>
                          <span className="text-[10px] text-dark-slate/40 shrink-0">{doneCount}/{totalCount}</span>
                        </div>
                        <ul className="space-y-0.5">
                          {card.subtasks!.map(s => (
                            <li key={s.id} className="flex items-start gap-1.5">
                              <span className="text-[10px] shrink-0 mt-px" style={{ color: s.done ? "#43aa8b" : "#b2b09b" }}>
                                {s.done ? "✓" : "○"}
                              </span>
                              <span className={`text-[10px] leading-snug ${s.done ? "line-through text-dark-slate/30" : "text-dark-slate/60"}`}>
                                {s.title}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })()}

          {/* Kanaler preview */}
          {recentChannelMessages.length > 0 && (
            <section className="bg-white border border-muted-teal/30 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-dark-slate">{t("channelsHeading")}</h2>
                <Link href={`/messages?project=${slug}`} className="text-xs text-seagrass hover:underline">
                  {t("openArrowLink")}
                </Link>
              </div>
              <ul className="space-y-3">
                {[...recentChannelMessages].reverse().map((msg) => {
                  const initials = (msg.author.name ?? "?").charAt(0).toUpperCase();
                  return (
                    <li key={msg.id} className="flex gap-2 items-start">
                      <div className="w-6 h-6 rounded-full bg-dry-sage shrink-0 flex items-center justify-center text-[10px] font-bold text-dark-slate overflow-hidden relative mt-0.5">
                        {msg.author.image ? (
                          <Image src={msg.author.image} alt={msg.author.name ?? ""} fill className="object-cover" unoptimized />
                        ) : initials}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-xs font-semibold text-dark-slate truncate">
                            {msg.author.name?.split(" ")[0] ?? "?"}
                          </span>
                          <span className="text-[10px] text-dark-slate/40 shrink-0">
                            #{msg.room.name} · {relativeTime(msg.createdAt, t)}
                          </span>
                        </div>
                        <p className="text-xs text-dark-slate/70 leading-snug line-clamp-2">
                          {msg.body.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <Link
                href={`/messages?project=${slug}`}
                className="mt-3 block text-center text-xs text-white bg-seagrass hover:bg-seagrass/90 rounded-lg py-1.5 transition-colors"
              >
                {t("openChannelsButton")}
              </Link>
            </section>
          )}

          {/* GitHub — read-only mirror of the mapped project board */}
          {project.githubBoard && (
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

          {/* Calendar widget */}
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
