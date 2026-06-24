import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/auth";
import { JoinButton, JoinRequestsPanel } from "./JoinSection";

const prisma = new PrismaClient();

const STAGES = ["Concept", "Prototype", "Production", "Delivery"];
const STATUS_TO_STAGE: Record<string, number> = {
  concept: 0, prototype: 1, production: 2, delivery: 3,
};
const SDG_LABELS: Record<number, string> = {
  1: "No Poverty", 2: "Zero Hunger", 3: "Good Health", 4: "Quality Education",
  5: "Gender Equality", 6: "Clean Water", 7: "Clean Energy", 8: "Decent Work",
  9: "Industry & Innovation", 10: "Reduced Inequalities", 11: "Sustainable Cities",
  12: "Responsible Consumption", 13: "Climate Action", 14: "Life Below Water",
  15: "Life on Land", 16: "Peace & Justice", 17: "Partnerships",
};

function MemberAvatar({ name }: { name: string }) {
  const initials = (name ?? "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="w-12 h-12 rounded-full bg-dry-sage flex items-center justify-center text-sm font-semibold text-dark-slate">
        {initials}
      </div>
      <span className="text-xs text-dark-slate/60 text-center leading-tight">
        {(name ?? "?").split(" ")[0]}
      </span>
    </div>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const project = await prisma.project.findUnique({ where: { slug } });
  if (!project) return {};
  return { title: `${project.title} — GoodTribes.org`, description: project.description ?? undefined };
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();

  const project = await prisma.project.findUnique({
    where: { slug },
    include: {
      owner: { select: { name: true } },
      members: {
        include: { user: { select: { name: true, id: true } } },
        orderBy: { joinedAt: "asc" },
      },
      joinRequests: {
        where: { status: "pending" },
        include: { user: { select: { id: true, name: true, image: true } } },
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

  return (
    <div className="max-w-5xl">
      <nav className="mb-6 text-sm text-dark-slate/50">
        <Link href="/projects" className="hover:text-dark-slate transition-colors">Projects</Link>
        <span className="mx-2">/</span>
        <span className="text-dark-slate">{project.title}</span>
      </nav>

      <div className="grid grid-cols-5 gap-8 mb-10">
        <div className="col-span-3">
          <div className="w-full aspect-video bg-dark-slate rounded overflow-hidden flex items-center justify-center">
            <p className="text-2xl font-bold text-white text-center px-8 leading-snug">{project.title}</p>
          </div>
        </div>

        <div className="col-span-2 flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-bold text-dark-slate mb-1">{project.title}</h1>
            <p className="text-sm text-dark-slate/60">
              by <span className="text-coral">{project.owner.name ?? "Unknown"}</span>
            </p>
          </div>

          {project.sdgGoals.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {project.sdgGoals.map((n) => (
                <span key={n} className="text-xs bg-dry-sage text-dark-slate px-2 py-0.5 rounded" title={SDG_LABELS[n]}>
                  SDG {n}
                </span>
              ))}
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
              <Link
                href={`/projects/${slug}/kanban`}
                className="px-5 py-2 rounded bg-coral text-white text-sm font-bold uppercase tracking-wide hover:bg-watermelon transition-colors"
              >
                Open Kanban →
              </Link>
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

      <div className="grid grid-cols-5 gap-8">
        <div className="col-span-3">
          <div className="border-b border-muted-teal/40 mb-6">
            <div className="flex gap-6">
              <button className="pb-3 text-sm font-medium border-b-2 border-coral text-coral whitespace-nowrap">Story</button>
              <Link href={`/projects/${slug}/todos`} className="pb-3 text-sm font-medium border-b-2 border-transparent text-dark-slate/50 hover:text-dark-slate whitespace-nowrap">Todo</Link>
              <Link href={`/projects/${slug}/kanban`} className="pb-3 text-sm font-medium border-b-2 border-transparent text-dark-slate/50 hover:text-dark-slate whitespace-nowrap">Kanban</Link>
              <Link href={`/projects/${slug}/updates`} className="pb-3 text-sm font-medium border-b-2 border-transparent text-dark-slate/50 hover:text-dark-slate whitespace-nowrap">Updates</Link>
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

        <div className="col-span-2 flex flex-col gap-8">
          <section>
            <h2 className="text-sm font-semibold text-dark-slate mb-3">The Team</h2>
            {project.members.length > 0 ? (
              <div className="grid grid-cols-4 gap-3">
                {project.members.map((m) => <MemberAvatar key={m.id} name={m.user.name ?? "?"} />)}
              </div>
            ) : (
              <p className="text-xs text-dark-slate/40">No members yet.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
