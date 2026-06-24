import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { notFound } from "next/navigation";
import Link from "next/link";
import { requestToJoin } from "./actions";
import OrgInviteForm from "./invite/OrgInviteForm";
import { OrgJoinRequestsPanel } from "./OrgJoinSection";

const prisma = new PrismaClient();

function MemberAvatar({ name, href }: { name: string; href?: string }) {
  const initials = (name ?? "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const inner = (
    <div className="flex flex-col items-center gap-1">
      <div className="w-12 h-12 rounded-full bg-dry-sage flex items-center justify-center text-sm font-semibold text-dark-slate">
        {initials}
      </div>
      <span className="text-xs text-dark-slate/60 text-center leading-tight">
        {(name ?? "?").split(" ")[0]}
      </span>
    </div>
  );
  if (href) {
    return (
      <Link href={href} className="hover:opacity-75 transition-opacity" title={name}>
        {inner}
      </Link>
    );
  }
  return inner;
}

export default async function OrgDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { slug } = await params;
  const { tab } = await searchParams;
  const activeTab = tab === "projects" ? "projects" : "story";
  const session = await auth();
  const userId = session?.user?.id;

  const org = await prisma.organisation.findUnique({
    where: { slug },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      members: {
        include: { user: { select: { id: true, name: true, showProfile: true } } },
        orderBy: { joinedAt: "asc" },
      },
      _count: { select: { projects: true } },
    },
  });

  if (!org) notFound();
  if (!org.isPublic && org.ownerId !== userId) notFound();

  const isOwner = org.ownerId === userId;
  const isMember = org.members.some((m) => m.userId === userId);

  const joinRequest =
    userId && !isOwner && !isMember
      ? await prisma.organisationJoinRequest.findUnique({
          where: { organisationId_userId: { organisationId: org.id, userId } },
        })
      : null;

  const [pendingJoinRequests, orgProjects] = await Promise.all([
    isOwner
      ? prisma.organisationJoinRequest.findMany({
          where: { organisationId: org.id, status: "pending" },
          include: { user: { select: { name: true, image: true } } },
          orderBy: { createdAt: "asc" },
        })
      : Promise.resolve([]),
    activeTab === "projects"
      ? prisma.project.findMany({
          where: { orgId: org.id, visibility: "public" },
          select: { slug: true, title: true, status: true, description: true, _count: { select: { members: true } } },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

  const ownerName = org.owner.name ?? org.owner.email;
  const ownerInitials = ownerName
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="max-w-5xl">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-dark-slate/50">
        <Link href="/org" className="hover:text-dark-slate transition-colors">Organisations</Link>
        <span className="mx-2">/</span>
        <span className="text-dark-slate">{org.name}</span>
      </nav>

      {/* TOP SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-10">
        {/* Left: banner */}
        <div className="md:col-span-3">
          <div className="relative w-full aspect-video bg-dark-slate rounded overflow-hidden">
            {org.imageUrl ? (
              <img src={org.imageUrl} alt={org.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-dark-slate/80 to-dark-slate text-white text-center px-8">
                <p className="text-2xl font-bold leading-snug">{org.name}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: info */}
        <div className="md:col-span-2 flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-bold text-dark-slate mb-1">{org.name}</h1>
            {!org.isPublic && (
              <span className="text-xs bg-dry-sage text-dark-slate px-2 py-1 rounded">Private</span>
            )}
          </div>

          {/* Owner */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-dry-sage flex-shrink-0 flex items-center justify-center text-sm font-semibold text-dark-slate">
              {ownerInitials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-dark-slate">{ownerName}</p>
              <p className="text-xs text-dark-slate/50">Owner</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="border border-muted-teal/30 rounded p-3 text-center">
              <p className="text-xl font-bold text-dark-slate">{org.members.length}</p>
              <p className="text-xs text-dark-slate/50 mt-0.5">Members</p>
            </div>
            <div className="border border-muted-teal/30 rounded p-3 text-center">
              <p className="text-xl font-bold text-dark-slate">{org._count.projects}</p>
              <p className="text-xs text-dark-slate/50 mt-0.5">Projects</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-3 mt-1">
            {userId && !isOwner && !isMember && (
              <form action={requestToJoin}>
                <input type="hidden" name="orgId" value={org.id} />
                <button
                  type="submit"
                  disabled={!!joinRequest}
                  className="px-5 py-2 rounded bg-coral text-white text-sm font-bold uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed hover:bg-watermelon transition-colors"
                >
                  {joinRequest ? "Request sent" : "Request to join"}
                </button>
              </form>
            )}
            {!userId && (
              <Link
                href="/login"
                className="px-5 py-2 rounded bg-coral text-white text-sm font-bold uppercase tracking-wide hover:bg-watermelon transition-colors"
              >
                Log in to join
              </Link>
            )}
            {isOwner && (
              <Link
                href={`/org/${slug}/edit`}
                className="px-3 py-1.5 rounded border border-muted-teal text-xs font-medium text-dark-slate/70 hover:text-dark-slate hover:border-dark-slate/40 transition-colors"
              >
                Edit
              </Link>
            )}
          </div>
        </div>
      </div>

      {pendingJoinRequests.length > 0 && (
        <OrgJoinRequestsPanel requests={pendingJoinRequests} slug={slug} />
      )}

      {/* BOTTOM SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
        {/* Left: story / projects tabs */}
        <div className="md:col-span-3">
          <div className="border-b border-muted-teal/40 mb-6">
            <div className="flex gap-6">
              <Link
                href={`/org/${slug}`}
                className={`pb-3 text-sm font-medium border-b-2 whitespace-nowrap ${activeTab === "story" ? "border-coral text-coral" : "border-transparent text-dark-slate/50 hover:text-dark-slate"}`}
              >
                Story
              </Link>
              <Link
                href={`/org/${slug}?tab=projects`}
                className={`pb-3 text-sm font-medium border-b-2 whitespace-nowrap ${activeTab === "projects" ? "border-coral text-coral" : "border-transparent text-dark-slate/50 hover:text-dark-slate"}`}
              >
                Projects ({org._count.projects})
              </Link>
            </div>
          </div>

          {activeTab === "story" && (
            org.description ? (
              <div className="prose prose-sm max-w-none text-dark-slate/80 leading-relaxed space-y-4">
                {org.description.split("\n\n").map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            ) : (
              <p className="text-dark-slate/40 italic text-sm">
                No description yet.
                {isOwner && (
                  <>
                    {" "}
                    <Link href={`/org/${slug}/edit`} className="text-coral hover:underline not-italic">
                      Add one →
                    </Link>
                  </>
                )}
              </p>
            )
          )}

          {activeTab === "projects" && (
            orgProjects.length > 0 ? (
              <div className="flex flex-col gap-3">
                {orgProjects.map((p) => (
                  <Link
                    key={p.slug}
                    href={`/projects/${p.slug}`}
                    className="flex items-start justify-between gap-3 border border-muted-teal/40 rounded-lg p-4 hover:shadow-md hover:border-muted-teal transition-all bg-white"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-dark-slate truncate">{p.title}</p>
                        <span className="text-xs bg-dry-sage text-dark-slate/60 px-2 py-0.5 rounded capitalize flex-shrink-0">
                          {p.status}
                        </span>
                      </div>
                      {p.description && (
                        <p className="text-sm text-dark-slate/60 line-clamp-2">{p.description}</p>
                      )}
                      <p className="text-xs text-dark-slate/40 mt-1">{p._count.members} member{p._count.members !== 1 ? "s" : ""}</p>
                    </div>
                    <svg className="w-4 h-4 text-dark-slate/30 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-dark-slate/40 italic text-sm">No public projects yet.</p>
            )
          )}
        </div>

        {/* Right: team */}
        <div className="md:col-span-2 flex flex-col gap-8">
          <section>
            <h2 className="text-sm font-semibold text-dark-slate mb-3">The Team</h2>
            {org.members.length > 0 ? (
              <div className="grid grid-cols-4 gap-3">
                {org.members.slice(0, 12).map((m) => (
                  <MemberAvatar
                    key={m.id}
                    name={m.user.name ?? "Unknown"}
                    href={m.user.showProfile ? `/members/${m.user.id}` : undefined}
                  />
                ))}
              </div>
            ) : (
              <p className="text-xs text-dark-slate/40">No members yet.</p>
            )}
            {isOwner && <OrgInviteForm orgId={org.id} slug={slug} />}
          </section>
        </div>
      </div>
    </div>
  );
}
