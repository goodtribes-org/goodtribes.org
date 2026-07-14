export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation";
import Link from "next/link";
import { PROJECT_STATUS_LABEL as STATUS_LABELS } from "@/lib/projectStatus";

export const metadata: Metadata = {
  title: "Dashboard — GoodTribes.org",
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const [myMemberships, myOrgs, pendingProjectRequests, pendingOrgRequests, recommended] = await Promise.all([
    prisma.projectMember.findMany({
      where: { userId },
      include: {
        project: { select: { slug: true, title: true, status: true, description: true } },
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
    prisma.project.findMany({
      where: {
        visibility: "public",
        neededSkills: { some: { skill: { users: { some: { userId } } } } },
        members: { none: { userId } },
      },
      take: 4,
      select: {
        slug: true,
        title: true,
        status: true,
        description: true,
        neededSkills: {
          where: { skill: { users: { some: { userId } } } },
          include: { skill: { select: { name: true } } },
          take: 3,
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const myProjects = myMemberships.map((m) => ({ ...m.project, role: m.role }));
  const pendingCount = pendingProjectRequests.length + pendingOrgRequests.length;

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
                    <span className="text-xs text-dark-slate/50 capitalize">{STATUS_LABELS[p.status] ?? p.status}</span>
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
              { label: "Browse projects and ideas", href: "/projects", done: false },
              { label: "Join or create a project", href: "/projects/new", done: false },
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

      {/* Recommended projects */}
      {recommended.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-dark-slate/60 uppercase tracking-wide">Recommended for you</h2>
              <p className="text-xs text-dark-slate/40 mt-0.5">Projects looking for your skills</p>
            </div>
            <Link href="/projects" className="text-xs text-coral hover:underline">See all →</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {recommended.map((p) => (
              <Link
                key={p.slug}
                href={`/projects/${p.slug}`}
                className="flex flex-col gap-2 border border-muted-teal/40 rounded-lg p-4 hover:shadow-md hover:border-muted-teal transition-all bg-white"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-dark-slate text-sm leading-snug">{p.title}</p>
                  <span className="text-xs text-dark-slate/40 capitalize flex-shrink-0">{STATUS_LABELS[p.status] ?? p.status}</span>
                </div>
                {p.description && (
                  <p className="text-xs text-dark-slate/50 line-clamp-2">{p.description}</p>
                )}
                <div className="flex flex-wrap gap-1 mt-auto pt-1">
                  {p.neededSkills.map(({ skill }) => (
                    <span key={skill.name} className="text-[10px] bg-seagrass/10 text-seagrass border border-seagrass/20 rounded px-1.5 py-0.5 font-medium">
                      {skill.name}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

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
