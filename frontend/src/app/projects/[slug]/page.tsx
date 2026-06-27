import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth";
import { JoinButton, JoinRequestsPanel } from "./JoinSection";
import InviteForm from "./invite/InviteForm";
import LeaveProjectButton from "@/components/LeaveProjectButton";
import TeamManager from "./TeamManager";
import MaturityWidget from "@/components/MaturityWidget";
import FlagProjectButton from "@/components/FlagProjectButton";
import KudosButton from "@/components/KudosButton";


const STAGES = ["Concept", "Prototype", "Production", "Delivery"];
const STATUS_TO_STAGE: Record<string, number> = {
  concept: 0, prototype: 1, production: 2, delivery: 3,
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

      {isOwnerOrAdmin && project.joinRequests.length > 0 && (
        <div className="mb-8">
          <JoinRequestsPanel requests={project.joinRequests} slug={slug} />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
        <div className="md:col-span-3">
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
                    <div key={m.id} className="flex flex-col items-center gap-1">
                      <MemberAvatar
                        name={m.user.name ?? "?"}
                        image={m.user.image}
                        href={m.user.showProfile ? `/members/${m.user.id}` : undefined}
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

      {userId && !isOwnerOrAdmin && (
        <div className="mt-10 pt-6 border-t border-muted-teal/20 flex justify-end">
          <FlagProjectButton projectId={project.id} />
        </div>
      )}
    </div>
  );
}
