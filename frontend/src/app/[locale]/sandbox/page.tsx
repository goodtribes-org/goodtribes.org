export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import SortToggleContainer from "@/components/SortToggleContainer";
import Pagination from "@/components/Pagination";
import ProjectCard from "@/components/ProjectCard";
import { computeTaskProgressByProject } from "@/lib/taskProgress";
import SandboxHero from "./SandboxHero";
import Pillars from "./Pillars";
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

export default async function SandboxPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ sort?: string; page?: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "SandboxPage" });
  const tPillars = await getTranslations({ locale, namespace: "SandboxPillars" });
  const { sort: sortParam, page: pageStr } = await searchParams;
  const sort = sortParam === "top" ? "top" : sortParam === "trending" ? "trending" : "new";
  const page = Math.max(1, parseInt(pageStr ?? "1") || 1);

  const orderBy =
    sort === "top"       ? { members: { _count: "desc" as const } }
    : sort === "trending" ? { updatedAt: "desc" as const }
    : { createdAt: "desc" as const };

  const where = { isSandbox: true };

  const [total, projects] = await Promise.all([
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
  ]);

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
    <SandboxHero kicker={t("heroKicker")} description={t("heroDescription")} />
    <div className="max-w-6xl mx-auto px-6 pb-12">
      <div className="mb-8 mt-4">
        <Pillars
          headings={{
            levaGott: tPillars("levaGottHeading"),
            maGott: tPillars("maGottHeading"),
            goraGott: tPillars("goraGottHeading"),
            dreamGood: tPillars("dreamGoodHeading"),
          }}
          bodies={{
            levaGott: tPillars("levaGottBody"),
            maGott: tPillars("maGottBody"),
            goraGott: tPillars("goraGottBody"),
            dreamGood: tPillars("dreamGoodBody"),
          }}
        />
      </div>

      <div className="flex items-center justify-between mb-2 mt-2 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-dark-slate">{t("heading")}</h1>
          <p className="text-sm text-dark-slate/50 mt-1">{t("subtitle")}</p>
        </div>
        <div className="flex gap-2 flex-shrink-0 flex-wrap">
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
        <Link href="/lean-canvas" className="text-coral hover:underline">
          {t("explainerLeanCanvasLink")}
        </Link>{" "}
        {t("explainerOr")}{" "}
        <Link href="/whiteboard" className="text-coral hover:underline">
          {t("explainerWhiteboardLink")}
        </Link>{" "}
        {t("explainerSuffix")}
      </p>

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
    </div>
    </div>
  );
}
