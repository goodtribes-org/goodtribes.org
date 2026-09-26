import type { Metadata } from "next";
import { hasLocale, type Locale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { routing } from "@/i18n/routing";
import { fetchActivityItems } from "@/lib/activityFeed";
import { resolveIdeaContent, resolveProjectContent } from "@/lib/contentTranslation";
import { computeTaskProgressByProject } from "@/lib/taskProgress";
import { getSiteCopyMap } from "@/lib/siteCopy";
import { DISPLAY_PHASES, PROJECT_PHASE_LABEL, toDisplayPhase } from "@/lib/projectPhase";
import ProjectCard from "@/components/ProjectCard";
import IdeaCard from "@/components/IdeaCardContainer";
import FoundingStory from "@/components/showroom/FoundingStory";
import DreamHero from "@/components/ny-startsida/DreamHero";
import {
  Closing, LiveStrip, ListHeader, card, PhaseJourney, PlatformStats, Promises, ToolsRow, type JourneyPhase,
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

const PROJECT_CARDS = 4;
const IDEA_CARDS = 3;
const CHIPS_PER_PHASE = 4;

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
    activity, allProjects, projectsBeyondIdea, ideaPhaseProjects, ideas,
    pledgeSum, tokenSum, completedCards, completedSubtasks, copy,
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
    prisma.idea.findMany({
      where: { status: "open" },
      orderBy: [{ votes: { _count: "desc" } }, { createdAt: "desc" }],
      take: IDEA_CARDS,
      include: {
        author: { select: { name: true } },
        _count: { select: { votes: true, comments: true, endorsements: true } },
        votes: userId ? { where: { userId }, select: { id: true } } : false,
        translations,
      },
    }),
    // Same figures as ImpactStatsWidget on /sandbox.
    prisma.fundingPledge.aggregate({ where: { pledgeStatus: "confirmed" }, _sum: { amount: true } }),
    prisma.tokenLedger.aggregate({ _sum: { tokens: true } }),
    prisma.kanbanCard.count({ where: { column: "DONE" } }),
    prisma.kanbanCardSubtask.count({ where: { done: true } }),
    getSiteCopyMap(locale),
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

  const ideaCards = ideas.map((idea) => ({
    ...idea,
    ...resolveIdeaContent(idea, idea.translations, locale),
    myVoteId: idea.votes?.[0]?.id ?? null,
  }));

  const phases: JourneyPhase[] = DISPLAY_PHASES.map((p) => {
    const inPhase = allProjects.filter((proj) => toDisplayPhase(proj.phase) === p.value);
    return {
      value: p.value as JourneyPhase["value"],
      label: PROJECT_PHASE_LABEL[p.value],
      count: inPhase.length,
      projects: inPhase.slice(0, CHIPS_PER_PHASE).map(({ title, slug }) => ({ title, slug })),
    };
  });

  return (
    // Full-bleed like the old start page, so the page's own grey background
    // runs edge to edge inside the site layout's content column.
    <div
      className={`${newHomeBodyFont.className} -mt-8 text-[#1c1c1a]`}
      style={{
        marginLeft: "calc(50% - 50vw)",
        width: "100vw",
        background: "#F6F6F4",
        ["--nh-accent" as string]: "#E8531F",
      }}
    >
      {/* 100vw includes the scrollbar, so the full-bleed wrapper is a few
          pixels wider than the page; clip that instead of letting it scroll. */}
      <style>{`html, body { overflow-x: clip; }`}</style>
      <DreamHero isLoggedIn={!!userId} />
      <LiveStrip locale={locale} items={activity.slice(0, 8).map((a) => ({ project: a.projectName, action: a.action }))} />
      <Promises locale={locale} />
      <PhaseJourney locale={locale} phases={phases} />

      {projects.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-10">
          <ListHeader eyebrow={t("projects.eyebrow")} heading={t("projects.heading")} href="/projects" linkLabel={t("projects.allLink")} />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {projects.map((p) => <ProjectCard key={p.slug} project={p} showStats={false} />)}
          </div>
        </section>
      )}

      {ideaCards.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-14">
          <ListHeader small heading={t("ideas.heading")} sub={t("ideas.sub")} href="/ideas" linkLabel={t("ideas.allLink")} />
          <div className="grid gap-5 md:grid-cols-3">
            {ideaCards.map((idea) => <IdeaCard key={idea.id} idea={idea} isLoggedIn={!!userId} />)}
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

      <section className="mx-auto max-w-6xl px-4 pb-14">
        <div className={`${card} px-6 sm:px-10`}>
          <FoundingStory locale={locale} copy={copy} />
        </div>
      </section>

      <ToolsRow locale={locale} />
      <Closing locale={locale} />
    </div>
  );
}
