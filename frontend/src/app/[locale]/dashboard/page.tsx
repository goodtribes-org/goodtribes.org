export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation";
import Link from "next/link";
import { PROJECT_PHASE_LABEL as PHASE_LABELS } from "@/lib/projectPhase";
import { SdgIcon } from "@/components/SdgIcon";

export const metadata: Metadata = {
  title: "Dashboard — GoodTribes.org",
};

type MatchProjectCard = {
  slug: string;
  title: string;
  description: string | null;
  category: string | null;
  phase: string;
  _count: { members: number };
  sdgGoals: number[];
  neededSkills: { skill: { id: string; name: string; slug: string } }[];
};

function MatchCard({
  project,
  matchingSkillIds,
  showSdgs,
}: {
  project: MatchProjectCard;
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

type OrgMatchCardData = {
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
  org: OrgMatchCardData;
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

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ skill?: string }>;
}) {
  const [session, { skill: skillSlug }] = await Promise.all([auth(), searchParams]);
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const [myMemberships, myOrgs, pendingProjectRequests, pendingOrgRequests, user, allSkills] =
    await Promise.all([
      prisma.projectMember.findMany({
        where: { userId },
        include: {
          project: { select: { slug: true, title: true, phase: true, description: true } },
        },
        orderBy: { joinedAt: "desc" },
      }),
      prisma.organisation.findMany({
        where: { OR: [{ ownerId: userId }, { members: { some: { userId } } }] },
        select: { id: true, name: true, slug: true, imageUrl: true, ownerId: true },
        orderBy: { name: "asc" },
      }),
      prisma.projectJoinRequest.findMany({
        where: { userId, status: "pending" },
        include: { project: { select: { slug: true, title: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.organisationJoinRequest.findMany({
        where: { userId, status: "pending" },
        include: { organisation: { select: { slug: true, name: true } } },
        orderBy: { createdAt: "asc" },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { interests: true, skills: { select: { skillId: true } } },
      }),
      prisma.skill.findMany({
        where: { projects: { some: { project: { visibility: "public", archivedAt: null } } } },
        select: { id: true, name: true, slug: true },
        orderBy: { name: "asc" },
      }),
    ]);

  const myProjects = myMemberships.map((m) => ({ ...m.project, role: m.role }));
  const pendingCount = pendingProjectRequests.length + pendingOrgRequests.length;

  const userSkillIds = (user?.skills ?? []).map((s) => s.skillId);
  const userInterests = user?.interests ?? [];
  const matchingSkillIdSet = new Set(userSkillIds);
  const hasSkills = userSkillIds.length > 0;
  const hasInterests = userInterests.length > 0;

  const matchProjectSelect = {
    slug: true,
    title: true,
    description: true,
    category: true,
    phase: true,
    sdgGoals: true,
    _count: { select: { members: true } },
    neededSkills: {
      include: { skill: { select: { id: true, name: true, slug: true } } },
    },
  } as const;

  const [skillMatches, orgMatches, interestMatches, exploreProjects] = await Promise.all([
    hasSkills
      ? prisma.project.findMany({
          where: {
            archivedAt: null,
            visibility: "public",
            neededSkills: { some: { skillId: { in: userSkillIds } } },
            members: { none: { userId } },
          },
          select: matchProjectSelect,
          orderBy: { createdAt: "desc" },
          take: 8,
        })
      : Promise.resolve([] as MatchProjectCard[]),

    hasSkills
      ? prisma.organisation.findMany({
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
      : Promise.resolve([] as OrgMatchCardData[]),

    hasInterests
      ? prisma.project.findMany({
          where: {
            archivedAt: null,
            visibility: "public",
            sdgGoals: { hasSome: userInterests },
            members: { none: { userId } },
          },
          select: matchProjectSelect,
          orderBy: { createdAt: "desc" },
          take: 8,
        })
      : Promise.resolve([] as MatchProjectCard[]),

    prisma.project.findMany({
      where: {
        archivedAt: null,
        visibility: "public",
        ...(skillSlug ? { neededSkills: { some: { skill: { slug: skillSlug } } } } : {}),
      },
      select: matchProjectSelect,
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
  ]);

  return (
    <div className="max-w-4xl space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-slate">Dashboard</h1>
          <p className="text-sm text-dark-slate/50 mt-1">
            Welcome back, {session.user.name ?? "there"}
          </p>
        </div>
        <Link
          href="/profile/setup"
          className="text-sm text-dark-slate/60 hover:text-dark-slate border border-muted-teal rounded px-3 py-1.5 transition-colors"
        >
          Edit profile
        </Link>
      </div>

      {/* Pending requests alert */}
      {pendingCount > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
          <span className="text-yellow-600 font-bold">{pendingCount}</span>
          <p className="text-sm text-yellow-800">
            pending join request{pendingCount !== 1 ? "s" : ""} — awaiting approval
          </p>
        </div>
      )}

      {/* My projects */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-dark-slate/60 uppercase tracking-wide">My projects</h2>
          <Link href="/projects/new" className="text-xs text-coral hover:underline">+ New project</Link>
        </div>
        {myProjects.length === 0 ? (
          <div className="border border-dashed border-muted-teal/40 rounded-lg p-8 text-center">
            <p className="text-dark-slate/40 text-sm mb-3">You're not on any projects yet.</p>
            <Link href="/projects" className="text-sm text-coral hover:underline">Browse projects →</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {myProjects.map((p) => (
              <Link
                key={p.slug}
                href={`/projects/${p.slug}`}
                className="flex items-start justify-between gap-3 border border-muted-teal/40 rounded-lg p-4 hover:shadow-md hover:border-muted-teal transition-all bg-white"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-dark-slate truncate">{p.title}</p>
                    {p.role === "FOUNDER" && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-coral flex-shrink-0">Owner</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-dark-slate/50 capitalize">{PHASE_LABELS[p.phase] ?? p.phase}</span>
                  </div>
                </div>
                <svg className="w-4 h-4 text-dark-slate/30 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* My organisations */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-dark-slate/60 uppercase tracking-wide">My organisations</h2>
          <Link href="/org" className="text-xs text-coral hover:underline">Browse orgs →</Link>
        </div>
        {myOrgs.length === 0 ? (
          <div className="border border-dashed border-muted-teal/40 rounded-lg p-8 text-center">
            <p className="text-dark-slate/40 text-sm mb-3">You're not in any organisations yet.</p>
            <Link href="/org" className="text-sm text-coral hover:underline">Browse organisations →</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {myOrgs.map((org) => {
              const initials = org.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
              return (
                <Link
                  key={org.id}
                  href={`/org/${org.slug}`}
                  className="flex items-center gap-3 border border-muted-teal/40 rounded-lg p-4 hover:shadow-md hover:border-muted-teal transition-all bg-white"
                >
                  <div className="w-10 h-10 rounded-md bg-dry-sage flex-shrink-0 overflow-hidden flex items-center justify-center text-sm font-semibold text-dark-slate">
                    {org.imageUrl ? (
                      <img src={org.imageUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      initials
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-dark-slate truncate">{org.name}</p>
                    {org.ownerId === userId && (
                      <p className="text-xs text-dark-slate/40">Owner</p>
                    )}
                  </div>
                  <svg className="w-4 h-4 text-dark-slate/30 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Onboarding checklist — shown until user has at least one project */}
      {myProjects.length === 0 && !session.user.onboardingDone && (
        <section className="border border-seagrass/30 bg-seagrass/5 rounded-xl p-6">
          <h2 className="font-semibold text-dark-slate mb-1">Get started</h2>
          <p className="text-sm text-dark-slate/50 mb-5">A few steps to make the most of GoodTribes.</p>
          <ol className="space-y-3">
            {[
              { label: "Create your account", done: true },
              { label: "Complete your profile", href: "/profile/setup", done: !!session.user.name },
              { label: "Browse projects and ideas", href: "/projects" },
              { label: "Join or create a project", href: "/projects/new", done: myProjects.length > 0 },
            ].map((step, i) => (
              <li key={i} className="flex items-center gap-3">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${step.done ? "bg-seagrass text-white" : "border-2 border-muted-teal/40 text-dark-slate/30"}`}>
                  {step.done ? "✓" : i + 1}
                </span>
                {step.href && !step.done ? (
                  <Link href={step.href} className="text-sm text-coral hover:underline">{step.label}</Link>
                ) : (
                  <span className={`text-sm ${step.done ? "text-dark-slate/40 line-through" : "text-dark-slate"}`}>{step.label}</span>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Hitta en match — merged from the old standalone /match page */}
      <div id="match" className="space-y-10 scroll-mt-6">
        <div>
          <h2 className="text-lg font-bold text-dark-slate">Hitta en match</h2>
          <p className="text-sm text-dark-slate/50 mt-1">
            Projekt och organisationer som matchar dina kompetenser och intressen.
          </p>
        </div>

        {/* Skill-matched projects */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-dark-slate/60 uppercase tracking-wide">
                Projekt som söker din kompetens
              </h3>
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

        {/* Organisations seeking the user's skills */}
        {hasSkills && (
          <section>
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-dark-slate/60 uppercase tracking-wide">
                Organisationer som söker din kompetens
              </h3>
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

        {/* Interest-based projects */}
        {hasInterests && (
          <section>
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-dark-slate/60 uppercase tracking-wide">
                Baserat på dina intressen
              </h3>
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

        {/* Explore by skill */}
        <section>
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-dark-slate/60 uppercase tracking-wide">
              Utforska efter kompetens
            </h3>
            <p className="text-xs text-dark-slate/40 mt-0.5">
              Filtrera aktiva projekt efter den kompetens de söker.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 mb-5">
            <Link
              href="/dashboard#match"
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
                href={`/dashboard?skill=${s.slug}#match`}
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

      {/* Pending join requests */}
      {(pendingProjectRequests.length > 0 || pendingOrgRequests.length > 0) && (
        <section>
          <h2 className="text-sm font-semibold text-dark-slate/60 uppercase tracking-wide mb-4">Pending requests</h2>
          <div className="flex flex-col gap-2">
            {pendingProjectRequests.map((r) => (
              <div key={r.id} className="flex items-center justify-between border border-muted-teal/40 rounded-lg px-4 py-3 bg-white">
                <div>
                  <p className="text-sm text-dark-slate">
                    Join request for{" "}
                    <Link href={`/projects/${r.project.slug}`} className="font-medium text-coral hover:underline">
                      {r.project.title}
                    </Link>
                  </p>
                  <p className="text-xs text-dark-slate/40 mt-0.5">Awaiting approval</p>
                </div>
                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">Pending</span>
              </div>
            ))}
            {pendingOrgRequests.map((r) => (
              <div key={r.id} className="flex items-center justify-between border border-muted-teal/40 rounded-lg px-4 py-3 bg-white">
                <div>
                  <p className="text-sm text-dark-slate">
                    Join request for{" "}
                    <Link href={`/org/${r.organisation.slug}`} className="font-medium text-coral hover:underline">
                      {r.organisation.name}
                    </Link>
                  </p>
                  <p className="text-xs text-dark-slate/40 mt-0.5">Awaiting approval</p>
                </div>
                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">Pending</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
