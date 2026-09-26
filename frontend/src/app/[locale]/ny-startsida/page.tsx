import type { Metadata } from "next";
import Link from "next/link";
import { hasLocale, type Locale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { routing } from "@/i18n/routing";
import { fetchActivityItems } from "@/lib/activityFeed";
import { resolveProjectContent } from "@/lib/contentTranslation";
import { computeTaskProgressByProject } from "@/lib/taskProgress";
import { DISPLAY_PHASES, PROJECT_PHASE_LABEL, toDisplayPhase } from "@/lib/projectPhase";
import ProjectCard from "@/components/ProjectCard";
import ActivityPulse from "@/components/ActivityPulse";
import LeaderboardWidget from "@/components/LeaderboardWidget";
import NewMembersWidget from "@/components/NewMembersWidget";
import FoundingCard from "@/components/ny-startsida/FoundingCard";
import DreamHero from "@/components/ny-startsida/DreamHero";
import {
  INK, LiveStrip, PhaseJourney, PlatformStats, ProjectsHeader, SectionHeader, ToolsRow, wrap, type JourneyPhase,
} from "@/components/ny-startsida/Sections";
import { newHomeBodyFont } from "@/components/ny-startsida/fonts";

// The proposed new start page, built next to the current one (app/[locale]/
// page.tsx stays untouched until it's decided). noindex so search engines
// don't pick it up while it's a draft; it's also left out of sitemap.ts.
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "NewHomePage" });
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

const PROJECT_CARDS = 10;

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

export default async function NewHomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!hasLocale(routing.locales, rawLocale)) notFound();
  const locale: Locale = rawLocale;
  const t = await getTranslations({ locale, namespace: "NewHomePage" });

  const session = await auth();
  const userId = session?.user?.id;
  const translations = locale !== routing.defaultLocale ? { where: { locale } } : false;
  const projectInclude = {
    owner: { select: { name: true } },
    members: { select: { id: true } },
    translations,
  } as const;
  const live = { hiddenAt: null, archivedAt: null };

  const [
    activity, allProjects, projectsBeyondIdea, ideaPhaseProjects,
    pledgeSum, tokenSum, completedCards, completedSubtasks, leaderboard, newMembers,
  ] = await Promise.all([
    fetchActivityItems(10),
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
    getLeaderboard(),
    prisma.user.findMany({
      where: { name: { not: null as null } },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, name: true, image: true, showProfile: true },
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
  }));

  const phases: JourneyPhase[] = DISPLAY_PHASES.map((p) => ({
    value: p.value as JourneyPhase["value"],
    label: PROJECT_PHASE_LABEL[p.value],
    count: allProjects.filter((proj) => toDisplayPhase(proj.phase) === p.value).length,
  }));

  return (
    // Full-bleed like the old start page, so the page's own grey background
    // runs edge to edge inside the site layout's content column.
    <div
      className={`${newHomeBodyFont.className} -mt-8`}
      style={{
        marginLeft: "calc(50% - 50vw)",
        width: "100vw",
        background: "#F6F6F4",
        color: INK,
        ["--nh-accent" as string]: "#E8531F",
      }}
    >
      {/* 100vw includes the scrollbar, so the full-bleed wrapper is a few
          pixels wider than the page; clip that instead of letting it scroll. */}
      <style>{`html, body { overflow-x: clip; }`}</style>
      <DreamHero isLoggedIn={!!userId} />
      <LiveStrip locale={locale} items={activity.slice(0, 8).map((a) => ({ project: a.projectName, action: a.action }))} />
      <PhaseJourney locale={locale} phases={phases} />

      {projects.length > 0 && (
        <section id="projekt" className={`${wrap} flex flex-col gap-9 pt-[72px]`}>
          <ProjectsHeader eyebrow={t("projects.eyebrow")} heading={t("projects.heading")} href="/projects" linkLabel={t("projects.allLink")} />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {projects.map((p) => <ProjectCard key={p.slug} project={p} />)}
          </div>
        </section>
      )}

      <PlatformStats
        locale={locale}
        totalRaised={pledgeSum._sum.amount ?? 0}
        completedTasks={completedCards + completedSubtasks}
        totalTokens={Math.round(tokenSum._sum.tokens ?? 0)}
        activeProjects={allProjects.length}
      />

      <FoundingCard locale={locale} />

      <ToolsRow locale={locale} />

      <section className={`${wrap} flex flex-col gap-9 pt-[72px] pb-24`}>
        <SectionHeader eyebrow={t("community.eyebrow")} heading={t("community.title")} />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold" style={{ color: INK }}>{t("community.heading")}</h2>
                <p className="mt-0.5 text-xs" style={{ color: "#6B726E" }}>{t("community.subheading")}</p>
              </div>
              <Link href="/feed" className="text-xs font-semibold hover:underline" style={{ color: "#C2410C" }}>
                {t("community.seeAllLink")}
              </Link>
            </div>
            <ActivityPulse />
          </div>
          <div className="flex flex-col gap-6">
            <LeaderboardWidget entries={leaderboard} />
            <NewMembersWidget
              members={newMembers.map((m) => ({ id: m.id, name: m.name!, image: m.image, showProfile: m.showProfile }))}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
