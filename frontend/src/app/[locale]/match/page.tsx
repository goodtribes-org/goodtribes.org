export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { SdgIcon } from "@/components/SdgIcon";

export const metadata: Metadata = {
  title: "Hitta projekt — GoodTribes",
};

type ProjectCard = {
  slug: string;
  title: string;
  description: string | null;
  category: string | null;
  status: string;
  _count: { members: number };
  sdgGoals: number[];
  neededSkills: { skill: { id: string; name: string; slug: string } }[];
};

function MatchCard({
  project,
  matchingSkillIds,
  showSdgs,
}: {
  project: ProjectCard;
  matchingSkillIds?: Set<string>;
  showSdgs?: boolean;
}) {
  const desc = project.description
    ? project.description.slice(0, 100) + (project.description.length > 100 ? "…" : "")
    : null;

  return (
    <Link
      href={`/projects/${project.slug}`}
      className="flex flex-col gap-2 border border-muted-teal/40 rounded-lg p-4 hover:shadow-md hover:border-muted-teal transition-all bg-white"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-dark-slate text-sm leading-snug">{project.title}</p>
        {project.category && (
          <span className="text-[10px] font-semibold uppercase tracking-wide bg-dry-sage/40 text-dark-slate/60 rounded px-1.5 py-0.5 flex-shrink-0">
            {project.category}
          </span>
        )}
      </div>

      {desc && (
        <p className="text-xs text-dark-slate/60 leading-snug">{desc}</p>
      )}

      <div className="flex flex-wrap items-center gap-1 mt-auto pt-1">
        {/* Matching skill badges */}
        {matchingSkillIds && project.neededSkills.map(({ skill }) =>
          matchingSkillIds.has(skill.id) ? (
            <span
              key={skill.id}
              className="text-[10px] bg-seagrass/15 text-seagrass border border-seagrass/30 rounded px-1.5 py-0.5 font-medium"
            >
              {skill.name}
            </span>
          ) : null
        )}

        {/* SDG badges when showing interest-based results */}
        {showSdgs && (
          <>
            <span className="text-[9px] font-medium text-dark-slate/40">Agenda 2030:</span>
            {project.sdgGoals.slice(0, 7).map((n) => (
              <SdgIcon key={n} n={n} size={20} />
            ))}
          </>
        )}

        <span className="ml-auto text-[10px] text-dark-slate/40 flex-shrink-0">
          {project._count.members} {project._count.members === 1 ? "medlem" : "medlemmar"}
        </span>
      </div>
    </Link>
  );
}

type OrgCard = {
  slug: string;
  name: string;
  description: string | null;
  _count: { members: number };
  neededSkills: { skill: { id: string; name: string; slug: string } }[];
};

function OrgMatchCard({
  org,
  matchingSkillIds,
}: {
  org: OrgCard;
  matchingSkillIds: Set<string>;
}) {
  const desc = org.description
    ? org.description.slice(0, 100) + (org.description.length > 100 ? "…" : "")
    : null;

  return (
    <Link
      href={`/org/${org.slug}`}
      className="flex flex-col gap-2 border border-muted-teal/40 rounded-lg p-4 hover:shadow-md hover:border-muted-teal transition-all bg-white"
    >
      <p className="font-semibold text-dark-slate text-sm leading-snug">{org.name}</p>

      {desc && (
        <p className="text-xs text-dark-slate/60 leading-snug">{desc}</p>
      )}

      <div className="flex flex-wrap items-center gap-1 mt-auto pt-1">
        {org.neededSkills.map(({ skill }) =>
          matchingSkillIds.has(skill.id) ? (
            <span
              key={skill.id}
              className="text-[10px] bg-seagrass/15 text-seagrass border border-seagrass/30 rounded px-1.5 py-0.5 font-medium"
            >
              {skill.name}
            </span>
          ) : null
        )}

        <span className="ml-auto text-[10px] text-dark-slate/40 flex-shrink-0">
          {org._count.members} {org._count.members === 1 ? "medlem" : "medlemmar"}
        </span>
      </div>
    </Link>
  );
}

export default async function MatchPage({
  searchParams,
}: {
  searchParams: Promise<{ skill?: string }>;
}) {
  const [session, { skill: skillSlug }] = await Promise.all([
    auth(),
    searchParams,
  ]);

  if (!session?.user?.id) {
    return (
      <div className="max-w-2xl mx-auto py-24 text-center">
        <h1 className="text-2xl font-bold text-dark-slate mb-3">Hitta rätt projekt</h1>
        <p className="text-dark-slate/50 mb-6">
          Logga in för att se projekt som matchar dina kompetenser och intressen.
        </p>
        <Link
          href="/login"
          className="inline-block px-6 py-2.5 bg-coral text-white font-medium rounded hover:bg-watermelon transition-colors"
        >
          Logga in
        </Link>
      </div>
    );
  }

  const userId = session.user.id;

  // Fetch user skills, interests, and all available skills in parallel
  const [user, allSkills] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        interests: true,
        skills: {
          select: { skillId: true },
        },
      },
    }),
    prisma.skill.findMany({
      where: { projects: { some: { project: { visibility: "public", status: { not: "DELIVERY" } } } } },
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const userSkillIds = (user?.skills ?? []).map((s) => s.skillId);
  const userInterests = user?.interests ?? [];
  const matchingSkillIdSet = new Set(userSkillIds);

  // Shared project select shape
  const projectSelect = {
    slug: true,
    title: true,
    description: true,
    category: true,
    status: true,
    sdgGoals: true,
    _count: { select: { members: true } },
    neededSkills: {
      include: { skill: { select: { id: true, name: true, slug: true } } },
    },
  } as const;

  // Query all three sections in parallel
  const [skillMatches, interestMatches, exploreProjects] = await Promise.all([
    // Section 1: skill-matched projects
    userSkillIds.length > 0
      ? prisma.project.findMany({
          where: {
            status: { not: "DELIVERY" },
            visibility: "public",
            neededSkills: { some: { skillId: { in: userSkillIds } } },
            members: { none: { userId } },
          },
          select: projectSelect,
          orderBy: { createdAt: "desc" },
          take: 8,
        })
      : Promise.resolve([] as ProjectCard[]),

    // Section 2: interest/SDG-matched projects (only if user has interests)
    userInterests.length > 0
      ? prisma.project.findMany({
          where: {
            status: { not: "DELIVERY" },
            visibility: "public",
            sdgGoals: { hasSome: userInterests },
            members: { none: { userId } },
          },
          select: projectSelect,
          orderBy: { createdAt: "desc" },
          take: 8,
        })
      : Promise.resolve([] as ProjectCard[]),

    // Section 3: explore by skill filter (URL param)
    prisma.project.findMany({
      where: {
        status: { not: "DELIVERY" },
        visibility: "public",
        ...(skillSlug ? { neededSkills: { some: { skill: { slug: skillSlug } } } } : {}),
      },
      select: projectSelect,
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
  ]);

  const orgMatches = userSkillIds.length > 0
    ? await prisma.organisation.findMany({
        where: {
          isPublic: true,
          neededSkills: { some: { skillId: { in: userSkillIds } } },
          members: { none: { userId } },
        },
        select: {
          slug: true,
          name: true,
          description: true,
          _count: { select: { members: true } },
          neededSkills: {
            include: { skill: { select: { id: true, name: true, slug: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 8,
      })
    : [];

  const hasSkills = userSkillIds.length > 0;
  const hasInterests = userInterests.length > 0;

  return (
    <div className="max-w-4xl space-y-12">
      <div>
        <h1 className="text-2xl font-bold text-dark-slate">Hitta projekt</h1>
        <p className="text-sm text-dark-slate/50 mt-1">
          Projekt som matchar dina kompetenser och intressen.
        </p>
      </div>

      {/* Section 1: skill-matched projects */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-dark-slate">
              Projekt som söker din kompetens
            </h2>
            {!hasSkills && (
              <p className="text-xs text-dark-slate/40 mt-0.5">
                Lägg till kompetenser i din{" "}
                <Link href="/profile/setup" className="text-coral hover:underline">
                  profil
                </Link>{" "}
                för att se matchade projekt.
              </p>
            )}
          </div>
        </div>

        {hasSkills && skillMatches.length === 0 && (
          <div className="border border-dashed border-muted-teal/40 rounded-lg p-8 text-center">
            <p className="text-dark-slate/40 text-sm">
              Inga aktiva projekt söker dina kompetenser just nu.
            </p>
          </div>
        )}

        {skillMatches.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {skillMatches.map((p) => (
              <MatchCard key={p.slug} project={p} matchingSkillIds={matchingSkillIdSet} />
            ))}
          </div>
        )}
      </section>

      {/* Section: organisations seeking the user's skills */}
      {hasSkills && (
        <section>
          <div className="mb-4">
            <h2 className="text-base font-semibold text-dark-slate">
              Organisationer som söker din kompetens
            </h2>
            <p className="text-xs text-dark-slate/40 mt-0.5">
              Organisationer som letar efter volontärer med dina kompetenser.
            </p>
          </div>

          {orgMatches.length === 0 ? (
            <div className="border border-dashed border-muted-teal/40 rounded-lg p-8 text-center">
              <p className="text-dark-slate/40 text-sm">
                Inga organisationer söker dina kompetenser just nu.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {orgMatches.map((o) => (
                <OrgMatchCard key={o.slug} org={o} matchingSkillIds={matchingSkillIdSet} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Section 2: interest-based projects */}
      {hasInterests && (
        <section>
          <div className="mb-4">
            <h2 className="text-base font-semibold text-dark-slate">
              Baserat på dina intressen
            </h2>
            <p className="text-xs text-dark-slate/40 mt-0.5">
              Projekt kopplade till de globala målen du bryr dig om.
            </p>
          </div>

          {interestMatches.length === 0 ? (
            <div className="border border-dashed border-muted-teal/40 rounded-lg p-8 text-center">
              <p className="text-dark-slate/40 text-sm">
                Inga aktiva projekt matchar dina intresseområden just nu.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {interestMatches.map((p) => (
                <MatchCard key={p.slug} project={p} showSdgs />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Section 3: explore by skill */}
      <section>
        <div className="mb-4">
          <h2 className="text-base font-semibold text-dark-slate">
            Utforska efter kompetens
          </h2>
          <p className="text-xs text-dark-slate/40 mt-0.5">
            Filtrera aktiva projekt efter den kompetens de söker.
          </p>
        </div>

        {/* Skill filter buttons */}
        <div className="flex flex-wrap gap-2 mb-5">
          <Link
            href="/match"
            className={`text-xs rounded-full px-3 py-1 border transition-colors ${
              !skillSlug
                ? "bg-dark-slate text-white border-dark-slate"
                : "border-muted-teal/50 text-dark-slate/60 hover:border-muted-teal hover:text-dark-slate"
            }`}
          >
            Alla
          </Link>
          {allSkills.map((s) => (
            <Link
              key={s.id}
              href={`/match?skill=${s.slug}`}
              className={`text-xs rounded-full px-3 py-1 border transition-colors ${
                skillSlug === s.slug
                  ? "bg-seagrass text-white border-seagrass"
                  : "border-muted-teal/50 text-dark-slate/60 hover:border-muted-teal hover:text-dark-slate"
              }`}
            >
              {s.name}
            </Link>
          ))}
        </div>

        {exploreProjects.length === 0 ? (
          <div className="border border-dashed border-muted-teal/40 rounded-lg p-8 text-center">
            <p className="text-dark-slate/40 text-sm">Inga projekt matchar filtret.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {exploreProjects.map((p) => (
              <MatchCard
                key={p.slug}
                project={p}
                matchingSkillIds={
                  skillSlug
                    ? new Set(
                        p.neededSkills
                          .filter((ns) => ns.skill.slug === skillSlug)
                          .map((ns) => ns.skill.id)
                      )
                    : undefined
                }
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
