export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

import { auth } from "@/auth";
import ProjectFilters from "@/components/ProjectFilters";
import Pagination from "@/components/Pagination";
import { SdgIcon } from "@/components/SdgIcon";

export const metadata: Metadata = {
  title: "Projects — GoodTribes.org",
  description: "Projects built by GoodTribes.org",
};

const PAGE_SIZE = 12;

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; q?: string; status?: string; category?: string; sdg?: string; page?: string }>;
}) {
  const { sort: sortParam, q, status, category, sdg, page: pageStr } = await searchParams;
  const sort = sortParam === "top" ? "top" : sortParam === "trending" ? "trending" : "new";
  const sdgNum = sdg ? parseInt(sdg) : undefined;
  const page = Math.max(1, parseInt(pageStr ?? "1") || 1);

  const where: Prisma.ProjectWhereInput = {
    visibility: "public",
    ...(q ? { OR: [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ]} : {}),
    ...(status ? { status } : {}),
    ...(category ? { category } : {}),
    ...(sdgNum && !isNaN(sdgNum) ? { sdgGoals: { has: sdgNum } } : {}),
  };

  const orderBy =
    sort === "top"      ? { members: { _count: "desc" as const } }
    : sort === "trending" ? { updatedAt: "desc" as const }
    : { createdAt: "desc" as const };

  const [session, total, projects] = await Promise.all([
    auth(),
    prisma.project.count({ where }),
    prisma.project.findMany({
      where,
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        owner: { select: { name: true } },
        members: { select: { id: true } },
        _count: { select: { kanbanCards: true, todoItems: true } },
      },
    }),
  ]);

  const rawParams = { sort: sortParam, q, status, category, sdg, page: pageStr };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-dark-slate">
          Projects{" "}
          <span className="text-dark-slate/40 font-normal">({total})</span>
        </h1>
        {session?.user?.id && (
          <Link
            href="/projects/new"
            className="px-4 py-2 bg-coral text-white text-sm font-medium rounded hover:bg-watermelon transition-colors"
          >
            + New project
          </Link>
        )}
      </div>

      <ProjectFilters sort={sort} q={q} status={status} category={category} sdg={sdg} total={total} />

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-dark-slate/50 mb-4">No projects match your filters.</p>
          <button
            onClick={undefined}
            className="text-coral hover:underline text-sm"
          >
            <Link href="/projects">Clear filters</Link>
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
            {projects.map((project) => {
              const ownerName = project.owner.name ?? "Unknown";
              return (
                <Link
                  key={project.slug}
                  href={`/projects/${project.slug}`}
                  className="rounded-lg overflow-hidden border border-muted-teal/40 hover:shadow-md transition-shadow bg-white flex flex-col"
                >
                  <div className="relative aspect-[4/3] w-full">
                    {project.imageUrl ? (
                      <Image
                        src={project.imageUrl}
                        alt={project.title}
                        fill
                        unoptimized
                        className="object-cover"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-dry-sage to-muted-teal/40 flex items-center justify-center p-4">
                        <p className="text-xs font-semibold text-dark-slate/70 text-center leading-tight line-clamp-3">{project.title}</p>
                      </div>
                    )}
                    <span className="absolute top-2 left-2 bg-white/90 rounded px-1.5 py-0.5 text-xs font-semibold text-dark-slate capitalize">
                      {project.status}
                    </span>
                  </div>
                  <div className="p-3 flex flex-col flex-1">
                    <p className="font-bold text-dark-slate text-sm leading-tight mb-0.5">
                      {project.title}
                    </p>
                    <p className="text-xs text-dark-slate/50 mb-2">
                      by <span className="text-coral">{ownerName}</span>
                    </p>
                    <p className="text-xs text-dark-slate/70 leading-snug mb-2 line-clamp-3 flex-1">
                      {(project as typeof project & { summary: string | null }).summary ?? project.description ?? "Ingen beskrivning ännu."}
                    </p>
                    {project.sdgGoals.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 mb-2">
                        <span className="text-xs font-semibold text-dark-slate/60 mr-0.5">Agenda 2030:</span>
                        {project.sdgGoals.slice(0, 5).map((n) => (
                          <SdgIcon key={n} n={n} size={20} />
                        ))}
                      </div>
                    )}
                    <div className="grid grid-cols-3 divide-x divide-muted-teal/30 text-center border-t border-muted-teal/20 pt-2 mt-auto">
                      <div className="px-1">
                        <p className="text-xs font-semibold text-dark-slate">{project.members.length}</p>
                        <p className="text-[10px] text-dark-slate/50 leading-tight">Members</p>
                      </div>
                      <div className="px-1">
                        <p className="text-xs font-semibold text-dark-slate">
                          {project._count.kanbanCards + project._count.todoItems}
                        </p>
                        <p className="text-[10px] text-dark-slate/50 leading-tight">Tasks</p>
                      </div>
                      <div className="px-1">
                        <p className="text-xs font-semibold text-dark-slate capitalize">{project.status}</p>
                        <p className="text-[10px] text-dark-slate/50 leading-tight">Stage</p>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
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
