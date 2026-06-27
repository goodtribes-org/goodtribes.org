import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { JoinButton, JoinRequestsPanel } from "./JoinSection";
import InviteForm from "./invite/InviteForm";
import TeamManager from "./TeamManager";
import MaturityWidget from "@/components/MaturityWidget";
import FlagProjectButton from "@/components/FlagProjectButton";
import KudosButton from "@/components/KudosButton";

function MemberAvatar({
  name,
  image,
  href,
}: {
  name: string;
  image?: string | null;
  href?: string;
}) {
  const initials = (name ?? "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const inner = (
    <div className="flex flex-col items-center gap-1">
      <div className="w-12 h-12 rounded-full bg-dry-sage flex items-center justify-center text-sm font-semibold text-dark-slate overflow-hidden relative">
        {image ? (
          <Image src={image} alt={name} fill className="object-cover" unoptimized />
        ) : (
          initials
        )}
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

function activityLabel(type: string, userName: string): string {
  switch (type) {
    case "member_joined":    return `${userName} gick med i projektet`;
    case "task_completed":   return `${userName} avklarade en uppgift`;
    case "todo_completed":   return `${userName} kryssade av en to-do`;
    case "milestone_reached":return "Milstolpe nådd";
    case "update_posted":    return `${userName} postade en uppdatering`;
    case "kanban_moved":     return `${userName} uppdaterade en uppgift`;
    default:                 return `${userName}: ${type.replace(/_/g, " ")}`;
  }
}

function activityIcon(type: string): string {
  switch (type) {
    case "member_joined":    return "👤";
    case "task_completed":   return "✅";
    case "todo_completed":   return "☑️";
    case "milestone_reached":return "🎯";
    case "update_posted":    return "📝";
    case "kanban_moved":     return "📋";
    default:                 return "📌";
  }
}

function relativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "Just nu";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min sedan`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} tim sedan`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} dag${days !== 1 ? "ar" : ""} sedan`;
  return date.toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await prisma.project.findUnique({ where: { slug } });
  if (!project) return {};
  return {
    title: project.title,
    description: project.description ?? undefined,
    openGraph: {
      title: `${project.title} — GoodTribes.org`,
      description: project.description ?? "A project on GoodTribes.org",
      url: `/projects/${slug}`,
      ...(project.imageUrl
        ? { images: [{ url: project.imageUrl, alt: project.title }] }
        : {}),
    },
    twitter: {
      card: project.imageUrl ? "summary_large_image" : "summary",
      title: project.title,
      description: project.description ?? "A project on GoodTribes.org",
      ...(project.imageUrl ? { images: [project.imageUrl] } : {}),
    },
  };
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();

  const project = await prisma.project.findUnique({
    where: { slug },
    include: {
      owner: { select: { name: true } },
      org: { select: { name: true, slug: true } },
      members: {
        include: {
          user: { select: { name: true, id: true, image: true, showProfile: true } },
        },
        orderBy: { joinedAt: "asc" },
      },
      joinRequests: {
        where: { status: "pending" },
        include: { user: { select: { id: true, name: true, image: true } } },
      },
      neededSkills: {
        include: { skill: { select: { id: true, name: true, slug: true } } },
        orderBy: { addedAt: "asc" },
      },
      _count: { select: { kanbanCards: true, todoItems: true } },
    },
  });
  if (!project) notFound();

  const userId = session?.user?.id;
  const userMembership = project.members.find((m) => m.user.id === userId);
  const isOwnerOrAdmin =
    userMembership && ["owner", "admin"].includes(userMembership.role);
  const isMember = !!userMembership;

  const [maturity, recentActivity, latestUpdate, fundingCampaign, userJoinRequest] =
    await Promise.all([
      prisma.projectMaturity.findUnique({ where: { projectSlug: slug } }),
      prisma.activityEvent.findMany({
        where: { project: { slug } },
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { user: { select: { name: true } } },
      }),
      prisma.blogPost.findFirst({
        where: { projectSlug: slug },
        orderBy: { createdAt: "desc" },
        select: { title: true, body: true, createdAt: true },
      }),
      prisma.fundingCampaign.findUnique({
        where: { projectId: project.id },
        include: { pledges: { select: { amount: true } } },
      }),
      userId && !isMember
        ? prisma.projectJoinRequest.findFirst({
            where: { project: { slug }, userId },
            select: { status: true },
          })
        : Promise.resolve(null),
    ]);

  const raised =
    fundingCampaign?.pledges.reduce((s, p) => s + p.amount, 0) ?? 0;
  const fundingPct = fundingCampaign
    ? Math.min(100, Math.round((raised / fundingCampaign.goal) * 100))
    : 0;
  const daysLeft = fundingCampaign?.deadline
    ? Math.max(
        0,
        Math.ceil(
          (new Date(fundingCampaign.deadline).getTime() - Date.now()) / 86400000
        )
      )
    : null;

  return (
    <div className="max-w-5xl">
      {isOwnerOrAdmin && project.joinRequests.length > 0 && (
        <div className="mb-8">
          <JoinRequestsPanel requests={project.joinRequests} slug={slug} />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
        {/* Left: pitch + activity + latest update */}
        <div className="md:col-span-3 space-y-8">
          {/* Description */}
          <div className="prose prose-sm max-w-none text-dark-slate/80 leading-relaxed">
            {project.description ? (
              <p>{project.description}</p>
            ) : (
              <p className="text-dark-slate/40 italic">Ingen beskrivning ännu.</p>
            )}
          </div>

          {/* Quick stats */}
          {(project._count.kanbanCards > 0 || project._count.todoItems > 0) && (
            <div className="flex gap-4 text-sm text-dark-slate/60">
              {project._count.kanbanCards > 0 && (
                <Link
                  href={`/projects/${slug}/kanban`}
                  className="hover:text-dark-slate transition-colors"
                >
                  📋 {project._count.kanbanCards} uppgifter
                </Link>
              )}
              {project._count.todoItems > 0 && (
                <Link
                  href={`/projects/${slug}/todos`}
                  className="hover:text-dark-slate transition-colors"
                >
                  ☑️ {project._count.todoItems} to-dos
                </Link>
              )}
            </div>
          )}

          {/* Activity feed */}
          <section>
            <h2 className="text-sm font-semibold text-dark-slate mb-3">Senaste aktivitet</h2>
            {recentActivity.length > 0 ? (
              <ul className="space-y-2.5">
                {recentActivity.map((event) => (
                  <li key={event.id} className="flex items-start gap-3 text-sm">
                    <span className="text-base leading-none mt-0.5 shrink-0">
                      {activityIcon(event.type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-dark-slate/80">
                        {activityLabel(event.type, event.user.name ?? "Någon")}
                      </span>
                      <span className="ml-2 text-xs text-dark-slate/40">
                        {relativeTime(event.createdAt)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-dark-slate/40 italic">Ingen aktivitet ännu.</p>
            )}
          </section>

          {/* Latest update */}
          {latestUpdate && (
            <section>
              <h2 className="text-sm font-semibold text-dark-slate mb-3">Senaste uppdatering</h2>
              <div className="border border-muted-teal/30 rounded-xl p-4">
                <p className="font-semibold text-dark-slate text-sm mb-1">{latestUpdate.title}</p>
                <p className="text-sm text-dark-slate/60 line-clamp-3">{latestUpdate.body}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-dark-slate/40">
                    {relativeTime(latestUpdate.createdAt)}
                  </span>
                  <Link
                    href={`/projects/${slug}/updates`}
                    className="text-xs text-seagrass hover:text-seagrass/80 font-medium"
                  >
                    Alla uppdateringar →
                  </Link>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Right: funding + join + skills + team + maturity */}
        <div className="md:col-span-2 flex flex-col gap-6">
          {/* Funding widget */}
          {fundingCampaign && (
            <section className="border border-muted-teal/30 rounded-xl p-4">
              <h2 className="text-sm font-semibold text-dark-slate mb-3">Finansiering</h2>
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-xl font-bold text-dark-slate">
                    {raised.toLocaleString("sv-SE")}
                  </span>
                  <span className="text-xs text-dark-slate/50">
                    av {fundingCampaign.goal.toLocaleString("sv-SE")} {fundingCampaign.currency}
                  </span>
                </div>
                <div className="w-full h-2.5 bg-muted-teal/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-coral rounded-full transition-all"
                    style={{ width: `${fundingPct}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-dark-slate/50">
                  <span className="font-semibold text-dark-slate">{fundingPct}%</span>
                  {daysLeft !== null && <span>{daysLeft} dagar kvar</span>}
                </div>
              </div>
              <Link
                href={`/projects/${slug}/funding`}
                className="mt-4 block w-full text-center px-4 py-2.5 bg-coral text-white rounded-xl font-semibold text-sm hover:bg-coral/90 transition-colors"
              >
                Stöd projektet
              </Link>
            </section>
          )}

          {/* Join CTA */}
          {!isMember && userId && (
            <div className="border border-seagrass/40 rounded-xl p-4 bg-seagrass/5">
              <h2 className="text-sm font-semibold text-dark-slate mb-1">Vill du bidra?</h2>
              <p className="text-xs text-dark-slate/60 mb-3">Ansök om att gå med i projektet.</p>
              <JoinButton
                projectId={project.id}
                slug={slug}
                existingStatus={userJoinRequest?.status ?? null}
              />
            </div>
          )}
          {!isMember && !userId && (
            <div className="border border-muted-teal/30 rounded-xl p-4 text-center">
              <p className="text-sm text-dark-slate/60 mb-3">Logga in för att gå med i projektet</p>
              <Link
                href="/auth/signin"
                className="text-sm text-coral font-medium hover:underline"
              >
                Logga in →
              </Link>
            </div>
          )}

          {/* Skills needed */}
          {project.neededSkills.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-dark-slate mb-3">Söker kompetenser</h2>
              <div className="flex flex-wrap gap-2">
                {project.neededSkills.map(({ skill }) => (
                  <Link
                    key={skill.id}
                    href={`/skill/${skill.slug}`}
                    className="text-xs bg-dry-sage text-dark-slate px-3 py-1 rounded-full hover:bg-muted-teal/30 transition-colors"
                  >
                    {skill.name}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* The Team */}
          <section>
            <h2 className="text-sm font-semibold text-dark-slate mb-3">Teamet</h2>
            {project.members.length > 0 ? (
              isOwnerOrAdmin && userId ? (
                <TeamManager
                  projectId={project.id}
                  slug={slug}
                  members={project.members.map((m) => ({
                    userId: m.userId,
                    role: m.role,
                    user: {
                      id: m.user.id,
                      name: m.user.name,
                      image: m.user.image,
                      showProfile: m.user.showProfile,
                    },
                  }))}
                  currentUserId={userId}
                />
              ) : (
                <div className="grid grid-cols-4 gap-3">
                  {project.members.map((m) => (
                    <div key={m.id} className="flex flex-col items-center gap-1">
                      <MemberAvatar
                        name={m.user.name ?? "?"}
                        image={m.user.image}
                        href={
                          m.user.showProfile ? `/members/${m.user.id}` : undefined
                        }
                      />
                      {userId && m.user.id !== userId && (
                        <KudosButton
                          toUserId={m.user.id}
                          toUserName={m.user.name ?? ""}
                          projectId={project.id}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )
            ) : (
              <p className="text-xs text-dark-slate/40">Inga medlemmar ännu.</p>
            )}
            {isOwnerOrAdmin && (
              <div className="mt-3">
                <InviteForm projectId={project.id} slug={slug} />
              </div>
            )}
          </section>

          {/* Maturity */}
          <MaturityWidget
            projectSlug={slug}
            initialScore={maturity?.score ?? null}
            initialScalingPlan={maturity?.scalingPlan ?? null}
            isOwnerOrAdmin={!!isOwnerOrAdmin}
          />
        </div>
      </div>

      {userId && !isOwnerOrAdmin && (
        <div className="mt-10 pt-6 border-t border-muted-teal/20 flex justify-end">
          <FlagProjectButton projectId={project.id} />
        </div>
      )}
    </div>
  );
}
