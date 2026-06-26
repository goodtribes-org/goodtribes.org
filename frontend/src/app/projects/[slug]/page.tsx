import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/auth";
import { JoinButton, JoinRequestsPanel } from "./JoinSection";
import InviteForm from "./invite/InviteForm";
import LeaveProjectButton from "@/components/LeaveProjectButton";
import TeamManager from "./TeamManager";
import MaturityWidget from "@/components/MaturityWidget";

const prisma = new PrismaClient();

const STAGES = ["Concept", "Prototype", "Production", "Delivery"];
const STATUS_TO_STAGE: Record<string, number> = {
  concept: 0, prototype: 1, production: 2, delivery: 3,
};
const SDG_INFO: Record<number, { label: string; color: string }> = {
  1:  { label: "No Poverty",              color: "#E5243B" },
  2:  { label: "Zero Hunger",             color: "#DDA63A" },
  3:  { label: "Good Health",             color: "#4C9F38" },
  4:  { label: "Quality Education",       color: "#C5192D" },
  5:  { label: "Gender Equality",         color: "#FF3A21" },
  6:  { label: "Clean Water",             color: "#26BDE2" },
  7:  { label: "Clean Energy",            color: "#FCC30B" },
  8:  { label: "Decent Work",             color: "#A21942" },
  9:  { label: "Industry & Innovation",   color: "#FD6925" },
  10: { label: "Reduced Inequalities",    color: "#DD1367" },
  11: { label: "Sustainable Cities",      color: "#FD9D24" },
  12: { label: "Responsible Consumption", color: "#BF8B2E" },
  13: { label: "Climate Action",          color: "#3F7E44" },
  14: { label: "Life Below Water",        color: "#0A97D9" },
  15: { label: "Life on Land",            color: "#56C02B" },
  16: { label: "Peace & Justice",         color: "#00689D" },
  17: { label: "Partnerships",            color: "#19486A" },
};

function MemberAvatar({ name, image, href }: { name: string; image?: string | null; href?: string }) {
  const initials = (name ?? "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
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

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
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
      ...(project.imageUrl ? { images: [{ url: project.imageUrl, alt: project.title }] } : {}),
    },
    twitter: {
      card: project.imageUrl ? "summary_large_image" : "summary",
      title: project.title,
      description: project.description ?? "A project on GoodTribes.org",
      ...(project.imageUrl ? { images: [project.imageUrl] } : {}),
    },
  };
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();

  const project = await prisma.project.findUnique({
    where: { slug },
    include: {
      owner: { select: { name: true } },
      org: { select: { name: true, slug: true } },
      members: {
        include: { user: { select: { name: true, id: true, image: true, showProfile: true } } },
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

  const stageIndex = STATUS_TO_STAGE[project.status] ?? 0;
  const totalTasks = project._count.kanbanCards + project._count.todoItems;
  const userId = session?.user?.id;
  const userMembership = project.members.find((m) => m.user.id === userId);
  const isOwnerOrAdmin = userMembership && ["owner", "admin"].includes(userMembership.role);
  const isMember = !!userMembership;

  const existingRequest = userId
    ? await prisma.projectJoinRequest.findUnique({
        where: { projectId_userId: { projectId: project.id, userId } },
      })
    : null;

  const maturity = await prisma.projectMaturity.findUnique({ where: { projectSlug: slug } });

  return (
    <div className="max-w-5xl">
      <nav className="mb-6 text-sm text-dark-slate/50">
        <Link href="/projects" className="hover:text-dark-slate transition-colors">Projects</Link>
        <span className="mx-2">/</span>
        <span className="text-dark-slate">{project.title}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-10">
        <div className="md:col-span-3">
          <div className="relative w-full aspect-video bg-dark-slate rounded overflow-hidden">
            {project.imageUrl ? (
              <Image
                src={project.imageUrl}
                alt={project.title}
                fill
                unoptimized
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 60vw"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <p className="text-2xl font-bold text-white text-center px-8 leading-snug">{project.title}</p>
              </div>
            )}
          </div>
        </div>

        <div className="md:col-span-2 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h1 className="text-2xl font-bold text-dark-slate mb-1">{project.title}</h1>
              <p className="text-sm text-dark-slate/60">
                by <span className="text-coral">{project.owner.name ?? "Unknown"}</span>
                {project.org && (
                  <> · <Link href={`/org/${project.org.slug}`} className="hover:text-seagrass transition-colors">{project.org.name}</Link></>
                )}
              </p>
            </div>
            {isOwnerOrAdmin && (
              <Link
                href={`/projects/${slug}/edit`}
                className="shrink-0 px-3 py-1.5 rounded border border-muted-teal text-xs font-medium text-dark-slate/70 hover:text-dark-slate hover:border-dark-slate/40 transition-colors"
              >
                Edit
              </Link>
            )}
          </div>

          {(project.category || (project.tags ?? []).length > 0) && (
            <div className="flex flex-wrap gap-1.5">
              {project.category && (
                <span className="text-xs bg-muted-teal/30 text-dark-slate px-2 py-0.5 rounded font-medium">
                  {project.category}
                </span>
              )}
              {(project.tags ?? []).map((tag) => (
                <span key={tag} className="text-xs border border-muted-teal text-dark-slate/60 px-2 py-0.5 rounded">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {project.sdgGoals.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {project.sdgGoals.map((n) => {
                const info = SDG_INFO[n];
                return (
                  <span
                    key={n}
                    title={`SDG ${n}: ${info?.label ?? ""}`}
                    className="text-xs font-bold px-2 py-0.5 rounded text-white cursor-default"
                    style={{ backgroundColor: info?.color ?? "#888" }}
                  >
                    {n}
                  </span>
                );
              })}
            </div>
          )}

          {totalTasks > 0 && (
            <div>
              <div className="flex justify-between text-xs text-dark-slate/60 mb-1">
                <span>Tasks</span><span>{totalTasks} total</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-seagrass" style={{ width: "100%" }} />
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 mt-1">
            {isMember ? (
              <>
                <Link
                  href={`/projects/${slug}/kanban`}
                  className="px-5 py-2 rounded bg-coral text-white text-sm font-bold uppercase tracking-wide hover:bg-watermelon transition-colors"
                >
                  Open Kanban →
                </Link>
                {!isOwnerOrAdmin && (
                  <LeaveProjectButton projectId={project.id} />
                )}
              </>
            ) : userId ? (
              <JoinButton
                projectId={project.id}
                slug={slug}
                existingStatus={existingRequest?.status ?? null}
              />
            ) : (
              <Link href="/login" className="px-5 py-2 rounded bg-coral text-white text-sm font-bold uppercase tracking-wide hover:bg-watermelon transition-colors">
                Log in to join →
              </Link>
            )}
          </div>
        </div>
      </div>

      {isOwnerOrAdmin && project.joinRequests.length > 0 && (
        <div className="mb-8">
          <JoinRequestsPanel requests={project.joinRequests} slug={slug} />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
        <div className="md:col-span-3">
          <div className="border-b border-muted-teal/40 mb-6">
            <div className="flex gap-6 overflow-x-auto">
              <button className="pb-3 text-sm font-medium border-b-2 border-coral text-coral whitespace-nowrap">Story</button>
              <Link href={`/projects/${slug}/todos`} className="pb-3 text-sm font-medium border-b-2 border-transparent text-dark-slate/50 hover:text-dark-slate whitespace-nowrap">Todo</Link>
              <Link href={`/projects/${slug}/kanban`} className="pb-3 text-sm font-medium border-b-2 border-transparent text-dark-slate/50 hover:text-dark-slate whitespace-nowrap">Kanban</Link>
              <Link href={`/projects/${slug}/milestones`} className="pb-3 text-sm font-medium border-b-2 border-transparent text-dark-slate/50 hover:text-dark-slate whitespace-nowrap">Milestones</Link>
              <Link href={`/projects/${slug}/wiki`} className="pb-3 text-sm font-medium border-b-2 border-transparent text-dark-slate/50 hover:text-dark-slate whitespace-nowrap">Wiki</Link>
              <Link href={`/projects/${slug}/updates`} className="pb-3 text-sm font-medium border-b-2 border-transparent text-dark-slate/50 hover:text-dark-slate whitespace-nowrap">Updates</Link>
              <Link href={`/projects/${slug}/chat`} className="pb-3 text-sm font-medium border-b-2 border-transparent text-dark-slate/50 hover:text-dark-slate whitespace-nowrap">Chat</Link>
              <Link href={`/projects/${slug}/funding`} className="pb-3 text-sm font-medium border-b-2 border-transparent text-dark-slate/50 hover:text-dark-slate whitespace-nowrap">Funding</Link>
              <Link href={`/projects/${slug}/activity`} className="pb-3 text-sm font-medium border-b-2 border-transparent text-dark-slate/50 hover:text-dark-slate whitespace-nowrap">Activity</Link>
              <Link href={`/projects/${slug}/forum`} className="pb-3 text-sm font-medium border-b-2 border-transparent text-dark-slate/50 hover:text-dark-slate whitespace-nowrap">Forum</Link>
              <Link href={`/projects/${slug}/polls`} className="pb-3 text-sm font-medium border-b-2 border-transparent text-dark-slate/50 hover:text-dark-slate whitespace-nowrap">Omröstningar</Link>
              <Link href={`/projects/${slug}/calendar`} className="pb-3 text-sm font-medium border-b-2 border-transparent text-dark-slate/50 hover:text-dark-slate whitespace-nowrap">Kalender</Link>
              <Link href={`/projects/${slug}/tokens`} className="pb-3 text-sm font-medium border-b-2 border-transparent text-dark-slate/50 hover:text-dark-slate whitespace-nowrap">Tokens</Link>
              <Link href={`/projects/${slug}/impact`} className="pb-3 text-sm font-medium border-b-2 border-transparent text-dark-slate/50 hover:text-dark-slate whitespace-nowrap">Impact</Link>
              <Link href={`/projects/${slug}/ai-review`} className="pb-3 text-sm font-medium border-b-2 border-transparent text-dark-slate/50 hover:text-dark-slate whitespace-nowrap">AI Granskning</Link>
              <Link href={`/projects/${slug}/alumni`} className="pb-3 text-sm font-medium border-b-2 border-transparent text-dark-slate/50 hover:text-dark-slate whitespace-nowrap">Alumni</Link>
              <Link href={`/projects/${slug}/scale`} className="pb-3 text-sm font-medium border-b-2 border-transparent text-dark-slate/50 hover:text-dark-slate whitespace-nowrap">Skalning</Link>
            </div>
          </div>

          <div className="border border-muted-teal/30 rounded p-4 mb-6">
            <p className="text-sm font-semibold text-dark-slate mb-2">{STAGES[stageIndex]}</p>
            <div className="relative flex items-center gap-0 mb-1">
              <div className="absolute left-[12px] right-[12px] top-[11px] h-0.5 bg-gray-200 z-0" />
              {STAGES.map((stage, i) => (
                <div key={stage} className="flex-1 flex flex-col items-center z-10">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${i <= stageIndex ? "bg-seagrass border-seagrass" : "bg-white border-gray-300"}`}>
                    {i <= stageIndex && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex">
              {STAGES.map((stage, i) => (
                <div key={stage} className="flex-1 text-center">
                  <span className={`text-xs ${i <= stageIndex ? "text-dark-slate font-medium" : "text-dark-slate/40"}`}>{stage}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-muted-teal/20">
              <p className="text-xs text-dark-slate/70 flex items-center gap-1">
                <span>👤</span> {project.members.length} member{project.members.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          <div className="prose prose-sm max-w-none text-dark-slate/80 leading-relaxed">
            {project.description ? <p>{project.description}</p> : <p className="text-dark-slate/40 italic">No description yet.</p>}
          </div>
        </div>

        <div className="md:col-span-2 flex flex-col gap-8">
          <MaturityWidget
            projectSlug={slug}
            initialScore={maturity?.score ?? null}
            initialScalingPlan={maturity?.scalingPlan ?? null}
            isOwnerOrAdmin={!!isOwnerOrAdmin}
          />

          {project.neededSkills.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-dark-slate mb-3">Skills needed</h2>
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

          <section>
            <h2 className="text-sm font-semibold text-dark-slate mb-3">The Team</h2>
            {project.members.length > 0 ? (
              isOwnerOrAdmin && userId ? (
                <TeamManager
                  projectId={project.id}
                  slug={slug}
                  members={project.members.map((m) => ({
                    userId: m.userId,
                    role: m.role,
                    user: { id: m.user.id, name: m.user.name, image: m.user.image, showProfile: m.user.showProfile },
                  }))}
                  currentUserId={userId}
                />
              ) : (
                <div className="grid grid-cols-4 gap-3">
                  {project.members.map((m) => (
                    <MemberAvatar
                      key={m.id}
                      name={m.user.name ?? "?"}
                      image={m.user.image}
                      href={m.user.showProfile ? `/members/${m.user.id}` : undefined}
                    />
                  ))}
                </div>
              )
            ) : (
              <p className="text-xs text-dark-slate/40">No members yet.</p>
            )}
            {isOwnerOrAdmin && (
              <div className="mt-3">
                <InviteForm projectId={project.id} slug={slug} />
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
