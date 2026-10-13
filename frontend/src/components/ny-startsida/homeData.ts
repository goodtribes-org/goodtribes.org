import type { Locale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { routing } from "@/i18n/routing";
import { fetchActivityItems, type PulseItem } from "@/lib/activityFeed";
import { resolveIdeaContent, resolveProjectContent } from "@/lib/contentTranslation";
import { computeTaskProgressByProject } from "@/lib/taskProgress";
import { getThanksState } from "@/lib/thanks";
import { DISPLAY_PHASES, toDisplayPhase } from "@/lib/projectPhase";
import { CHALLENGE_CARD_SELECT, PUBLIC_CHALLENGE_WHERE } from "@/lib/challenges";
import { CALL_CARD_SELECT, CALL_ORDER, publicCallWhere } from "@/lib/fundingCalls/public";
import { PUBLIC_PROJECT_WHERE } from "@/lib/projectVisibility";
import { searchFirstTasks, parseFirstTaskFilters } from "@/lib/firstTasks";
import type { JourneyPhase } from "./Sections";

// Everything the start page shows, loaded in one place so the page and its
// layout proposals (/startsida-forslag) render the same data.

const PROJECT_CARDS = 10;
// Two rows of five on large screens, same as the project cards.
const IDEA_CARDS = 10;

// What a visitor cares about in the live strip and the community list: new
// projects, ideas, milestones, blog posts, people joining and finished tasks
// — not card shuffling, chat messages or comments.
const MEANINGFUL_TYPES = new Set(["project", "idea", "milestone", "blogPost"]);
const MEANINGFUL_ACTIVITIES = new Set(["member_joined", "task_completed", "todo_completed"]);
function isMeaningful(a: PulseItem) {
  return MEANINGFUL_TYPES.has(a.targetType) || (a.targetType === "activityEvent" && MEANINGFUL_ACTIVITIES.has(a.activityType ?? ""));
}

export async function getHomePageData(locale: Locale) {
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
  // Published, not hidden or archived — drafts (#226) never show here.
  const live = { ...PUBLIC_PROJECT_WHERE, archivedAt: null };

  const [
    activity, allProjects, projectsBeyondIdea, ideaPhaseProjects,
    pledgeSum, tokenSum, completedCards, completedSubtasks, memberCount, newMembers, latestIdeas, openChallenges, firstTasks, openCalls,
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
    // The newest open ideas, counted the same way as /ideas.
    prisma.idea.findMany({
      where: { hiddenAt: null, status: "open" },
      orderBy: { createdAt: "desc" },
      take: IDEA_CARDS,
      include: {
        author: { select: { name: true } },
        _count: { select: { votes: true, comments: true, basedProjects: { where: PUBLIC_PROJECT_WHERE } } },
        translations,
      },
    }),
    // Utmaningar (#228) still open for ideas, closing soonest first.
    prisma.challenge.findMany({
      where: { ...PUBLIC_CHALLENGE_WHERE, closesAt: { gt: new Date() } },
      orderBy: { closesAt: "asc" },
      take: 3,
      select: CHALLENGE_CARD_SELECT,
    }),
    // Första uppgifter (#279): the other way in, right under the dream box.
    searchFirstTasks(parseFirstTaskFilters({}), { take: 5 }),
    // Utlysningar (#344): ten open calls, closing soonest first.
    prisma.fundingCall.findMany({ where: publicCallWhere(), orderBy: CALL_ORDER, take: 10, select: CALL_CARD_SELECT }),
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
  const ideas = latestIdeas.map((idea) => {
    const content = resolveIdeaContent(idea, idea.translations, locale);
    return {
      id: idea.id,
      title: content.title,
      description: content.description,
      authorName: idea.author.name,
      votes: idea._count.votes,
      comments: idea._count.comments,
      drivenBy: idea._count.basedProjects,
    };
  });
  const ideaLabels = {
    label: t("ideas.label"),
    byAuthor: (name: string) => t("ideas.byAuthor", { name }),
    unknownAuthor: t("ideas.unknownAuthor"),
    votes: t("ideas.votes"),
    comments: t("ideas.comments"),
    noDescription: t("ideas.noDescription"),
    drivenBy: (count: number) => t("ideas.drivenBy", { count }),
    waiting: t("ideas.waitingBadge"),
  };
  const events = activity.filter(isMeaningful);
  const communityEvents = events.slice(0, 6);
  const thanks = await getThanksState(communityEvents, userId ?? null);

  const tPhase = await getTranslations({ locale, namespace: "ProjectPhase" });
  const phases: JourneyPhase[] = DISPLAY_PHASES.map((p) => ({
    value: p.value as JourneyPhase["value"],
    label: tPhase(p.value),
    count: allProjects.filter((proj) => toDisplayPhase(proj.phase) === p.value).length,
  }));

  return {
    userId, projects, ideas, ideaLabels, events, communityEvents, thanks, phases,
    openCalls, openChallenges, firstTasks, memberCount, newMembers, allProjects,
    totalRaised: pledgeSum._sum.amount ?? 0,
    completedTasks: completedCards + completedSubtasks,
    totalTokens: Math.round(tokenSum._sum.tokens ?? 0),
  };
}
