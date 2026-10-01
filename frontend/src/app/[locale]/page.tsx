export const dynamic = "force-dynamic";

import Link from "next/link";
import { hasLocale, type Locale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { routing } from "@/i18n/routing";
import { fetchActivityItems, type PulseItem } from "@/lib/activityFeed";
import { resolveProjectContent } from "@/lib/contentTranslation";
import { computeTaskProgressByProject } from "@/lib/taskProgress";
import { getThanksState } from "@/lib/thanks";
import { getYourTribe } from "@/lib/yourTribe";
import { DISPLAY_PHASES, PROJECT_PHASE_LABEL, toDisplayPhase } from "@/lib/projectPhase";
import ProjectCard from "@/components/ProjectCard";
import Community from "@/components/ny-startsida/Community";
import YourTribe from "@/components/ny-startsida/YourTribe";
import { YOUR_TRIBE_COLLAPSED_COOKIE } from "@/lib/yourTribeCookie";
import FoundingCard from "@/components/ny-startsida/FoundingCard";
import DreamHero from "@/components/ny-startsida/DreamHero";
import {
  INK, LiveStrip, PhaseJourney, PlatformStats, SectionHeader, wrap, type JourneyPhase,
} from "@/components/ny-startsida/Sections";
import { newHomeBodyFont } from "@/components/ny-startsida/fonts";

const PROJECT_CARDS = 10;

// What a visitor cares about in the live strip and the community list: new
// projects, ideas, milestones, blog posts, people joining and finished tasks
// — not card shuffling, chat messages or comments.
const MEANINGFUL_TYPES = new Set(["project", "idea", "milestone", "blogPost"]);
const MEANINGFUL_ACTIVITIES = new Set(["member_joined", "task_completed", "todo_completed"]);
function isMeaningful(a: PulseItem) {
  return MEANINGFUL_TYPES.has(a.targetType) || (a.targetType === "activityEvent" && MEANINGFUL_ACTIVITIES.has(a.activityType ?? ""));
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!hasLocale(routing.locales, rawLocale)) notFound();
  const locale: Locale = rawLocale;
  const t = await getTranslations({ locale, namespace: "NewHomePage" });

  const session = await auth();
  const userId = session?.user?.id;
  const translations = locale !== routing.defaultLocale ? { where: { locale } } : false;
  const projectInclude = {
    owner: { select: { id: true, name: true, image: true } },
    members: { select: { id: true, user: { select: { id: true, name: true, image: true } } }, orderBy: { joinedAt: "asc" as const } },
    neededSkills: { select: { skill: { select: { name: true } } } },
    translations,
  } as const;
  const live = { hiddenAt: null, archivedAt: null };

  const [
    activity, allProjects, projectsBeyondIdea, ideaPhaseProjects,
    pledgeSum, tokenSum, completedCards, completedSubtasks, memberCount, newMembers,
  ] = await Promise.all([
    fetchActivityItems(15),
    prisma.project.findMany({ where: live, select: { phase: true, title: true, slug: true }, orderBy: { updatedAt: "desc" } }),
    // "Projects that have come some way": past the Idé phase, most recently
    // active first. Topped up from the Idé phase below if there are too few.
    prisma.project.findMany({
      where: { ...live, phase: { notIn: ["IDEA", "SPRINT"] } },
      orderBy: { updatedAt: "desc" },
      take: PROJECT_CARDS,
      include: projectInclude,
    }),
    prisma.project.findMany({
      where: { ...live, phase: { in: ["IDEA", "SPRINT"] } },
      orderBy: { updatedAt: "desc" },
      take: PROJECT_CARDS,
      include: projectInclude,
    }),
    // Same figures as ImpactStatsWidget on /sandbox.
    prisma.fundingPledge.aggregate({ where: { pledgeStatus: "confirmed" }, _sum: { amount: true } }),
    prisma.tokenLedger.aggregate({ _sum: { tokens: true } }),
    prisma.kanbanCard.count({ where: { column: "DONE" } }),
    prisma.kanbanCardSubtask.count({ where: { done: true } }),
    prisma.user.count({ where: { name: { not: null as null } } }),
    prisma.user.findMany({
      where: { name: { not: null as null } },
      orderBy: { createdAt: "desc" },
      take: 24,
      select: { id: true, name: true, image: true },
    }),
  ]);

  const cardProjects = [...projectsBeyondIdea, ...ideaPhaseProjects].slice(0, PROJECT_CARDS);
  const [likeCounts, taskCards] = await Promise.all([
    cardProjects.length
      ? prisma.feedLike.groupBy({
          by: ["targetId"],
          where: { targetType: "project", targetId: { in: cardProjects.map((p) => p.id) } },
          _count: true,
        })
      : Promise.resolve([]),
    cardProjects.length
      ? prisma.kanbanCard.findMany({
          where: { projectSlug: { in: cardProjects.map((p) => p.slug) } },
          select: { projectSlug: true, column: true, subtasks: { select: { done: true } } },
        })
      : Promise.resolve([]),
  ]);
  const likesById = new Map(likeCounts.map((g) => [g.targetId, g._count]));
  const progressBySlug = computeTaskProgressByProject(taskCards);
  const projects = cardProjects.map((p) => ({
    ...p,
    ...resolveProjectContent(p, p.translations, locale),
    likes: likesById.get(p.id) ?? 0,
    taskProgress: progressBySlug.get(p.slug) ?? { total: 0, done: 0 },
    // Whoever started it first (green ring on the card), then the rest.
    people: [p.owner, ...p.members.map((m) => m.user).filter((u) => u.id !== p.owner.id)],
  }));
  const events = activity.filter(isMeaningful);
  const communityEvents = events.slice(0, 6);
  const [thanks, yourTribe] = await Promise.all([
    getThanksState(communityEvents, userId ?? null),
    userId ? getYourTribe(userId) : Promise.resolve(null),
  ]);

  const phases: JourneyPhase[] = DISPLAY_PHASES.map((p) => ({
    value: p.value as JourneyPhase["value"],
    label: PROJECT_PHASE_LABEL[p.value],
    count: allProjects.filter((proj) => toDisplayPhase(proj.phase) === p.value).length,
  }));

  return (
    // Full-bleed, so the page's own grey background runs edge to edge inside
    // the site layout's content column.
    <div
      className={`${newHomeBodyFont.className} -mt-8`}
      style={{
        marginLeft: "calc(50% - 50vw)",
        width: "100vw",
        background: "#FCFCFB",
        color: INK,
        ["--nh-accent" as string]: "#E8531F",
      }}
    >
      {/* 100vw includes the scrollbar, so the full-bleed wrapper is a few
          pixels wider than the page; clip that instead of letting it scroll. */}
      <style>{`html, body { overflow-x: clip; }`}</style>
      {/* Logged in: your own view first — what's waiting, your projects, thanks you got */}
      {yourTribe && (
        <YourTribe
          locale={locale}
          name={session?.user?.name ?? null}
          data={yourTribe}
          initialCollapsed={(await cookies()).get(YOUR_TRIBE_COLLAPSED_COOKIE)?.value === "1"}
        />
      )}
      <DreamHero isLoggedIn={!!userId} />
      {/* A second way in, for people who'd rather help than start something */}
      <div className="-mt-6 flex justify-center px-4 pb-6">
        <Link
          href="/projects"
          className="inline-flex items-center rounded-full border border-[#E4E4DF] bg-white px-4 py-2 text-[15px] font-semibold hover:border-[#C2410C]"
          style={{ color: INK }}
        >
          {t("hero.helpInstead")}
        </Link>
      </div>
      <LiveStrip locale={locale} items={events.slice(0, 8).map((a) => ({ project: a.projectName, action: a.action }))} />

      <FoundingCard locale={locale} />

      {projects.length > 0 && (
        <section id="projekt" className={`${wrap} flex flex-col gap-6 pt-[48px]`}>
          <SectionHeader eyebrow={t("projects.eyebrow")} heading={t("projects.heading")} link={{ href: "/projects", label: t("projects.allLink") }} />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {projects.map((p) => <ProjectCard key={p.slug} project={p} />)}
          </div>
        </section>
      )}

      <Community
        locale={locale}
        memberCount={memberCount}
        newestMembers={newMembers}
        events={communityEvents}
        viewerId={userId ?? null}
        thanks={thanks}
      />

      <PhaseJourney locale={locale} phases={phases} />

      <PlatformStats
        locale={locale}
        totalRaised={pledgeSum._sum.amount ?? 0}
        completedTasks={completedCards + completedSubtasks}
        totalTokens={Math.round(tokenSum._sum.tokens ?? 0)}
        activeProjects={allProjects.length}
      />

      <div className="pb-24" />
    </div>
  );
}
