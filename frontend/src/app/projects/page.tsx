export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { PrismaClient, Prisma } from "@prisma/client";
import { auth } from "@/auth";
import ProjectFilters from "@/components/ProjectFilters";
import Pagination from "@/components/Pagination";

export const metadata: Metadata = {
  title: "Projects — GoodTribes.org",
  description: "Projects built by GoodTribes.org",
};

const prisma = new PrismaClient();
const PAGE_SIZE = 12;

const SDG_COLORS: Record<number, string> = {
  1:"#E5243B",2:"#DDA63A",3:"#4C9F38",4:"#C5192D",5:"#FF3A21",
  6:"#26BDE2",7:"#FCC30B",8:"#A21942",9:"#FD6925",10:"#DD1367",
  11:"#FD9D24",12:"#BF8B2E",13:"#3F7E44",14:"#0A97D9",15:"#56C02B",
  16:"#00689D",17:"#19486A",
};

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; category?: string; sdg?: string; skill?: string; page?: string }>;
}) {
  const { status, category, sdg, skill, page: pageStr } = await searchParams;
  const sdgNum = sdg ? parseInt(sdg) : undefined;
  const page = Math.max(1, parseInt(pageStr ?? "1") || 1);

  const where: Prisma.ProjectWhereInput = {
    visibility: "public",
    ...(status ? { status } : {}),
    ...(category ? { category } : {}),
    ...(sdgNum && !isNaN(sdgNum) ? { sdgGoals: { has: sdgNum } } : {}),
    ...(skill ? { neededSkills: { some: { skill: { slug: skill } } } } : {}),
  };

  const [session, total, projects, skills] = await Promise.all([
    auth(),
    prisma.project.count({ where }),
    prisma.project.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        owner: { select: { name: true } },
        members: { select: { id: true } },
        _count: { select: { kanbanCards: true, todoItems: true } },
      },
    }),
    prisma.skill.findMany({
      where: { projects: { some: { project: { visibility: "public" } } } },
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const rawParams = { status, category, sdg, skill, page: pageStr };

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

      <ProjectFilters status={status} category={category} sdg={sdg} skill={skill} skills={skills} total={total} />

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
                      {project.description ?? "No description yet."}
                    </p>
                    {project.sdgGoals.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {project.sdgGoals.slice(0, 5).map((n) => (
                          <span
                            key={n}
                            title={`SDG ${n}`}
                            className="w-5 h-5 rounded text-[9px] font-bold text-white flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: SDG_COLORS[n] }}
                          >
                            {n}
                          </span>
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
