import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/auth";

export const metadata: Metadata = {
  title: "Projects — GoodTribes.org",
  description: "Projects built by GoodTribes.org",
};

const prisma = new PrismaClient();

export default async function ProjectsPage() {
  const [session, projects] = await Promise.all([
    auth(),
    prisma.project.findMany({
      where: { visibility: "public" },
      orderBy: { createdAt: "desc" },
      include: {
        owner: { select: { name: true } },
        members: { select: { id: true } },
        _count: { select: { kanbanCards: true, todoItems: true } },
      },
    }),
  ]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-dark-slate">
          Projects{" "}
          <span className="text-dark-slate/40 font-normal">({projects.length} results)</span>
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

      {/* Filter bar */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <button className="flex items-center gap-2 border border-muted-teal rounded px-3 py-1.5 text-sm text-dark-slate hover:border-seagrass transition-colors">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z"
            />
          </svg>
          Filters
        </button>

        <button className="flex items-center gap-1.5 border border-muted-teal rounded px-3 py-1.5 text-sm text-dark-slate hover:border-seagrass transition-colors">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
          </svg>
          Sort: Newest
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-3 h-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div className="ml-auto flex items-center gap-1">
          <button className="p-1.5 rounded border border-muted-teal text-dark-slate/60 hover:border-seagrass hover:text-dark-slate transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-dark-slate/50 mb-4">No projects yet.</p>
          {session?.user?.id ? (
            <Link
              href="/projects/new"
              className="px-5 py-2 bg-coral text-white text-sm font-medium rounded hover:bg-watermelon transition-colors"
            >
              Create the first project
            </Link>
          ) : (
            <Link href="/login" className="text-coral hover:underline text-sm">
              Log in to create a project
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-10">
            {projects.map((project) => {
              const imageSrc =
                project.imageUrl ?? `https://picsum.photos/seed/${project.slug}/800/600`;
              const ownerName = project.owner.name ?? "Unknown";
              return (
                <Link
                  key={project.slug}
                  href={`/projects/${project.slug}`}
                  className="rounded-lg overflow-hidden border border-muted-teal/40 hover:shadow-md transition-shadow bg-white flex flex-col"
                >
                  {/* Image */}
                  <div className="relative aspect-[4/3] w-full">
                    <Image
                      src={imageSrc}
                      alt={project.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                    <span className="absolute top-2 left-2 bg-white/90 rounded px-1.5 py-0.5 text-xs font-semibold text-dark-slate capitalize">
                      {project.status}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="p-3 flex flex-col flex-1">
                    <p className="font-bold text-dark-slate text-sm leading-tight mb-0.5">
                      {project.title}
                    </p>
                    <p className="text-xs text-dark-slate/50 mb-2">
                      by <span className="text-coral">{ownerName}</span>
                    </p>
                    <p className="text-xs text-dark-slate/70 leading-snug mb-3 line-clamp-3 flex-1">
                      {project.description ?? "No description yet."}
                    </p>

                    {/* Stats */}
                    <div className="grid grid-cols-3 divide-x divide-muted-teal/30 text-center border-t border-muted-teal/20 pt-2 mt-auto">
                      <div className="px-1">
                        <p className="text-xs font-semibold text-dark-slate">
                          {project.members.length}
                        </p>
                        <p className="text-[10px] text-dark-slate/50 leading-tight">Members</p>
                      </div>
                      <div className="px-1">
                        <p className="text-xs font-semibold text-dark-slate">
                          {project._count.kanbanCards + project._count.todoItems}
                        </p>
                        <p className="text-[10px] text-dark-slate/50 leading-tight">Tasks</p>
                      </div>
                      <div className="px-1">
                        <p className="text-xs font-semibold text-dark-slate capitalize">
                          {project.status}
                        </p>
                        <p className="text-[10px] text-dark-slate/50 leading-tight">Stage</p>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
