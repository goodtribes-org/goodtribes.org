export const dynamic = "force-dynamic";

import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import ProjectCard from "@/components/ProjectCard";
import SortToggle from "@/components/SortToggle";
import Pagination from "@/components/Pagination";
import ActivityPulse from "@/components/ActivityPulse";
import HeroPhotoStack from "@/components/HeroPhotoStack";
import HomeStatsWidget from "@/components/HomeStatsWidget";
import ImpactStatsWidget from "@/components/ImpactStatsWidget";
import LeaderboardWidget from "@/components/LeaderboardWidget";
import NewMembersWidget from "@/components/NewMembersWidget";
import SdgCoverageWidget from "@/components/SdgCoverageWidget";

const PAGE_SIZE = 12;

async function getLeaderboard() {
  const tokenGroups = await prisma.tokenLedger.groupBy({
    by: ["userId"],
    _sum: { tokens: true },
    orderBy: { _sum: { tokens: "desc" } },
    take: 20,
  });
  const users = await prisma.user.findMany({
    where: { id: { in: tokenGroups.map((g) => g.userId) }, showProfile: true, name: { not: null as null } },
    select: { id: true, name: true, image: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  return tokenGroups
    .map((g) => {
      const user = userMap.get(g.userId);
      return user ? { id: user.id, name: user.name!, image: user.image, tokens: g._sum.tokens ?? 0 } : null;
    })
    .filter((entry): entry is { id: string; name: string; image: string | null; tokens: number } => !!entry)
    .slice(0, 5);
}

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

  const [
    projectCount,
    orgCount,
    memberCount,
    pledgeSum,
    hoursSum,
    completedTasks,
    leaderboard,
    newMembers,
    sdgProjects,
    totalFiltered,
    projects,
  ] = await Promise.all([
    prisma.project.count({ where: { visibility: "public" } }),
    prisma.organisation.count({ where: { isPublic: true } }),
    prisma.user.count({ where: { showProfile: true } }),
    prisma.fundingPledge.aggregate({ where: { pledgeStatus: "confirmed" }, _sum: { amount: true } }),
    prisma.timeLog.aggregate({ where: { status: "approved" }, _sum: { loggedHours: true } }),
    prisma.kanbanCard.count({ where: { column: "DONE" } }),
    getLeaderboard(),
    prisma.user.findMany({
      where: { showProfile: true, name: { not: null as null } },
      orderBy: { id: "desc" }, // User has no createdAt; cuid ids are chronologically sortable
      take: 6,
      select: { id: true, name: true, image: true },
    }),
    prisma.project.findMany({ where: { visibility: "public" }, select: { sdgGoals: true } }),
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

  const totalRaised = pledgeSum._sum.amount ?? 0;
  const totalHours = Math.round(hoursSum._sum.loggedHours ?? 0);
  const coveredGoals = Array.from(new Set(sdgProjects.flatMap((p) => p.sdgGoals)));

  const rawParams = { sort: sortParam, q, status, category, sdg, page: pageStr };

  return (
    <div>

      {/* Del 1 — Hero: full-bleed blurred bakgrund (följer bilden som visas i högen) + bilder + textkort */}
      <div className="relative -mt-8" style={{ marginLeft: "calc(50% - 50vw)", width: "100vw" }}>
        <HeroPhotoStack>
          <section className="flex flex-col items-center text-center max-w-3xl bg-white/95 rounded-2xl shadow-lg px-6 py-8">
            <h1 className="text-3xl md:text-4xl font-bold text-dark-slate">
              Tillsammans gör vi bra idéer till verklighet
            </h1>
            <p className="mt-4 text-dark-slate/80">
              Runt om i världen bubblar det av fantastiska idéer — projekt som vill rädda bin, städa hav
              eller skapa tryggare kvarter. Samtidigt finns det tusentals människor som vill hjälpa till
              och göra skillnad, men som inte vet var de ska börja.
            </p>
            <p className="mt-3 text-dark-slate/80">
              GoodTribes är mötesplatsen däremellan. Vi kopplar ihop visionära projekt med engagerade
              volontärer, så att goda idéer inte stannar vid en dröm utan faktiskt blir verklighet.
            </p>
            <p className="mt-4 text-sm text-dark-slate/70">
              <strong className="text-dark-slate">Har du ett projekt?</strong> Beskriv vad du behöver.
              <span className="mx-1.5">·</span>
              <strong className="text-dark-slate">Vill du hjälpa till?</strong> Dela med dig av din tid
              eller kunskap.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/projects/new"
                className="bg-coral text-white text-sm font-medium px-5 py-2.5 rounded hover:bg-watermelon transition-colors"
              >
                Skapa ett projekt
              </Link>
              <Link
                href="/projects"
                className="text-coral text-sm font-medium px-5 py-2.5 rounded border border-coral hover:bg-coral/5 transition-colors"
              >
                Utforska projekt
              </Link>
            </div>
          </section>
        </HeroPhotoStack>
      </div>

      <div className="space-y-16">

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
          <div className="flex flex-col gap-6">
            <LeaderboardWidget entries={leaderboard} />
            <NewMembersWidget
              members={newMembers.map((m) => ({ id: m.id, name: m.name!, image: m.image }))}
            />
            <ImpactStatsWidget
              totalRaised={totalRaised}
              totalHours={totalHours}
              completedTasks={completedTasks}
            />
            <SdgCoverageWidget coveredGoals={coveredGoals} />
            <HomeStatsWidget
              projectCount={projectCount}
              orgCount={orgCount}
              memberCount={memberCount}
            />
          </div>
        </div>
      </section>

      {/* Del 3 — Project Browser */}
      <section id="projects">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-dark-slate">
              Utforska projekt{" "}
              <span className="text-dark-slate/40 font-normal">({totalFiltered})</span>
            </h2>
            <SortToggle sort={sort} q={q} status={status} category={category} sdg={sdg} basePath="/" />
          </div>
          <Link href="/projects" className="text-xs text-coral hover:underline">
            Se alla projekt →
          </Link>
        </div>
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

    </div>
  );
}
