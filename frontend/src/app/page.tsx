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

      {/* Del 1 — Hero: full-bleed with blurred background + two tilted cards */}
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
                marginRight: "330px",
              }}
            >
              Crowdsourcing for Good
            </h1>
          </div>

          {/* Two cards */}
          <div className="flex justify-center px-4 pb-10">
            <div className="flex flex-col md:flex-row gap-5 items-stretch">

              <HeroCards />

              {/* Card 2: stats + CTA */}
              <div
                className="shrink-0 bg-white rounded-2xl p-5 flex flex-col"
                style={{
                  width: "320px",
                  minHeight: "460px",
                  boxShadow: "0 8px 40px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.3)",
                  marginLeft: "-10px",
                  transform: "rotate(3deg)",
                }}
              >
                <p className="text-seagrass text-xs font-semibold uppercase tracking-widest mb-4">
                  Where good ideas become reality
                </p>

                {/* Stats */}
                <div className="space-y-3 mb-4">
                  <div className="bg-dry-sage/20 rounded-xl px-4 py-3 text-center">
                    <p className="text-3xl font-bold text-dark-slate">{projectCount}</p>
                    <p className="text-dark-slate/60 text-sm mt-0.5">Aktiva projekt</p>
                  </div>
                  <div className="bg-dry-sage/20 rounded-xl px-4 py-3 text-center">
                    <p className="text-3xl font-bold text-dark-slate">{orgCount}</p>
                    <p className="text-dark-slate/60 text-sm mt-0.5">Organisationer</p>
                  </div>
                  <div className="bg-dry-sage/20 rounded-xl px-4 py-3 text-center">
                    <p className="text-3xl font-bold text-dark-slate">{memberCount}</p>
                    <p className="text-dark-slate/60 text-sm mt-0.5">Volontärer</p>
                  </div>
                </div>

                <div className="flex-1" />

                {/* CTA buttons */}
                <div className="space-y-2">
                  {session ? (
                    <Link
                      href="/projects/new"
                      className="block w-full text-center bg-coral text-white font-semibold px-4 py-3 rounded-xl hover:bg-watermelon transition-colors"
                    >
                      Starta ett projekt →
                    </Link>
                  ) : (
                    <Link
                      href="/login"
                      className="block w-full text-center bg-coral text-white font-semibold px-4 py-3 rounded-xl hover:bg-watermelon transition-colors"
                    >
                      Kom igång gratis →
                    </Link>
                  )}
                  <Link
                    href="#projects"
                    className="block w-full text-center bg-seagrass/10 text-dark-slate font-medium px-4 py-2.5 rounded-xl hover:bg-seagrass/20 transition-colors text-sm"
                  >
                    Utforska projekt
                  </Link>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

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
