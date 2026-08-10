export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getAiParticipantUser } from "@/lib/aiParticipant";
import { htmlToPreviewText } from "@/lib/renderBody";
import SortToggleContainer from "@/components/SortToggleContainer";
import Pagination from "@/components/Pagination";
import ProjectCard from "@/components/ProjectCard";
import { computeTaskProgressByProject } from "@/lib/taskProgress";
import SandboxHero from "./SandboxHero";
import { resolveProjectContent } from "@/lib/contentTranslation";
import { routing } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";
import type { Locale } from "next-intl";

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

type SandboxT = Awaited<ReturnType<typeof getTranslations<"SandboxPage">>>;

function timeAgo(date: Date, t: SandboxT): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return t("timeJustNow");
  const m = Math.floor(s / 60);
  if (m < 60) return t("timeMinutesAgo", { minutes: m });
  const h = Math.floor(m / 60);
  if (h < 24) return t("timeHoursAgo", { hours: h });
  return t("timeDaysAgo", { days: Math.floor(h / 24) });
}

export default async function SandboxPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ sort?: string; page?: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "SandboxPage" });
  const { sort: sortParam, page: pageStr } = await searchParams;
  const sort = sortParam === "top" ? "top" : sortParam === "trending" ? "trending" : "new";
  const page = Math.max(1, parseInt(pageStr ?? "1") || 1);

  const orderBy =
    sort === "top"       ? { members: { _count: "desc" as const } }
    : sort === "trending" ? { updatedAt: "desc" as const }
    : { createdAt: "desc" as const };

  const where = { isSandbox: true };
  const aiUser = await getAiParticipantUser();

  const [total, projects, recentProjectsForFeed, recentIdeas, recentMessages, projectCount, aiSeedCount, tasksDone] = await Promise.all([
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
    prisma.project.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { slug: true, title: true, createdAt: true, owner: { select: { name: true } } },
    }),
    prisma.idea.findMany({
      where: { hiddenAt: null, status: { not: "draft" } },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        title: true,
        createdAt: true,
        author: { select: { name: true } },
      },
    }),
    prisma.message.findMany({
      where: { room: { project: { isSandbox: true } }, hiddenAt: null },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        body: true,
        createdAt: true,
        author: { select: { name: true } },
        room: { select: { project: { select: { slug: true, title: true } } } },
      },
    }),
    prisma.project.count({ where }),
    prisma.project.count({ where: { isSandbox: true, ownerId: aiUser.id } }),
    prisma.kanbanCard.count({ where: { column: "DONE", project: { isSandbox: true } } }),
  ]);

  const feedEvents = [
    ...recentProjectsForFeed.map((p) => ({
      key: `p-${p.slug}`,
      type: "project" as const,
      createdAt: p.createdAt,
      href: `/projects/${p.slug}`,
      primary: p.title,
      secondary: t("startedBy", { name: p.owner.name ?? t("unknownAuthor") }),
    })),
    ...recentIdeas.map((idea) => ({
      key: `i-${idea.id}`,
      type: "idea" as const,
      createdAt: idea.createdAt,
      href: `/ideas/${idea.id}`,
      primary: idea.title,
      secondary: t("newIdeaBy", { name: idea.author.name ?? t("unknownAuthor") }),
    })),
    ...recentMessages.map((m) => ({
      key: `m-${m.id}`,
      type: "message" as const,
      createdAt: m.createdAt,
      href: m.room.project ? `/projects/${m.room.project.slug}` : "/sandbox",
      primary: htmlToPreviewText(m.body),
      secondary: t("messageIn", {
        author: m.author.name ?? t("unknownAuthor"),
        project: m.room.project?.title ?? t("unnamedSandboxProject"),
      }),
    })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 10);

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
    <div className="relative -mt-8 -mb-12 flex-1" style={{ marginLeft: "calc(50% - 50vw)", width: "100vw", backgroundColor: "#f6f5f2" }}>
    <SandboxHero heading={t("heading")} kicker={t("heroKicker")} description={t("heroDescription")} />
    <div className="max-w-6xl mx-auto px-6 pb-12">
      <div className="flex items-center justify-between mb-2 mt-2 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-dark-slate">{t("heading")}</h1>
          <p className="text-sm text-dark-slate/50 mt-1">{t("subtitle")}</p>
        </div>
        <div className="flex gap-2 flex-shrink-0 flex-wrap">
          <Link
            href="/ideaverkstad/new"
            className="px-4 py-2 border border-amber-400 text-amber-800 bg-amber-50 text-sm font-medium rounded hover:bg-amber-100 transition-colors"
          >
            {t("tryIdeaverkstadCta")}
          </Link>
          <Link
            href="/lean-canvas/new"
            className="px-4 py-2 border border-amber-400 text-amber-800 bg-amber-50 text-sm font-medium rounded hover:bg-amber-100 transition-colors"
          >
            {t("tryLeanCanvasCta")}
          </Link>
          <Link
            href="/whiteboard/new"
            className="px-4 py-2 border border-amber-400 text-amber-800 bg-amber-50 text-sm font-medium rounded hover:bg-amber-100 transition-colors"
          >
            {t("tryWhiteboardCta")}
          </Link>
          <Link
            href="/projects/new"
            className="px-4 py-2 bg-coral text-white text-sm font-medium rounded hover:bg-watermelon transition-colors"
          >
            {t("newProjectCta")}
          </Link>
        </div>
      </div>
      <p className="text-xs text-dark-slate/40 mb-6">
        {t("explainerPrefix")}{" "}
        <Link href="/ideaverkstad" className="text-coral hover:underline">
          {t("explainerIdeaverkstadLink")}
        </Link>,{" "}
        <Link href="/lean-canvas/new" className="text-coral hover:underline">
          {t("explainerLeanCanvasLink")}
        </Link>{" "}
        {t("explainerOr")}{" "}
        <Link href="/whiteboard/new" className="text-coral hover:underline">
          {t("explainerWhiteboardLink")}
        </Link>{" "}
        {t("explainerSuffix")}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <div className="rounded-lg p-3 text-center text-white bg-gradient-to-br from-coral to-watermelon shadow-sm">
          <p className="text-xl font-bold">{projectCount}</p>
          <p className="text-[11px] opacity-85">{t("statProjects")}</p>
        </div>
        <div className="rounded-lg p-3 text-center text-white bg-gradient-to-br from-coral to-watermelon shadow-sm">
          <p className="text-xl font-bold">{aiSeedCount}</p>
          <p className="text-[11px] opacity-85">{t("statAiStarted")}</p>
        </div>
        <div className="rounded-lg p-3 text-center text-white bg-gradient-to-br from-coral to-watermelon shadow-sm">
          <p className="text-xl font-bold">{projectCount - aiSeedCount}</p>
          <p className="text-[11px] opacity-85">{t("statHumanStarted")}</p>
        </div>
        <div className="rounded-lg p-3 text-center text-white bg-gradient-to-br from-coral to-watermelon shadow-sm">
          <p className="text-xl font-bold">{tasksDone}</p>
          <p className="text-[11px] opacity-85">{t("statTasksDone")}</p>
        </div>
      </div>

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

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-dark-slate">{t("activityHeading")}</h2>
          <Link href="/ideas" className="text-xs text-coral hover:underline">{t("allIdeasLink")}</Link>
        </div>
        {feedEvents.length === 0 ? (
          <div className="border border-dashed border-amber-300 rounded-lg p-16 text-center">
            <p className="text-dark-slate/40 text-sm mb-3">{t("emptyActivity")}</p>
            <Link
              href="/ideas/new"
              className="inline-block px-4 py-2 bg-coral text-white text-sm font-medium rounded hover:bg-watermelon transition-colors"
            >
              {t("shareIdea")}
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {feedEvents.map((e) => (
              <Link
                key={e.key}
                href={e.href}
                className="flex items-start gap-3 border border-amber-200 bg-white rounded-lg p-3 hover:border-amber-400 transition-colors"
              >
                <span
                  className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${
                    e.type === "project" ? "bg-coral" : e.type === "idea" ? "bg-[#7bad93]" : "bg-watermelon"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-dark-slate line-clamp-1">{e.primary}</p>
                  <p className="text-xs text-dark-slate/50 mt-0.5">{e.secondary}</p>
                </div>
                <span className="text-[11px] text-dark-slate/40 flex-shrink-0">{timeAgo(e.createdAt, t)}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
    </div>
  );
}
