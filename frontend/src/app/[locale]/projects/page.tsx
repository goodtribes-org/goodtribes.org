export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

import { getTranslations, getLocale } from "next-intl/server";
import { auth } from "@/auth";
import ProjectFilters from "@/components/ProjectFiltersContainer";
import Pagination from "@/components/Pagination";
import ProjectCard from "@/components/ProjectCard";
import CountryMap from "@/components/CountryMap";
import { countByCountry } from "@/lib/geo";
import { isValidProjectPhase } from "@/lib/projectPhase";
import { computeTaskProgressByProject } from "@/lib/taskProgress";
import { resolveProjectContent } from "@/lib/contentTranslation";
import { routing } from "@/i18n/routing";
import type { Locale } from "next-intl";

export const metadata: Metadata = {
  title: "Projects — GoodTribes.org",
  description: "Projects built by GoodTribes.org",
};

const PAGE_SIZE = 12;

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; q?: string; phase?: string; category?: string; sdg?: string; page?: string }>;
}) {
  const { sort: sortParam, q, phase, category, sdg, page: pageStr } = await searchParams;
  const sort = sortParam === "top" ? "top" : sortParam === "trending" ? "trending" : "new";
  const sdgNum = sdg ? parseInt(sdg) : undefined;
  const page = Math.max(1, parseInt(pageStr ?? "1") || 1);

  const where: Prisma.ProjectWhereInput = {
    hiddenAt: null,
    ...(q ? { OR: [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ]} : {}),
    ...(phase && isValidProjectPhase(phase) ? { phase } : {}),
    ...(category ? { category } : {}),
    ...(sdgNum && !isNaN(sdgNum) ? { sdgGoals: { has: sdgNum } } : {}),
  };

  const orderBy =
    sort === "top"      ? { members: { _count: "desc" as const } }
    : sort === "trending" ? { updatedAt: "desc" as const }
    : { createdAt: "desc" as const };

  const locale = (await getLocale()) as Locale;

  const [session, t, tFilters, total, projects, ownerCountries] = await Promise.all([
    auth(),
    getTranslations("ProjectsPage"),
    getTranslations("Filters"),
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
    prisma.project.findMany({ where, select: { owner: { select: { country: true } } } }),
  ]);

  const countryCounts = countByCountry(ownerCountries.map((p) => p.owner.country));

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

  const rawParams = { sort: sortParam, q, phase, category, sdg, page: pageStr };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-dark-slate">
          {t("heading")}{" "}
          <span className="text-dark-slate/40 font-normal">({total})</span>
        </h1>
        {session?.user?.id && (
          <Link
            href="/projects/new"
            className="px-4 py-2 bg-coral text-white text-sm font-medium rounded hover:bg-watermelon transition-colors"
          >
            {t("newProjectCta")}
          </Link>
        )}
      </div>

      {Object.keys(countryCounts).length > 0 && (
        <div className="mb-6">
          <CountryMap counts={countryCounts} unitLabel={t("unitLabel")} />
        </div>
      )}

      <ProjectFilters sort={sort} q={q} phase={phase} category={category} sdg={sdg} />

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-dark-slate/50 mb-4">{t("noProjectsMatch")}</p>
          <Link href="/projects" className="text-coral hover:underline text-sm">{tFilters("clearFilters")}</Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
            {projectsWithLikes.map((project) => (
              <ProjectCard key={project.slug} project={project} />
            ))}
          </div>
          <Pagination
            page={page}
            total={total}
            perPage={PAGE_SIZE}
            searchParams={rawParams}
            basePath="/projects"
          />
        </>
      )}
    </div>
  );
}
