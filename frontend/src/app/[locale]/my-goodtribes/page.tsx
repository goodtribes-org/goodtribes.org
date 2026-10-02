export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import VolunteerTourGate from "@/components/VolunteerTourGate";
import { activityDateGroup, type DateGroupKey } from "./workplaceHelpers";
import WorkplaceTokensTab from "./WorkplaceTokensTab";
import WorkplaceKudosTab from "./WorkplaceKudosTab";
import WorkplaceMentorInboxTab from "./WorkplaceMentorInboxTab";
import WorkplaceActivityTab from "./WorkplaceActivityTab";
import OverviewTab from "./OverviewTab";
import TasksTab from "./TasksTab";
import CalendarTab from "./CalendarTab";
import FollowingTab from "./FollowingTab";
import FindTab from "./FindTab";
import type { Locale } from "next-intl";

// Mitt GoodTribes — the member's own area, in the profile menu. It replaced
// Arbetsrum (/workplace, which now redirects here with the same tab) and adds
// tasks, calendar and following. "Hitta ett projekt" (matching by skills
// and goals) is the last tab — it was /dashboard, which now redirects here.

export const metadata: Metadata = { title: "Mitt GoodTribes" };

const TABS = [
  { key: "overview", labelKey: "tabOverview" },
  { key: "tasks", labelKey: "tabTasks" },
  { key: "calendar", labelKey: "tabCalendar" },
  { key: "following", labelKey: "tabFollowing" },
  { key: "activity", labelKey: "tabActivity" },
  { key: "kudos", labelKey: "tabKudos" },
  { key: "tokens", labelKey: "tabTokens" },
  { key: "find", labelKey: "tabFind" },
] as const;
const MENTOR_TAB = { key: "mentor-inbox", labelKey: "tabMentorInbox" } as const;
type TabKey = (typeof TABS)[number]["key"] | "mentor-inbox";

export default async function MyGoodTribesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string; skill?: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "WorkplacePage" });

  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const [mentorProfile, tourUser] = await Promise.all([
    prisma.mentor.findUnique({ where: { userId }, select: { id: true, verified: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { tourDismissedAt: true } }),
  ]);
  const tabs = [...TABS, ...(mentorProfile?.verified ? [MENTOR_TAB] : [])];
  const { tab: requested, skill } = await searchParams;
  const activeTab: TabKey = (tabs.find((x) => x.key === requested)?.key ?? "overview") as TabKey;

  return (
    <div className="space-y-6">
      <VolunteerTourGate show={!tourUser?.tourDismissedAt} />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-[.12em] text-[#C2410C]">{t("eyebrow")}</p>
          <h1 className="text-3xl font-bold">
            {session.user.name ? t("greetingWithName", { name: session.user.name.split(" ")[0] }) : t("greetingNoName")}
          </h1>
        </div>
        <Link href="/projects/new" className="bg-coral text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-watermelon transition-colors">
          {t("newProjectLink")}
        </Link>
      </div>

      {/* Tabs: centred pills, the active one dark (like Basecamp's personal menu) */}
      <nav className="-mx-6 overflow-x-auto border-y border-[#E4E4DF] px-6 py-2.5 sm:mx-0 sm:px-0" style={{ scrollbarWidth: "none" }} aria-label={t("eyebrow")}>
        <ul className="m-0 flex w-max list-none gap-1 p-0 sm:mx-auto">
          {tabs.map((tab) => (
            <li key={tab.key}>
              <Link
                href={tab.key === "overview" ? "/my-goodtribes" : `/my-goodtribes?tab=${tab.key}`}
                aria-current={activeTab === tab.key ? "page" : undefined}
                className={`block whitespace-nowrap rounded-xl px-3.5 py-2 text-[15px] ${activeTab === tab.key ? "bg-[#253331] text-white" : "text-[#3F4642] hover:bg-[#F0F0EC]"}`}
              >
                {t(tab.labelKey)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {activeTab === "overview" && <OverviewTab userId={userId} locale={locale} />}
      {activeTab === "tasks" && <TasksTab userId={userId} locale={locale} />}
      {activeTab === "calendar" && <CalendarTab userId={userId} locale={locale} />}
      {activeTab === "following" && <FollowingTab userId={userId} locale={locale} />}
      {activeTab === "activity" && <ActivityTab userId={userId} t={t} />}
      {activeTab === "tokens" && <TokensTab userId={userId} t={t} />}
      {activeTab === "kudos" && <KudosTab userId={userId} t={t} />}
      {activeTab === "find" && (
        <FindTab userId={userId} locale={locale as Locale} skillSlug={skill} onboardingDone={!!session.user.onboardingDone} hasName={!!session.user.name} />
      )}
      {activeTab === "mentor-inbox" && mentorProfile?.verified && <MentorTab mentorId={mentorProfile.id} t={t} locale={locale} />}
    </div>
  );
}

type T = Awaited<ReturnType<typeof getTranslations<"WorkplacePage">>>;

// The four tabs below are Arbetsrum's, unchanged — only their data loading
// moved into a component each, so a tab only queries what it shows.

async function ActivityTab({ userId, t }: { userId: string; t: T }) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [events, projects, monthCount, ideasCount] = await Promise.all([
    prisma.activityEvent.findMany({
      where: { userId, projectId: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { project: { select: { title: true, slug: true } } },
    }),
    prisma.activityEvent.findMany({ where: { userId, projectId: { not: null } }, select: { projectId: true }, distinct: ["projectId"] }),
    prisma.activityEvent.count({ where: { userId, createdAt: { gte: monthStart } } }),
    prisma.idea.count({ where: { authorId: userId } }),
  ]);
  const activityEvents = events.map((e) => ({ ...e, project: e.project! }));
  const ORDER: DateGroupKey[] = ["today", "yesterday", "thisWeek", "earlier"];
  const groupedEvents: { key: DateGroupKey; events: typeof activityEvents }[] = [];
  for (const event of activityEvents) {
    const key = activityDateGroup(event.createdAt);
    let group = groupedEvents.find((g) => g.key === key);
    if (!group) groupedEvents.push((group = { key, events: [] }));
    group.events.push(event);
  }
  groupedEvents.sort((a, b) => ORDER.indexOf(a.key) - ORDER.indexOf(b.key));
  return (
    <WorkplaceActivityTab t={t} distinctProjectCount={projects.length} activitiesThisMonth={monthCount} ideasCount={ideasCount} groupedEvents={groupedEvents} />
  );
}

async function TokensTab({ userId, t }: { userId: string; t: T }) {
  const ledgerEntries = await prisma.tokenLedger.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { project: { select: { title: true, slug: true } } },
  });
  const totalTokens = ledgerEntries.reduce((sum, e) => sum + e.tokens, 0);
  const byProject = new Map<string, { projectSlug: string; projectTitle: string; tokens: number }>();
  for (const e of ledgerEntries) {
    const row = byProject.get(e.projectSlug);
    if (row) row.tokens += e.tokens;
    else byProject.set(e.projectSlug, { projectSlug: e.projectSlug, projectTitle: e.project.title, tokens: e.tokens });
  }
  const recentTokenActivity = ledgerEntries.slice(0, 10).map((e) => ({
    id: e.id, reason: e.reason, tokens: e.tokens, createdAt: e.createdAt, projectSlug: e.projectSlug, projectTitle: e.project.title,
  }));
  return (
    <WorkplaceTokensTab t={t} totalTokens={totalTokens} tokensByProject={[...byProject.values()].sort((a, b) => b.tokens - a.tokens)} recentTokenActivity={recentTokenActivity} />
  );
}

async function KudosTab({ userId, t }: { userId: string; t: T }) {
  const [kudosReceived, totalKudosReceived] = await Promise.all([
    prisma.kudos.findMany({
      where: { toUserId: userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { fromUser: { select: { name: true } }, project: { select: { title: true, slug: true } } },
    }),
    prisma.kudos.count({ where: { toUserId: userId } }),
  ]);
  return <WorkplaceKudosTab t={t} totalKudosReceived={totalKudosReceived} kudosReceived={kudosReceived} />;
}

async function MentorTab({ mentorId, t, locale }: { mentorId: string; t: T; locale: string }) {
  const mentorRequests = await prisma.mentorshipRequest.findMany({
    where: { mentorId, status: { in: ["pending", "accepted"] } },
    include: { project: { select: { title: true, slug: true } }, feedback: { select: { rating: true } } },
    orderBy: { createdAt: "desc" },
  });
  return <WorkplaceMentorInboxTab t={t} locale={locale} mentorRequests={mentorRequests} />;
}
