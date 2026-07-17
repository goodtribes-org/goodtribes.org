import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { requestToJoin } from "./actions";
import OrgInviteForm from "./invite/OrgInviteForm";
import { OrgJoinRequestsPanel } from "./OrgJoinSection";
import OrgTeamManager from "./OrgTeamManager";
import OrgVerifiedBadge from "@/components/OrgVerifiedBadge";
import FlagContentButton from "@/components/FlagContentButton";
import OrgReviewButton from "@/components/OrgReviewButton";
import ResourceLibrary from "@/components/ResourceLibrary";
import ActivityTimeline, { type EventMeta } from "@/components/ActivityTimeline";
import OrgTourGate from "@/components/OrgTourGate";
import { PROJECT_STATUS_LABEL } from "@/lib/projectStatus";
import { buildMetadata, APP_URL } from "@/lib/metadata";
import ShareButton from "@/components/ShareButton";
import LikeCommentBlock from "@/components/LikeCommentBlock";
import { getLikeCommentData } from "@/lib/socialInteractions";

const ORG_EVENT_META: EventMeta = {
  member_joined:  { icon: "👤", label: (_, a) => `${a} joined the organisation` },
  project_added:  { icon: "📁", label: (p, a) => `${a} added a project: "${p.title}"` },
};


export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const org = await prisma.organisation.findUnique({
    where: { slug },
    select: { name: true, description: true, imageUrl: true, isPublic: true },
  });
  if (!org || !org.isPublic) return {};
  return buildMetadata({
    locale,
    path: `/org/${slug}`,
    title: org.name,
    description: org.description ?? "An organisation on GoodTribes.org",
    imageUrl: org.imageUrl,
  });
}

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
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { locale, slug } = await params;
  const { tab } = await searchParams;
  const activeTab =
    tab === "projects" ? "projects" :
    tab === "resources" ? "resources" :
    tab === "activity" ? "activity" :
    "story";
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
      neededSkills: { include: { skill: { select: { id: true, name: true, slug: true } } } },
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

  const isMemberOrOwner = isOwner || isMember;

  const [pendingJoinRequests, orgProjects, reviewAgg, recentReviews, orgFiles, orgActivity] = await Promise.all([
    isOwner
      ? prisma.organisationJoinRequest.findMany({
          where: { organisationId: org.id, status: "pending" },
          include: { user: { select: { id: true, name: true, image: true } } },
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
    prisma.organisationReview.aggregate({
      where: { organisationId: org.id },
      _avg: { rating: true },
      _count: true,
    }),
    prisma.organisationReview.findMany({
      where: { organisationId: org.id },
      include: { author: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    activeTab === "resources" && isMemberOrOwner
      ? prisma.file.findMany({
          where: { organisationId: org.id },
          select: { id: true, key: true, name: true, size: true, mimeType: true, createdAt: true },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    activeTab === "activity" && isMemberOrOwner
      ? prisma.activityEvent.findMany({
          where: { organisationId: org.id },
          orderBy: { createdAt: "desc" },
          take: 50,
          include: { user: { select: { name: true } } },
        })
      : Promise.resolve([]),
  ]);

  const { likeCount, liked, comments } = await getLikeCommentData("organisation", org.id, userId ?? null);

  const ownerName = org.owner.name ?? org.owner.email;
  const ownerInitials = ownerName
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="max-w-5xl">
      <OrgTourGate organisationId={org.id} show={isOwner && !org.tourDismissedAt} />

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
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-dark-slate">{org.name}</h1>
              {org.verified && <OrgVerifiedBadge />}
            </div>
            {!org.isPublic && (
              <span className="text-xs bg-dry-sage text-dark-slate px-2 py-1 rounded">Private</span>
            )}
            {reviewAgg._count > 0 && (
              <p className="text-sm text-dark-slate/60 mt-1">
                <span className="text-amber-400">★</span>{" "}
                {reviewAgg._avg.rating?.toFixed(1)} ({reviewAgg._count} {reviewAgg._count === 1 ? "recension" : "recensioner"})
              </p>
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

          {org.neededSkills.length > 0 && (
            <div className="flex flex-wrap gap-1">
              <span className="text-[10px] font-medium text-dark-slate/40 mr-0.5 self-center">Seeking:</span>
              {org.neededSkills.map(({ skill: s }) => (
                <span
                  key={s.id}
                  className="text-[10px] bg-seagrass/15 text-seagrass border border-seagrass/30 rounded px-1.5 py-0.5 font-medium"
                >
                  {s.name}
                </span>
              ))}
            </div>
          )}

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
                data-tour="org-edit"
                className="px-3 py-1.5 rounded border border-muted-teal text-xs font-medium text-dark-slate/70 hover:text-dark-slate hover:border-dark-slate/40 transition-colors"
              >
                Edit
              </Link>
            )}
            {isMemberOrOwner && (
              <Link
                href={`/work/${slug}`}
                data-tour="org-workspace"
                className="px-3 py-1.5 rounded border border-muted-teal text-xs font-medium text-dark-slate/70 hover:text-dark-slate hover:border-dark-slate/40 transition-colors"
              >
                Workspace
              </Link>
            )}
            {userId && !isOwner && (
              <OrgReviewButton organisationId={org.id} orgName={org.name} />
            )}
            {org.isPublic && (
              <ShareButton
                url={`${APP_URL}/${locale}/org/${slug}`}
                title={org.name}
                text={org.description ?? undefined}
              />
            )}
          </div>

          {userId && !isOwner && (
            <div>
              <FlagContentButton targetType="Organisation" targetId={org.id} />
            </div>
          )}
        </div>
      </div>

      {pendingJoinRequests.length > 0 && (
        <OrgJoinRequestsPanel requests={pendingJoinRequests} slug={slug} />
      )}

      {recentReviews.length > 0 && (
        <div className="mb-10 border border-muted-teal/30 rounded-lg p-5 bg-white">
          <h2 className="text-sm font-semibold text-dark-slate mb-3">Recensioner</h2>
          <div className="flex flex-col gap-3">
            {recentReviews.map((r) => (
              <div key={r.id} className="text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 text-xs">{"★".repeat(r.rating)}<span className="text-muted-teal/40">{"★".repeat(5 - r.rating)}</span></span>
                  <span className="font-medium text-dark-slate">{r.author.name ?? "Anonym"}</span>
                </div>
                {r.comment && <p className="text-dark-slate/70 mt-0.5">{r.comment}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-10 border border-muted-teal/30 rounded-lg p-5 bg-white">
        <LikeCommentBlock
          targetType="organisation"
          targetId={org.id}
          isLoggedIn={!!userId}
          initialLikeCount={likeCount}
          initialLiked={liked}
          initialComments={comments}
        />
      </div>

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
                data-tour="org-projects-tab"
                className={`pb-3 text-sm font-medium border-b-2 whitespace-nowrap ${activeTab === "projects" ? "border-coral text-coral" : "border-transparent text-dark-slate/50 hover:text-dark-slate"}`}
              >
                Projects ({org._count.projects})
              </Link>
              {isMemberOrOwner && (
                <>
                  <Link
                    href={`/org/${slug}?tab=resources`}
                    data-tour="org-resources-tab"
                    className={`pb-3 text-sm font-medium border-b-2 whitespace-nowrap ${activeTab === "resources" ? "border-coral text-coral" : "border-transparent text-dark-slate/50 hover:text-dark-slate"}`}
                  >
                    Resources
                  </Link>
                  <Link
                    href={`/org/${slug}?tab=activity`}
                    className={`pb-3 text-sm font-medium border-b-2 whitespace-nowrap ${activeTab === "activity" ? "border-coral text-coral" : "border-transparent text-dark-slate/50 hover:text-dark-slate"}`}
                  >
                    Activity
                  </Link>
                </>
              )}
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
                        <span className="text-xs bg-dry-sage text-dark-slate/60 px-2 py-0.5 rounded flex-shrink-0">
                          {PROJECT_STATUS_LABEL[p.status] ?? p.status}
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

          {activeTab === "resources" && isMemberOrOwner && (
            <ResourceLibrary
              organisationId={org.id}
              files={orgFiles.map((f) => ({ ...f, createdAt: f.createdAt.toISOString() }))}
              canUpload={isMemberOrOwner}
            />
          )}

          {activeTab === "activity" && isMemberOrOwner && (
            <ActivityTimeline events={orgActivity} eventMeta={ORG_EVENT_META} />
          )}
        </div>

        {/* Right: team */}
        <div className="md:col-span-2 flex flex-col gap-8">
          <section>
            <h2 className="text-sm font-semibold text-dark-slate mb-3">The Team</h2>
            {org.members.length > 0 ? (
              isOwner && userId ? (
                <OrgTeamManager
                  orgId={org.id}
                  slug={slug}
                  members={org.members.map((m) => ({
                    userId: m.userId,
                    role: m.role,
                    user: { id: m.user.id, name: m.user.name, showProfile: m.user.showProfile },
                  }))}
                  currentUserId={userId}
                  ownerId={org.ownerId}
                />
              ) : (
                <div className="grid grid-cols-4 gap-3">
                  {org.members.slice(0, 12).map((m) => (
                    <MemberAvatar
                      key={m.id}
                      name={m.user.name ?? "Unknown"}
                      href={m.user.showProfile ? `/members/${m.user.id}` : undefined}
                    />
                  ))}
                </div>
              )
            ) : (
              <p className="text-xs text-dark-slate/40">No members yet.</p>
            )}
            {isOwner && (
              <div data-tour="org-invite">
                <OrgInviteForm orgId={org.id} slug={slug} />
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
