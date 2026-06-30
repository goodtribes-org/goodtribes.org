import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import ProjectTabNav from "./ProjectTabNav";
import { SdgIcon } from "@/components/SdgIcon";
import Tooltip from "@/components/Tooltip";
import { SDG_LABELS_SV, SDG_UN_URLS } from "@/lib/sdg";

const STAGES = ["Concept", "Prototype", "Production", "Delivery"];
const STATUS_TO_STAGE: Record<string, number> = {
  concept: 0, prototype: 1, production: 2, delivery: 3,
};

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [session, project] = await Promise.all([
    auth(),
    prisma.project.findUnique({
      where: { slug },
      select: {
        id: true,
        ownerId: true,
        imageUrl: true,
        title: true,
        status: true,
        category: true,
        tags: true,
        sdgGoals: true,
        org: { select: { name: true, slug: true } },
        owner: { select: { name: true, image: true } },
        members: {
          select: { userId: true, user: { select: { name: true, image: true, showProfile: true } } },
          orderBy: { joinedAt: "asc" },
          take: 12,
        },
        _count: { select: { members: true } },
      },
    }),
  ]);
  if (!project) notFound();

  const stageIndex = STATUS_TO_STAGE[project.status] ?? 0;

  const [fundingCampaign, isOwnerRecord, isMemberRecord, totalTasks, doneTasks] = await Promise.all([
    prisma.fundingCampaign.findUnique({
      where: { projectId: project.id },
      include: { pledges: { select: { amount: true } } },
    }),
    session?.user?.id
      ? prisma.projectMember.findFirst({
          where: { project: { slug }, userId: session.user.id, role: { in: ["owner", "admin"] } },
        })
      : Promise.resolve(null),
    session?.user?.id
      ? prisma.projectMember.findFirst({
          where: { project: { slug }, userId: session.user.id },
        })
      : Promise.resolve(null),
    prisma.kanbanCard.count({ where: { projectSlug: slug } }),
    prisma.kanbanCard.count({ where: { projectSlug: slug, column: "DONE" } }),
  ]);

  const isOwner = !!isOwnerRecord;
  const isMember = !!isMemberRecord;
  const raised = fundingCampaign?.pledges.reduce((s, p) => s + p.amount, 0) ?? 0;
  const fundingPct = fundingCampaign
    ? Math.min(100, Math.round((raised / fundingCampaign.goal) * 100))
    : 0;
  const daysLeft = fundingCampaign?.deadline
    ? Math.max(0, Math.ceil((new Date(fundingCampaign.deadline).getTime() - Date.now()) / 86400000))
    : null;
  const taskPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  // Sort members so owner appears first
  const sortedMembers = [...project.members].sort((a, b) =>
    a.userId === project.ownerId ? -1 : b.userId === project.ownerId ? 1 : 0
  );

  return (
    <>
      {/* Full-bleed hero: blurred background + title + two photo cards */}
      <div
        className="relative -mt-8"
        style={{ marginLeft: "calc(50% - 50vw)", width: "100vw" }}
      >
        {/* Background — fixed 490 px, clipped */}
        <div className="absolute top-0 left-0 right-0 overflow-hidden" style={{ height: "490px" }}>
          {project.imageUrl ? (
            <>
              <Image
                src={project.imageUrl}
                alt=""
                fill
                unoptimized
                className="object-cover"
                sizes="100vw"
              />
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-dark-slate to-dark-slate/70" />
          )}
        </div>

        {/* Content layer — title above, cards below (may overflow bg) */}
        <div className="relative z-10">
          {/* Project title */}
          <div className="flex justify-center pt-5 pb-3 px-6">
            <h1
              className="text-5xl md:text-6xl font-bold text-center leading-tight"
              style={{
                color: "white",
                textShadow:
                  "-1px -1px 0 #999, 1px -1px 0 #999, -1px 1px 0 #999, 1px 1px 0 #999, 2px 4px 12px rgba(0,0,0,0.35)",
              }}
            >
              {project.title}
            </h1>
          </div>

          {/* Two cards */}
          <div className="flex justify-center px-4 pb-10">
            <div className="flex flex-col md:flex-row gap-5 items-stretch">

              {/* Card 1: project image — 820 × 460 */}
              <div
                className="shrink-0 bg-white overflow-hidden"
                style={{
                  width: "820px",
                  height: "460px",
                  border: "24px solid white",
                  boxShadow: "0 8px 40px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.3)",
                }}
              >
                {project.imageUrl ? (
                  <div className="relative w-full h-full">
                    <Image
                      src={project.imageUrl}
                      alt={project.title}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-dry-sage/20">
                    <span className="text-6xl font-bold text-dark-slate/20">
                      {project.title[0]}
                    </span>
                  </div>
                )}
              </div>

              {/* Card 2: team + SDG + join */}
              <div
                className="shrink-0 bg-white rounded-2xl p-5 flex flex-col"
                style={{
                  width: "320px",
                  minHeight: "460px",
                  boxShadow: "0 8px 40px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.3)",
                }}
              >
                {/* Join button */}
                {!isMember && (
                  <div className="mb-4 flex justify-center">
                    <Link
                      href={`/projects/${slug}`}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-seagrass text-white rounded-xl font-semibold text-sm hover:bg-seagrass/90 transition-colors"
                    >
                      Support GoodTribes
                    </Link>
                  </div>
                )}

                {/* Funding bar */}
                {fundingCampaign && (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-dark-slate/40 mb-1.5 uppercase tracking-wide">Finansiering</p>
                    <div className="w-full h-2 bg-muted-teal/20 rounded-full overflow-hidden mb-1">
                      <div className="h-full bg-coral rounded-full transition-all" style={{ width: `${fundingPct}%` }} />
                    </div>
                    <p className="text-xs text-dark-slate/50 text-right">
                      {raised.toLocaleString("sv-SE")} av {fundingCampaign.goal.toLocaleString("sv-SE")} {fundingCampaign.currency}
                      {" · "}{fundingPct}%
                      {daysLeft !== null && ` · ${daysLeft} dagar kvar`}
                    </p>
                  </div>
                )}

                {/* Tasks bar */}
                {totalTasks > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-dark-slate/40 mb-1.5 uppercase tracking-wide">Uppgifter</p>
                    <div className="w-full h-2 bg-muted-teal/20 rounded-full overflow-hidden mb-1">
                      <div className="h-full bg-seagrass rounded-full transition-all" style={{ width: `${taskPct}%` }} />
                    </div>
                    <p className="text-xs text-dark-slate/50 text-right">
                      {doneTasks} av {totalTasks} klara · {taskPct}%
                    </p>
                  </div>
                )}

                {/* Team member avatars */}
                {project.members.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-dark-slate/40 mb-2 uppercase tracking-wide">
                      Teamet · {project._count.members} {project._count.members === 1 ? "medlem" : "medlemmar"}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {sortedMembers.map((m, i) => {
                        const isProjectOwner = m.userId === project.ownerId;
                        const initials = (m.user.name ?? "?").charAt(0).toUpperCase();
                        const avatarClass = `w-10 h-10 rounded-full overflow-hidden bg-dry-sage relative flex items-center justify-center text-sm font-semibold text-dark-slate shrink-0 ring-2 transition-all duration-200 ease-in-out hover:scale-[1.6] hover:shadow-lg cursor-pointer ${isProjectOwner ? "ring-seagrass" : "ring-white"}`;
                        const avatarContent = m.user.image ? (
                          <Image src={m.user.image} alt={m.user.name ?? ""} fill className="object-cover" unoptimized />
                        ) : initials;
                        return (
                          <Tooltip key={i} lines={[m.user.name ?? "?", ...(isProjectOwner ? ["Founder"] : [])]}>
                            {m.user.showProfile ? (
                              <Link href={`/members/${m.userId}`} className={avatarClass}>
                                {avatarContent}
                              </Link>
                            ) : (
                              <div className={avatarClass}>{avatarContent}</div>
                            )}
                          </Tooltip>
                        );
                      })}
                      {project._count.members > 12 && (
                        <div className="w-10 h-10 rounded-full ring-2 ring-white bg-muted-teal/20 flex items-center justify-center text-xs font-semibold text-dark-slate/60">
                          +{project._count.members - 12}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Spacer */}
                <div className="flex-1" />

                {/* SDG badges */}
                {(project.sdgGoals.length > 0) && (
                  <div className="mt-2">
                    <p className="text-[10px] font-semibold text-dark-slate/40 uppercase tracking-wider mb-1.5">Agenda 2030:</p>
                    <div className="grid grid-cols-7 gap-0.5">
                      {[...project.sdgGoals, 18].map((n) => (
                        <Tooltip key={n} lines={[`SDG ${n}`, SDG_LABELS_SV[n] ?? ""]}>
                          <a
                            href={SDG_UN_URLS[n] ?? "https://www.un.org/sustainabledevelopment/sustainable-development-goals/"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="transition-all duration-200 ease-in-out hover:scale-[1.6] hover:shadow-lg block cursor-pointer"
                          >
                            <SdgIcon n={n} size={38} />
                          </a>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Tab nav — full-bleed border line */}
      <div
        className="mb-6 border-b border-muted-teal/20"
        style={{ marginLeft: "calc(50% - 50vw)", width: "100vw" }}
      >
        <div className="px-6">
          <ProjectTabNav slug={slug} isOwner={isOwner} />
        </div>
      </div>

      {children}
    </>
  );
}
