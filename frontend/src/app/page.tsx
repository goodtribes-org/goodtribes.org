export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import ProjectCard from "@/components/ProjectCard";
import ProjectFilters from "@/components/ProjectFilters";
import Pagination from "@/components/Pagination";
import ActivityPulse from "@/components/ActivityPulse";
import HeroCards from "@/components/HeroCards";
import HomeStatsWidget from "@/components/HomeStatsWidget";

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

      {/* Del 1 — Hero: full-bleed with blurred background + flip cards */}
      <div
        className="relative -mt-8"
        style={{ marginLeft: "calc(50% - 50vw)", width: "100vw" }}
      >
        {/* Background — blurred hero image, clipped to 490 px */}
        <div className="absolute top-0 left-0 right-0 overflow-hidden" style={{ height: "490px" }}>
          <Image
            src="/img/hero-banner.png"
            alt=""
            fill
            unoptimized
            className="object-cover blur-2xl scale-110"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-dark-slate/30" />
        </div>

        {/* Content layer */}
        <div className="relative z-10">
          {/* Title above cards */}
          <div className="flex justify-center pt-5 pb-2 px-6">
            <h1
              className="text-5xl md:text-6xl font-bold text-center leading-tight"
              style={{
                color: "white",
                textShadow:
                  "-1px -1px 0 #999, 1px -1px 0 #999, -1px 1px 0 #999, 1px 1px 0 #999, 2px 4px 12px rgba(0,0,0,0.35)",
              }}
            >
              Crowdsourcing for Good
            </h1>
          </div>

          {/* Hero cards */}
          <div className="flex justify-center px-4 pb-10">
            <HeroCards />
          </div>
        </div>
      </div>

      {/* Del 2 — Activity Pulse */}
      <section>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          <div>
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
          </div>
          <HomeStatsWidget
            projectCount={projectCount}
            orgCount={orgCount}
            memberCount={memberCount}
            isLoggedIn={!!session}
          />
        </div>
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
