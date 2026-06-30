export const dynamic = "force-dynamic";

import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import ProjectCard from "@/components/ProjectCard";
import ProjectFilters from "@/components/ProjectFilters";
import Pagination from "@/components/Pagination";
import ActivityPulse from "@/components/ActivityPulse";

const PAGE_SIZE = 12;

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{
    sort?: string;
    q?: string;
    status?: string;
    category?: string;
    sdg?: string;
    page?: string;
  }>;
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
    sort === "top"       ? { members: { _count: "desc" as const } }
    : sort === "trending" ? { updatedAt: "desc" as const }
    : { createdAt: "desc" as const };

  const [session, projectCount, orgCount, memberCount, totalFiltered, projects] = await Promise.all([
    auth(),
    prisma.project.count({ where: { visibility: "public" } }),
    prisma.organisation.count({ where: { isPublic: true } }),
    prisma.user.count({ where: { showProfile: true } }),
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
    <div className="space-y-16">

      {/* Del 1 — Hero */}
      <section className="rounded-2xl bg-gradient-to-br from-dark-slate to-dark-slate/80 text-white px-8 py-14 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-seagrass via-transparent to-coral" />
        <div className="relative md:grid md:grid-cols-2 md:gap-12 md:items-center">
          {/* Copy */}
          <div className="text-center md:text-left">
            <p className="text-seagrass text-sm font-semibold uppercase tracking-widest mb-3">
              Where good ideas become reality
            </p>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
              Skilled volunteers.<br />Impact-driven projects.
            </h1>
            <p className="text-white/70 text-lg mb-8 max-w-lg mx-auto md:mx-0">
              GoodTribes connects people who want to make a difference with organisations that need their skills.
            </p>
            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
              {session ? (
                <>
                  <Link
                    href="/projects/new"
                    className="bg-coral text-white font-semibold px-6 py-3 rounded-lg hover:bg-watermelon transition-colors"
                  >
                    Starta ett projekt →
                  </Link>
                  <Link
                    href="#projects"
                    className="bg-white/10 text-white font-medium px-6 py-3 rounded-lg hover:bg-white/20 transition-colors"
                  >
                    Utforska projekt
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="bg-coral text-white font-semibold px-6 py-3 rounded-lg hover:bg-watermelon transition-colors"
                  >
                    Kom igång gratis →
                  </Link>
                  <Link
                    href="#projects"
                    className="bg-white/10 text-white font-medium px-6 py-3 rounded-lg hover:bg-white/20 transition-colors"
                  >
                    Utforska projekt
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Stats — desktop: cards column, mobile: row below copy */}
          <div className="hidden md:grid grid-cols-1 gap-4">
            <div className="bg-white/10 backdrop-blur rounded-xl px-6 py-5 text-center">
              <p className="text-3xl font-bold">{projectCount}</p>
              <p className="text-white/60 text-sm mt-1">Aktiva projekt</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl px-6 py-5 text-center">
              <p className="text-3xl font-bold">{orgCount}</p>
              <p className="text-white/60 text-sm mt-1">Organisationer</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl px-6 py-5 text-center">
              <p className="text-3xl font-bold">{memberCount}</p>
              <p className="text-white/60 text-sm mt-1">Volontärer</p>
            </div>
          </div>
        </div>

        {/* Stats — mobile row */}
        <div className="flex justify-center gap-10 mt-10 pt-8 border-t border-white/10 md:hidden">
          <div className="text-center">
            <p className="text-2xl font-bold">{projectCount}</p>
            <p className="text-white/50 text-xs mt-0.5">Projekt</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{orgCount}</p>
            <p className="text-white/50 text-xs mt-0.5">Organisationer</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{memberCount}</p>
            <p className="text-white/50 text-xs mt-0.5">Volontärer</p>
          </div>
        </div>
      </section>

      {/* Del 2 — Activity Pulse */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-dark-slate">Händer just nu</h2>
            <p className="text-xs text-dark-slate/50 mt-0.5">Senaste aktivitet på plattformen</p>
          </div>
          <Link href="/feed" className="text-xs text-coral hover:underline">
            Se all aktivitet →
          </Link>
        </div>
        <ActivityPulse />
      </section>

      {/* Del 3 — Project Browser */}
      <section id="projects">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-dark-slate">
              Utforska projekt{" "}
              <span className="text-dark-slate/40 font-normal">({totalFiltered})</span>
            </h2>
          </div>
          <Link href="/projects" className="text-xs text-coral hover:underline">
            Se alla projekt →
          </Link>
        </div>
        <ProjectFilters
          sort={sort}
          q={q}
          status={status}
          category={category}
          sdg={sdg}
          total={totalFiltered}
          basePath="/"
        />
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-dark-slate/50 mb-4">Inga projekt matchar dina filter.</p>
            <Link href="/" className="text-coral hover:underline text-sm">
              Rensa filter
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
              {projects.map((p) => <ProjectCard key={p.slug} project={p} />)}
            </div>
            <Pagination
              page={page}
              total={totalFiltered}
              perPage={PAGE_SIZE}
              searchParams={rawParams}
              basePath="/"
            />
          </>
        )}
      </section>

    </div>
  );
}
