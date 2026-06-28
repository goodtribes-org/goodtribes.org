import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import ProjectTabNav from "./ProjectTabNav";

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
        imageUrl: true,
        title: true,
        status: true,
        category: true,
        tags: true,
        sdgGoals: true,
        org: { select: { name: true, slug: true } },
        owner: { select: { name: true, image: true } },
        members: {
          select: { user: { select: { name: true, image: true } } },
          orderBy: { joinedAt: "asc" },
          take: 8,
        },
        _count: { select: { members: true } },
      },
    }),
  ]);
  if (!project) notFound();

  const stageIndex = STATUS_TO_STAGE[project.status] ?? 0;

  const [fundingCampaign, isOwnerRecord] = await Promise.all([
    prisma.fundingCampaign.findUnique({
      where: { projectId: project.id },
      include: { pledges: { select: { amount: true } } },
    }),
    session?.user?.id
      ? prisma.projectMember.findFirst({
          where: { project: { slug }, userId: session.user.id, role: { in: ["owner", "admin"] } },
        })
      : Promise.resolve(null),
  ]);

  const isOwner = !!isOwnerRecord;
  const raised = fundingCampaign?.pledges.reduce((s, p) => s + p.amount, 0) ?? 0;
  const fundingPct = fundingCampaign
    ? Math.min(100, Math.round((raised / fundingCampaign.goal) * 100))
    : 0;
  const daysLeft = fundingCampaign?.deadline
    ? Math.max(0, Math.ceil((new Date(fundingCampaign.deadline).getTime() - Date.now()) / 86400000))
    : null;

  return (
    <>
      {/* Full-bleed hero with title overlay — flush with header */}
      <div
        className="relative -mt-8"
        style={{ marginLeft: "calc(50% - 50vw)", width: "100vw" }}
      >
        <div className="relative w-full h-64 md:h-[480px]">
          {project.imageUrl ? (
            <Image
              src={project.imageUrl}
              alt={project.title}
              fill
              unoptimized
              className="object-cover"
              sizes="100vw"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-dark-slate to-dark-slate/70" />
          )}
          {/* Top-right: member avatar cluster */}
          <div className="absolute top-4 right-4 md:top-6 md:right-6 flex flex-col items-end gap-2">
            {/* Owner avatar (large) */}
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-full ring-2 ring-white/70 overflow-hidden bg-dark-slate/60 flex items-center justify-center text-white font-bold text-lg shrink-0 relative">
              {project.owner.image ? (
                <Image src={project.owner.image} alt={project.owner.name ?? ""} fill className="object-cover" unoptimized />
              ) : (
                (project.owner.name ?? "?").charAt(0).toUpperCase()
              )}
            </div>
            {/* Team member avatars (small row) */}
            {project.members.length > 0 && (
              <div className="flex -space-x-2">
                {project.members.slice(0, 6).map((m, i) => {
                  const initials = (m.user.name ?? "?").charAt(0).toUpperCase();
                  return (
                    <div
                      key={i}
                      title={m.user.name ?? ""}
                      className="w-8 h-8 rounded-full ring-2 ring-white/60 overflow-hidden bg-dark-slate/60 flex items-center justify-center text-white text-xs font-semibold shrink-0 relative"
                    >
                      {m.user.image ? (
                        <Image src={m.user.image} alt={m.user.name ?? ""} fill className="object-cover" unoptimized />
                      ) : (
                        initials
                      )}
                    </div>
                  );
                })}
                {project._count.members > 6 && (
                  <div className="w-8 h-8 rounded-full ring-2 ring-white/60 bg-black/50 flex items-center justify-center text-white text-xs font-semibold">
                    +{project._count.members - 6}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom: title + owner overlay */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent px-6 pb-6 pt-24">
            <div className="max-w-5xl mx-auto flex items-end justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight drop-shadow">
                  {project.title}
                </h1>
                <p className="text-white/70 text-sm mt-2">
                  av <span className="text-white/90 font-medium">{project.owner.name ?? "Okänd"}</span>
                  {project.org && (
                    <>
                      {" "}·{" "}
                      <Link href={`/org/${project.org.slug}`} className="text-white/70 hover:text-white transition-colors">
                        {project.org.name}
                      </Link>
                    </>
                  )}
                </p>
              </div>
              {isOwner && (
                <Link
                  href={`/projects/${slug}/edit`}
                  className="shrink-0 px-3 py-1.5 rounded border border-white/40 text-xs font-medium text-white/80 hover:text-white hover:border-white/70 transition-colors backdrop-blur-sm"
                >
                  Redigera
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Below-hero meta bar — tags, stage, SDG, members, funding */}
      <div className="py-4 border-b border-muted-teal/20 mb-2">
        <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
          <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
            <span className="text-xs font-semibold px-2.5 py-1 bg-seagrass/20 text-seagrass rounded-full">
              {STAGES[stageIndex]}
            </span>
            {project.category && (
              <span className="text-xs bg-muted-teal/30 text-dark-slate px-2.5 py-1 rounded-full font-medium">
                {project.category}
              </span>
            )}
            {(project.tags ?? []).map((tag) => (
              <span key={tag} className="text-xs border border-muted-teal/60 text-dark-slate/60 px-2.5 py-1 rounded-full">
                #{tag}
              </span>
            ))}
            {project.sdgGoals.map((n) => {
              const info = SDG_INFO[n];
              return (
                <span
                  key={n}
                  title={`SDG ${n}: ${info?.label ?? ""}`}
                  className="text-xs font-bold px-2.5 py-1 rounded-full text-white cursor-default"
                  style={{ backgroundColor: info?.color ?? "#888" }}
                >
                  SDG {n}
                </span>
              );
            })}
          </div>
          <div className="flex items-center gap-4 shrink-0 text-sm text-dark-slate/60">
            <span>👥 {project._count.members} {project._count.members === 1 ? "medlem" : "medlemmar"}</span>
            {fundingCampaign && (
              <span className="font-semibold text-dark-slate">
                {fundingPct}% finansierat
                {daysLeft !== null && <span className="font-normal text-dark-slate/50"> · {daysLeft} dagar kvar</span>}
              </span>
            )}
          </div>
        </div>
        {fundingCampaign && (
          <div className="w-full h-1.5 bg-muted-teal/20 rounded-full overflow-hidden mt-3">
            <div
              className="h-full bg-coral rounded-full transition-all"
              style={{ width: `${fundingPct}%` }}
            />
          </div>
        )}
      </div>

      {/* Tab nav */}
      <div className="mb-6">
        <ProjectTabNav slug={slug} />
      </div>

      {children}
    </>
  );
}
