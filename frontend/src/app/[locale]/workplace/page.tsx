export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import VolunteerTourGate from "@/components/VolunteerTourGate";
import { routing } from "@/i18n/routing";
import { activityDateGroup, type DateGroupKey } from "./workplaceHelpers";
import WorkplaceOverviewTab from "./WorkplaceOverviewTab";
import WorkplaceTokensTab from "./WorkplaceTokensTab";
import WorkplaceKudosTab from "./WorkplaceKudosTab";
import WorkplaceMentorInboxTab from "./WorkplaceMentorInboxTab";
import WorkplaceActivityTab from "./WorkplaceActivityTab";

export const metadata: Metadata = { title: "Workplace — GoodTribes.org" };

const TABS_BASE = [
  { key: "overview", labelKey: "tabOverview" },
  { key: "activity", labelKey: "tabActivity" },
  { key: "tokens", labelKey: "tabTokens" },
  { key: "kudos", labelKey: "tabKudos" },
] as const;

const MENTOR_TAB = { key: "mentor-inbox", labelKey: "tabMentorInbox" } as const;

type BaseTabKey = (typeof TABS_BASE)[number]["key"];
type TabKey = BaseTabKey | "mentor-inbox";

export default async function WorkplacePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "WorkplacePage" });

  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const resolvedParams = await searchParams;
  const activeTab: TabKey =
    resolvedParams.tab === "activity"
      ? "activity"
      : resolvedParams.tab === "tokens"
        ? "tokens"
        : resolvedParams.tab === "kudos"
          ? "kudos"
          : resolvedParams.tab === "mentor-inbox"
            ? "mentor-inbox"
            : "overview";

  // Fetch mentor profile to decide whether to show the Mentor Inbox tab
  const mentorProfile = await prisma.mentor.findUnique({
    where: { userId },
    select: { id: true, verified: true },
  });

  const tourUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { tourDismissedAt: true },
  });

  // Data needed for both tabs (overview header always visible)
  const [memberships, openKanban, myIdeas] = await Promise.all([
    prisma.projectMember.findMany({
      where: { userId },
      orderBy: { joinedAt: "desc" },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            slug: true,
            phase: true,
            summary: true,
            description: true,
            translations: locale !== routing.defaultLocale ? { where: { locale } } : false,
            _count: {
              select: {
                kanbanCards: { where: { column: { not: "DONE" } } },
                members: true,
              },
            },
          },
        },
      },
    }),
    prisma.kanbanCard.findMany({
      where: {
        project: { members: { some: { userId } } },
        column: { not: "DONE" },
      },
      orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
      take: 15,
      include: { project: { select: { title: true, slug: true } } },
    }),
    prisma.idea.findMany({
      where: { authorId: userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        _count: { select: { votes: true, comments: true } },
        translations: locale !== routing.defaultLocale ? { where: { locale } } : false,
      },
    }),
  ]);

  // Tokens tab data
  let totalTokens = 0;
  let tokensByProject: { projectSlug: string; projectTitle: string; tokens: number }[] = [];
  let recentTokenActivity: {
    id: string;
    reason: string;
    tokens: number;
    createdAt: Date;
    projectSlug: string;
    projectTitle: string;
  }[] = [];

  if (activeTab === "tokens") {
    const ledgerEntries = await prisma.tokenLedger.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { project: { select: { title: true, slug: true } } },
    });

    totalTokens = ledgerEntries.reduce((sum, e) => sum + e.tokens, 0);

    const projectMap = new Map<string, { projectSlug: string; projectTitle: string; tokens: number }>();
    for (const entry of ledgerEntries) {
      const existing = projectMap.get(entry.projectSlug);
      if (existing) {
        existing.tokens += entry.tokens;
      } else {
        projectMap.set(entry.projectSlug, {
          projectSlug: entry.projectSlug,
          projectTitle: entry.project.title,
          tokens: entry.tokens,
        });
      }
    }
    tokensByProject = Array.from(projectMap.values()).sort((a, b) => b.tokens - a.tokens);

    recentTokenActivity = ledgerEntries.slice(0, 10).map((e) => ({
      id: e.id,
      reason: e.reason,
      tokens: e.tokens,
      createdAt: e.createdAt,
      projectSlug: e.projectSlug,
      projectTitle: e.project.title,
    }));
  }

  // Kudos tab data
  let kudosReceived: {
    id: string;
    message: string;
    createdAt: Date;
    fromUser: { name: string | null };
    project: { title: string; slug: string } | null;
  }[] = [];
  let totalKudosReceived = 0;

  if (activeTab === "kudos") {
    const [kudosList, kudosCount] = await Promise.all([
      prisma.kudos.findMany({
        where: { toUserId: userId },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          fromUser: { select: { name: true } },
          project: { select: { title: true, slug: true } },
        },
      }),
      prisma.kudos.count({ where: { toUserId: userId } }),
    ]);
    kudosReceived = kudosList;
    totalKudosReceived = kudosCount;
  }

  // Mentor Inbox tab data
  type MentorRequest = {
    id: string;
    status: string;
    message: string | null;
    sessionAt: Date | null;
    createdAt: Date;
    project: { title: string; slug: string };
    feedback: { rating: number } | null;
  };
  let mentorRequests: MentorRequest[] = [];

  if (activeTab === "mentor-inbox" && mentorProfile?.verified) {
    mentorRequests = await prisma.mentorshipRequest.findMany({
      where: { mentorId: mentorProfile.id, status: { in: ["pending", "accepted"] } },
      include: {
        project: { select: { title: true, slug: true } },
        feedback: { select: { rating: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  // Activity tab data
  let activityEvents: {
    id: string;
    type: string;
    createdAt: Date;
    project: { title: string; slug: string };
  }[] = [];
  let distinctProjectCount = 0;
  let activitiesThisMonth = 0;
  let ideasCount = 0;

  if (activeTab === "activity") {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [events, projectCountResult, monthCountResult, ideasCountResult] =
      await Promise.all([
        prisma.activityEvent.findMany({
          where: { userId, projectId: { not: null } },
          orderBy: { createdAt: "desc" },
          take: 50,
          include: { project: { select: { title: true, slug: true } } },
        }),
        prisma.activityEvent.findMany({
          where: { userId, projectId: { not: null } },
          select: { projectId: true },
          distinct: ["projectId"],
        }),
        prisma.activityEvent.count({
          where: { userId, createdAt: { gte: monthStart } },
        }),
        prisma.idea.count({ where: { authorId: userId } }),
      ]);

    activityEvents = events.map((e) => ({ ...e, project: e.project! }));
    distinctProjectCount = projectCountResult.length;
    activitiesThisMonth = monthCountResult;
    ideasCount = ideasCountResult;
  }

  const totalOpenTasks = memberships.reduce(
    (sum, m) => sum + m.project._count.kanbanCards,
    0
  );

  const allTasks = openKanban.slice(0, 15);

  // Group activity events by date group key
  const groupedEvents: { key: DateGroupKey; events: typeof activityEvents }[] = [];
  const ORDER: DateGroupKey[] = ["today", "yesterday", "thisWeek", "earlier"];
  for (const event of activityEvents) {
    const key = activityDateGroup(event.createdAt);
    let group = groupedEvents.find((g) => g.key === key);
    if (!group) {
      group = { key, events: [] };
      groupedEvents.push(group);
    }
    group.events.push(event);
  }
  groupedEvents.sort((a, b) => ORDER.indexOf(a.key) - ORDER.indexOf(b.key));

  return (
    <div className="space-y-8">
      <VolunteerTourGate show={!tourUser?.tourDismissedAt} />

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {session.user.name
              ? t("greetingWithName", { name: session.user.name.split(" ")[0] })
              : t("greetingNoName")}
          </h1>
          <p className="text-dark-slate/60 mt-1">
            {t("summaryProjects", { count: memberships.length })} &nbsp;·&nbsp;{" "}
            {t("summaryOpenTasks", { count: totalOpenTasks })} &nbsp;·&nbsp;{" "}
            {t("summaryIdeas", { count: myIdeas.length })}
          </p>
        </div>
        <Link
          href="/projects/new"
          className="bg-coral text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-watermelon transition-colors"
        >
          {t("newProjectLink")}
        </Link>
      </div>

      {/* Tab navigation */}
      <div className="border-b border-muted-teal">
        <nav className="-mb-px flex gap-6 flex-nowrap overflow-x-auto scrollbar-none" style={{ scrollbarWidth: "none" }}>
          {[...TABS_BASE, ...(mentorProfile?.verified ? [MENTOR_TAB] : [])].map((tab) => (
            <Link
              key={tab.key}
              href={tab.key === "overview" ? "/workplace" : `/workplace?tab=${tab.key}`}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? "border-seagrass text-seagrass"
                  : "border-transparent text-dark-slate/50 hover:text-dark-slate hover:border-muted-teal"
              }`}
            >
              {t(tab.labelKey)}
            </Link>
          ))}
        </nav>
      </div>

      {activeTab === "overview" && (
        <WorkplaceOverviewTab t={t} locale={locale} memberships={memberships} allTasks={allTasks} myIdeas={myIdeas} />
      )}

      {activeTab === "tokens" && (
        <WorkplaceTokensTab
          t={t}
          totalTokens={totalTokens}
          tokensByProject={tokensByProject}
          recentTokenActivity={recentTokenActivity}
        />
      )}

      {activeTab === "kudos" && (
        <WorkplaceKudosTab t={t} totalKudosReceived={totalKudosReceived} kudosReceived={kudosReceived} />
      )}

      {activeTab === "mentor-inbox" && mentorProfile?.verified && (
        <WorkplaceMentorInboxTab t={t} locale={locale} mentorRequests={mentorRequests} />
      )}

      {activeTab === "activity" && (
        <WorkplaceActivityTab
          t={t}
          distinctProjectCount={distinctProjectCount}
          activitiesThisMonth={activitiesThisMonth}
          ideasCount={ideasCount}
          groupedEvents={groupedEvents}
        />
      )}
    </div>
  );
}
